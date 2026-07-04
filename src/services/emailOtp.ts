const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const OTP_SESSION_KEY = "javify-email-otp-session";

export type OtpSendResult = {
  ok: boolean;
  email: string;
  expiresAt: number;
  cooldownUntil: number;
  provider: "backend" | "demo";
  message: string;
  debugCode?: string;
};

export type OtpVerifyResult = {
  ok: boolean;
  status: "verified" | "invalid" | "expired" | "locked" | "missing" | "network-error";
  message: string;
};

type OtpSession = {
  email: string;
  username: string;
  codeHash: string;
  expiresAt: number;
  cooldownUntil: number;
  attempts: number;
  createdAt: number;
  devCode: string;
};

function getApiBaseUrl() {
  const env = (import.meta as unknown as { env?: { VITE_AUTH_API_BASE_URL?: string } }).env;
  return env?.VITE_AUTH_API_BASE_URL?.replace(/\/$/, "") ?? "";
}

function isAuthDebugEnabled() {
  const env = (import.meta as unknown as { env?: { VITE_AUTH_DEBUG?: string } }).env;
  return env?.VITE_AUTH_DEBUG === "true";
}

function authDebug(...args: unknown[]) {
  if (isAuthDebugEnabled()) {
    console.debug("[auth:otp]", ...args);
  }
}

function secureSixDigitCode() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function readOtpSession(): OtpSession | null {
  try {
    const raw = sessionStorage.getItem(OTP_SESSION_KEY);
    return raw ? (JSON.parse(raw) as OtpSession) : null;
  } catch {
    return null;
  }
}

function writeOtpSession(session: OtpSession) {
  sessionStorage.setItem(OTP_SESSION_KEY, JSON.stringify(session));
}

export function getCurrentOtpSession() {
  return readOtpSession();
}

export function clearOtpSession() {
  sessionStorage.removeItem(OTP_SESSION_KEY);
}

async function tryBackendSendOtp(email: string, username: string): Promise<OtpSendResult | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, purpose: "register" }),
    });

    if (!response.ok) {
      const details = await response.text();
      authDebug("Backend send failed", response.status, details);
      return null;
    }

    const data = (await response.json()) as Partial<OtpSendResult>;
    return {
      ok: true,
      email,
      expiresAt: data.expiresAt ?? Date.now() + OTP_TTL_MS,
      cooldownUntil: data.cooldownUntil ?? Date.now() + RESEND_COOLDOWN_MS,
      provider: "backend",
      message: data.message ?? "Verification code sent to your email.",
    };
  } catch (error) {
    authDebug("Backend send unavailable, using demo fallback", error);
    return null;
  }
}

async function tryBackendVerifyOtp(email: string, code: string): Promise<OtpVerifyResult | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, purpose: "register" }),
    });

    const data = (await response.json().catch(() => ({}))) as Partial<OtpVerifyResult>;

    if (!response.ok) {
      authDebug("Backend verify failed", response.status, data);
      return {
        ok: false,
        status: data.status ?? "invalid",
        message: data.message ?? "Verification failed. Please try again.",
      };
    }

    return {
      ok: true,
      status: "verified",
      message: data.message ?? "Email verified successfully.",
    };
  } catch (error) {
    authDebug("Backend verify unavailable, using demo fallback", error);
    return null;
  }
}

export async function sendEmailOtp(email: string, username: string): Promise<OtpSendResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = readOtpSession();
  const now = Date.now();

  if (existing?.email === normalizedEmail && existing.expiresAt > now && existing.cooldownUntil > now) {
    return {
      ok: true,
      email: normalizedEmail,
      expiresAt: existing.expiresAt,
      cooldownUntil: existing.cooldownUntil,
      provider: "demo",
      debugCode: existing.devCode,
      message: `A verification code was already sent. You can resend in ${Math.ceil((existing.cooldownUntil - now) / 1000)}s.`,
    };
  }

  const backendResult = await tryBackendSendOtp(normalizedEmail, username);
  if (backendResult) return backendResult;

  const code = secureSixDigitCode();
  const expiresAt = now + OTP_TTL_MS;
  const cooldownUntil = now + RESEND_COOLDOWN_MS;
  const codeHash = await sha256(`${normalizedEmail}:${code}`);
  const session: OtpSession = {
    email: normalizedEmail,
    username,
    codeHash,
    expiresAt,
    cooldownUntil,
    attempts: 0,
    createdAt: now,
    devCode: code,
  };

  writeOtpSession(session);
  authDebug(`Demo verification code for ${normalizedEmail}: ${code}`);

  return {
    ok: true,
    email: normalizedEmail,
    expiresAt,
    cooldownUntil,
    provider: "demo",
    debugCode: code,
    message: "Verification code generated. In production this is sent by your backend email service.",
  };
}

export async function resendEmailOtp(email: string, username: string): Promise<OtpSendResult> {
  const existing = readOtpSession();
  const now = Date.now();
  const normalizedEmail = email.trim().toLowerCase();

  if (existing?.email === normalizedEmail && existing.cooldownUntil > now) {
    return {
      ok: true,
      email: normalizedEmail,
      expiresAt: existing.expiresAt,
      cooldownUntil: existing.cooldownUntil,
      provider: "demo",
      debugCode: existing.devCode,
      message: `Please wait ${Math.ceil((existing.cooldownUntil - now) / 1000)}s before requesting another code.`,
    };
  }

  clearOtpSession();
  return sendEmailOtp(normalizedEmail, username);
}

export async function verifyEmailOtp(email: string, code: string): Promise<OtpVerifyResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const backendResult = await tryBackendVerifyOtp(normalizedEmail, code);
  if (backendResult) return backendResult;

  const session = readOtpSession();
  const now = Date.now();

  if (!session || session.email !== normalizedEmail) {
    return { ok: false, status: "missing", message: "No verification request was found. Please request a new code." };
  }

  if (session.expiresAt <= now) {
    clearOtpSession();
    return { ok: false, status: "expired", message: "This verification code expired. Please request a new code." };
  }

  if (session.attempts >= MAX_ATTEMPTS) {
    clearOtpSession();
    return { ok: false, status: "locked", message: "Too many incorrect attempts. Please request a new code." };
  }

  const hash = await sha256(`${normalizedEmail}:${code}`);
  if (hash !== session.codeHash) {
    const updated = { ...session, attempts: session.attempts + 1 };
    writeOtpSession(updated);
    return {
      ok: false,
      status: "invalid",
      message: `Incorrect code. ${Math.max(MAX_ATTEMPTS - updated.attempts, 0)} attempts remaining.`,
    };
  }

  clearOtpSession();
  return { ok: true, status: "verified", message: "Email verified successfully." };
}

export function getTimeRemaining(msTarget: number) {
  return Math.max(0, msTarget - Date.now());
}

export { OTP_TTL_MS, RESEND_COOLDOWN_MS };