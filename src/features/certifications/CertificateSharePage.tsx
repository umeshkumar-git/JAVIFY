/**
 * Public Certificate Share/Verify Page
 * Accessible at /certificate/share/:certId and /certificate/verify/:certId
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import { useJavifyStore } from "../../store/useJavifyStore";
import { recordActivity } from "../../services/analytics";
import { getTrackById, type EarnedCertificate, type CertState } from "./certifications.data";
import { getQRCodeDataUrl, trackCertificateView } from "./certificateUtils";

const STORAGE_KEY = "javify-certifications";

function loadCerts(): EarnedCertificate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const state = JSON.parse(raw) as CertState;
    return state.earnedCertificates ?? [];
  } catch { return []; }
}

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-panel rounded-[28px] border border-white/10", className)}>{children}</div>;
}

export default function CertificateSharePage() {
  const { certId } = useParams<{ certId: string }>();
  const username = useJavifyStore(s => s.username);
  const [cert, setCert] = useState<EarnedCertificate | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    const all = loadCerts();
    const found = all.find(c => c.certificateId === certId);
    if (found) {
      setCert(found);
      trackCertificateView();
      recordActivity(username, "certificate_viewed", `Viewed certificate ${found.certificateId}`);
      setQrDataUrl(getQRCodeDataUrl(found.verificationUrl));
    } else {
      setNotFound(true);
    }
  }, [certId, username]);

  const track = cert ? getTrackById(cert.trackId) : undefined;
  const issueDate = cert ? new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  // Not found state
  if (notFound) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md">
          <GlassPanel className="border-rose-400/30 p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-white">Certificate Not Found</h2>
            <p className="text-sm text-slate-400 mt-3">
              The certificate ID <span className="font-mono text-slate-200 bg-white/5 px-2 py-0.5 rounded">{certId}</span> does not match any issued certificate.
            </p>
            <p className="text-xs text-slate-500 mt-2">It may have been revoked or the link is incorrect.</p>
            <Link to="/certifications" className="mt-6 inline-block btn-3d px-6 py-2 text-sm">Browse Certifications</Link>
          </GlassPanel>
        </motion.div>
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-5 w-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
          Loading certificate…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="w-full max-w-lg"
      >
        <GlassPanel className="overflow-hidden">
          {/* Certificate header banner */}
          <div className={cn("bg-gradient-to-r p-6 text-center", track?.color ?? "from-amber-500 to-yellow-600")}>
            <div className="text-5xl mb-3">🎓</div>
            <h1 className="text-xl font-black text-white uppercase tracking-widest">Javify Certificate</h1>
            <p className="text-white/80 text-xs uppercase tracking-widest mt-1">of Completion</p>
          </div>

          {/* Certificate body */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* Awarded To */}
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">Awarded To</p>
              <h2 className="text-2xl font-bold text-white mt-1">{cert.userName}</h2>
            </div>

            {/* Certificate Title */}
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">Certificate</p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/15 to-yellow-500/15 border border-amber-400/25 px-4 py-2">
                <span className="text-xl">{track?.icon ?? "🎓"}</span>
                <span className="text-sm font-bold text-amber-200">{cert.title}</span>
              </div>
            </div>

            {/* Skills */}
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-2">Skills Validated</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {cert.skills.map(s => (
                  <span key={s} className="rounded-full bg-emerald-500/15 border border-emerald-400/25 px-3 py-1 text-xs text-emerald-300">✓ {s}</span>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Score</div>
                <div className="text-lg font-bold text-emerald-300 mt-0.5">{cert.score}%</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Issued</div>
                <div className="text-sm font-medium text-white mt-0.5">{issueDate}</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Status</div>
                <div className="text-sm font-bold text-emerald-300 mt-0.5">✓ Valid</div>
              </div>
            </div>

            {/* Certificate ID */}
            <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">Certificate ID</div>
              <div className="text-sm font-mono text-cyan-300 mt-0.5">{cert.certificateId}</div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="rounded-xl border border-white/10 bg-white p-3">
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="QR Code" className="w-20 h-20" />
                )}
                <p className="text-[8px] text-slate-400 text-center mt-1 uppercase tracking-wider">Scan to Verify</p>
              </div>
            </div>

            {/* Verification badge */}
            <div className="inline-flex items-center justify-center gap-2 w-full rounded-full bg-emerald-500/15 border border-emerald-400/25 px-4 py-2 text-sm text-emerald-300">
              <span>✅</span>
              <span className="font-semibold">This certificate is verified and authentic</span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Link to="/certifications" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 hover:bg-white/10 transition">
                Browse Certifications
              </Link>
              <button
                type="button"
                onClick={() => {
                  const text = `${cert.userName} earned ${cert.title} on Javify. Verify: ${cert.verificationUrl}`;
                  navigator.clipboard.writeText(text);
                }}
                className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-300 hover:bg-cyan-500/15 transition"
              >
                🔗 Copy Link
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = `I just earned ${cert.title} on Javify 🎓\n\nSkills: ${cert.skills.join(", ")}\n\nVerify: ${cert.verificationUrl}`;
                  navigator.clipboard.writeText(text);
                }}
                className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300 hover:bg-amber-500/15 transition"
              >
                📋 Copy Share Text
              </button>
            </div>

            <div className="border-t border-white/5 pt-4 text-[10px] text-slate-600 text-center">
              Javify Platform · javify.dev · Digitally Verified Certificate
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
