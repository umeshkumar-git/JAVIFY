import { Router } from "express";
import {
	registerUser,
	loginUser,
	refreshSession,
	logoutSession,
	requestOtp,
	verifyOtp,
} from "../services/auth.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const authController = {
	async signup(req, res, next) {
		try {
			const session = await registerUser(req.body);
			res.status(201).json(successResponse(session));
		} catch (error) {
			next(error);
		}
	},

	async login(req, res, next) {
		try {
			const session = await loginUser(req.body);
			res.json(successResponse(session));
		} catch (error) {
			next(error);
		}
	},

	async refresh(req, res, next) {
		try {
			const session = await refreshSession(req.body.refreshToken);
			res.json(successResponse(session));
		} catch (error) {
			next(error);
		}
	},

	async logout(req, res, next) {
		try {
			await logoutSession(req.body.refreshToken);
			res.json(successResponse({ ok: true }));
		} catch (error) {
			next(error);
		}
	},

	async requestOtpCode(req, res, next) {
		try {
			const otp = await requestOtp(req.body.email, req.body.purpose);
			res.json(successResponse(otp));
		} catch (error) {
			next(error);
		}
	},

	async verifyOtpCode(req, res, next) {
		try {
			const otp = await verifyOtp(
				req.body.email,
				req.body.code,
				req.body.purpose,
			);
			res.json(successResponse(otp));
		} catch (error) {
			next(error);
		}
	},
};

export default Router();
