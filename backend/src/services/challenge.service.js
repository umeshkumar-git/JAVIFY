import { AppError } from "../middleware/errorHandler.js";
import { challengeRepository } from "../repositories/challenge.repository.js";
import { toPublicChallengeDto } from "../dtos/challenge.dto.js";
import logger from "../utils/logger.js";

export async function listChallenges() {
	const challenges = await challengeRepository.findAll();
	logger.info("Challenges fetched", {
		module: "challenge.service",
		action: "challenge.list",
		count: challenges.length,
	});
	return challenges.map(toPublicChallengeDto);
}

export async function getChallengeById(id) {
	const challenge = await challengeRepository.findById(id);
	if (!challenge) {
		throw new AppError("Challenge not found.", 404, "CHALLENGE_NOT_FOUND");
	}

	logger.info("Challenge fetched", {
		module: "challenge.service",
		action: "challenge.getById",
		challengeId: id,
	});
	return toPublicChallengeDto(challenge);
}

export async function createChallenge(payload) {
	const challenge = await challengeRepository.create(payload);
	logger.info("Challenge created", {
		module: "challenge.service",
		action: "challenge.create",
		challengeId: challenge.id,
		title: challenge.title,
	});
	return toPublicChallengeDto(challenge);
}

export async function updateChallenge(id, payload) {
	const challenge = await challengeRepository.update(id, payload);
	logger.info("Challenge updated", {
		module: "challenge.service",
		action: "challenge.update",
		challengeId: id,
		title: challenge.title,
	});
	return toPublicChallengeDto(challenge);
}

export async function deleteChallenge(id) {
	await challengeRepository.delete(id);
	logger.info("Challenge deleted", {
		module: "challenge.service",
		action: "challenge.delete",
		challengeId: id,
	});
	return { ok: true };
}
