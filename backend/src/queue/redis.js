import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redisConnection = new IORedis(redisUrl, {
	maxRetriesPerRequest: null,
	enableReadyCheck: false,
	lazyConnect: true,
	retryStrategy: (times) => {
		if (times > 2) return null; // stop retrying if offline
		return Math.min(times * 100, 500);
	},
});

redisConnection.on("error", () => {
	// Graceful handling when Redis is offline in dev environment
});
