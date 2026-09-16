import {
	getEmailQueue,
	getExternalApiQueue,
	getReportQueue,
} from "../queue/queues.js";
import { sendOtpEmail } from "./email.service.js";
import logger from "../utils/logger.js";
import { redisConnection } from "../queue/redis.js";

export async function enqueueOtpEmail(toEmail, code) {
	try {
		await redisConnection.ping();
		const queue = getEmailQueue();
		return queue.add(
			"send-otp-email",
			{ toEmail, code },
			{
				jobId: `otp:${toEmail}:${Date.now()}`,
				attempts: 5,
				backoff: { type: "exponential", delay: 2000 },
			},
		);
	} catch (error) {
		logger.warn(
			"Redis unavailable; sending email inline instead of queueing",
			{
				module: "queue.service",
				action: "queue.fallback",
				toEmail,
				message: error.message,
			},
		);
		return sendOtpEmail(toEmail, code);
	}
}

export async function enqueueExternalApiCall({
	provider,
	payload,
	metadata = {},
}) {
	try {
		await redisConnection.ping();
		const queue = getExternalApiQueue();
		return queue.add(
			`${provider}-sync`,
			{ provider, payload, metadata },
			{
				attempts: 5,
				backoff: { type: "exponential", delay: 3000 },
			},
		);
	} catch (error) {
		logger.warn("Redis unavailable; skipping external API queue job", {
			module: "queue.service",
			action: "queue.exernal-api-fallback",
			provider,
			message: error.message,
		});
		return null;
	}
}

export async function enqueueReportGeneration({ userId, reportType, payload }) {
	try {
		await redisConnection.ping();
		const queue = getReportQueue();
		return queue.add(
			"generate-report",
			{ userId, reportType, payload },
			{
				attempts: 5,
				backoff: { type: "exponential", delay: 4000 },
			},
		);
	} catch (error) {
		logger.warn("Redis unavailable; skipping report queue job", {
			module: "queue.service",
			action: "queue.report-fallback",
			userId,
			reportType,
			message: error.message,
		});
		return null;
	}
}
