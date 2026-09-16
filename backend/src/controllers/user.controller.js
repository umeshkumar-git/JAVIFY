import { Router } from "express";
import {
	getCurrentUser,
	updateCurrentUser,
	getUserProgress,
	listUsers,
} from "../services/user.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const userController = {
	async me(req, res, next) {
		try {
			const user = await getCurrentUser(req.user.sub);
			res.json(successResponse(user));
		} catch (error) {
			next(error);
		}
	},

	async updateMe(req, res, next) {
		try {
			const user = await updateCurrentUser(req.user.sub, req.body);
			res.json(successResponse(user));
		} catch (error) {
			next(error);
		}
	},

	async getMyProgress(req, res, next) {
		try {
			const progress = await getUserProgress(req.user.sub);
			res.json(successResponse(progress));
		} catch (error) {
			next(error);
		}
	},

	async list(req, res, next) {
		try {
			const users = await listUsers();
			res.json(successResponse(users));
		} catch (error) {
			next(error);
		}
	},
};

export default Router();
