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

/**
 * In-memory fallback map for SWR caching when Redis is offline.
 * Map<string, { value: any, expiresAt: number, staleExpiresAt: number }>
 */
const inMemorySwrStore = new Map();
const inFlightLoaders = new Map();

/**
 * Acquires a distributed lock with automatic TTL expiration.
 * @param {string} lockKey
 * @param {number} ttlSeconds
 * @returns {Promise<boolean>}
 */
export async function acquireDistributedLock(lockKey, ttlSeconds = 10) {
	if (await isCacheEnabled()) {
		try {
			const result = await redisClient.set(lockKey, "locked", {
				NX: true,
				EX: ttlSeconds,
			});
			return result === "OK";
		} catch {
			return true; // Fail open
		}
	}
	return true;
}

export async function releaseDistributedLock(lockKey) {
	if (await isCacheEnabled()) {
		try {
			await redisClient.del(lockKey);
		} catch {
			// Ignore cleanup error
		}
	}
}

/**
 * Tier-1 Stale-While-Revalidate (SWR) Cache with Thundering Herd Mutex Protection.
 *
 * @param {string} key - Cache identifier
 * @param {number} freshTtlSeconds - Duration payload is considered fresh
 * @param {number} staleTtlSeconds - Additional window during which stale data can be served
 * @param {() => Promise<any>} loader - Upstream fetcher
 * @param {Object} [metadata] - Logging metadata
 */
export async function withSwrCache(
	key,
	freshTtlSeconds,
	staleTtlSeconds,
	loader,
	metadata = {},
) {
	const now = Date.now();
	const lockKey = `lock:swr:${key}`;
	const totalTtl = freshTtlSeconds + staleTtlSeconds;

	// 1. Try reading from Redis or Memory
	let cachedPayload = null;
	if (await isCacheEnabled()) {
		cachedPayload = await getCachedValue(`swr:${key}`);
	} else {
		const mem = inMemorySwrStore.get(key);
		if (mem && mem.staleExpiresAt > now) {
			cachedPayload = mem;
		}
	}

	// 2. Evaluate fresh vs stale
	if (
		cachedPayload &&
		cachedPayload.expiresAt &&
		cachedPayload.value !== undefined
	) {
		if (now < cachedPayload.expiresAt) {
			// Fresh Hit
			logger.info("SWR cache hit (fresh)", {
				module: "cache",
				action: "swr.fresh_hit",
				key,
				...metadata,
			});
			return cachedPayload.value;
		}

		// Stale Hit: Serve immediately and trigger background revalidation
		logger.info(
			"SWR cache hit (stale serving, background refresh triggered)",
			{
				module: "cache",
				action: "swr.stale_serve",
				key,
				...metadata,
			},
		);

		// Background asynchronous revalidation with distributed lock
		(async () => {
			const lockAcquired = await acquireDistributedLock(lockKey, 15);
			if (!lockAcquired) {
				// Another instance is already revalidating
				return;
			}
			try {
				const freshValue = await loader();
				const swrRecord = {
					value: freshValue,
					expiresAt: Date.now() + freshTtlSeconds * 1000,
					staleExpiresAt: Date.now() + totalTtl * 1000,
				};
				if (await isCacheEnabled()) {
					await setCachedValue(`swr:${key}`, swrRecord, totalTtl);
				} else {
					inMemorySwrStore.set(key, swrRecord);
				}
			} catch (err) {
				logger.warn("SWR background revalidation failed", {
					key,
					error: err.message,
				});
			} finally {
				await releaseDistributedLock(lockKey);
			}
		})();

		return cachedPayload.value;
	}

	// 3. Cache Miss: Synchronous load with distributed lock & single-flight coalescing
	const inFlightKey = `inflight:${key}`;
	if (inFlightLoaders.has(inFlightKey)) {
		return inFlightLoaders.get(inFlightKey);
	}

	const loadPromise = (async () => {
		const lockAcquired = await acquireDistributedLock(lockKey, 15);
		try {
			const value = await loader();
			const swrRecord = {
				value,
				expiresAt: Date.now() + freshTtlSeconds * 1000,
				staleExpiresAt: Date.now() + totalTtl * 1000,
			};
			if (await isCacheEnabled()) {
				await setCachedValue(`swr:${key}`, swrRecord, totalTtl);
			} else {
				inMemorySwrStore.set(key, swrRecord);
			}
			return value;
		} finally {
			if (lockAcquired) {
				await releaseDistributedLock(lockKey);
			}
			inFlightLoaders.delete(inFlightKey);
		}
	})();

	inFlightLoaders.set(inFlightKey, loadPromise);
	return loadPromise;
}

