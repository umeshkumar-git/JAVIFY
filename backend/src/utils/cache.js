import { createClient } from "redis";
import logger from "./logger.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redisClient = createClient({
	url: redisUrl,
	socket: {
		reconnectStrategy: (retries) => {
			if (retries > 2) return new Error("Redis unavailable");
			return Math.min(retries * 100, 500);
		},
	},
});

redisClient.on("error", (error) => {
	logger.error("Redis client error", {
		module: "cache",
		action: "redis.error",
		message: error.message,
	});
});

export async function connectRedis() {
	try {
		if (!redisClient.isOpen) {
			await redisClient.connect();
		}
		logger.info("Redis connected", {
			module: "cache",
			action: "redis.connect",
			url: redisUrl,
		});
		return redisClient;
	} catch (error) {
		logger.warn("Redis unavailable; continuing without cache", {
			module: "cache",
			action: "redis.connect",
			message: error.message,
			url: redisUrl,
		});
		return null;
	}
}

export async function isCacheEnabled() {
	return redisClient.isOpen && redisClient.isReady;
}

export async function getCachedValue(key) {
	if (!(await isCacheEnabled())) return null;

	try {
		const value = await redisClient.get(key);
		return value ? JSON.parse(value) : null;
	} catch (error) {
		logger.warn("Redis cache read failed", {
			module: "cache",
			action: "cache.get",
			key,
			message: error.message,
		});
		return null;
	}
}

export async function setCachedValue(key, value, ttlSeconds = 300) {
	if (!(await isCacheEnabled())) return false;

	try {
		await redisClient.set(key, JSON.stringify(value), {
			EX: ttlSeconds,
		});
		return true;
	} catch (error) {
		logger.warn("Redis cache write failed", {
			module: "cache",
			action: "cache.set",
			key,
			ttlSeconds,
			message: error.message,
		});
		return false;
	}
}

export async function deleteCachedKey(key) {
	if (!(await isCacheEnabled())) return false;

	try {
		await redisClient.del(key);
		return true;
	} catch (error) {
		logger.warn("Redis cache delete failed", {
			module: "cache",
			action: "cache.delete",
			key,
			message: error.message,
		});
		return false;
	}
}

export async function invalidateCachePattern(pattern) {
	if (!(await isCacheEnabled())) return false;

	try {
		const keys = await redisClient.keys(pattern);
		if (keys.length > 0) {
			await redisClient.del(keys);
		}
		return true;
	} catch (error) {
		logger.warn("Redis cache invalidation failed", {
			module: "cache",
			action: "cache.invalidate",
			pattern,
			message: error.message,
		});
		return false;
	}
}

export async function withCache(key, ttlSeconds, loader, metadata = {}) {
	const cachedValue = await getCachedValue(key);
	if (cachedValue !== null) {
		logger.info("Cache hit", {
			module: "cache",
			action: "cache.hit",
			key,
			...metadata,
		});
		return cachedValue;
	}

	const value = await loader();
	await setCachedValue(key, value, ttlSeconds);

	logger.info("Cache miss: value loaded and stored", {
		module: "cache",
		action: "cache.miss",
		key,
		ttlSeconds,
		...metadata,
	});

	return value;
}
