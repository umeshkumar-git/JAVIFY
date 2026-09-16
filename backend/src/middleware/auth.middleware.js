import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./errorHandler.js";

export function requireAuth(req, _res, next) {
	const header = req.headers.authorization;
	if (!header?.startsWith("Bearer ")) {
		return next(
			new AppError("Authentication required.", 401, "AUTH_REQUIRED"),
		);
	}

	try {
		const token = header.slice(7);
		const payload = jwt.verify(token, env.JWT_SECRET);
		req.user = payload;
		next();
	} catch (error) {
		return next(
			new AppError("Invalid or expired token.", 401, "AUTH_INVALID"),
		);
	}
}

export function requireRole(...allowedRoles) {
	return (req, _res, next) => {
		if (!req.user) {
			return next(
				new AppError("Authentication required.", 401, "AUTH_REQUIRED"),
			);
		}

		if (!allowedRoles.includes(req.user.role)) {
			return next(
				new AppError("Insufficient permissions.", 403, "FORBIDDEN"),
			);
		}

		next();
	};
}
