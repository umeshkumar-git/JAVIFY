import { AppError } from "../middleware/errorHandler.js";
import { userRepository } from "../repositories/user.repository.js";
import { toPublicUserDto, toUserProgressDto } from "../dtos/user.dto.js";
import logger from "../utils/logger.js";
import { invalidateCachePattern, withCache } from "../utils/cache.js";

const USER_PROFILE_TTL = 180;
const USER_PROGRESS_TTL = 180;
const USER_LIST_TTL = 180;

export async function getCurrentUser(userId) {
	const cacheKey = `user:profile:${userId}`;
	const user = await withCache(
		cacheKey,
		USER_PROFILE_TTL,
		async () => {
			const foundUser = await userRepository.findById(userId);
			if (!foundUser) {
				throw new AppError("User not found.", 404, "USER_NOT_FOUND");
			}
			return toPublicUserDto(foundUser);
		},
		{ domain: "user", action: "user.getCurrent", userId },
	);

	logger.info("Current user fetched", {
		module: "user.service",
		action: "user.getCurrent",
		userId,
	});
	return user;
}

export async function updateCurrentUser(userId, payload) {
	const { name, avatar } = payload;
	const updated = await userRepository.updateById(userId, { name, avatar });
	await invalidateCachePattern(`user:profile:${userId}`);
	await invalidateCachePattern(`user:progress:${userId}`);
	await invalidateCachePattern("user:list");

	logger.info("Current user updated", {
		module: "user.service",
		action: "user.updateCurrent",
		userId,
		name: !!name,
		avatar: !!avatar,
	});
	return toPublicUserDto(updated);
}

export async function getUserProgress(userId) {
	const cacheKey = `user:progress:${userId}`;
	const progress = await withCache(
		cacheKey,
		USER_PROGRESS_TTL,
		async () => {
			const [user, completedChallenges, totalSubmissions] =
				await userRepository.findProgress(userId);

			if (!user) {
				throw new AppError("User not found.", 404, "USER_NOT_FOUND");
			}

			return toUserProgressDto({
				user,
				completedChallengeIds: completedChallenges.map(
					(challenge) => challenge.challengeId,
				),
				totalSubmissions,
			});
		},
		{ domain: "user", action: "user.progress", userId },
	);

	logger.info("User progress fetched", {
		module: "user.service",
		action: "user.progress",
		userId,
		completedCount: progress.completedChallengeIds.length,
		totalSubmissions: progress.totalSubmissions,
	});
	return progress;
}

export async function listUsers() {
	const cacheKey = "user:list";
	const users = await withCache(
		cacheKey,
		USER_LIST_TTL,
		async () => {
			const allUsers = await userRepository.findAll();
			return allUsers.map(toPublicUserDto);
		},
		{ domain: "user", action: "user.list" },
	);

	logger.info("Users list fetched", {
		module: "user.service",
		action: "user.list",
		count: users.length,
	});
	return users;
}
