import { Router } from "express";
import {
	listChallenges,
	getChallengeById,
	createChallenge,
	updateChallenge,
	deleteChallenge,
} from "../services/challenge.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const challengeController = {
	async list(req, res, next) {
		try {
			const challenges = await listChallenges();
			res.json(successResponse(challenges));
		} catch (error) {
			next(error);
		}
	},

	async getById(req, res, next) {
		try {
			const challenge = await getChallengeById(req.params.id);
			res.json(successResponse(challenge));
		} catch (error) {
			next(error);
		}
	},

	async create(req, res, next) {
		try {
			const challenge = await createChallenge(req.body);
			res.status(201).json(successResponse(challenge));
		} catch (error) {
			next(error);
		}
	},

	async update(req, res, next) {
		try {
			const challenge = await updateChallenge(req.params.id, req.body);
			res.json(successResponse(challenge));
		} catch (error) {
			next(error);
		}
	},

	async destroy(req, res, next) {
		try {
			const result = await deleteChallenge(req.params.id);
			res.json(successResponse(result));
		} catch (error) {
			next(error);
		}
	},
};

export default Router();
