import { AppError } from "../middleware/errorHandler.js";
import { challengeRepository } from "../repositories/challenge.repository.js";
import { toPublicChallengeDto } from "../dtos/challenge.dto.js";
import logger from "../utils/logger.js";
import { invalidateCachePattern, withCache } from "../utils/cache.js";

const CHALLENGE_LIST_TTL = 300;
const CHALLENGE_DETAIL_TTL = 600;

export async function listChallenges() {
	const cacheKey = "challenge:list";
	const challenges = await withCache(
		cacheKey,
		CHALLENGE_LIST_TTL,
		async () => {
			const allChallenges = await challengeRepository.findAll();
			return allChallenges.map(toPublicChallengeDto);
		},
		{ domain: "challenge", action: "challenge.list" },
	);

	logger.info("Challenges fetched", {
		module: "challenge.service",
		action: "challenge.list",
		count: challenges.length,
	});
	return challenges;
}

export async function getChallengeById(id) {
	const cacheKey = `challenge:detail:${id}`;
	const challenge = await withCache(
		cacheKey,
		CHALLENGE_DETAIL_TTL,
		async () => {
			const found = await challengeRepository.findById(id);
			if (!found) {
				throw new AppError("Challenge not found.", 404, "CHALLENGE_NOT_FOUND");
			}
			return toPublicChallengeDto(found);
		},
		{ domain: "challenge", action: "challenge.getById", challengeId: id },
	);

	logger.info("Challenge fetched", {
		module: "challenge.service",
		action: "challenge.getById",
		challengeId: id,
	});
	return challenge;
}

export async function createChallenge(payload) {
	const challenge = await challengeRepository.create(payload);
	await invalidateCachePattern("challenge:*");
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
	await invalidateCachePattern("challenge:*");
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
	await invalidateCachePattern("challenge:*");
	logger.info("Challenge deleted", {
		module: "challenge.service",
		action: "challenge.delete",
		challengeId: id,
	});
	return { ok: true };
}
