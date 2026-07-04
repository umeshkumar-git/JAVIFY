import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../utils/cn";
import { useJavifyStore } from "../../store/useJavifyStore";
import { recordActivity } from "../../services/analytics";
import {
  CERT_TRACKS, DEFAULT_CERT_STATE, generateCertificateId, generateVerificationUrl, generateShareUrl,
  getTrackById, buildLinkedInShareUrl, buildTwitterShareUrl, generateCertificateTextFile,
  buildGitHubReadmeUpdate, buildShareMessage,
  type AssessmentAttempt, type CertState, type CertTrack, type EarnedCertificate,
} from "./certifications.data";
import {
  downloadCertificatePNG, downloadCertificatePDF, trackShare, trackDownload,
} from "./certificateUtils";
import CertificateActions from "./CertificateActions";

const STORAGE_KEY = "javify-certifications";

function loadState(): CertState {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...DEFAULT_CERT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_CERT_STATE }; }
  catch { return { ...DEFAULT_CERT_STATE }; }
}
function saveState(s: CertState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-panel rounded-[28px] border border-white/10", className)}>{children}</div>;
}

type Section = "tracks" | "assessment" | "earned" | "verify";

export default function CertificationsPage() {
  const username = useJavifyStore(s => s.username);
  const xp = useJavifyStore(s => s.xp);
  const streak = useJavifyStore(s => s.streak);
  const completedChallengeIds = useJavifyStore(s => s.completedChallengeIds);

  const [state, setState] = useState<CertState>(loadState);
  const [section, setSection] = useState<Section>("tracks");
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [assessmentAnswers, setAssessmentAnswers] = useState<(number | null)[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [assessmentScore, setAssessmentScore] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [successModalCert, setSuccessModalCert] = useState<EarnedCertificate | null>(null);

  useEffect(() => { saveState(state); }, [state]);

  const activeTrack = activeTrackId ? getTrackById(activeTrackId) : null;

  const checkEligibility = (track: CertTrack) => {
    const results: { met: boolean; label: string }[] = [];
    for (const req of track.requirements) {
      if (req.type === "challenges") results.push({ met: completedChallengeIds.length >= req.target, label: req.label });
      else if (req.type === "xp") results.push({ met: xp >= req.target, label: req.label });
      else if (req.type === "streak") results.push({ met: streak >= req.target, label: req.label });
      else if (req.type === "minigames") results.push({ met: true, label: req.label });
    }
    if (track.prerequisiteTrackId) {
      const hasPre = state.earnedCertificates.some(c => c.trackId === track.prerequisiteTrackId);
      results.push({ met: hasPre, label: `Earn ${getTrackById(track.prerequisiteTrackId!)?.title ?? "prerequisite"} first` });
    }
    return results;
  };

  const isEligible = (track: CertTrack) => checkEligibility(track).every(r => r.met);
  const isEarned = (trackId: string) => state.earnedCertificates.some(c => c.trackId === trackId);

  const startAssessment = (trackId: string) => {
    const track = getTrackById(trackId);
    if (!track) return;
    setActiveTrackId(trackId);
    setAssessmentAnswers(new Array(track.assessmentQuestions.length).fill(null));
    setCurrentQ(0);
    setAssessmentComplete(false);
    setAssessmentScore(0);
    setSection("assessment");
  };

  const submitAssessment = () => {
    if (!activeTrack) return;
    let score = 0;
    let maxScore = 0;
    activeTrack.assessmentQuestions.forEach((q, i) => {
      maxScore += q.points;
      if (assessmentAnswers[i] === q.correctIndex) score += q.points;
    });
    const pct = Math.round((score / maxScore) * 100);
    setAssessmentScore(pct);
    setAssessmentComplete(true);

    const attempt: AssessmentAttempt = {
      trackId: activeTrack.id,
      answers: assessmentAnswers.map(a => a ?? -1),
      score: pct,
      passed: pct >= activeTrack.minScore,
      attemptedAt: Date.now(),
    };
    setState(prev => ({ ...prev, assessmentAttempts: [...prev.assessmentAttempts, attempt] }));

    if (pct >= activeTrack.minScore && !isEarned(activeTrack.id)) {
      const certId = generateCertificateId();
      const cert: EarnedCertificate = {
        id: crypto.randomUUID(),
        trackId: activeTrack.id,
        userId: username,
        userName: username,
        title: activeTrack.title,
        skills: activeTrack.skills,
        score: pct,
        issuedAt: Date.now(),
        certificateId: certId,
        verificationUrl: generateVerificationUrl(certId),
        shareUrl: generateShareUrl(certId),
        shareCount: 0,
      };
      setState(prev => ({ ...prev, earnedCertificates: [...prev.earnedCertificates, cert] }));
      useJavifyStore.setState(s => ({ xp: s.xp + activeTrack.xpReward, coins: s.coins + 100 }));
      recordActivity(username, "certification_earned", `Earned ${activeTrack.title} with ${pct}% score`);
      setSuccessModalCert(cert);
    }
  };

  const downloadCertificate = (cert: EarnedCertificate) => {
    const content = generateCertificateTextFile(cert);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${cert.certificateId}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    recordActivity(username, "certificate_downloaded", `Downloaded ${cert.title}`);
  };

  const incrementShareCount = (certId: string) => {
    setState(prev => ({
      ...prev,
      earnedCertificates: prev.earnedCertificates.map(c =>
        c.id === certId ? { ...c, shareCount: (c.shareCount ?? 0) + 1 } : c
      ),
    }));
  };

  const handleShare = (cert: EarnedCertificate, platform: "linkedin" | "twitter" | "github" | "copy-link" | "copy-id" | "copy-message") => {
    incrementShareCount(cert.id);
    trackShare(platform === "linkedin" ? "linkedin" : platform === "twitter" ? "twitter" : platform === "github" ? "github" : "copy");
    recordActivity(username, "certificate_shared", `Shared ${cert.title} via ${platform}`);
    switch (platform) {
      case "linkedin":
        window.open(buildLinkedInShareUrl(cert), "_blank");
        break;
      case "twitter":
        window.open(buildTwitterShareUrl(cert), "_blank");
        break;
      case "github": {
        const readmeText = buildGitHubReadmeUpdate(cert);
        navigator.clipboard.writeText(readmeText).then(() => {
          setToast("GitHub README text copied! Paste it into your Javify-Learning-Progress README.md");
          setTimeout(() => setToast(null), 5000);
        });
        break;
      }
      case "copy-link":
        navigator.clipboard.writeText(cert.shareUrl).then(() => { setToast("Share link copied!"); setTimeout(() => setToast(null), 2500); });
        break;
      case "copy-id":
        navigator.clipboard.writeText(cert.certificateId).then(() => { setToast(`Certificate ID ${cert.certificateId} copied!`); setTimeout(() => setToast(null), 2500); });
        break;
      case "copy-message":
        navigator.clipboard.writeText(buildShareMessage(cert)).then(() => { setToast("Share message copied to clipboard!"); setTimeout(() => setToast(null), 2500); });
        break;
    }
  };

  const handleDownloadPNG = (cert: EarnedCertificate) => {
    const track = getTrackById(cert.trackId);
    downloadCertificatePNG(cert, track);
    trackDownload("png");
    recordActivity(username, "certificate_downloaded_png", `Downloaded PNG: ${cert.title}`);
    setToast("PNG certificate downloaded!");
    setTimeout(() => setToast(null), 2500);
  };

  const handleDownloadPDF = (cert: EarnedCertificate) => {
    const track = getTrackById(cert.trackId);
    downloadCertificatePDF(cert, track);
    trackDownload("pdf");
    recordActivity(username, "certificate_downloaded_pdf", `Downloaded PDF: ${cert.title}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 text-2xl shadow-lg">🎓</div>
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-400">Skill Validation</p>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Certifications</h1>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["tracks", "earned", "verify"] as Section[]).map(s => (
            <button key={s} type="button" onClick={() => { setSection(s); setActiveTrackId(null); }}
              className={cn("rounded-xl px-4 py-2 text-xs font-medium transition capitalize", section === s ? "bg-white/12 text-white" : "text-slate-400 hover:text-white hover:bg-white/5")}
            >
              {s === "tracks" ? "Learning Paths" : s === "earned" ? "My Certificates" : "Verify"}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-5 py-3 text-sm text-emerald-200 text-center"
          >{toast}</motion.div>
        )}
      </AnimatePresence>

      {/* ── TRACKS ─────────────────────────────────────────────────────────────── */}
      {section === "tracks" && (
        <div className="space-y-4">
          {CERT_TRACKS.map((track) => {
            const earned = isEarned(track.id);
            const eligible = isEligible(track);
            const reqs = checkEligibility(track);
            const metCount = reqs.filter(r => r.met).length;
            return (
              <GlassPanel key={track.id} className={cn("p-5 sm:p-6", earned && "border-emerald-400/30")}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shrink-0 bg-gradient-to-br shadow-lg", track.color)}>{track.icon}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-white">{track.title}</h3>
                        {earned && <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">✓ EARNED</span>}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{track.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {track.skills.map(s => <span key={s} className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-slate-300">{s}</span>)}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right sm:min-w-[140px]">
                    <div className="text-xs text-slate-500 mb-2">Requirements: {metCount}/{reqs.length}</div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
                      <div className={cn("h-full rounded-full bg-gradient-to-r", track.color)} style={{ width: `${(metCount / reqs.length) * 100}%` }} />
                    </div>
                    {earned ? (
                      <button type="button" onClick={() => setSection("earned")}
                        className="rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-4 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 transition">
                        View Certificate
                      </button>
                    ) : eligible ? (
                      <button type="button" onClick={() => startAssessment(track.id)}
                        className="rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:opacity-90 transition">
                        Take Assessment
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">Complete requirements first</span>
                    )}
                  </div>
                </div>
                {/* Requirements checklist */}
                <div className="mt-4 grid gap-2 sm:grid-cols-2 border-t border-white/5 pt-4">
                  {reqs.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={cn("flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold", r.met ? "bg-emerald-500/30 text-emerald-300" : "bg-white/10 text-slate-500")}>
                        {r.met ? "✓" : "○"}
                      </span>
                      <span className={cn(r.met ? "text-slate-300" : "text-slate-500")}>{r.label}</span>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}

      {/* ── ASSESSMENT ─────────────────────────────────────────────────────────── */}
      {section === "assessment" && activeTrack && !assessmentComplete && (
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-violet-300 uppercase tracking-widest">{activeTrack.title}</p>
              <h2 className="text-lg font-bold text-white">Assessment — Question {currentQ + 1}/{activeTrack.assessmentQuestions.length}</h2>
            </div>
            <div className="text-sm text-slate-400">Min score: {activeTrack.minScore}%</div>
          </div>

          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-6">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all" style={{ width: `${((currentQ + 1) / activeTrack.assessmentQuestions.length) * 100}%` }} />
          </div>

          {(() => {
            const q = activeTrack.assessmentQuestions[currentQ];
            const answered = assessmentAnswers[currentQ] !== null;
            const isCorrect = assessmentAnswers[currentQ] === q.correctIndex;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-violet-500/15 border border-violet-500/20 px-2 py-0.5 text-violet-300">{q.topic}</span>
                  <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5">{q.type.toUpperCase()}</span>
                  <span className="ml-auto text-cyan-300">{q.points} pts</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-white font-medium leading-relaxed">{q.question}</p>
                  {q.code && <pre className="mt-3 rounded-xl bg-[#0b1020]/80 p-3 font-mono text-xs text-cyan-200 overflow-x-auto">{q.code}</pre>}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, i) => (
                    <button key={i} type="button" disabled={answered}
                      onClick={() => { const next = [...assessmentAnswers]; next[currentQ] = i; setAssessmentAnswers(next); }}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm transition-all",
                        answered && i === q.correctIndex ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200" :
                        answered && i === assessmentAnswers[currentQ] ? "border-rose-400/50 bg-rose-500/20 text-rose-200" :
                        answered ? "border-white/5 bg-white/[0.02] text-slate-500 cursor-default" :
                        assessmentAnswers[currentQ] === i ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200" :
                        "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 cursor-pointer"
                      )}
                    >
                      <span className="text-xs text-slate-500 mr-2">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </button>
                  ))}
                </div>

                {answered && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={cn("rounded-xl border p-4 text-sm", isCorrect ? "border-emerald-400/30 bg-emerald-500/10" : "border-rose-400/30 bg-rose-500/10")}
                  >
                    <div className="font-bold text-white mb-1">{isCorrect ? "✅ Correct!" : "❌ Incorrect"}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{q.explanation}</p>
                  </motion.div>
                )}

                <div className="flex justify-end gap-3">
                  {answered && currentQ < activeTrack.assessmentQuestions.length - 1 && (
                    <button type="button" onClick={() => setCurrentQ(i => i + 1)} className="btn-3d btn-3d-cyan px-5 py-2 text-xs">Next Question →</button>
                  )}
                  {answered && currentQ === activeTrack.assessmentQuestions.length - 1 && (
                    <button type="button" onClick={submitAssessment} className="btn-3d px-6 py-2 text-sm">Submit Assessment</button>
                  )}
                </div>
              </div>
            );
          })()}
        </GlassPanel>
      )}

      {/* ── ASSESSMENT RESULT ──────────────────────────────────────────────────── */}
      {section === "assessment" && assessmentComplete && activeTrack && (
        <GlassPanel className="p-6 sm:p-8 text-center">
          <div className="text-5xl mb-3">{assessmentScore >= activeTrack.minScore ? "🎓" : "📚"}</div>
          <h2 className="text-2xl font-bold text-white">{assessmentScore >= activeTrack.minScore ? "Certification Earned!" : "Not Yet Certified"}</h2>
          <div className="mt-3 text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">{assessmentScore}%</div>
          <p className="text-sm text-slate-400 mt-2">
            {assessmentScore >= activeTrack.minScore
              ? `Congratulations! You passed the ${activeTrack.title}. +${activeTrack.xpReward} XP awarded.`
              : `You need ${activeTrack.minScore}% to pass. Review the material and try again.`}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => { setSection("tracks"); setActiveTrackId(null); }} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm text-slate-300 hover:bg-white/10 transition">Back to Tracks</button>
            {assessmentScore >= activeTrack.minScore && (
              <button type="button" onClick={() => setSection("earned")}
                className="btn-3d px-5 py-2 text-sm">View Certificate</button>
            )}
            {assessmentScore < activeTrack.minScore && (
              <button type="button" onClick={() => startAssessment(activeTrack.id)} className="btn-3d btn-3d-cyan px-5 py-2 text-sm">Retry Assessment</button>
            )}
          </div>
        </GlassPanel>
      )}

      {/* ── EARNED CERTIFICATES ────────────────────────────────────────────────── */}
      {section === "earned" && (
        <div className="space-y-4">
          {state.earnedCertificates.length === 0 ? (
            <GlassPanel className="p-8 text-center">
              <div className="text-4xl mb-3">📜</div>
              <h3 className="text-lg font-bold text-white">No Certificates Yet</h3>
              <p className="text-sm text-slate-400 mt-2">Complete a learning path and pass the assessment to earn your first certificate.</p>
              <button type="button" onClick={() => setSection("tracks")} className="mt-4 btn-3d px-5 py-2 text-sm">Browse Learning Paths</button>
            </GlassPanel>
          ) : (
            state.earnedCertificates.map(cert => {
              const track = getTrackById(cert.trackId);
              return (
                <GlassPanel key={cert.id} className="border-amber-400/20 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shrink-0 bg-gradient-to-br shadow-lg", track?.color ?? "from-amber-500 to-yellow-600")}>{track?.icon ?? "🎓"}</div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{cert.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-slate-400">Score: <span className="text-emerald-300 font-semibold">{cert.score}%</span></span>
                          <span className="text-xs text-slate-500">·</span>
                          <span className="text-xs text-slate-400">{new Date(cert.issuedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">ID: {cert.certificateId}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cert.skills.map(s => <span key={s} className="rounded-full bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 text-[10px] text-amber-300">✓ {s}</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {/* Unified Download + Share toolbar — handles loading, errors,
                          PNG/PDF, WhatsApp, Email, LinkedIn, Twitter, copy link, and
                          native device share. */}
                      <CertificateActions
                        cert={cert}
                        track={track}
                        onNotice={(message: string) => {
                          setToast(message);
                          window.setTimeout(() => setToast(null), 2500);
                          // Increment share count when the user takes an action.
                          if (message.toLowerCase().includes("shar") || message.toLowerCase().includes("copied")) {
                            incrementShareCount(cert.id);
                          }
                        }}
                      />
                      {(cert.shareCount ?? 0) > 0 && (
                        <div className="text-[10px] text-slate-500">Shared {cert.shareCount} time{cert.shareCount === 1 ? "" : "s"}</div>
                      )}
                    </div>
                  </div>
                </GlassPanel>
              );
            })
          )}
        </div>
      )}

      {/* ── VERIFY ─────────────────────────────────────────────────────────────── */}
      {section === "verify" && <VerificationCenter certificates={state.earnedCertificates} />}

      {/* ── SUCCESS MODAL — shown immediately after earning a certificate ────── */}
      <AnimatePresence>
        {successModalCert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSuccessModalCert(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-md rounded-3xl border border-amber-400/30 bg-[#0d1630] p-6 sm:p-8 shadow-[0_32px_100px_rgba(0,0,0,0.6)] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.15, stiffness: 200 }}
                  className="text-6xl mb-3"
                >🎉</motion.div>
                <h2 className="text-2xl font-black text-white">Congratulations!</h2>
                <p className="text-sm text-slate-300 mt-2">You earned:</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/30 px-4 py-2">
                  <span className="text-xl">{getTrackById(successModalCert.trackId)?.icon ?? "🎓"}</span>
                  <span className="text-sm font-bold text-amber-200">{successModalCert.title}</span>
                </div>
                <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                  <span className="text-cyan-300">+{getTrackById(successModalCert.trackId)?.xpReward ?? 0} XP</span>
                  <span className="text-amber-300">+100 coins</span>
                  <span className="text-emerald-300">{successModalCert.score}%</span>
                </div>
                <div className="mt-2 text-[10px] font-mono text-slate-500">ID: {successModalCert.certificateId}</div>
              </div>

              {/* Skills */}
              <div className="mt-5 flex flex-wrap justify-center gap-1">
                {successModalCert.skills.map(s => <span key={s} className="rounded-full bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 text-[10px] text-amber-300">✓ {s}</span>)}
              </div>

              {/* Download buttons */}
              <div className="mt-6 space-y-2">
                <p className="text-xs text-slate-400 text-center uppercase tracking-widest mb-3">Download Certificate</p>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => { downloadCertificate(successModalCert); setToast("TXT certificate downloaded!"); setTimeout(() => setToast(null), 2500); }} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/10 transition text-center">
                    <div className="text-lg mb-1">📄</div>TXT
                  </button>
                  <button type="button" onClick={() => { handleDownloadPNG(successModalCert); }} className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300 hover:bg-emerald-500/15 transition text-center">
                    <div className="text-lg mb-1">🖼️</div>PNG
                  </button>
                  <button type="button" onClick={() => { handleDownloadPDF(successModalCert); }} className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300 hover:bg-rose-500/15 transition text-center">
                    <div className="text-lg mb-1">📑</div>PDF
                  </button>
                </div>
              </div>

              {/* Share buttons */}
              <div className="mt-5 space-y-2">
                <p className="text-xs text-slate-400 text-center uppercase tracking-widest mb-3">Share Achievement</p>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => handleShare(successModalCert, "linkedin")} className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-2.5 text-xs text-blue-300 hover:bg-blue-500/15 transition text-center">
                    <div className="text-lg mb-1">in</div>LinkedIn
                  </button>
                  <button type="button" onClick={() => handleShare(successModalCert, "twitter")} className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2.5 text-xs text-sky-300 hover:bg-sky-500/15 transition text-center">
                    <div className="text-lg mb-1">𝕏</div>Twitter
                  </button>
                  <button type="button" onClick={() => handleShare(successModalCert, "github")} className="rounded-xl border border-slate-400/20 bg-slate-500/10 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-500/15 transition text-center">
                    <div className="text-lg mb-1">🐙</div>GitHub
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => handleShare(successModalCert, "copy-link")} className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2.5 text-xs text-cyan-300 hover:bg-cyan-500/15 transition">🔗 Copy Link</button>
                  <button type="button" onClick={() => handleShare(successModalCert, "copy-message")} className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300 hover:bg-amber-500/15 transition">📋 Copy Text</button>
                </div>
              </div>

              {/* Continue button */}
              <button type="button" onClick={() => { setSuccessModalCert(null); setSection("earned"); }}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 py-3 text-sm font-bold text-white hover:opacity-90 transition">View Certificate →</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VerificationCenter({ certificates }: { certificates: EarnedCertificate[] }) {
  const [searchId, setSearchId] = useState("");
  const [result, setResult] = useState<EarnedCertificate | "not-found" | null>(null);

  const handleVerify = () => {
    const found = certificates.find(c => c.certificateId.toLowerCase() === searchId.trim().toLowerCase());
    setResult(found ?? "not-found");
  };

  return (
    <div className="space-y-5">
      <GlassPanel className="p-6">
        <h3 className="text-lg font-bold text-white mb-1">Certificate Verification</h3>
        <p className="text-xs text-slate-400 mb-4">Enter a certificate ID to verify its authenticity.</p>
        <div className="flex gap-2">
          <input value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="JVF-2026-12345" autoComplete="off"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-400/40" />
          <button type="button" onClick={handleVerify} disabled={!searchId.trim()} className="btn-3d px-5 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed">Verify</button>
        </div>
      </GlassPanel>

      <AnimatePresence>
        {result === "not-found" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlassPanel className="border-rose-400/30 bg-rose-500/10 p-5 text-center">
              <div className="text-3xl mb-2">❌</div>
              <div className="text-white font-bold">Certificate Not Found</div>
              <p className="text-xs text-slate-400 mt-1">The ID you entered does not match any issued certificate.</p>
            </GlassPanel>
          </motion.div>
        )}
        {result && result !== "not-found" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlassPanel className="border-emerald-400/30 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">✅</div>
                <div>
                  <div className="text-white font-bold">Certificate Verified</div>
                  <div className="text-xs text-emerald-300">This certificate is authentic and valid.</div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest">Holder</div>
                  <div className="text-white font-medium mt-1">{result.userName}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest">Certificate</div>
                  <div className="text-white font-medium mt-1">{result.title}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest">Score</div>
                  <div className="text-emerald-300 font-bold mt-1">{result.score}%</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest">Issued</div>
                  <div className="text-white font-medium mt-1">{new Date(result.issuedAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {result.skills.map(s => <span key={s} className="rounded-full bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 text-[10px] text-emerald-300">✓ {s}</span>)}
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
