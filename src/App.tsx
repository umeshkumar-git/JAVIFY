import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import javifyLogoPng from "./assets/javify-logo.png";
import {
  HashRouter as Router,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  apiEndpoints,
  architectureBlocks,
  challenges,
  databaseTables,
  deploymentStack,
  getChallengeById,
  getNextChallengeId,
  getWorldById,
  leaderboard,
  platformHighlights,
  securityRules,
  testimonials,
  worlds,
} from "./data/javify";
import { cn } from "./utils/cn";
import { getCompletionPercentage, getXpToNextLevel, useJavifyStore } from "./store/useJavifyStore";
import { getCompilerStatusLabel, runJavaWithCompiler } from "./services/javaRunner";
import { recordVisit, recordActivity, getAnalytics } from "./services/analytics";
import {
  clearOtpSession,
  getTimeRemaining,
  resendEmailOtp,
  sendEmailOtp,
  verifyEmailOtp,
} from "./services/emailOtp";
import AdminPanel from "./pages/AdminPanel";
import UserPanel from "./pages/UserPanel";
import MultiplayerBattles from "./features/multiplayer/MultiplayerBattles";
import Leaderboard from "./features/leaderboard/Leaderboard";
import LearningInsights from "./features/recommendations/LearningInsights";
import AiMentorPanel from "./features/aiMentor/AiMentorPanel";
import { getGitHubState, pushChallengeProgress } from "./features/github/github.service";
import MiniGamesArena from "./features/miniGames/MiniGamesArena";
import CertificationsPage from "./features/certifications/CertificationsPage";
import CertificateSharePage from "./features/certifications/CertificateSharePage";
import StreamingHubPage from "./pages/StreamingHubPage";
import { AudioPlayerBar } from "./features/player/AudioPlayerBar";
import { ListenTogetherModal } from "./features/player/ListenTogetherModal";

const navigation = [
  { label: "Home", to: "/" },
  { label: "🎵 Stream & Sync", to: "/stream" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "World Map", to: "/map" },
  { label: "🎮 Arena", to: "/arena" },
  { label: "🎓 Certs", to: "/certifications" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Battles", to: "/battles" },
  { label: "Insights", to: "/insights" },
  { label: "Profile", to: "/user" },
];

type ThemeMode = "dark" | "light";

const ThemeContext = createContext<{
  theme: ThemeMode;
  toggleTheme: () => void;
}>({
  theme: "dark",
  toggleTheme: () => undefined,
});

function useTheme() {
  return useContext(ThemeContext);
}

function mockFetch<T>(payload: T, delay = 320) {
  return new Promise<T>((resolve) => {
    window.setTimeout(() => resolve(payload), delay);
  });
}

function getPlayerTitle(level: number) {
  if (level >= 12) return "Grandmaster Lambda";
  if (level >= 9) return "Thread Paladin";
  if (level >= 6) return "OOP Vanguard";
  if (level >= 3) return "Byte Ranger";
  return "Java Apprentice";
}

function getAchievements(completedChallengeIds: string[], runCount: number, failedRuns: number) {
  return [
    {
      title: "First Compilation",
      description: "Run code for the first time inside the coding arena.",
      unlocked: runCount > 0,
      accent: "from-cyan-400 to-blue-500",
    },
    {
      title: "Loop Master",
      description: "Clear the Loop Dungeon by solving Counting Runes.",
      unlocked: completedChallengeIds.includes("counting-runes"),
      accent: "from-emerald-400 to-cyan-500",
    },
    {
      title: "OOP Warrior",
      description: "Defeat the constructor boss in OOP City.",
      unlocked: completedChallengeIds.includes("hero-blueprint"),
      accent: "from-amber-400 to-orange-500",
    },
    {
      title: "Bug Hunter",
      description: "Persist through debugging pressure with three failed runs or Exception Valley completion.",
      unlocked: failedRuns >= 3 || completedChallengeIds.includes("recovery-shield"),
      accent: "from-rose-400 to-pink-500",
    },
    {
      title: "Java Grandmaster",
      description: "Complete every world and stand atop the Advanced Temple.",
      unlocked: completedChallengeIds.length === challenges.length,
      accent: "from-fuchsia-400 to-violet-500",
    },
  ];
}

function isWorldUnlocked(worldIndex: number, completedChallengeIds: string[]) {
  if (worldIndex === 0) return true;
  const previousWorld = worlds[worldIndex - 1];
  return previousWorld.challengeIds.every((id) => completedChallengeIds.includes(id));
}

/* ═══════════════════════════════════════════════
   3D Tilt Hook — tracks mouse and writes CSS vars
   for hardware-accelerated rotateX/rotateY transforms.
   ═══════════════════════════════════════════════ */
function useTilt3D(maxTilt = 8) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const tiltY = (x - 0.5) * (maxTilt * 2);
      const tiltX = (0.5 - y) * (maxTilt * 2);
      node.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
      node.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
      node.style.setProperty("--mouse-x", `${(x * 100).toFixed(0)}%`);
      node.style.setProperty("--mouse-y", `${(y * 100).toFixed(0)}%`);
    },
    [maxTilt]
  );

  const handleLeave = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  }, []);

  return { ref, onMouseMove: handleMove, onMouseLeave: handleLeave };
}

function GlassPanel({
  children,
  className,
  tilt = false,
  glow = true,
}: {
  children: ReactNode;
  className?: string;
  tilt?: boolean;
  glow?: boolean;
}) {
  const tiltProps = useTilt3D(tilt ? 6 : 0);

  if (!tilt) {
    return (
      <div className={cn("glass-panel rounded-[28px] border border-white/10", className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={tiltProps.ref}
      onMouseMove={tiltProps.onMouseMove}
      onMouseLeave={tiltProps.onMouseLeave}
      className={cn("glass-panel card-3d relative rounded-[28px] border border-white/10", className)}
    >
      {glow ? <div className="card-3d-shine" aria-hidden /> : null}
      <div className="card-3d-content">{children}</div>
    </div>
  );
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      className={cn(
        // Use flexbox for proper layout - no absolute positioning
        "group inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all duration-300 hover:border-white/20 active:scale-95 shrink-0",
        // Compact: icon-only square button | Full: pill button with text
        compact ? "h-10 w-10 p-1" : "h-10 px-3 py-1 gap-2"
      )}
    >
      {/* Icon - fixed size, centered, no sliding animation */}
      <div className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 shadow-lg shrink-0",
        isLight ? "bg-amber-400" : "bg-indigo-600"
      )}>
        <span className="text-sm leading-none">{isLight ? "☀️" : "🌙"}</span>
      </div>
      {/* Label - only in non-compact mode, uses gap for spacing */}
      {!compact && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
          {isLight ? "Light" : "Dark"}
        </span>
      )}
    </button>
  );
}

function BrandMark({ size = "md", animated = false }: { size?: "sm" | "md" | "lg"; animated?: boolean }) {
  return (
    <div
      className={cn(
        "relative shrink-0",
        size === "sm" && "h-10 w-10",
        size === "md" && "h-11 w-11",
        size === "lg" && "h-16 w-16 sm:h-20 sm:w-20"
      )}
      style={{ perspective: "600px" }}
    >
      {/* Glow halo */}
      <div
        aria-hidden
        className={cn(
          "absolute -inset-2 rounded-3xl bg-linear-to-br from-fuchsia-500/40 via-violet-500/30 to-cyan-500/40 blur-xl",
          animated && "animate-pulse"
        )}
      />
      <img
        src={javifyLogoPng}
        alt="Javify logo"
        className={cn(
          "relative h-full w-full object-cover ring-1 ring-white/20",
          size === "lg" ? "rounded-3xl sm:rounded-[28px]" : "rounded-2xl",
          animated ? "logo-3d" : "logo-3d-static"
        )}
      />
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.02c-3.2.7-3.87-1.38-3.87-1.38-.52-1.34-1.28-1.7-1.28-1.7-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18A10.9 10.9 0 0 1 12 6.15c.98 0 1.96.13 2.88.39 2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.42-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.16c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

type AssistantMessage = {
  role: "mentor" | "player";
  text: string;
  ts: number;
};

function buildMentorReply(message: string, challengeId?: string): string {
  const ch = challengeId ? getChallengeById(challengeId) : undefined;
  const n = message.toLowerCase();

  // Challenge-specific intelligence
  if (ch) {
    if (n.includes("hint") || n.includes("stuck") || n.includes("help"))
      return `Hint for "${ch.title}": ${ch.hint}\n\nTry solving one objective at a time, then run your code before submitting.`;
    if (n.includes("output") || n.includes("wrong") || n.includes("fix"))
      return `The expected output for "${ch.title}" is exactly:\n\n${ch.expectedOutput}\n\nMake sure your System.out.println matches this character-for-character, including capitalization and spacing.`;
    if (n.includes("concept") || n.includes("explain") || n.includes("what"))
      return `"${ch.title}" belongs to the topic "${getWorldById(ch.worldId)?.topic ?? "Java"}". ${ch.description}\n\nFocus on understanding why each objective exists before writing code.`;
    if (n.includes("test") || n.includes("hidden"))
      return `Hidden tests for "${ch.title}":\n${ch.hiddenTests.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}\n\nMake sure your solution satisfies all of these.`;
  }

  // General Java topics
  if (n.includes("variable") || n.includes("data type") || n.includes("int"))
    return "Java variables store data. Common types:\n• int — whole numbers (int x = 5;)\n• double — decimals (double pi = 3.14;)\n• String — text (String s = \"hello\";)\n• boolean — true/false\n\nAlways declare the type before the name.";
  if (n.includes("if") || n.includes("else") || n.includes("condition"))
    return "Java conditions use if/else:\n\nif (score >= 50) {\n    System.out.println(\"Pass\");\n} else {\n    System.out.println(\"Fail\");\n}\n\nThe condition inside () must be a boolean expression.";
  if (n.includes("loop") || n.includes("for") || n.includes("while"))
    return "Java loops repeat code:\n\nfor (int i = 1; i <= 5; i++) {\n    System.out.println(i);\n}\n\nThree parts: start value, stop condition, update step. The body runs each iteration.";
  if (n.includes("method") || n.includes("function") || n.includes("return"))
    return "Java methods are reusable blocks:\n\nstatic int add(int a, int b) {\n    return a + b;\n}\n\nCall it from main: System.out.println(add(3, 4));\nMethods reduce duplication and improve readability.";
  if (n.includes("array") || n.includes("list") || n.includes("index"))
    return "Java arrays hold multiple values:\n\nint[] nums = {4, 6, 8};\nfor (int n : nums) {\n    sum += n;\n}\n\nArrays are zero-indexed: nums[0] is 4.";
  if (n.includes("class") || n.includes("object") || n.includes("oop"))
    return "OOP in Java:\n\nclass Hero {\n    String name;\n    Hero(String name) { this.name = name; }\n    void intro() { System.out.println(\"Hero: \" + name); }\n}\n\nCreate an object: Hero h = new Hero(\"Ada\");\nCall: h.intro();";
  if (n.includes("exception") || n.includes("try") || n.includes("catch"))
    return "Exception handling:\n\ntry {\n    int r = 10 / 0;\n} catch (ArithmeticException e) {\n    System.out.println(\"Error caught\");\n}\n\nThe catch block prevents crashes from risky operations.";
  if (n.includes("thread") || n.includes("concurrent"))
    return "Java threads run tasks in parallel:\n\nThread t = new Thread(() -> {\n    System.out.println(\"Running\");\n});\nt.start();\n\nUse start() — never run() directly.";
  if (n.includes("stream") || n.includes("filter") || n.includes("collection"))
    return "Java Streams process collections:\n\nList<Integer> nums = List.of(1,2,3,4,5,6);\nnums.stream()\n    .filter(n -> n % 2 == 0)\n    .forEach(System.out::println);\n\nThis prints 2, 4, 6. Streams are powerful for data pipelines.";

  // Debug & learning guidance
  if (n.includes("error") || n.includes("compile") || n.includes("debug"))
    return "Debugging steps:\n1. Read the FIRST error message — fix that one first\n2. Check: class name is Main, main method signature is correct\n3. Verify semicolons, braces, and spelling\n4. Run after every small change\n5. Compare your output with the expected output character by character";
  if (n.includes("road") || n.includes("path") || n.includes("learn") || n.includes("start"))
    return "Recommended Java learning path:\n\n1. Variables & Data Types\n2. If/Else Conditions\n3. Loops (for, while)\n4. Methods & Return\n5. Arrays\n6. Classes & Objects\n7. Exception Handling\n8. Multithreading\n9. Collections & Streams\n\nComplete each Javify world in order for the best experience.";

  if (ch)
    return `You're working on "${ch.title}". ${ch.mission}\n\nTry writing a minimal solution first, run it, then improve. Ask me for a hint, concept explanation, or debugging help.`;

  return "Hello! I'm the Javify AI Assistant. I can help you with:\n\n• Java concept explanations\n• Challenge hints & debugging\n• Learning path recommendations\n• Code structure guidance\n\nJust ask a question or tap one of the quick actions below.";
}

function AiAssistantDock() {
  const location = useLocation();
  const username = useJavifyStore((s) => s.username);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const challengeId = location.pathname.startsWith("/challenge/") ? location.pathname.split("/challenge/")[1] : undefined;
  const activeChallenge = challengeId ? getChallengeById(challengeId) : undefined;

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "mentor",
      text: activeChallenge
        ? `Hello ${username}. I’m your AI assistant for ${activeChallenge.title}. I can help with hints, concepts, debugging, and expected output.`
        : `Hello ${username}. I’m your Javify AI assistant. Ask me anything about Java, your learning path, or how to solve a challenge.`,
      ts: Date.now(),
    },
  ]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [messages, isTyping, open]);

  const quickPrompts = activeChallenge
    ? ["Give me a hint", "Explain the concept", "Expected output", "How do I debug this?"]
    : ["How do I start Java?", "Learning roadmap", "Explain variables", "Explain loops"];

  const resetChat = () => {
    setMessages([
      {
        role: "mentor",
        text: activeChallenge
          ? `Chat reset. I’m ready to help you with ${activeChallenge.title}.`
          : "Chat reset. Ask me anything about Java or your current mission.",
        ts: Date.now(),
      },
    ]);
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setMessages((prev) => [...prev, { role: "player", text: trimmed, ts: Date.now() }]);
    setInput("");
    setIsTyping(true);
    setOpen(true);

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "mentor", text: buildMentorReply(trimmed, activeChallenge?.id), ts: Date.now() },
      ]);
      setIsTyping(false);
    }, 450 + Math.random() * 250);
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.aside
            key="assistant-panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-22 left-4 right-4 z-120 flex max-h-[min(72vh,560px)] flex-col overflow-hidden rounded-[28px] border border-white/10 shadow-[0_28px_80px_rgba(0,0,0,0.5)] sm:bottom-26 sm:left-auto sm:right-6 sm:w-[390px]"
            style={{
              background: "linear-gradient(180deg, rgba(11,16,32,0.98), rgba(15,23,42,0.98))",
              backdropFilter: "blur(18px)",
            }}
            aria-label="AI assistant chat panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-cyan-500 shadow-[0_8px_20px_rgba(34,211,238,0.22)]">
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-white" aria-hidden>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0b1020]" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">Javify AI Assistant</div>
                  <div className="truncate text-[11px] text-gray-500 dark:text-slate-400">
                    {activeChallenge ? `Current screen: ${activeChallenge.title}` : "Always visible while you scroll"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetChat}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
                  title="Clear chat"
                  aria-label="Clear chat"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm3.46-7.12 1.41-1.41L12 11.59l1.12-1.12 1.41 1.41L13.41 13l1.12 1.12-1.41 1.41L12 14.41l-1.12 1.12-1.41-1.41L10.59 13l-1.13-1.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
                  title="Close assistant"
                  aria-label="Close assistant"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M19 13H5v-2h14v2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Status / context row */}
            <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-white/2 px-4 py-2 text-[11px] sm:px-5">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className={cn("h-2 w-2 rounded-full", isTyping ? "animate-pulse bg-emerald-400" : "bg-emerald-400")} />
                <span>{isTyping ? "Assistant is replying…" : "Assistant online"}</span>
              </div>
              <div className="truncate text-slate-500">Fixed • Floating • Scroll-safe</div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar sm:px-5">
              {messages.map((msg, i) => (
                <motion.div
                  key={`${msg.role}-${msg.ts}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={cn("flex gap-2.5", msg.role === "player" ? "flex-row-reverse" : "flex-row")}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm",
                      msg.role === "mentor"
                        ? "bg-linear-to-br from-violet-600 to-cyan-500"
                        : "bg-slate-500"
                    )}
                  >
                    {msg.role === "mentor" ? "AI" : username.charAt(0).toUpperCase()}
                  </div>

                  <div className={cn("max-w-[84%] space-y-1", msg.role === "player" && "text-right")}>
                    <div
                      className={cn(
                        "rounded-2xl border px-3.5 py-3 text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm",
                        msg.role === "mentor"
                          ? "rounded-tl-md border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-slate-200"
                          : "rounded-tr-md border-violet-500/20 bg-violet-600 text-white"
                      )}
                    >
                      {msg.text}
                    </div>
                    <div className="px-1 text-[10px] text-slate-500 dark:text-slate-600">{formatTime(msg.ts)}</div>
                  </div>
                </motion.div>
              ))}

              {isTyping ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-cyan-500 text-[11px] font-bold text-white">AI</div>
                  <div className="rounded-2xl rounded-tl-md border border-white/8 bg-white/5 px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "120ms" }} />
                      <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "240ms" }} />
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </div>

            {/* Quick actions */}
            <div className="flex gap-1.5 overflow-x-auto border-t border-white/5 bg-white/2 px-3 py-2.5 custom-scrollbar sm:px-4">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-white/10 hover:text-white whitespace-nowrap"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              className="flex items-center gap-2 border-t border-white/8 px-3 py-3 sm:px-4"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about Java..."
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/40"
              />
              <button
                type="submit"
                disabled={isTyping || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {/* Floating button — always visible while scrolling */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "fixed bottom-5 right-5 z-130 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_10px_32px_rgba(124,58,237,0.45)] transition sm:bottom-8 sm:right-6",
          open
            ? "border border-white/15 bg-white/10 backdrop-blur-xl"
            : "bg-linear-to-br from-violet-600 to-cyan-500"
        )}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "chat"}
            initial={{ opacity: 0, rotate: -20, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 20, scale: 0.7 }}
            transition={{ duration: 0.16 }}
            className="relative flex items-center justify-center"
          >
            {open ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden>
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                  <path d="M7 8h10v2H7zm0 4h7v2H7z" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-50" />
                  <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-[8px] font-bold text-slate-950">AI</span>
                </span>
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  );
}

function SectionIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-3xl space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-300/90">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white md:text-4xl">{title}</h2>
      <p className="text-sm leading-7 text-gray-600 dark:text-slate-300 md:text-base">{description}</p>
    </div>
  );
}

function MetricCard({ label, value, helper, accent }: { label: string; value: string; helper: string; accent: string }) {
  return (
    <GlassPanel tilt className="relative overflow-hidden p-5">
      <div className={cn("absolute inset-x-6 top-0 h-24 rounded-full blur-3xl opacity-60", accent)} />
      <div className="relative" style={{ transformStyle: "preserve-3d" }}>
        <p className="text-xs uppercase tracking-[0.32em] text-slate-400" style={{ transform: "translateZ(20px)" }}>
          {label}
        </p>
        <div
          className="mt-3 text-3xl font-bold text-white drop-shadow-[0_4px_12px_rgba(0,217,255,0.25)]"
          style={{ transform: "translateZ(50px)" }}
        >
          {value}
        </div>
        <p className="mt-2 text-sm text-slate-300" style={{ transform: "translateZ(20px)" }}>
          {helper}
        </p>
      </div>
    </GlassPanel>
  );
}

function FloatingBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden scene-3d">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(108,99,255,0.25),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(0,217,255,0.18),transparent_30%),linear-gradient(180deg,#0b1020,#0f172a_55%,#111827)]" />
      <div className="grid-overlay absolute inset-0 opacity-30" />
      {/* Holographic 3D floor grid */}
      <div className="holo-floor" />
      {/* Depth-layered orbs (deepest → nearest) */}
      <div className="orb-deep absolute left-[5%] top-16 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div className="orb-mid absolute left-[68%] top-28 h-80 w-80 rounded-full bg-cyan-400/18 blur-3xl" />
      <div className="orb-near absolute left-[40%] top-[55%] h-64 w-64 rounded-full bg-violet-500/22 blur-3xl" />
      <div className="orb-mid absolute left-[18%] top-[70%] h-56 w-56 rounded-full bg-pink-500/15 blur-3xl" />
      {/* 3D star particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 40 }).map((_, i) => {
          const top = (i * 137) % 100;
          const left = (i * 71) % 100;
          const size = ((i * 13) % 3) + 1;
          const opacity = ((i * 7) % 5) / 10 + 0.2;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                opacity,
                boxShadow: `0 0 ${size * 3}px rgba(255,255,255,${opacity})`,
                animation: `orb-drift ${10 + (i % 8)}s ease-in-out infinite`,
                animationDelay: `${i * 0.13}s`,
              }}
            />
          );
        })}
      </div>
      <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.24),transparent_65%)]" />
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const isAuthenticated = useJavifyStore((state) => state.isAuthenticated);
  const username = useJavifyStore((state) => state.username);
  const level = useJavifyStore((state) => state.level);
  const completedChallengeIds = useJavifyStore((state) => state.completedChallengeIds);
  const logout = useJavifyStore((state) => state.logout);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const nextChallengeId = useMemo(() => getNextChallengeId(completedChallengeIds), [completedChallengeIds]);

  // Global automatic analytics — fires on every route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMobileNavOpen(false);
    recordVisit(location.pathname);
  }, [location.pathname]);

  // Login-first experience: when not authenticated, the auth screen is the entry.
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0B1020] text-white scene-3d">
        <FloatingBackground />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-10 sm:px-6 lg:px-8">
          <header className="pt-5 sm:pt-7">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3">
                <BrandMark size="sm" />
                <div>
                  <div className="text-base font-semibold tracking-[0.2em] text-white sm:text-lg">JAVIFY</div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-slate-400 sm:text-xs">Java RPG · Code Arena</div>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <ThemeToggle compact />
                <Link
                  to="/preview"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 sm:px-4 sm:py-2 sm:text-sm"
                >
                  Preview tour
                </Link>
              </div>
            </div>
          </header>

          <main className="relative flex-1 pt-6 sm:pt-10 page-3d-enter" style={{ perspective: "1800px" }}>
            <Routes>
              <Route path="/preview" element={<LandingPage nextChallengeId={nextChallengeId} />} />
              <Route path="*" element={<AuthPage />} />
            </Routes>
          </main>
        </div>
        <AiAssistantDock />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1020] text-white scene-3d">
      <FloatingBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-3 pb-12 sm:px-6 lg:px-8">
        <header className="sticky top-3 z-30 pt-3 sm:top-4 sm:pt-4">
          <GlassPanel className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6">
            <Link to="/" className="flex items-center gap-2 sm:gap-3">
              <BrandMark size="sm" />
              <div>
                <div className="text-base font-semibold tracking-[0.18em] text-white sm:text-lg">JAVIFY</div>
                <div className="hidden text-xs uppercase tracking-[0.28em] text-slate-400 sm:block">Java RPG Learning Platform</div>
              </div>
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-full px-3 py-2 text-sm transition lg:px-4",
                      isActive 
                        ? "bg-black/10 dark:bg-white/12 text-gray-900 dark:text-white shadow-[0_0_25px_rgba(0,217,255,0.12)]" 
                        : "text-gray-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-white"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <Link
                to={`/challenge/${nextChallengeId}`}
                className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200 transition hover:border-cyan-200/50 hover:bg-cyan-300/15 lg:px-4"
              >
                Arena
              </Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 xl:flex xl:items-center xl:gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-semibold text-white">
                  {username.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  {username}
                  <span className="ml-2 text-cyan-300">Lv. {level}</span>
                </span>
              </div>

              <ThemeToggle compact />

              <button
                type="button"
                onClick={logout}
                className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 sm:inline-flex"
              >
                Logout
              </button>

              <button
                type="button"
                onClick={() => setMobileNavOpen((open) => !open)}
                aria-label="Toggle navigation"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  {mobileNavOpen ? (
                    <>
                      <path d="M6 6l12 12" />
                      <path d="M6 18L18 6" />
                    </>
                  ) : (
                    <>
                      <path d="M4 7h16" />
                      <path d="M4 12h16" />
                      <path d="M4 17h16" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </GlassPanel>

          {mobileNavOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="md:hidden"
            >
              <GlassPanel className="mt-3 space-y-2 p-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6C63FF,#00D9FF)] text-sm font-bold text-white">
                    {username.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-white">{username}</div>
                    <div className="text-xs text-cyan-300">Level {level} • {getPlayerTitle(level)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                  <span className="text-sm text-slate-200">Color theme</span>
                  <ThemeToggle />
                </div>
                {navigation.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-2xl px-4 py-3 text-sm transition",
                        isActive ? "bg-white/12 text-white" : "text-slate-200 hover:bg-white/8"
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
                <Link
                  to={`/challenge/${nextChallengeId}`}
                  className="block rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200"
                >
                  Coding Arena →
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/10"
                >
                  Logout
                </button>
              </GlassPanel>
            </motion.div>
          ) : null}
        </header>

        <main className="relative flex-1 pt-6 sm:pt-8" style={{ perspective: "1800px" }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 30, rotateX: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 0.8, 0.2, 1] }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/preview" element={<LandingPage nextChallengeId={nextChallengeId} />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/map" element={<WorldMapPage />} />
              <Route path="/challenge/:challengeId" element={<ChallengePage />} />
              <Route path="/architecture" element={<ArchitecturePage />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/user" element={<UserPanel />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/battles" element={<MultiplayerBattles />} />
              <Route path="/insights" element={<LearningInsights />} />
              <Route path="/arena" element={<MiniGamesArena />} />
              <Route path="/certifications" element={<CertificationsPage />} />
              <Route path="/certificate/share/:certId" element={<CertificateSharePage />} />
              <Route path="/certificate/verify/:certId" element={<CertificateSharePage />} />
              <Route path="/stream" element={<StreamingHubPage />} />
              <Route path="*" element={<DashboardPage />} />
            </Routes>
          </motion.div>
        </main>
      </div>
      <AiAssistantDock />
      <AudioPlayerBar />
      <ListenTogetherModal />
    </div>
  );
}

function LandingPage({ nextChallengeId }: { nextChallengeId: string | undefined }) {
  const isAuthenticated = useJavifyStore((state) => state.isAuthenticated);
  const xp = useJavifyStore((state) => state.xp);
  const level = useJavifyStore((state) => state.level);
  const completedChallengeIds = useJavifyStore((state) => state.completedChallengeIds);

  const analyticsQuery = useQuery({
    queryKey: ["public-analytics"],
    queryFn: () => mockFetch(getAnalytics(), 200),
    refetchInterval: 5000,
  });

  useEffect(() => {
    // visit tracked globally by AppLayout
  }, []);

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard-preview"],
    queryFn: () => mockFetch(leaderboard, 280),
  });

  const testimonialsQuery = useQuery({
    queryKey: ["testimonials"],
    queryFn: () => mockFetch(testimonials, 360),
  });

  return (
    <div className="space-y-12 pb-8 md:space-y-20">
      <section className="grid items-center gap-8 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-10">
        <div className="space-y-8">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] text-fuchsia-200 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.34em]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-300" />
            New Season Live • EdTech × RPG × Secure Code Arena
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div className="flex items-center gap-4">
               <BrandMark size="lg" />
               <div className="h-10 w-px bg-white/10 hidden sm:block" />
                <div className="hidden sm:block">
                  <div className="text-xl font-bold tracking-[0.2em] text-gray-900 dark:text-white">JAVIFY</div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Next-Gen Education</div>
                </div>
             </div>
             <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1]">
               Level up your <span className="neon-text italic">Java Mastery</span>.
             </h1>
             <p className="max-w-2xl text-base leading-8 text-gray-600 dark:text-slate-400 sm:text-lg sm:leading-9 md:text-xl">
               Step into a futuristic RPG universe where every coding challenge is a mission, every world is a new concept, and every compilation brings you closer to Grandmaster status.
             </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              to={isAuthenticated ? "/dashboard" : "/auth"}
              className="btn-3d inline-flex items-center gap-2 text-sm sm:text-base"
            >
              {isAuthenticated ? "Open Command Dashboard" : "Start Your Adventure"}
              <span aria-hidden>→</span>
            </Link>
            <Link
              to={`/challenge/${nextChallengeId ?? challenges[0].id}`}
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10"
            >
              Explore Coding Arena
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Active Rank" value={getPlayerTitle(level)} helper={`Level ${level} operative`} accent="bg-cyan-400/20" />
            <MetricCard label="Current XP" value={xp.toString()} helper="Earn more by clearing worlds" accent="bg-violet-500/20" />
            <MetricCard
              label="Mission Completion"
              value={`${completedChallengeIds.length}/${challenges.length}`}
              helper="Campaign progress tracked in real time"
              accent="bg-fuchsia-500/20"
            />
          </div>
        </div>

        <GlassPanel className="relative overflow-hidden p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.16),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(0,217,255,0.16),transparent_40%)]" />
          <div className="relative space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-cyan-300">Mission Control</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Future-proof learning dashboard</h3>
              </div>
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-200">
                Live MVP Demo
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Worlds", value: "9", helper: "From Variables to Streams" },
                { label: "Boss Encounters", value: "9", helper: "Capstone-style challenge gates" },
                { label: "Execution Mode", value: "Docker", helper: "Secure sandbox architecture" },
                { label: "Frontend Stack", value: "React + TS", helper: "Animated game UI" },
              ].map((card, index) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * index + 0.12 }}
                  className="rounded-3xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{card.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
                  <p className="mt-2 text-sm text-slate-300">{card.helper}</p>
                </motion.div>
              ))}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0c142b]/70 p-4">
              <div className="mb-4 flex items-center justify-between text-sm text-slate-300">
                <span>Progression Flow</span>
                <span className="text-cyan-300">Java Apprentice → Grandmaster</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {worlds.map((world, index) => (
                  <div key={world.id} className="flex items-center gap-2">
                    <div className="min-w-28 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm text-slate-200">
                      <div className="text-lg">{world.icon}</div>
                      <div className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">World {index + 1}</div>
                      <div className="mt-1">{world.name}</div>
                    </div>
                    {index < worlds.length - 1 ? <div className="h-px w-8 bg-linear-to-r from-cyan-400/60 to-fuchsia-500/60" /> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassPanel>
      </section>

      <section className="space-y-8">
        <SectionIntro
          eyebrow="Real-Time Platform Data"
          title="Global operative activity and visitor telemetry"
          description="Javify is an active universe. Track live visitor counts, current user engagement, and total platform traffic in real time."
        />
        <div className="grid gap-6 sm:grid-cols-3">
          <MetricCard
            label="Total Visitors"
            value={analyticsQuery.data?.totalPageViews?.toString() ?? "..."}
            helper="Cumulative platform views"
            accent="bg-cyan-500/30"
          />
          <MetricCard
            label="Visitor Count"
            value={analyticsQuery.data?.uniqueVisitors?.toString() ?? "..."}
            helper="Unique operatives discovered"
            accent="bg-violet-500/30"
          />
          <MetricCard
            label="User Visiting Count"
            value={analyticsQuery.data?.activeNow?.toString() ?? "..."}
            helper="Operatives exploring now"
            accent="bg-emerald-500/30"
          />
        </div>
      </section>

      <section className="space-y-8">
        <SectionIntro
          eyebrow="Why Javify Hits Different"
          title="A learning loop so addictive you'll forget you're studying Java"
          description="Javify fuses real coding practice with RPG momentum: XP, streaks, boss battles, and unlockable worlds keep you returning every day until mastery."
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {platformHighlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.08 }}
            >
              <GlassPanel tilt className="h-full p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg text-cyan-200">
                  {index === 0 ? "🎮" : index === 1 ? "💻" : index === 2 ? "🏆" : "🛡️"}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionIntro
          eyebrow="Major-Level Project Scope"
          title="Built like a serious platform, not a simple classroom demo"
          description="Javify now presents the full product layer expected from an advanced software project: secure auth, AI guidance, game progression, code execution design, analytics, and deployment planning."
        />
        <GlassPanel className="relative overflow-hidden p-5 sm:p-7 md:p-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(108,99,255,0.16),rgba(0,217,255,0.08),rgba(255,77,157,0.12))]" />
          <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Secure Identity", value: "JWT + OAuth", copy: "Email, Google, and GitHub-ready login flows." },
              { label: "AI Mentor", value: "Context Help", copy: "Guided hints, debugging help, and learning roadmaps." },
              { label: "Execution Engine", value: "Docker", copy: "Sandbox strategy with CPU, memory, and network isolation." },
              { label: "Game Economy", value: "XP + Coins", copy: "World unlocks, achievements, streaks, and boss rewards." },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{item.label}</p>
                <div className="mt-3 text-2xl font-semibold text-white">{item.value}</div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.copy}</p>
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>

      <section className="space-y-8">
        <SectionIntro
          eyebrow="Game Worlds"
          title="Travel through Java concepts as worlds, stages, and boss encounters"
          description="Each environment is mapped to a core Java topic. The visual system turns abstract programming concepts into memorable progression milestones."
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {worlds.map((world, index) => (
            <GlassPanel key={world.id} tilt className="relative overflow-hidden p-6">
              <div className={cn("absolute inset-0 bg-linear-to-br opacity-60", world.gradient)} />
              <div className="relative" style={{ transformStyle: "preserve-3d" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-4xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]" style={{ transform: "translateZ(45px)" }}>{world.icon}</div>
                    <h3 className="mt-4 text-xl font-semibold text-white" style={{ transform: "translateZ(30px)" }}>{world.name}</h3>
                    <p className="mt-2 text-sm text-cyan-200" style={{ transform: "translateZ(20px)" }}>{world.topic}</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.24em] text-slate-200" style={{ transform: "translateZ(25px)" }}>
                    W-{index + 1}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">{world.summary}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {world.stages.map((stage) => (
                    <span key={stage} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                      {stage}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between text-sm text-slate-300">
                  <span>Boss: {world.boss}</span>
                  <Link to={`/challenge/${world.challengeIds[0]}`} className="text-cyan-300 transition hover:text-cyan-200">
                    Inspect mission →
                  </Link>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassPanel className="p-6 md:p-8">
          <SectionIntro
            eyebrow="Leaderboard"
            title="Competitive progression keeps learners engaged"
            description="Weekly rankings, streaks, and titles amplify motivation without sacrificing educational structure."
          />
          <div className="mt-8 space-y-4">
            {(leaderboardQuery.data ?? leaderboard).map((entry) => (
              <div
                key={entry.rank}
                className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-white">
                    {entry.rank}
                  </div>
                  <div>
                    <div className="text-base font-medium text-white">{entry.name}</div>
                    <div className="text-sm text-slate-400">{entry.title}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right text-sm text-slate-300">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">XP</div>
                    <div className="mt-1 text-white">{entry.xp}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Level</div>
                    <div className="mt-1 text-white">{entry.level}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Streak</div>
                    <div className="mt-1 text-cyan-300">{entry.streak}d</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-6 md:p-8">
          <SectionIntro
            eyebrow="Testimonials"
            title="Designed to feel rewarding, not repetitive"
            description="Players stay inside the loop because the UI celebrates progress, failure recovery, and every solved challenge."
          />
          <div className="mt-8 space-y-4">
            {(testimonialsQuery.data ?? testimonials).map((item) => (
              <div key={item.name} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm leading-7 text-slate-300">“{item.quote}”</p>
                <div className="mt-4">
                  <div className="font-medium text-white">{item.name}</div>
                  <div className="text-sm text-cyan-300">{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>

      <section>
        <GlassPanel className="relative overflow-hidden px-6 py-8 md:px-10 md:py-10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(108,99,255,0.18),rgba(168,85,247,0.12),rgba(0,217,255,0.12))]" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs uppercase tracking-[0.34em] text-cyan-300">Final Objective</p>
              <h2 className="text-3xl font-semibold text-white md:text-4xl">Build the ultimate Java learning game platform.</h2>
              <p className="text-sm leading-7 text-slate-300 md:text-base">
                Premium UI, gamified pedagogy, a secure execution sandbox, and a production-ready
                architecture, all wrapped into a coding adventure that turns learners into champions.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/architecture"
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                View System Design
              </Link>
              <Link
                to={isAuthenticated ? "/dashboard" : "/auth"}
                className="btn-3d btn-3d-pink inline-flex items-center gap-2 text-sm"
              >
                Launch Javify
                <span aria-hidden>🚀</span>
              </Link>
            </div>
          </div>
        </GlassPanel>
      </section>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const register = useJavifyStore((state) => state.register);
  const login = useJavifyStore((state) => state.login);
  const isAuthenticated = useJavifyStore((state) => state.isAuthenticated);
  const setVerificationPending = useJavifyStore((state) => state.setVerificationPending);
  const markEmailVerified = useJavifyStore((state) => state.markEmailVerified);
  const cancelVerification = useJavifyStore((state) => state.cancelVerification);
  const verificationEmail = useJavifyStore((state) => state.verificationEmail);
  const verificationExpiresAt = useJavifyStore((state) => state.verificationExpiresAt);

  const [mode, setMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("NeoLearner");
  const [email, setEmail] = useState("neo@javify.dev");
  const [identity, setIdentity] = useState("neo@javify.dev");
  const [password, setPassword] = useState("javify123");
  const [error, setError] = useState("");
  const [verificationStep, setVerificationStep] = useState<"form" | "code">("form");
  const [verificationDigits, setVerificationDigits] = useState(["", "", "", "", "", ""]);
  const [verificationError, setVerificationError] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [resendCooldownUntil, setResendCooldownUntil] = useState(0);
  const [debugOtpCode, setDebugOtpCode] = useState<string | undefined>(undefined);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (verificationStep !== "code") return;
    const updateRemaining = () => setTimeRemaining(getTimeRemaining(verificationExpiresAt));
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [verificationStep, verificationExpiresAt]);

  const handleRegister = async () => {
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setVerificationError("");
    setVerificationNotice("");
    setIsSendingCode(true);

    try {
      const result = await sendEmailOtp(email.trim(), username.trim());
      setVerificationPending(result.email, result.expiresAt);
      setResendCooldownUntil(result.cooldownUntil);
      setDebugOtpCode(result.debugCode);
      setVerificationStep("code");
      setVerificationDigits(["", "", "", "", "", ""]);
      setTimeRemaining(getTimeRemaining(result.expiresAt));
      setVerificationNotice(result.message);
      recordActivity(username.trim(), "otp_sent", `Verification code requested for ${result.email} via ${result.provider}`);
      window.setTimeout(() => document.getElementById("verify-digit-0")?.focus(), 80);
    } catch (otpError) {
      recordActivity(username.trim(), "otp_send_failed", otpError instanceof Error ? otpError.message : "Unknown OTP send failure");
      setError("Could not send the verification code. Please check your email configuration and try again.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleLogin = () => {
    if (!identity.trim()) {
      setError("Please enter your email or username.");
      return;
    }
    login(identity.trim());
    navigate("/dashboard");
  };

  const handleQuickStart = () => {
    register("Apprentice", "apprentice@javify.dev");
    navigate("/dashboard");
  };

  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [showGitHubPicker, setShowGitHubPicker] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");

  // Simulated browser Google accounts (in production this comes from the Google One-Tap API)
  const browserGoogleAccounts = [
    { name: "Personal Account", email: "user@gmail.com", avatar: "U", color: "from-blue-500 to-cyan-500" },
    { name: "Work Account", email: "user@company.com", avatar: "W", color: "from-emerald-500 to-teal-500" },
    { name: "Student Account", email: "user@university.edu", avatar: "S", color: "from-violet-500 to-fuchsia-500" },
  ];

  const browserGitHubAccounts = [
    { name: "Personal GitHub", username: "dev-user", avatar: "D", color: "from-slate-600 to-slate-800" },
    { name: "Org GitHub", username: "org-dev", avatar: "O", color: "from-violet-600 to-indigo-800" },
  ];

  const handleGoogleAccountSelect = (account: { name: string; email: string }) => {
    const displayName = account.email.split("@")[0];
    register(displayName, account.email);
    recordActivity(displayName, "login", `Signed in with Google (${account.email})`);
    setShowGooglePicker(false);
    navigate("/dashboard");
  };

  const handleGoogleCustomEmail = () => {
    if (!/^\S+@\S+\.\S+$/.test(customGoogleEmail)) return;
    const displayName = customGoogleEmail.split("@")[0];
    register(displayName, customGoogleEmail);
    recordActivity(displayName, "login", `Signed in with Google (${customGoogleEmail})`);
    setShowGooglePicker(false);
    navigate("/dashboard");
  };

  const handleGitHubAccountSelect = (account: { name: string; username: string }) => {
    register(account.username, `${account.username}@github.com`);
    recordActivity(account.username, "login", `Signed in with GitHub (${account.username})`);
    setShowGitHubPicker(false);
    navigate("/dashboard");
  };

  const handleVerificationDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...verificationDigits];
    newDigits[index] = value.slice(-1);
    setVerificationDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`verify-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerificationKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === "Backspace" && !verificationDigits[index] && index > 0) {
      const prevInput = document.getElementById(`verify-digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifySubmit = async () => {
    const code = verificationDigits.join("");
    if (code.length !== 6) {
      setVerificationError("Please enter the complete 6-digit code.");
      return;
    }

    setVerificationError("");
    setIsVerifyingCode(true);

    try {
      const result = await verifyEmailOtp(verificationEmail || email, code);
      if (result.ok) {
        markEmailVerified(verificationEmail || email);
        register(username.trim(), (verificationEmail || email).trim());
        recordActivity(username.trim(), "email_verified", `Verified ${(verificationEmail || email).trim()}`);
        setVerificationNotice(result.message);
        navigate("/dashboard");
        return;
      }

      setVerificationError(result.message);
      if (result.status === "expired" || result.status === "locked" || result.status === "missing") {
        setVerificationDigits(["", "", "", "", "", ""]);
      }
      document.getElementById("verify-digit-0")?.focus();
    } catch (verifyError) {
      recordActivity(username.trim(), "otp_verify_failed", verifyError instanceof Error ? verifyError.message : "Unknown OTP verification failure");
      setVerificationError("Verification failed due to a network or email service issue. Please try again.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (isSendingCode || getTimeRemaining(resendCooldownUntil) > 0) return;

    setIsSendingCode(true);
    setVerificationError("");
    setVerificationNotice("");

    try {
      const result = await resendEmailOtp(verificationEmail || email, username.trim());
      setVerificationPending(result.email, result.expiresAt);
      setResendCooldownUntil(result.cooldownUntil);
      setDebugOtpCode(result.debugCode);
      setTimeRemaining(getTimeRemaining(result.expiresAt));
      setVerificationDigits(["", "", "", "", "", ""]);
      setVerificationNotice(result.message);
      recordActivity(username.trim(), "otp_resent", `Verification code resent to ${result.email}`);
      window.setTimeout(() => document.getElementById("verify-digit-0")?.focus(), 80);
    } catch (resendError) {
      recordActivity(username.trim(), "otp_resend_failed", resendError instanceof Error ? resendError.message : "Unknown OTP resend failure");
      setVerificationError("Could not resend the code. Please try again in a moment.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleCancelVerification = () => {
    clearOtpSession();
    cancelVerification();
    setVerificationStep("form");
    setVerificationDigits(["", "", "", "", "", ""]);
    setVerificationError("");
    setVerificationNotice("");
    setDebugOtpCode(undefined);
    setResendCooldownUntil(0);
  };

  const secondsRemaining = Math.ceil(timeRemaining / 1000);
  const cooldownSeconds = Math.ceil(getTimeRemaining(resendCooldownUntil) / 1000);
  const expiresLabel = `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}`;

  // ── Verification Code UI ──
  if (verificationStep === "code") {
    return (
      <div className="relative flex min-h-[80vh] items-center justify-center">
        <div className="absolute inset-0 bg-linear-to-br from-violet-600/20 via-cyan-500/10 to-fuchsia-500/20 blur-3xl" />
        <GlassPanel className="relative w-full max-w-md p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-cyan-500 shadow-[0_8px_24px_rgba(139,92,246,0.4)]">
              <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                <path d="M12 10H8v2h4v-2zm6 0h-4v2h4v-2zm-9-3H8v2h1V7zm3 0h-1v2h1V7zm3 0h-1v2h1V7z" />
              </svg>
            </div>
            <h2 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Check your email</h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
              We sent a verification code to<br />
              <span className="text-cyan-600 dark:text-cyan-300 font-medium">{verificationEmail}</span>
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              Expires in {expiresLabel}
            </div>
          </div>

          <div className="mt-8">
            <label className="block text-center text-sm font-medium text-slate-400 mb-4">
              Enter the 6-digit code
            </label>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {verificationDigits.map((digit, index) => (
                <input
                  key={index}
                  id={`verify-digit-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleVerificationDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleVerificationKeyDown(index, e)}
                  disabled={isVerifyingCode || isSendingCode || secondsRemaining <= 0}
                  className="flex h-12 w-10 sm:h-14 sm:w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center text-lg font-bold text-white outline-none transition focus:border-cyan-400/40 focus:bg-white/8 sm:text-xl"
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            {verificationNotice && (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 text-center">
                {verificationNotice}
              </div>
            )}

            {secondsRemaining <= 0 && (
              <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 text-center">
                This code has expired. Please resend a new verification code.
              </div>
            )}

            {verificationError && (
              <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 text-center">
                {verificationError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleCancelVerification}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifySubmit}
                disabled={isVerifyingCode || isSendingCode || secondsRemaining <= 0}
                className="btn-3d px-8 py-2.5 text-sm"
              >
                {isVerifyingCode ? "Verifying..." : "Verify & Create Account"}
              </button>
            </div>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isSendingCode || cooldownSeconds > 0}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-cyan-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSendingCode ? "Sending..." : cooldownSeconds > 0 ? `Resend code in ${cooldownSeconds}s` : "Resend verification code"}
              </button>
            </div>

            <p className="mt-5 text-center text-xs text-slate-500">
              In production, the backend sends this code through SMTP or an email API.
              <br />
              <button
                type="button"
                onClick={() => {
                  if (debugOtpCode) {
                    setVerificationDigits(debugOtpCode.split(""));
                  }
                }}
                className="mt-2 text-cyan-400 hover:text-cyan-300 underline disabled:opacity-40"
                disabled={!debugOtpCode}
              >
                Auto-fill demo code{debugOtpCode ? ` (${debugOtpCode})` : ""}
              </button>
            </p>
          </div>
        </GlassPanel>
      </div>
    );
  }

  // ── Regular Auth Form ──

  return (
    <div className="relative grid min-h-[80vh] items-center gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
      {/* Hero login: primary on mobile, left on desktop. */}
      <GlassPanel className="relative order-1 overflow-hidden p-5 sm:p-7 md:p-9">
        <div className="pointer-events-none absolute -top-24 right-[-20%] h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[-20%] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-4 sm:gap-5">
            <BrandMark size="lg" />
            <div>
              <div className="text-xl font-bold tracking-[0.22em] text-white sm:text-2xl">JAVIFY</div>
              <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-cyan-200 sm:text-xs">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
                Player Sign-in
              </div>
            </div>
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl leading-[1.15]">
            {mode === "register" ? (
              <>
                Begin your <span className="neon-text">Java quest</span>.
              </>
            ) : (
              <>
                Welcome back, <span className="neon-text">hero</span>.
              </>
            )}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300 sm:text-base">
            {mode === "register"
              ? "Create your operative profile to unlock worlds, earn XP, and battle bosses across the Javify universe."
              : "Resume your campaign. Your XP, streak, and unlocked worlds are waiting."}
          </p>

          <div className="mt-6 flex rounded-full border border-white/10 bg-white/5 p-1 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={cn(
                "flex-1 rounded-full px-4 py-2.5 transition",
                mode === "register" ? "bg-white/12 text-white shadow-[0_0_18px_rgba(0,217,255,0.18)]" : "text-slate-400"
              )}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={cn(
                "flex-1 rounded-full px-4 py-2.5 transition",
                mode === "login" ? "bg-white/12 text-white shadow-[0_0_18px_rgba(0,217,255,0.18)]" : "text-slate-400"
              )}
            >
              Sign In
            </button>
          </div>

          <form
            className="mt-6 space-y-4"
            autoComplete="off"
            data-no-fedcm="true"
            onSubmit={(event) => {
              event.preventDefault();
              if (mode === "register") {
                handleRegister();
              } else {
                handleLogin();
              }
            }}
          >
            {mode === "register" ? (
              <>
                <label className="block space-y-2 text-sm">
                  <span className="text-slate-300">Username</span>
                  <input
                    autoComplete="off"
                    name="javify_user"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/40 focus:bg-white/8 sm:text-sm"
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="text-slate-300">Email</span>
                  <input
                    type="email"
                    autoComplete="off"
                    name="javify_email"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/40 focus:bg-white/8 sm:text-sm"
                  />
                </label>
              </>
            ) : (
              <label className="block space-y-2 text-sm">
                <span className="text-slate-300">Email or Username</span>
                <input
                  autoComplete="off"
                  name="javify_identity"
                  value={identity}
                  onChange={(event) => setIdentity(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/40 focus:bg-white/8 sm:text-sm"
                />
              </label>
            )}

            <label className="block space-y-2 text-sm">
              <span className="flex items-center justify-between text-slate-300">
                Password
                {mode === "login" ? (
                  <button type="button" className="text-xs text-cyan-300 hover:text-cyan-200">
                    Forgot?
                  </button>
                ) : null}
              </span>
              <input
                type="password"
                autoComplete="off"
                name="javify_pass"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/40 focus:bg-white/8 sm:text-sm"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={isSendingCode}
              className="btn-3d w-full text-sm sm:text-base"
            >
              {isSendingCode ? "Sending verification code..." : mode === "register" ? "🎮 Create Account & Verify Email" : "⚔️ Enter the Arena"}
            </button>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-slate-500">
              <span className="h-px flex-1 bg-white/10" />
              or continue with
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                data-provider="google"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowGooglePicker(true); }}
                className="group flex items-center justify-center gap-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
              >
                <GoogleLogo />
                <span className="group-hover:text-white transition-colors">Continue via Google</span>
              </button>
              <button
                type="button"
                data-provider="github"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowGitHubPicker(true); }}
                className="group flex items-center justify-center gap-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
              >
                <span className="text-slate-100 transition-transform group-hover:scale-110"><GitHubLogo /></span>
                <span className="group-hover:text-white transition-colors">Continue via GitHub</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleQuickStart}
              className="w-full rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15"
            >
              ⚡ Quick start as guest apprentice
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400">
            By continuing you accept the Javify Code of Conduct & secure sandbox terms.
          </p>
        </div>
      </GlassPanel>

      {/* Marketing side: hidden on small screens to keep login front-and-center. */}
      <div className="order-2 hidden flex-col gap-5 lg:flex">
        <GlassPanel className="relative overflow-hidden p-7 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_55%)]" />
          <div className="relative space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] text-fuchsia-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-300" />
              Now playing · Season 01
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Code Java like it's an <span className="neon-text">epic RPG</span>.
            </h2>
            <p className="text-sm leading-7 text-slate-300">
              Travel 9 immersive worlds, defeat boss-level challenges, and rise from Java Apprentice to
              Grandmaster Lambda inside a Monaco-powered coding arena.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { v: "9", l: "Worlds" },
                { v: "40+", l: "Missions" },
                { v: "∞", l: "Replays" },
              ].map((stat) => (
                <div key={stat.l} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center">
                  <div className="text-2xl font-semibold text-white">{stat.v}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-slate-400">{stat.l}</div>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">Player rewards</div>
          <div className="mt-4 space-y-3">
            {[
              { icon: "⚔️", title: "Earn XP & coins", copy: "Every solved mission boosts your level and unlocks gear." },
              { icon: "🏆", title: "Defeat world bosses", copy: "Capstone challenges cap each topic with a victory moment." },
              { icon: "🔥", title: "Daily streaks", copy: "Show up daily to keep your fire burning and rank rising." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg">{item.icon}</div>
                <div>
                  <div className="text-sm font-medium text-white">{item.title}</div>
                  <p className="text-xs leading-6 text-slate-300">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* Mobile perks: compact strip below form on small screens. */}
      <div className="order-3 grid grid-cols-3 gap-2 lg:hidden">
        {[
          { v: "9", l: "Worlds" },
          { v: "40+", l: "Missions" },
          { v: "🔥", l: "Streaks" },
        ].map((stat) => (
          <div key={stat.l} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center">
            <div className="text-xl font-semibold text-white">{stat.v}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-slate-400">{stat.l}</div>
          </div>
        ))}
      </div>

      {/* ═══ Google Account Picker Modal ═══ */}
      {showGooglePicker && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d1630] p-0 shadow-[0_32px_100px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div className="flex items-center gap-3">
                <GoogleLogo />
                <div>
                  <div className="text-sm font-semibold text-white">Continue via Google</div>
                  <div className="text-[11px] text-slate-400">Choose an account to continue to Javify</div>
                </div>
              </div>
              <button type="button" onClick={() => setShowGooglePicker(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>

            {/* Account List */}
            <div className="p-3 space-y-1">
              {browserGoogleAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleGoogleAccountSelect(account)}
                  className="group flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left transition-all hover:bg-white/8"
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-sm font-bold text-white", account.color)}>
                    {account.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{account.name}</div>
                    <div className="text-xs text-slate-400 truncate">{account.email}</div>
                  </div>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-slate-600 group-hover:fill-white transition-colors"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 px-6 py-2 text-[10px] uppercase tracking-widest text-slate-500">
              <span className="h-px flex-1 bg-white/8" />
              or use another account
              <span className="h-px flex-1 bg-white/8" />
            </div>

            {/* Custom Email */}
            <div className="px-4 pb-5 pt-2">
              <div className="flex gap-2">
                <input
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  autoComplete="off"
                  name="javify_google_email"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-400/40"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGoogleCustomEmail(); } }}
                />
                <button
                  type="button"
                  onClick={handleGoogleCustomEmail}
                  disabled={!/^\S+@\S+\.\S+$/.test(customGoogleEmail)}
                  className="shrink-0 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Go
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 bg-white/2 px-6 py-3">
              <p className="text-[10px] text-slate-500 text-center">
                Javify uses a secure authorization flow. Your credentials are processed locally in this demo.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ GitHub Account Picker Modal ═══ */}
      {showGitHubPicker && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d1630] p-0 shadow-[0_32px_100px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div className="flex items-center gap-3">
                <GitHubLogo />
                <div>
                  <div className="text-sm font-semibold text-white">Continue via GitHub</div>
                  <div className="text-[11px] text-slate-400">Select an account to enter Javify</div>
                </div>
              </div>
              <button type="button" onClick={() => setShowGitHubPicker(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>

            {/* Account List */}
            <div className="p-3 space-y-1">
              {browserGitHubAccounts.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => handleGitHubAccountSelect(account)}
                  className="group flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left transition-all hover:bg-white/8"
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-sm font-bold text-white", account.color)}>
                    {account.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{account.name}</div>
                    <div className="text-xs text-slate-400 truncate">@{account.username}</div>
                  </div>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-slate-600 group-hover:fill-white transition-colors"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
                </button>
              ))}  
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 bg-white/2 px-6 py-3">
              <p className="text-[10px] text-slate-500 text-center">
                Javify requests read-only access to your GitHub profile. No repository access required.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function DashboardPage() {
  const username = useJavifyStore((state) => state.username);
  const xp = useJavifyStore((state) => state.xp);
  const level = useJavifyStore((state) => state.level);
  const coins = useJavifyStore((state) => state.coins);
  const streak = useJavifyStore((state) => state.streak);
  const runCount = useJavifyStore((state) => state.runCount);
  const failedRuns = useJavifyStore((state) => state.failedRuns);
  const completedChallengeIds = useJavifyStore((state) => state.completedChallengeIds);
  const activeWorldId = useJavifyStore((state) => state.activeWorldId);
  const resetProgress = useJavifyStore((state) => state.resetProgress);

  const analyticsQuery = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: () => mockFetch(getAnalytics(), 200),
    refetchInterval: 5000,
  });

  useEffect(() => {
    recordActivity(username, "page_view", "Visited dashboard");
  }, []);

  const progressPercent = getCompletionPercentage(completedChallengeIds);
  const xpToNextLevel = getXpToNextLevel(xp);
  const playerTitle = getPlayerTitle(level);
  const activeWorld = getWorldById(activeWorldId) ?? worlds[0];
  const nextChallengeId = getNextChallengeId(completedChallengeIds) ?? challenges[0].id;
  const nextChallenge = getChallengeById(nextChallengeId) ?? challenges[0];
  const achievements = getAchievements(completedChallengeIds, runCount, failedRuns);

  const leaderboardQuery = useQuery({
    queryKey: ["dashboard-leaderboard"],
    queryFn: () => mockFetch(leaderboard, 260),
  });

  return (
    <div className="space-y-8 pb-10">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <GlassPanel className="relative overflow-hidden p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,217,255,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,77,157,0.18),transparent_32%)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center gap-4">
                <BrandMark size="md" />
                <p className="text-xs uppercase tracking-[0.34em] text-cyan-300">Player Dashboard</p>
              </div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">Welcome back, {username}.</h1>
              <p className="text-base leading-8 text-slate-300">
                Your futuristic command center tracks progression, rewards, achievements, and your next Java
                mission. Keep the streak alive and continue the ascent to mastery.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">{playerTitle}</span>
                <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 px-4 py-2 text-sm text-fuchsia-200">
                  {completedChallengeIds.length} missions completed
                </span>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#0d1630]/80 p-5">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Campaign Completion</span>
                <span className="text-cyan-300">{progressPercent}%</span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#00D9FF,#6C63FF,#FF4D9D)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
                <span>{xp} XP collected</span>
                <span>{xpToNextLevel} XP to next level</span>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.34em] text-fuchsia-300">Continue Learning</p>
          <h2 className="mt-4 text-2xl font-semibold text-white">Current world: {activeWorld.name}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{activeWorld.summary}</p>
          <div className="mt-6 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-slate-400">Next mission</div>
                <div className="mt-1 text-lg font-medium text-white">{nextChallenge.title}</div>
              </div>
              <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
                +{nextChallenge.xpReward} XP
              </div>
            </div>
            <p className="text-sm text-slate-300">{nextChallenge.mission}</p>
            <Link
              to={`/challenge/${nextChallenge.id}`}
              className="inline-flex rounded-full bg-[linear-gradient(135deg,#6C63FF,#8B5CF6,#00D9FF)] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(108,99,255,0.35)]"
            >
              Launch challenge
            </Link>
          </div>
        </GlassPanel>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="XP" value={xp.toString()} helper="Earned from solved coding missions" accent="bg-violet-500/25" />
        <MetricCard label="Level" value={level.toString()} helper="Progression updates every 250 XP" accent="bg-cyan-400/25" />
        <MetricCard label="Coins" value={coins.toString()} helper="Spendable in future inventory systems" accent="bg-fuchsia-500/25" />
        <MetricCard label="Daily Streak" value={`${streak}d`} helper="Consistency multiplier for long-term retention" accent="bg-emerald-400/25" />
      </section>

      {/* Total Visitors Section */}
      <GlassPanel className="p-6 md:p-8 relative overflow-hidden border-cyan-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,217,255,0.15),transparent_50%)]" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-cyan-300">Platform Telemetry</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Total Visitors</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">The total number of visitors who have explored the Javify universe.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-5xl font-black text-gray-900 dark:text-white drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                {analyticsQuery.data?.totalPageViews ?? "..."}
              </div>
              <div className="text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mt-1">Global Views</div>
            </div>
          </div>
        </div>
      </GlassPanel>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <GlassPanel className="p-6 md:p-8">
          <SectionIntro
            eyebrow="Achievements"
            title="Milestones that reward growth, persistence, and mastery"
            description="This system can be expanded into animated badge reveals, profile showcases, and leaderboard boosts."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {achievements.map((achievement) => (
              <div
                key={achievement.title}
                className={cn(
                  "rounded-3xl border p-5 transition",
                  achievement.unlocked ? "border-cyan-300/25 bg-cyan-400/10" : "border-white/10 bg-white/5"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-lg font-medium text-white">{achievement.title}</div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]",
                      achievement.unlocked ? "bg-white/15 text-cyan-200" : "bg-white/8 text-slate-500"
                    )}
                  >
                    {achievement.unlocked ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{achievement.description}</p>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-6 md:p-8">
          <SectionIntro
            eyebrow="Leaderboard Snapshot"
            title="Competitive energy meets educational progress"
            description="React Query powers leaderboard loading in this MVP, preparing the UI for a real API-backed ranking service."
          />
          <div className="mt-8 space-y-4">
            {(leaderboardQuery.data ?? leaderboard).slice(0, 4).map((entry) => (
              <div key={entry.rank} className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-base font-medium text-white">#{entry.rank} {entry.name}</div>
                    <div className="mt-1 text-sm text-slate-400">{entry.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold text-cyan-300">{entry.xp} XP</div>
                    <div className="text-sm text-slate-400">{entry.streak} day streak</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <GlassPanel className="p-6 md:p-8">
          <SectionIntro
            eyebrow="World Progression"
            title="Every major Java topic becomes a world on your campaign map"
            description="This RPG framing increases motivation by making conceptual milestones visible and rewarding."
          />
          <div className="mt-8 grid gap-4">
            {worlds.map((world, index) => {
              const completed = world.challengeIds.every((id) => completedChallengeIds.includes(id));
              const unlocked = isWorldUnlocked(index, completedChallengeIds);
              return (
                <div key={world.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 text-white">
                        <span className="text-2xl">{world.icon}</span>
                        <span className="text-lg font-medium">{world.name}</span>
                      </div>
                      <div className="mt-2 text-sm text-slate-400">{world.topic}</div>
                    </div>
                    <div
                      className={cn(
                        "rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]",
                        completed
                          ? "bg-emerald-400/15 text-emerald-200"
                          : unlocked
                            ? "bg-cyan-400/15 text-cyan-200"
                            : "bg-white/8 text-slate-500"
                      )}
                    >
                      {completed ? "Completed" : unlocked ? "Unlocked" : "Locked"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>

        <GlassPanel className="p-6 md:p-8">
          <SectionIntro
            eyebrow="Daily Quest Loop"
            title="Short-term goals reinforce consistency"
            description="These quests can be driven by backend scheduling, streak resets, and daily reward services in production."
          />
          <div className="mt-8 space-y-4">
            {[
              { title: "Run any mission", done: runCount > 0, copy: "Boot your coding arena for today." },
              {
                title: "Solve the active challenge",
                done: completedChallengeIds.includes(nextChallenge.id),
                copy: "Keep the world map moving forward.",
              },
              { title: "Use AI mentor wisely", done: true, copy: "Hints guide without revealing full solutions." },
            ].map((quest) => (
              <div key={quest.title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-base font-medium text-white">{quest.title}</div>
                  <div className={cn("rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]", quest.done ? "bg-emerald-400/15 text-emerald-200" : "bg-white/8 text-slate-500")}>{quest.done ? "Done" : "Pending"}</div>
                </div>
                <p className="mt-2 text-sm text-slate-300">{quest.copy}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={resetProgress}
            className="mt-6 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Reset demo progress
          </button>
        </GlassPanel>
      </section>
    </div>
  );
}

function WorldMapPage() {
  const completedChallengeIds = useJavifyStore((state) => state.completedChallengeIds);
  const activeWorldId = useJavifyStore((state) => state.activeWorldId);
  const xp = useJavifyStore((state) => state.xp);
  const username = useJavifyStore((state) => state.username);

  useEffect(() => {
    recordActivity(username, "page_view", "Viewed world map");
  }, []);

  return (
    <div className="space-y-8 pb-10">
      <SectionIntro
        eyebrow="Interactive World Map"
        title="A mobile-game inspired Java progression path"
        description="Locked worlds, glowing paths, boss gates, and completion markers turn the curriculum into an explorable RPG campaign."
      />

      <div className="relative mx-auto max-w-5xl">
        <div className="absolute left-1/2 top-10 hidden h-[calc(100%-5rem)] w-px -translate-x-1/2 bg-linear-to-b from-cyan-400/60 via-violet-500/50 to-fuchsia-500/60 lg:block" />
        <div className="space-y-6">
          {worlds.map((world, index) => {
            const unlocked = isWorldUnlocked(index, completedChallengeIds);
            const completed = world.challengeIds.every((challengeId) => completedChallengeIds.includes(challengeId));
            const onLeft = index % 2 === 0;
            const isActive = world.id === activeWorldId;

            return (
              <div key={world.id} className={cn("relative grid gap-4 lg:grid-cols-2", onLeft ? "" : "") }>
                <div className={cn(onLeft ? "lg:pr-10" : "lg:order-2 lg:pl-10")}>
                  <GlassPanel
                    className={cn(
                      "relative overflow-hidden p-6 transition duration-300",
                      unlocked ? "border-cyan-300/20" : "opacity-70",
                      isActive && "shadow-[0_0_40px_rgba(0,217,255,0.12)]"
                    )}
                  >
                    <div className={cn("absolute inset-0 bg-linear-to-br opacity-70", world.gradient)} />
                    <div className="relative">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-3xl">{world.icon}</div>
                          <h3 className="mt-3 text-2xl font-semibold text-white">{world.name}</h3>
                          <p className="mt-2 text-sm text-cyan-200">{world.topic}</p>
                        </div>
                        <div
                          className={cn(
                            "rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]",
                            completed
                              ? "bg-emerald-400/15 text-emerald-200"
                              : unlocked
                                ? "bg-cyan-400/15 text-cyan-200"
                                : "bg-white/8 text-slate-500"
                          )}
                        >
                          {completed ? "Completed" : unlocked ? "Unlocked" : `Unlock @ ${world.unlockAtXp} XP`}
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-slate-300">{world.summary}</p>

                      <div className="mt-5 flex flex-wrap gap-3">
                        {world.stages.map((stage, stageIndex) => {
                          const activeNodeCount = completed ? world.stages.length : unlocked ? 2 : 0;
                          const filled = stageIndex < activeNodeCount;
                          return (
                            <div key={stage} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                              <span className={cn("h-2.5 w-2.5 rounded-full", filled ? "bg-cyan-300 shadow-[0_0_12px_rgba(0,217,255,0.8)]" : "bg-white/20")} />
                              {stage}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                        <div className="text-sm text-slate-300">Boss: {world.boss}</div>
                        {unlocked ? (
                          <Link
                            to={`/challenge/${world.challengeIds[0]}`}
                            className="rounded-full bg-[linear-gradient(135deg,#6C63FF,#8B5CF6,#00D9FF)] px-4 py-2 text-sm font-semibold text-white"
                          >
                            {completed ? "Replay mission" : "Enter world"}
                          </Link>
                        ) : (
                          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-500">Locked</div>
                        )}
                      </div>
                    </div>
                  </GlassPanel>
                </div>

                <div className={cn("hidden lg:flex lg:items-center lg:justify-center", onLeft ? "" : "lg:order-1")}>
                  <div className={cn("map-node", completed ? "map-node-complete" : unlocked ? "map-node-active" : "map-node-locked")}>{index + 1}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <GlassPanel className="p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-cyan-300">Map Telemetry</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Player campaign diagnostics</h3>
          </div>
          <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">Current XP: {xp}</div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard label="Unlocked Worlds" value={worlds.filter((_, index) => isWorldUnlocked(index, completedChallengeIds)).length.toString()} helper="Accessible campaign zones" accent="bg-cyan-400/20" />
          <MetricCard label="Bosses Defeated" value={worlds.filter((world) => world.challengeIds.every((id) => completedChallengeIds.includes(id))).length.toString()} helper="Core milestones completed" accent="bg-fuchsia-500/20" />
          <MetricCard label="Active Sector" value={(worlds.findIndex((world) => world.id === activeWorldId) + 1).toString()} helper="Current progression checkpoint" accent="bg-violet-500/20" />
        </div>
      </GlassPanel>
    </div>
  );
}

function ChallengePage() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const recordRun = useJavifyStore((state) => state.recordRun);
  const useHint = useJavifyStore((state) => state.useHint);
  const completeChallenge = useJavifyStore((state) => state.completeChallenge);
  const completedChallengeIds = useJavifyStore((state) => state.completedChallengeIds);

  const activeChallenge = getChallengeById(challengeId ?? "") ?? challenges[0];
  const challengeIndex = challenges.findIndex((item) => item.id === activeChallenge.id);
  const previousChallenge = challenges[challengeIndex - 1];
  const nextChallenge = challenges[challengeIndex + 1];
  const [code, setCode] = useState(activeChallenge.starterCode);
  const [consoleOutput, setConsoleOutput] = useState("Javify runtime ready. Press Run to compile your Java mission.");
  const [mentorText, setMentorText] = useState("The AI mentor is online. Ask for a hint whenever you need guided help.");
  const [statusTitle, setStatusTitle] = useState("Awaiting execution");
  const [statusTone, setStatusTone] = useState<"idle" | "success" | "warning" | "error">("idle");
  const [diagnostics, setDiagnostics] = useState<string[]>([
    "• Waiting for Java compiler run",
    "• Hidden tests will activate after execution",
  ]);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (!getChallengeById(challengeId ?? "")) {
      navigate(`/challenge/${challenges[0].id}`, { replace: true });
      return;
    }

    setCode(activeChallenge.starterCode);
    setConsoleOutput("Javify runtime ready. Press Run to compile your Java mission.");
    setMentorText(activeChallenge.hint);
    setStatusTitle("Awaiting execution");
    setStatusTone("idle");
    setDiagnostics(["• Waiting for Java compiler run", "• Hidden tests will activate after execution"]);
    setIsExecuting(false);
  }, [activeChallenge.id, activeChallenge.hint, activeChallenge.starterCode, challengeId, navigate]);

  const isCompleted = completedChallengeIds.includes(activeChallenge.id);
  const world = getWorldById(activeChallenge.worldId) ?? worlds[0];

  const runCode = async () => {
    setIsExecuting(true);
    setStatusTitle("Compiling Java...");
    setStatusTone("warning");
    setConsoleOutput("Sending Main.java to the live Java compiler sandbox...");

    const result = await runJavaWithCompiler(code, activeChallenge);
    recordRun(result.passed);
    setStatusTitle(result.title);
    setStatusTone(result.passed ? "success" : result.success ? "warning" : "error");
    setConsoleOutput(result.output);
    setMentorText(result.mentor);
    setDiagnostics(result.diagnostics);
    setIsExecuting(false);
  };

  const submitCode = async () => {
    setIsExecuting(true);
    setStatusTitle("Submitting to compiler...");
    setStatusTone("warning");
    setConsoleOutput("Compiling, running, and validating hidden challenge tests...");

    const result = await runJavaWithCompiler(code, activeChallenge);
    recordRun(result.passed);
    setStatusTitle(result.title);
    setStatusTone(result.passed ? "success" : result.success ? "warning" : "error");
    setConsoleOutput(result.output);
    setMentorText(result.mentor);
    setDiagnostics(result.diagnostics);
    if (result.passed) {
      completeChallenge(activeChallenge.id);
      recordActivity(useJavifyStore.getState().username, "challenge_completed", `Completed "${activeChallenge.title}" (+${activeChallenge.xpReward} XP)`);
      setConsoleOutput(`${result.output}\n\nRewards granted: +${activeChallenge.xpReward} XP, +${activeChallenge.coinsReward} coins.`);

      // Auto-push to GitHub if connected and enabled.
      const githubState = getGitHubState();
      if (githubState.connected && githubState.syncOptions.autoCommitOnSolve) {
        const worldForChallenge = getWorldById(activeChallenge.worldId);
        pushChallengeProgress({
          challengeId: activeChallenge.id,
          challengeTitle: activeChallenge.title,
          category: worldForChallenge?.topic ?? "General",
          difficulty: activeChallenge.difficulty,
          xpEarned: activeChallenge.xpReward,
          code,
          passedTests: 1,
          totalTests: 1,
        }).then((record) => {
          if (record.status === "success") {
            setConsoleOutput(
              `${result.output}\n\nRewards granted: +${activeChallenge.xpReward} XP, +${activeChallenge.coinsReward} coins.\n\n✓ GitHub: ${record.message}`
            );
          }
        }).catch(() => undefined);
      }
    }
    setIsExecuting(false);
  };

  const requestHint = () => {
    useHint(activeChallenge.id);
    setStatusTitle("AI mentor hint");
    setStatusTone("warning");
    setMentorText(activeChallenge.hint);
    setConsoleOutput("Hint delivered. Adjust your code, then run the mission again.");
  };

  const requestConceptGuide = () => {
    setStatusTitle("AI concept guide");
    setStatusTone("warning");
    setMentorText(
      `This mission belongs to ${world.topic}. Read the objective, identify the Java structure required, write a minimal version first, then improve only after it prints the expected output.`
    );
  };

  const requestDebugPlan = () => {
    setStatusTitle("AI debug plan");
    setStatusTone("warning");
    setMentorText(
      "Debug in this order: verify class Main, verify public static void main(String[] args), check braces and semicolons, run the code, then compare the output character by character."
    );
  };

  return (
    <div className="space-y-8 pb-10">
      <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <GlassPanel className="p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-cyan-300">Coding Challenge</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">{activeChallenge.title}</h1>
              <p className="mt-2 text-sm text-fuchsia-200">{world.name} • {activeChallenge.difficulty}</p>
            </div>
            <div className={cn("rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]", isCompleted ? "bg-emerald-400/15 text-emerald-200" : "bg-white/8 text-slate-400")}>
              {isCompleted ? "Completed" : "Pending"}
            </div>
          </div>

          <p className="mt-5 text-sm leading-7 text-slate-300">{activeChallenge.description}</p>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-medium text-white">Mission briefing</div>
            <p className="mt-2 text-sm leading-7 text-slate-300">{activeChallenge.mission}</p>
            <div className="mt-5 space-y-3">
              {activeChallenge.objectives.map((objective) => (
                <div key={objective} className="flex items-start gap-3 text-sm text-slate-200">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(0,217,255,0.65)]" />
                  <span>{objective}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-medium text-white">Rewards</div>
              <p className="mt-3 text-sm text-slate-300">+{activeChallenge.xpReward} XP</p>
              <p className="mt-1 text-sm text-slate-300">+{activeChallenge.coinsReward} Coins</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-medium text-white">Expected Output</div>
              <pre className="mt-3 whitespace-pre-wrap font-mono text-sm text-cyan-200">{activeChallenge.expectedOutput}</pre>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-medium text-white">Hidden test preview</div>
            <div className="mt-4 space-y-2">
              {activeChallenge.hiddenTests.map((test) => (
                <div key={test} className="text-sm text-slate-300">• {test}</div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {previousChallenge ? (
              <Link to={`/challenge/${previousChallenge.id}`} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                ← Previous
              </Link>
            ) : null}
            {nextChallenge ? (
              <Link to={`/challenge/${nextChallenge.id}`} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                Next →
              </Link>
            ) : null}
            <Link to="/map" className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/15">
              Back to world map
            </Link>
          </div>
        </GlassPanel>

        <div className="space-y-6">
          <GlassPanel className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.34em] text-fuchsia-300">Monaco Editor</div>
                <div className="mt-2 text-lg font-medium text-white">Java mission workspace</div>
              </div>
              <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200">
                {isExecuting ? "Compiler running..." : getCompilerStatusLabel()} • IntelliSense ready
              </div>
            </div>
            <div className="h-[340px] sm:h-[420px] lg:h-[480px]">
              <Editor
                height="100%"
                language="java"
                theme={theme === "dark" ? "vs-dark" : "light"}
                value={code}
                onChange={(value) => setCode(value ?? "")}
                loading="Booting Monaco Editor..."
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  padding: { top: 16 },
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: "on",
                }}
              />
            </div>
            <div className="flex flex-wrap gap-3 border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={runCode}
                disabled={isExecuting}
                className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-5 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExecuting ? "Running..." : "Run Java"}
              </button>
              <button
                type="button"
                onClick={submitCode}
                disabled={isExecuting}
                className="rounded-full bg-[linear-gradient(135deg,#6C63FF,#8B5CF6,#00D9FF)] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_22px_rgba(108,99,255,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExecuting ? "Validating..." : "Submit & Complete"}
              </button>
              <button
                type="button"
                onClick={requestHint}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                Hint
              </button>
            </div>
          </GlassPanel>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.88fr]">
            <GlassPanel className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.34em] text-cyan-300">Output Console</div>
                  <div className="mt-2 text-lg font-medium text-white">{statusTitle}</div>
                </div>
                <div
                  className={cn(
                    "rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]",
                    statusTone === "success"
                      ? "bg-emerald-400/15 text-emerald-200"
                      : statusTone === "error"
                        ? "bg-rose-400/15 text-rose-200"
                        : statusTone === "warning"
                          ? "bg-amber-400/15 text-amber-200"
                          : "bg-white/8 text-slate-500"
                  )}
                >
                  {statusTone}
                </div>
              </div>
              <div className="mt-5 rounded-3xl border border-white/10 bg-[#0b1020]/80 p-5">
                <pre className="min-h-40 whitespace-pre-wrap font-mono text-sm leading-7 text-slate-200">{consoleOutput}</pre>
              </div>
              <div className="mt-5 grid gap-3">
                {diagnostics.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    {item}
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className="p-6">
              <div className="text-xs uppercase tracking-[0.34em] text-fuchsia-300">AI Mentor</div>
              <div className="mt-2 text-lg font-medium text-white">Guided feedback, not full answers</div>
              <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
                {mentorText}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <button
                  type="button"
                  onClick={requestHint}
                  className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200 transition hover:bg-cyan-400/15"
                >
                  Smart hint
                </button>
                <button
                  type="button"
                  onClick={requestConceptGuide}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  Explain concept
                </button>
                <button
                  type="button"
                  onClick={requestDebugPlan}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  Debug plan
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  "Step 1: Frontend sends the Java source to /api/run.",
                  "Step 2: Backend validates auth, payload, and rate limits.",
                  "Step 3: Docker sandbox compiles and executes code with no network and tight resource caps.",
                  "Step 4: Output is captured and checked against hidden tests.",
                  "Step 5: XP, progress, and achievements are updated on success.",
                ].map((step) => (
                  <div key={step} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    {step}
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
        </div>
      </section>

      {/* AI Coding Mentor — tabbed analysis panel */}
      <section>
        <AiMentorPanel code={code} challengeId={activeChallenge.id} />
      </section>
    </div>
  );
}

function ArchitecturePage() {
  const endpointsQuery = useQuery({
    queryKey: ["api-endpoints"],
    queryFn: () => mockFetch(apiEndpoints, 300),
  });

  return (
    <div className="space-y-8 pb-10">
      <SectionIntro
        eyebrow="Major-Level System Architecture"
        title="A professional full-stack blueprint for a coding RPG platform"
        description="A deployment-ready blueprint covering the immersive client, secure API layer, scalable database, and isolated Java sandbox runner that powers the platform."
      />

      <section className="grid gap-5 xl:grid-cols-4">
        {architectureBlocks.map((block) => (
          <GlassPanel key={block.title} tilt className="h-full p-6">
            <div className="text-xs uppercase tracking-[0.34em] text-cyan-300" style={{ transform: "translateZ(15px)" }}>Module</div>
            <h3 className="mt-3 text-xl font-semibold text-white" style={{ transform: "translateZ(35px)" }}>{block.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{block.description}</p>
            <div className="mt-5 space-y-3">
              {block.bullets.map((bullet) => (
                <div key={bullet} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  {bullet}
                </div>
              ))}
            </div>
          </GlassPanel>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassPanel className="p-6 md:p-8">
          <SectionIntro
            eyebrow="API Surface"
            title="REST endpoints aligned with the learning and execution flow"
            description="The backend can be implemented in NestJS or Express, with DTO validation, JWT guards, and Swagger for documentation."
          />
          <div className="mt-8 overflow-hidden rounded-[28px] border border-white/10">
            <div className="hidden grid-cols-[0.7fr_1.2fr_2fr_0.9fr] bg-white/8 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400 md:grid">
              <div>Method</div>
              <div>Path</div>
              <div>Description</div>
              <div>Auth</div>
            </div>
            <div className="divide-y divide-white/10">
              {(endpointsQuery.data ?? apiEndpoints).map((endpoint) => (
                <div key={endpoint.path} className="bg-white/5 px-4 py-4 text-sm text-slate-200 md:grid md:grid-cols-[0.7fr_1.2fr_2fr_0.9fr] md:gap-4">
                  <div className="flex items-center gap-2 md:block">
                    <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-xs font-semibold text-cyan-300 md:bg-transparent md:px-0 md:py-0">
                      {endpoint.method}
                    </span>
                    <span className="font-mono text-xs text-fuchsia-200 md:hidden">{endpoint.path}</span>
                  </div>
                  <div className="hidden font-mono text-fuchsia-200 md:block">{endpoint.path}</div>
                  <div className="mt-2 text-slate-300 md:mt-0">{endpoint.description}</div>
                  <div className="mt-2 text-xs text-slate-400 md:mt-0 md:text-sm md:text-slate-200">
                    <span className="md:hidden">Auth: </span>
                    {endpoint.auth}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6 md:p-8">
          <SectionIntro
            eyebrow="Security Model"
            title="Designed to safely execute untrusted Java code"
            description="The most sensitive component is the sandbox runner. The platform architecture puts hard boundaries around execution."
          />
          <div className="mt-8 space-y-4">
            {securityRules.map((rule) => (
              <div key={rule.title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-base font-medium text-white">{rule.title}</div>
                <p className="mt-2 text-sm leading-7 text-slate-300">{rule.description}</p>
              </div>
            ))}
          </div>
        </GlassPanel>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <GlassPanel className="p-6 md:p-8">
          <SectionIntro
            eyebrow="Database Design"
            title="PostgreSQL schema for users, progress, and gameplay analytics"
            description="The database layer captures both educational outcomes and game mechanics, enabling leaderboards, streaks, and submission history."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {databaseTables.map((table) => (
              <div key={table.name} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="font-mono text-base font-semibold text-cyan-200">{table.name}</div>
                <div className="mt-4 space-y-2">
                  {table.columns.map((column) => (
                    <div key={column} className="rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-300">
                      {column}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-6 md:p-8">
          <SectionIntro
            eyebrow="Deployment"
            title="Split the platform into scalable deployment targets"
            description="Frontend, API, database, and runner services can evolve independently while sharing observability and CI/CD."
          />
          <div className="mt-8 space-y-4">
            {deploymentStack.map((item, index) => (
              <div key={item} className="flex items-start gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">{index + 1}</div>
                <div className="text-sm leading-7 text-slate-300">{item}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[28px] border border-cyan-300/15 bg-[#0b1020]/80 p-5">
            <div className="text-sm font-medium text-white">Recommended Docker runner flags</div>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/30 p-4 font-mono text-sm text-cyan-200">docker run --rm --network none --memory 256m --cpus=".5" javify-runner</pre>
          </div>
        </GlassPanel>
      </section>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    return (window.localStorage.getItem("javify-theme") as ThemeMode | null) ?? "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("theme-light", theme === "light");
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("javify-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
      }}
    >
      <Router>
        <AppLayout />
      </Router>
    </ThemeContext.Provider>
  );
}
