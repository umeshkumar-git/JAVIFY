/**
 * Certificate Share & Download API
 *
 * Endpoints:
 *   POST   /api/certificates/:id/share        — Generate a secure public share URL
 *   GET    /api/certificates/share/:token     — Resolve a public share token (no auth)
 *   GET    /api/certificates/:id/download     — Authenticated owner download (PDF)
 *   PATCH  /api/certificates/:id/visibility   — Toggle public/private
 *
 * Security:
 *   - Tokens are signed JWTs with cert ID + visibility flag (no PII)
 *   - Tokens expire after 90 days and can be revoked
 *   - Only the certificate OWNER can mint share tokens or change visibility
 *   - Public resolution returns only safe, displayable fields
 *   - Authenticated download requires JWT + ownership match
 */
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../utils/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";

const router = Router();

const SHARE_TOKEN_TTL = "90d";

/* ─────────────────────────────────────────────────────────────────────── */
/*  POST /api/certificates/:id/share — mint a public share token          */
/* ─────────────────────────────────────────────────────────────────────── */
router.post("/:id/share", requireAuth, async (req, res, next) => {
  try {
    const cert = await prisma.certificate.findUnique({ where: { id: req.params.id } });
    if (!cert) return res.status(404).json({ error: "Certificate not found." });

    // Authorization — only owner can share
    if (cert.userId !== req.user.sub) {
      return res.status(403).json({ error: "You do not own this certificate." });
    }

    // Status must be VALID — refuse REVOKED or EXPIRED certificates
    if (cert.status !== "VALID") {
      return res.status(409).json({ error: `Certificate is ${cert.status.toLowerCase()} and cannot be shared.` });
    }

    // Toggle on visibility so it can be publicly resolved
    if (!cert.isPublic) {
      await prisma.certificate.update({
        where: { id: cert.id },
        data: { isPublic: true },
      });
    }

    const token = jwt.sign(
      { certId: cert.id, certificateId: cert.certificateId, kind: "share" },
      env.JWT_SECRET,
      { expiresIn: SHARE_TOKEN_TTL }
    );

    const shareUrl = `${env.FRONTEND_URL ?? ""}/#/certificate/share/${cert.certificateId}?t=${token}`;
    logger.info("Certificate share token minted", { certId: cert.id, owner: req.user.sub });

    res.json({ shareUrl, token, expiresIn: SHARE_TOKEN_TTL });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────────────────────────────── */
/*  GET /api/certificates/share/:token — resolve public share (no auth)   */
/* ─────────────────────────────────────────────────────────────────────── */
router.get("/share/:token", async (req, res, next) => {
  try {
    let payload;
    try {
      payload = jwt.verify(req.params.token, env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired share link." });
    }
    if (payload.kind !== "share" || !payload.certId) {
      return res.status(400).json({ error: "Malformed share token." });
    }

    const cert = await prisma.certificate.findUnique({
      where: { id: payload.certId },
      include: { user: { select: { name: true, avatar: true } } },
    });

    if (!cert) return res.status(404).json({ error: "Certificate not found." });
    if (cert.status !== "VALID") return res.status(410).json({ error: "Certificate is no longer valid." });
    if (!cert.isPublic) return res.status(403).json({ error: "This certificate is private." });

    // Only return safe public fields — never expose internal fields, scores, etc.
    res.json({
      certificateId: cert.certificateId,
      title: cert.title,
      skills: cert.skills,
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate,
      status: cert.status,
      qrCode: cert.qrCode,
      verificationUrl: cert.verificationUrl,
      user: { name: cert.user.name, avatar: cert.user.avatar },
    });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────────────────────────────── */
/*  PATCH /api/certificates/:id/visibility — owner toggles public/private  */
/* ─────────────────────────────────────────────────────────────────────── */
router.patch(
  "/:id/visibility",
  requireAuth,
  validate(z.object({ isPublic: z.boolean() })),
  async (req, res, next) => {
    try {
      const cert = await prisma.certificate.findUnique({ where: { id: req.params.id } });
      if (!cert) return res.status(404).json({ error: "Certificate not found." });
      if (cert.userId !== req.user.sub) {
        return res.status(403).json({ error: "You do not own this certificate." });
      }

      const updated = await prisma.certificate.update({
        where: { id: cert.id },
        data: { isPublic: req.body.isPublic },
      });
      res.json({ id: updated.id, isPublic: updated.isPublic });
    } catch (err) {
      next(err);
    }
  }
);

/* ─────────────────────────────────────────────────────────────────────── */
/*  GET /api/certificates/:id/download — authenticated owner PDF download */
/* ─────────────────────────────────────────────────────────────────────── */
router.get("/:id/download", requireAuth, async (req, res, next) => {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { name: true } } },
    });
    if (!cert) return res.status(404).json({ error: "Certificate not found." });
    if (cert.userId !== req.user.sub) {
      return res.status(403).json({ error: "You do not own this certificate." });
    }
    if (cert.status !== "VALID") {
      return res.status(409).json({ error: `Certificate is ${cert.status.toLowerCase()}.` });
    }

    // The frontend renders the actual PDF via canvas + print-to-PDF.
    // This endpoint returns the certificate payload that the client uses to
    // construct the file locally, with the meaningful filename.
    const sanitize = (input) => String(input ?? "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const filename = `Certificate_${sanitize(cert.user.name)}_${sanitize(cert.title)}.pdf`;

    res.json({
      filename,
      certificateId: cert.certificateId,
      title: cert.title,
      skills: cert.skills,
      issueDate: cert.issueDate,
      score: cert.score,
      qrCode: cert.qrCode,
      verificationUrl: cert.verificationUrl,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
