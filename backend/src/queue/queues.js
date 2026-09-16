import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";

const defaultJobOptions = {
	removeOnComplete: true,
	removeOnFail: false,
	attempts: 5,
	backoff: {
		type: "exponential",
		delay: 2000,
	},
	timeout: 30000,
};

export function getEmailQueue() {
	return new Queue("email-notifications", {
		connection: redisConnection,
		defaultJobOptions,
	});
}

export function getExternalApiQueue() {
	return new Queue("external-api-calls", {
		connection: redisConnection,
		defaultJobOptions,
	});
}

export function getReportQueue() {
	return new Queue("report-generation", {
		connection: redisConnection,
		defaultJobOptions,
	});
}

export function getDeadLetterQueue() {
	return new Queue("dead-letter-queue", {
		connection: redisConnection,
		defaultJobOptions: {
			...defaultJobOptions,
			attempts: 1,
			backoff: { type: "fixed", delay: 1000 },
		},
	});
}
