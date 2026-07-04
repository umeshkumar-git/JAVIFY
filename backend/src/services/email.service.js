import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST) {
    logger.warn("SMTP not configured — emails will be logged to console only.");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

export async function sendOtpEmail(toEmail, code) {
  const t = getTransporter();
  const subject = "Your Javify verification code";
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b1020;color:#fff;border-radius:18px;">
      <h2 style="margin:0 0 8px 0;color:#06b6d4;">Javify Verification</h2>
      <p style="color:#cbd5e1;line-height:1.6;">Use the code below to verify your email. It expires in 5 minutes.</p>
      <div style="margin:24px 0;padding:18px;text-align:center;background:#0f172a;border-radius:12px;font-size:28px;letter-spacing:8px;font-weight:700;color:#22d3ee;">${code}</div>
      <p style="font-size:12px;color:#64748b;">If you didn't request this, ignore this email.</p>
    </div>
  `;
  if (!t) {
    logger.info(`[email-fallback] OTP for ${toEmail}: ${code}`);
    return;
  }
  await t.sendMail({
    from: env.SMTP_FROM,
    to: toEmail,
    subject,
    html,
  });
}
