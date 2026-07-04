import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../utils/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./token.service.js";
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

  await prisma.otpCode.updateMany({
    where: { email: normalized, purpose, consumed: false },
    data: { consumed: true },
  });

  await prisma.otpCode.create({
    data: { email: normalized, purpose, codeHash, expiresAt },
  });

  await sendOtpEmail(normalized, code);
  logger.info("OTP issued", { email: normalized, purpose });

  return {
    expiresAt: expiresAt.getTime(),
    cooldownUntil: Date.now() + 30 * 1000,
    message: "Verification code sent to your email.",
  };
}

export async function verifyOtp(email, code, purpose = "register") {
  const normalized = email.trim().toLowerCase();
  const otp = await prisma.otpCode.findFirst({
    where: { email: normalized, purpose, consumed: false },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) throw new AppError("No verification request found.", 400, "OTP_MISSING");
  if (otp.expiresAt.getTime() <= Date.now()) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
    throw new AppError("Verification code expired.", 400, "OTP_EXPIRED");
  }
  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
    throw new AppError("Too many attempts. Request a new code.", 429, "OTP_LOCKED");
  }
  if (hashCode(normalized, code) !== otp.codeHash) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: otp.attempts + 1 },
    });
    throw new AppError("Incorrect verification code.", 400, "OTP_INVALID");
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
  return { ok: true };
}

export async function registerUser({ name, email, password }) {
  const normalized = email.trim().toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email: normalized } });
  if (exists) throw new AppError("Email already registered.", 409, "EMAIL_TAKEN");

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalized,
      password: hash,
      role: "STUDENT",
      emailVerified: true,
    },
  });

  return issueAuthSession(user);
}

export async function loginUser({ email, password }) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) throw new AppError("Invalid credentials.", 401, "AUTH_FAILED");
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new AppError("Invalid credentials.", 401, "AUTH_FAILED");
  return issueAuthSession(user);
}

async function issueAuthSession(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

export async function refreshSession(refreshToken) {
  const session = await prisma.session.findUnique({ where: { refreshToken } });
  if (!session) throw new AppError("Invalid refresh token.", 401, "REFRESH_INVALID");
  if (session.expiresAt.getTime() <= Date.now()) {
    throw new AppError("Refresh token expired.", 401, "REFRESH_EXPIRED");
  }
  verifyRefreshToken(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new AppError("User no longer exists.", 401, "USER_GONE");
  return { accessToken: signAccessToken(user), user: sanitizeUser(user) };
}

export async function logoutSession(refreshToken) {
  await prisma.session.deleteMany({ where: { refreshToken } });
}

export function sanitizeUser(user) {
  const { password: _pw, ...safe } = user;
  return safe;
}
