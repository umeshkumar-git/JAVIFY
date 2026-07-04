/**
 * CertificateActions — Reusable Download + Share toolbar for a certificate.
 *
 * Features:
 *  - Download as PNG (high-res canvas) and PDF (print dialog)
 *  - Share via WhatsApp, Email, LinkedIn, Twitter/X, native Web Share API
 *  - Copy public certificate link
 *  - Loading states and graceful error handling
 *  - Authorization guard: only valid/shareable certificates render actions
 *  - Responsive, accessible, with hover/active states
 *
 * Architecture:
 *  This component is purely presentational + side-effect-driven. It calls
 *  the existing `certificateUtils` and `certifications.data` helpers, and
 *  reports outcomes via the `onNotice` callback so the parent can show
 *  toasts in its own design language.
 */
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../utils/cn";
import {
  buildEmailShareUrl,
  buildLinkedInShareUrl,
  buildShareMessage,
  buildTwitterShareUrl,
  buildWhatsAppShareUrl,
  isCertificateShareable,
  type EarnedCertificate,
  type CertTrack,
} from "./certifications.data";
import {
  downloadCertificatePDF,
  downloadCertificatePNG,
  trackDownload,
  trackShare,
} from "./certificateUtils";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Icons (inline SVG for crisp rendering + theming via currentColor)        */
/* ────────────────────────────────────────────────────────────────────────── */

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("h-4 w-4 fill-current", className)} aria-hidden>
    <path d="M5 20h14v-2H5v2zm7-18v12.17l3.59-3.58L17 12l-5 5-5-5 1.41-1.41L11 14.17V2h2z" />
  </svg>
);

const ShareIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("h-4 w-4 fill-current", className)} aria-hidden>
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M20.5 3.5A11.78 11.78 0 0 0 12.07 0C5.5 0 .15 5.34.15 11.92a11.84 11.84 0 0 0 1.6 5.94L0 24l6.3-1.65a11.92 11.92 0 0 0 5.77 1.47h.01c6.57 0 11.92-5.34 11.92-11.92 0-3.18-1.24-6.18-3.5-8.4zM12.07 21.8a9.86 9.86 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.83 9.83 0 0 1-1.51-5.26c0-5.46 4.45-9.91 9.92-9.91 2.65 0 5.14 1.04 7.01 2.92a9.84 9.84 0 0 1 2.9 7c0 5.47-4.45 9.92-9.92 9.92zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01a1.1 1.1 0 0 0-.8.37c-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.86-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.86 3.37-1.86 3.6 0 4.27 2.37 4.27 5.46v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);

/* ────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export interface CertificateActionsProps {
  cert: EarnedCertificate;
  track: CertTrack | undefined;
  /** Optional callback so parent can render toasts in its own UI language. */
  onNotice?: (message: string, kind: "success" | "error" | "info") => void;
  /** "full" = labels + icons, "compact" = icons only with tooltips. */
  variant?: "full" | "compact";
  className?: string;
}

type ActionState = "idle" | "loading" | "success" | "error";

export default function CertificateActions({
  cert,
  track,
  onNotice,
  variant = "full",
  className,
}: CertificateActionsProps) {
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [downloadState, setDownloadState] = useState<ActionState>("idle");
  const [shareState, setShareState] = useState<ActionState>("idle");

  /** Authorization guard — refuse to render actions for invalid certificates. */
  const shareable = isCertificateShareable(cert);

  /** Web Share API is only available in secure contexts on certain browsers. */
  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const notify = useCallback(
    (message: string, kind: "success" | "error" | "info") => {
      onNotice?.(message, kind);
    },
    [onNotice]
  );

  /* ─── DOWNLOAD ────────────────────────────────────────────────────────── */

  const handleDownload = useCallback(
    async (format: "png" | "pdf") => {
      if (!shareable) {
        notify("This certificate cannot be downloaded.", "error");
        return;
      }
      setDownloadState("loading");
      try {
        if (format === "png") downloadCertificatePNG(cert, track);
        else downloadCertificatePDF(cert, track);
        trackDownload(format);
        setDownloadState("success");
        notify(`${format.toUpperCase()} certificate downloaded successfully.`, "success");
      } catch (error) {
        setDownloadState("error");
        const msg = error instanceof Error ? error.message : "Download failed. Please try again.";
        notify(msg, "error");
      } finally {
        window.setTimeout(() => setDownloadState("idle"), 1800);
      }
    },
    [cert, track, shareable, notify]
  );

  /* ─── SHARE ───────────────────────────────────────────────────────────── */

  type Channel = "native" | "copy" | "whatsapp" | "email" | "linkedin" | "twitter";

  const handleShare = useCallback(
    async (channel: Channel) => {
      if (!shareable) {
        notify("This certificate is not authorized for sharing.", "error");
        return;
      }
      setShareState("loading");
      try {
        switch (channel) {
          case "native": {
            if (!hasNativeShare) throw new Error("Native sharing is not supported on this device.");
            await navigator.share({
              title: `${cert.title} — Javify Certificate`,
              text: buildShareMessage(cert),
              url: cert.shareUrl,
            });
            trackShare("copy");
            notify("Shared successfully via your device.", "success");
            break;
          }
          case "copy": {
            await navigator.clipboard.writeText(cert.shareUrl);
            trackShare("copy");
            notify("Certificate link copied to clipboard.", "success");
            break;
          }
          case "whatsapp": {
            window.open(buildWhatsAppShareUrl(cert), "_blank", "noopener,noreferrer");
            trackShare("copy");
            notify("Opening WhatsApp…", "info");
            break;
          }
          case "email": {
            window.location.href = buildEmailShareUrl(cert);
            trackShare("copy");
            notify("Opening your email app…", "info");
            break;
          }
          case "linkedin": {
            window.open(buildLinkedInShareUrl(cert), "_blank", "noopener,noreferrer");
            trackShare("linkedin");
            notify("Opening LinkedIn share dialog…", "info");
            break;
          }
          case "twitter": {
            window.open(buildTwitterShareUrl(cert), "_blank", "noopener,noreferrer");
            trackShare("twitter");
            notify("Opening Twitter/X compose…", "info");
            break;
          }
        }
        setShareState("success");
        setShareMenuOpen(false);
      } catch (error) {
        // User dismissing the native share sheet throws an AbortError — treat as silent.
        if (error instanceof Error && error.name === "AbortError") {
          setShareState("idle");
          return;
        }
        setShareState("error");
        notify(error instanceof Error ? error.message : "Could not share certificate.", "error");
      } finally {
        window.setTimeout(() => setShareState("idle"), 1800);
      }
    },
    [cert, hasNativeShare, shareable, notify]
  );

  /* ─── Close share menu when clicking outside ──────────────────────────── */

  useEffect(() => {
    if (!shareMenuOpen) return;
    const handler = () => setShareMenuOpen(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [shareMenuOpen]);

  if (!shareable) {
    return (
      <div className={cn("text-xs text-amber-300", className)}>
        ⚠️ This certificate is not available for sharing or download.
      </div>
    );
  }

  const isCompact = variant === "compact";

  /* ─── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* ── Download dropdown — PNG + PDF ───────────────────────────── */}
      <div className="relative">
        <DownloadGroup
          isCompact={isCompact}
          state={downloadState}
          onPNG={() => handleDownload("png")}
          onPDF={() => handleDownload("pdf")}
        />
      </div>

      {/* ── Share dropdown ──────────────────────────────────────────── */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setShareMenuOpen((open) => !open)}
          disabled={shareState === "loading"}
          aria-expanded={shareMenuOpen}
          aria-haspopup="menu"
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
            "border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400/50",
            isCompact ? "h-9 w-9 justify-center" : "px-3 py-2 text-xs font-semibold"
          )}
          title="Share certificate"
        >
          {shareState === "loading" ? <Spinner /> : <ShareIcon />}
          {!isCompact && <span>Share</span>}
        </button>

        <AnimatePresence>
          {shareMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              role="menu"
              className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020]/95 p-1 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            >
              {hasNativeShare && (
                <ShareMenuItem
                  icon={<ShareIcon />}
                  label="Share via device…"
                  hint="Native"
                  onClick={() => handleShare("native")}
                  accent="text-cyan-300"
                />
              )}
              <ShareMenuItem
                icon={<LinkIcon />}
                label="Copy certificate link"
                onClick={() => handleShare("copy")}
                accent="text-cyan-300"
              />
              <div className="my-1 h-px bg-white/5" />
              <ShareMenuItem
                icon={<WhatsAppIcon />}
                label="WhatsApp"
                onClick={() => handleShare("whatsapp")}
                accent="text-emerald-300"
              />
              <ShareMenuItem
                icon={<MailIcon />}
                label="Email"
                onClick={() => handleShare("email")}
                accent="text-amber-300"
              />
              <ShareMenuItem
                icon={<LinkedInIcon />}
                label="LinkedIn"
                onClick={() => handleShare("linkedin")}
                accent="text-blue-300"
              />
              <ShareMenuItem
                icon={<span className="text-xs font-bold">𝕏</span>}
                label="Twitter / X"
                onClick={() => handleShare("twitter")}
                accent="text-sky-300"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function DownloadGroup({
  isCompact, state, onPNG, onPDF,
}: { isCompact: boolean; state: ActionState; onPNG: () => void; onPDF: () => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 transition-colors hover:border-emerald-400/50">
      <button
        type="button"
        onClick={onPNG}
        disabled={state === "loading"}
        title="Download as PNG"
        className={cn(
          "inline-flex items-center gap-2 hover:bg-emerald-500/15 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed",
          isCompact ? "h-9 w-9 justify-center" : "px-3 py-2 text-xs font-semibold"
        )}
      >
        {state === "loading" ? <Spinner /> : <DownloadIcon />}
        {!isCompact && <span>PNG</span>}
      </button>
      <div className="w-px bg-emerald-400/30" />
      <button
        type="button"
        onClick={onPDF}
        disabled={state === "loading"}
        title="Download as PDF"
        className={cn(
          "inline-flex items-center gap-2 hover:bg-emerald-500/15 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed",
          isCompact ? "h-9 w-9 justify-center" : "px-3 py-2 text-xs font-semibold"
        )}
      >
        {state === "loading" ? <Spinner /> : <DownloadIcon />}
        {!isCompact && <span>PDF</span>}
      </button>
    </div>
  );
}

function ShareMenuItem({
  icon, label, hint, onClick, accent = "text-slate-200",
}: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void; accent?: string }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
        "hover:bg-white/8 active:bg-white/12 focus:outline-none focus-visible:bg-white/8",
        accent
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">{icon}</span>
      <span className="flex-1 text-slate-100">{label}</span>
      {hint && <span className="text-[10px] uppercase tracking-widest text-slate-500">{hint}</span>}
    </button>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-label="Loading"
    />
  );
}
