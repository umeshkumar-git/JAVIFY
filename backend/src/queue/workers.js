import { Worker } from "bullmq";
import { getDeadLetterQueue } from "./queues.js";
import { redisConnection } from "./redis.js";
import { sendOtpEmail } from "../services/email.service.js";
import logger from "../utils/logger.js";

async function forwardToDeadLetter(job, error, queueName) {
	if (!job) return;

	const deadLetterQueue = getDeadLetterQueue();
	await deadLetterQueue.add(`${queueName}-dlq`, {
		queueName,
		jobName: job.name,
		data: job.data,
		failedReason: error.message,
		stack: error.stack,
		attemptsMade: job.attemptsMade,
		timestamp: new Date().toISOString(),
	});

	logger.error("Job moved to DLQ", {
		module: "queue",
		action: "job.dlq",
		queueName,
		jobName: job.name,
		attemptsMade: job.attemptsMade,
		failedReason: error.message,
	});
}

function createWorker(queueName, processor) {
	const worker = new Worker(queueName, async (job) => processor(job), {
		connection: redisConnection,
		concurrency: 2,
	});

	worker.on("failed", async (job, error) => {
		if (!job) return;
		const hasExceededAttempts =
			job.attemptsMade >= (job.opts.attempts ?? 1);
		if (hasExceededAttempts) {
			await forwardToDeadLetter(job, error, queueName);
		}
		logger.warn("Queue job failed", {
			module: "queue",
			action: "job.failed",
			queueName,
			jobName: job.name,
			attemptsMade: job.attemptsMade,
			maxAttempts: job.opts.attempts ?? 1,
			failedReason: error.message,
		});
	});

	worker.on("completed", (job) => {
		logger.info("Queue job completed", {
			module: "queue",
			action: "job.completed",
			queueName,
			jobName: job.name,
			jobId: job.id,
		});
	});

	return worker;
}

export async function startWorkers() {
	try {
		await redisConnection.ping();
	} catch (error) {
		logger.warn("Redis unavailable; background workers not started", {
			module: "queue",
			action: "workers.start",
			message: error.message,
		});
		return [];
	}

	const workers = [
		createWorker("email-notifications", async (job) => {
			if (job.name === "send-otp-email") {
				await sendOtpEmail(job.data.toEmail, job.data.code);
				return { sent: true, toEmail: job.data.toEmail };
			}
			throw new Error(`Unsupported email job type: ${job.name}`);
		}),
		createWorker("external-api-calls", async (job) => {
			if (job.name.endsWith("-sync")) {
				logger.info("Simulated external API call dispatched", {
					module: "queue",
					action: "external-api.process",
					provider: job.data.provider,
					jobName: job.name,
				});
				return { provider: job.data.provider, status: "synced" };
			}
			throw new Error(`Unsupported external API job type: ${job.name}`);
		}),
		createWorker("report-generation", async (job) => {
			if (job.name === "generate-report") {
				logger.info("Report generation queued", {
					module: "queue",
					action: "report.generate",
					userId: job.data.userId,
					reportType: job.data.reportType,
				});
				return { reportType: job.data.reportType, status: "generated" };
			}
			throw new Error(`Unsupported report job type: ${job.name}`);
		}),
	];

	logger.info("Background workers started", {
		module: "queue",
		action: "workers.start",
		queueNames: [
			"email-notifications",
			"external-api-calls",
			"report-generation",
		],
	});

	return workers;
}
