import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AppError } from "../middleware/errorHandler.js";
import { authRepository } from "../repositories/auth.repository.js";
import { toAuthSessionDto, toPublicUserDto } from "../dtos/auth.dto.js";
import {
	signAccessToken,
	signRefreshToken,
	verifyRefreshToken,
} from "./token.service.js";
import { sendOtpEmail } from "./email.service.js";
import logger from "../utils/logger.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function hashCode(email, code) {
	return crypto.createHash("sha256").update(`${email}:${code}`).digest("hex");
}

export async function requestOtp(email, purpose = "register") {
	const normalized = email.trim().toLowerCase();
	const code = String(100000 + crypto.randomInt(0, 900000));
	const codeHash = hashCode(normalized, code);
	const expiresAt = new Date(Date.now() + OTP_TTL_MS);

	await authRepository.invalidateOtpRequests(normalized, purpose);
	const otp = await authRepository.createOtp({
		email: normalized,
		purpose,
		codeHash,
		expiresAt,
	});

	await sendOtpEmail(normalized, code);
	logger.info("OTP issued", {
		module: "auth.service",
		action: "otp.request",
		email: normalized,
		purpose,
		otpId: otp.id,
	});

	return {
		expiresAt,
		cooldownUntil: new Date(Date.now() + 30 * 1000),
		message: "Verification code sent to your email.",
	};
}

export async function verifyOtp(email, code, purpose = "register") {
	const normalized = email.trim().toLowerCase();
	const otp = await authRepository.findLatestOtp(normalized, purpose);

	if (!otp) {
		throw new AppError(
			"No verification request found.",
			400,
			"OTP_MISSING",
		);
	}

	if (otp.expiresAt.getTime() <= Date.now()) {
		await authRepository.markOtpConsumed(otp.id);
		logger.warn("OTP expired", {
			module: "auth.service",
			action: "otp.verify",
			email: normalized,
			purpose,
			otpId: otp.id,
		});
		throw new AppError("Verification code expired.", 400, "OTP_EXPIRED");
	}

	if (otp.attempts >= MAX_OTP_ATTEMPTS) {
		await authRepository.markOtpConsumed(otp.id);
		logger.warn("OTP locked after too many attempts", {
			module: "auth.service",
			action: "otp.verify",
			email: normalized,
			purpose,
			otpId: otp.id,
		});
		throw new AppError(
			"Too many attempts. Request a new code.",
			429,
			"OTP_LOCKED",
		);
	}

	if (hashCode(normalized, code) !== otp.codeHash) {
		await authRepository.updateOtp(otp.id, { attempts: otp.attempts + 1 });
		logger.warn("OTP invalid", {
			module: "auth.service",
			action: "otp.verify",
			email: normalized,
			purpose,
			attempts: otp.attempts + 1,
			otpId: otp.id,
		});
		throw new AppError("Incorrect verification code.", 400, "OTP_INVALID");
	}

	await authRepository.markOtpConsumed(otp.id);
	logger.info("OTP verified", {
		module: "auth.service",
		action: "otp.verify",
		email: normalized,
		purpose,
		otpId: otp.id,
	});
	return { ok: true };
}

export async function registerUser({ name, email, password }) {
	const normalized = email.trim().toLowerCase();
	const exists = await authRepository.findUserByEmail(normalized);
	if (exists) {
		throw new AppError("Email already registered.", 409, "EMAIL_TAKEN");
	}

	const hash = await bcrypt.hash(password, 12);
	const user = await authRepository.createUser({
		name: name.trim(),
		email: normalized,
		password: hash,
		role: "STUDENT",
		emailVerified: true,
	});

	logger.info("User registered", {
		module: "auth.service",
		action: "user.register",
		userId: user.id,
		email: normalized,
	});
	return issueAuthSession(user);
}

export async function loginUser({ email, password }) {
	const normalized = email.trim().toLowerCase();
	const user = await authRepository.findUserByEmail(normalized);
	if (!user) {
		throw new AppError("Invalid credentials.", 401, "AUTH_FAILED");
	}

	const ok = await bcrypt.compare(password, user.password);
	if (!ok) {
		throw new AppError("Invalid credentials.", 401, "AUTH_FAILED");
	}

	logger.info("User login successful", {
		module: "auth.service",
		action: "user.login",
		userId: user.id,
		email: normalized,
	});
	return issueAuthSession(user);
}

async function issueAuthSession(user) {
	const accessToken = signAccessToken(user);
	const refreshToken = signRefreshToken(user);
	const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

	await authRepository.createSession({
		userId: user.id,
		refreshToken,
		expiresAt,
	});

	logger.info("Authentication session created", {
		module: "auth.service",
		action: "session.create",
		userId: user.id,
		refreshTokenCreated: true,
	});

	return toAuthSessionDto({ user, accessToken, refreshToken });
}

export async function refreshSession(refreshToken) {
	const session =
		await authRepository.findSessionByRefreshToken(refreshToken);
	if (!session) {
		throw new AppError("Invalid refresh token.", 401, "REFRESH_INVALID");
	}

	if (session.expiresAt.getTime() <= Date.now()) {
		throw new AppError("Refresh token expired.", 401, "REFRESH_EXPIRED");
	}

	verifyRefreshToken(refreshToken);

	const user = await authRepository.findUserById(session.userId);
	if (!user) {
		throw new AppError("User no longer exists.", 401, "USER_GONE");
	}

	logger.info("Authentication session refreshed", {
		module: "auth.service",
		action: "session.refresh",
		userId: user.id,
	});
	return { accessToken: signAccessToken(user), user: toPublicUserDto(user) };
}

export async function logoutSession(refreshToken) {
	await authRepository.deleteSessionsByRefreshToken(refreshToken);
	logger.info("Authentication session revoked", {
		module: "auth.service",
		action: "session.logout",
		refreshTokenPresent: Boolean(refreshToken),
	});
}

export function sanitizeUser(user) {
	return toPublicUserDto(user);
}
