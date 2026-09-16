import { AppError } from "../middleware/errorHandler.js";
import { userRepository } from "../repositories/user.repository.js";
import { toPublicUserDto, toUserProgressDto } from "../dtos/user.dto.js";
import logger from "../utils/logger.js";

export async function getCurrentUser(userId) {
	const user = await userRepository.findById(userId);
	if (!user) {
		throw new AppError("User not found.", 404, "USER_NOT_FOUND");
	}

	logger.info("Current user fetched", {
		module: "user.service",
		action: "user.getCurrent",
		userId,
	});
	return toPublicUserDto(user);
}

export async function updateCurrentUser(userId, payload) {
	const { name, avatar } = payload;
	const updated = await userRepository.updateById(userId, { name, avatar });

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
	const [user, completedChallenges, totalSubmissions] =
		await userRepository.findProgress(userId);

	if (!user) {
		throw new AppError("User not found.", 404, "USER_NOT_FOUND");
	}

	logger.info("User progress fetched", {
		module: "user.service",
		action: "user.progress",
		userId,
		completedCount: completedChallenges.length,
		totalSubmissions,
	});
	return toUserProgressDto({
		user,
		completedChallengeIds: completedChallenges.map(
			(challenge) => challenge.challengeId,
		),
		totalSubmissions,
	});
}

export async function listUsers() {
	const users = await userRepository.findAll();
	logger.info("Users list fetched", {
		module: "user.service",
		action: "user.list",
		count: users.length,
	});
	return users.map(toPublicUserDto);
}
