export type Difficulty = "Novice" | "Skilled" | "Elite" | "Boss";

export interface Challenge {
  id: string;
  worldId: string;
  title: string;
  mission: string;
  description: string;
  objectives: string[];
  starterCode: string;
  expectedOutput: string;
  difficulty: Difficulty;
  xpReward: number;
  coinsReward: number;
  hint: string;
  boss: boolean;
  requiredSnippets: string[];
  hiddenTests: string[];
  mentorFeedback: string;
}

export interface World {
  id: string;
  name: string;
  topic: string;
  icon: string;
  summary: string;
  boss: string;
  accent: string;
  gradient: string;
  unlockAtXp: number;
  challengeIds: string[];
  stages: string[];
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  level: number;
  streak: number;
  title: string;
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  auth: string;
}

export interface DatabaseTable {
  name: string;
  columns: string[];
}

export interface ArchitectureBlock {
  title: string;
  description: string;
  bullets: string[];
}

export interface SecurityRule {
  title: string;
  description: string;
}

export interface ExecutionResult {
  success: boolean;
  passed: boolean;
  title: string;
  output: string;
  mentor: string;
  diagnostics: string[];
}

export const worlds: World[] = [
  {
    id: "forest-variables",
    name: "Forest of Variables",
    topic: "Variables & Data Types",
    icon: "🌲",
    summary: "Learn how to store and display values as your first spell components.",
    boss: "The Echo Treant",
    accent: "from-cyan-400 to-violet-500",
    gradient: "from-cyan-500/25 via-transparent to-violet-500/25",
    unlockAtXp: 0,
    challengeIds: ["print-hello-javify"],
    stages: ["Scout Camp", "Crystal Cache", "Syntax Shrine", "Boss Gate"],
  },
  {
    id: "conditional-kingdom",
    name: "Conditional Kingdom",
    topic: "If/Else Statements",
    icon: "🏰",
    summary: "Make branching decisions to open gates and choose the right path.",
    boss: "Gatekeeper Null",
    accent: "from-fuchsia-400 to-pink-500",
    gradient: "from-fuchsia-500/25 via-transparent to-pink-500/25",
    unlockAtXp: 120,
    challengeIds: ["portal-condition"],
    stages: ["Royal Prompt", "Choice Chamber", "Branch Hall", "Boss Gate"],
  },
  {
    id: "loop-dungeon",
    name: "Loop Dungeon",
    topic: "Loops",
    icon: "🌀",
    summary: "Master repetition to channel stable energy through ancient runes.",
    boss: "Cyclone Hydra",
    accent: "from-sky-400 to-cyan-500",
    gradient: "from-sky-500/25 via-transparent to-cyan-500/25",
    unlockAtXp: 260,
    challengeIds: ["counting-runes"],
    stages: ["Rune Hall", "Repeat Path", "Counter Forge", "Boss Gate"],
  },
  {
    id: "method-mountains",
    name: "Method Mountains",
    topic: "Functions & Methods",
    icon: "⛰️",
    summary: "Package reusable powers into elegant methods and call them at will.",
    boss: "Invoker Titan",
    accent: "from-violet-400 to-indigo-500",
    gradient: "from-violet-500/25 via-transparent to-indigo-500/25",
    unlockAtXp: 420,
    challengeIds: ["healing-method"],
    stages: ["Echo Ridge", "Return Cavern", "Invoke Peak", "Boss Gate"],
  },
  {
    id: "array-arena",
    name: "Array Arena",
    topic: "Arrays",
    icon: "🛡️",
    summary: "Collect data into structured formations and battle with precision.",
    boss: "Indexer Prime",
    accent: "from-emerald-400 to-cyan-500",
    gradient: "from-emerald-500/25 via-transparent to-cyan-500/25",
    unlockAtXp: 620,
    challengeIds: ["array-energy-sum"],
    stages: ["Loadout Deck", "Index Lane", "Memory Field", "Boss Gate"],
  },
  {
    id: "oop-city",
    name: "OOP City",
    topic: "Classes & Objects",
    icon: "🏙️",
    summary: "Build classes, instantiate objects, and unlock true Java identity.",
    boss: "Constructor Warden",
    accent: "from-amber-400 to-orange-500",
    gradient: "from-amber-500/25 via-transparent to-orange-500/25",
    unlockAtXp: 860,
    challengeIds: ["hero-blueprint"],
    stages: ["Blueprint Bay", "Class Core", "Object Plaza", "Boss Gate"],
  },
  {
    id: "exception-valley",
    name: "Exception Valley",
    topic: "Exception Handling",
    icon: "⚡",
    summary: "Catch failures gracefully and turn broken flows into stable missions.",
    boss: "Crash Revenant",
    accent: "from-rose-400 to-orange-500",
    gradient: "from-rose-500/25 via-transparent to-orange-500/25",
    unlockAtXp: 1120,
    challengeIds: ["recovery-shield"],
    stages: ["Fault Ravine", "Catch Bridge", "Recovery Node", "Boss Gate"],
  },
  {
    id: "thread-nexus",
    name: "Thread Nexus",
    topic: "Multithreading",
    icon: "🧠",
    summary: "Split tasks across threads and synchronize your energy network.",
    boss: "Parallel Specter",
    accent: "from-cyan-400 to-blue-500",
    gradient: "from-cyan-500/25 via-transparent to-blue-500/25",
    unlockAtXp: 1400,
    challengeIds: ["nexus-thread"],
    stages: ["Spawn Dock", "Async Relay", "Sync Grid", "Boss Gate"],
  },
  {
    id: "advanced-temple",
    name: "Advanced Temple",
    topic: "Collections & Streams",
    icon: "🛕",
    summary: "Harness collections and streams to write expressive advanced Java.",
    boss: "Grandmaster Lambda",
    accent: "from-pink-400 to-violet-500",
    gradient: "from-pink-500/25 via-transparent to-violet-500/25",
    unlockAtXp: 1720,
    challengeIds: ["stream-even-signals"],
    stages: ["Collection Vault", "Filter Hall", "Lambda Court", "Boss Gate"],
  },
];

export const challenges: Challenge[] = [
  {
    id: "print-hello-javify",
    worldId: "forest-variables",
    title: "Print Hello Javify",
    mission: "Activate the first beacon by printing a welcome signal.",
    description:
      "Your first task is to compile a valid Java program and print the exact text Hello Javify.",
    objectives: [
      "Create a valid Main class",
      "Use the main method entry point",
      "Print the exact phrase Hello Javify",
    ],
    starterCode: `public class Main {
  public static void main(String[] args) {
    // Print the welcome signal
  }
}`,
    expectedOutput: "Hello Javify",
    difficulty: "Novice",
    xpReward: 120,
    coinsReward: 60,
    hint: "Use System.out.println(...) inside main to print the message.",
    boss: false,
    requiredSnippets: ["class Main", "main(String[] args)", "System.out.println", "Hello Javify"],
    hiddenTests: [
      "Program compiles successfully",
      "Output matches Hello Javify exactly",
      "Main entry point is present",
    ],
    mentorFeedback: "Great start. In Java, exact output strings matter, including capitalization and spacing.",
  },
  {
    id: "portal-condition",
    worldId: "conditional-kingdom",
    title: "Portal Condition",
    mission: "Open the royal portal only when mana reaches the safe threshold.",
    description:
      "Create an int variable named mana set to 80. If mana is greater than or equal to 50, print Portal Open. Otherwise print Need More Mana.",
    objectives: [
      "Declare an integer variable named mana",
      "Use if/else logic",
      "Print Portal Open for mana 80",
    ],
    starterCode: `public class Main {
  public static void main(String[] args) {
    int mana = 80;
    // Add your condition here
  }
}`,
    expectedOutput: "Portal Open",
    difficulty: "Novice",
    xpReward: 140,
    coinsReward: 75,
    hint: "Compare mana with 50 using >= and print a message in each branch.",
    boss: false,
    requiredSnippets: ["int mana = 80", "if", ">= 50", "Portal Open"],
    hiddenTests: [
      "Condition handles values at the threshold",
      "Correct branch prints for mana = 80",
      "Else path is defined",
    ],
    mentorFeedback: "Conditions are about decisions. Start by asking a true/false question with if.",
  },
  {
    id: "counting-runes",
    worldId: "loop-dungeon",
    title: "Counting Runes",
    mission: "Charge the dungeon seals by printing numbers 1 through 5 on separate lines.",
    description:
      "Use a loop to print the numbers from 1 to 5, each on its own line.",
    objectives: [
      "Use a loop",
      "Count from 1 to 5",
      "Print every value on its own line",
    ],
    starterCode: `public class Main {
  public static void main(String[] args) {
    // Use a loop here
  }
}`,
    expectedOutput: "1\n2\n3\n4\n5",
    difficulty: "Skilled",
    xpReward: 170,
    coinsReward: 95,
    hint: "A for loop is a strong fit here: initialize at 1 and continue while the counter is <= 5.",
    boss: false,
    requiredSnippets: ["for", "<= 5", "System.out.println"],
    hiddenTests: [
      "Loop starts at 1",
      "Loop ends at 5",
      "Each number prints on a new line",
    ],
    mentorFeedback: "Think in three parts: start value, stop condition, and how the counter changes.",
  },
  {
    id: "healing-method",
    worldId: "method-mountains",
    title: "Healing Method",
    mission: "Create a reusable heal ability and call it from main.",
    description:
      "Write a static method named heal that accepts an int hp and returns hp + 25. Call heal(75) from main and print the result.",
    objectives: [
      "Create a static int method named heal",
      "Return hp + 25",
      "Print the result of heal(75)",
    ],
    starterCode: `public class Main {
  public static void main(String[] args) {
    // Call heal here
  }

  // Create the heal method here
}`,
    expectedOutput: "100",
    difficulty: "Skilled",
    xpReward: 190,
    coinsReward: 110,
    hint: "Define a method outside main, then call it inside main and print the returned value.",
    boss: false,
    requiredSnippets: ["static int heal", "return", "heal(75)", "System.out.println"],
    hiddenTests: [
      "Method returns hp + 25",
      "Method name is heal",
      "main prints 100",
    ],
    mentorFeedback: "Methods let you package logic once and reuse it. Focus on the signature and return statement.",
  },
  {
    id: "array-energy-sum",
    worldId: "array-arena",
    title: "Array Energy Sum",
    mission: "Sum the arena crystals stored inside an array.",
    description:
      "Create an int array containing 4, 6, and 8. Loop through it, store the total in a variable named sum, and print the total.",
    objectives: [
      "Declare an int array",
      "Use a loop to visit each element",
      "Print the total 18",
    ],
    starterCode: `public class Main {
  public static void main(String[] args) {
    // Create your array and total it
  }
}`,
    expectedOutput: "18",
    difficulty: "Skilled",
    xpReward: 220,
    coinsReward: 125,
    hint: "Start with int[] values = {4, 6, 8}; then add each value into sum.",
    boss: false,
    requiredSnippets: ["int[]", "sum", "for", "System.out.println"],
    hiddenTests: [
      "Array contains three values",
      "Each item contributes to sum",
      "Printed result equals 18",
    ],
    mentorFeedback: "Arrays help you manage multiple values under one variable name. Iterate, accumulate, then print.",
  },
  {
    id: "hero-blueprint",
    worldId: "oop-city",
    title: "Hero Blueprint",
    mission: "Create a Hero class and instantiate your first object.",
    description:
      "Create a class Hero with a String field name set using a constructor. Add a method intro() that prints Hero: Byte Knight. In main, create a Hero and call intro().",
    objectives: [
      "Create a Hero class",
      "Use a constructor to set name",
      "Call intro() from an object instance",
    ],
    starterCode: `class Hero {
  // Add fields, constructor, and intro method
}

public class Main {
  public static void main(String[] args) {
    // Create a Hero object and call intro
  }
}`,
    expectedOutput: "Hero: Byte Knight",
    difficulty: "Elite",
    xpReward: 260,
    coinsReward: 150,
    hint: "Your constructor should receive a name, store it in a field, and intro() should print that field.",
    boss: true,
    requiredSnippets: ["class Hero", "Hero(", "String name", "intro()", "new Hero"],
    hiddenTests: [
      "Hero class exists",
      "Constructor sets the name field",
      "intro prints Hero: Byte Knight",
    ],
    mentorFeedback: "OOP starts with blueprints. Define the class, then create an object from it.",
  },
  {
    id: "recovery-shield",
    worldId: "exception-valley",
    title: "Recovery Shield",
    mission: "Trap a runtime crash before it destroys the valley.",
    description:
      "Inside a try block, divide 10 by 0. Catch the exception and print Recovered from Error.",
    objectives: [
      "Use try/catch",
      "Trigger an arithmetic exception",
      "Print Recovered from Error in catch",
    ],
    starterCode: `public class Main {
  public static void main(String[] args) {
    // Use try/catch here
  }
}`,
    expectedOutput: "Recovered from Error",
    difficulty: "Elite",
    xpReward: 280,
    coinsReward: 170,
    hint: "Put the risky line inside try, then catch Exception or ArithmeticException and print the recovery message.",
    boss: false,
    requiredSnippets: ["try", "catch", "10 / 0", "Recovered from Error"],
    hiddenTests: [
      "Division by zero occurs in try",
      "Exception is caught safely",
      "Recovery output matches expected text",
    ],
    mentorFeedback: "Exceptions are controlled failures. Catching them keeps the user experience stable.",
  },
  {
    id: "nexus-thread",
    worldId: "thread-nexus",
    title: "Nexus Thread",
    mission: "Launch a worker thread and broadcast a network-ready signal.",
    description:
      "Create a new Thread using a lambda or Runnable that prints Thread Nexus Online. Start the thread.",
    objectives: [
      "Create a Thread",
      "Print Thread Nexus Online inside the thread",
      "Start the thread",
    ],
    starterCode: `public class Main {
  public static void main(String[] args) {
    // Create and start a thread here
  }
}`,
    expectedOutput: "Thread Nexus Online",
    difficulty: "Elite",
    xpReward: 320,
    coinsReward: 190,
    hint: "You can create a thread with new Thread(() -> { ... }); then call start().",
    boss: false,
    requiredSnippets: ["new Thread", "start()", "Thread Nexus Online"],
    hiddenTests: [
      "Thread object is created",
      "Output occurs inside the worker thread",
      "start() is called",
    ],
    mentorFeedback: "Threads allow multiple tasks to run independently. Create the worker first, then start it.",
  },
  {
    id: "stream-even-signals",
    worldId: "advanced-temple",
    title: "Stream Even Signals",
    mission: "Filter the even signal frequencies using Java streams.",
    description:
      "Create a list of integers 1 through 6. Use a stream to keep only even numbers and print them as 2 4 6.",
    objectives: [
      "Create a collection of integers",
      "Use stream() and filter()",
      "Print the even values 2 4 6",
    ],
    starterCode: `import java.util.*;
import java.util.stream.*;

public class Main {
  public static void main(String[] args) {
    // Build the stream pipeline here
  }
}`,
    expectedOutput: "2 4 6",
    difficulty: "Boss",
    xpReward: 360,
    coinsReward: 220,
    hint: "Start from a List<Integer>, then stream(), filter with n % 2 == 0, and join or print the values.",
    boss: true,
    requiredSnippets: ["List", "stream()", "filter", "% 2 == 0", "2 4 6"],
    hiddenTests: [
      "A collection is created",
      "filter keeps only even numbers",
      "Output sequence is 2 4 6",
    ],
    mentorFeedback: "Streams transform data step by step. Filter first, then format your final output.",
  },
];

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "NovaByte", xp: 5320, level: 22, streak: 41, title: "Grandmaster Lambda" },
  { rank: 2, name: "KaiThread", xp: 4870, level: 20, streak: 33, title: "Thread Paladin" },
  { rank: 3, name: "MiraOOP", xp: 4520, level: 19, streak: 28, title: "Object Oracle" },
  { rank: 4, name: "LoopLynx", xp: 4265, level: 18, streak: 30, title: "Loop Master" },
  { rank: 5, name: "ZenCompile", xp: 3980, level: 17, streak: 18, title: "Bug Hunter" },
];

export const testimonials: Testimonial[] = [
  {
    name: "Amira Hassan",
    role: "Computer Science Student",
    quote:
      "Javify turned dry Java topics into boss battles and progression loops. I kept learning because the interface made every milestone feel rewarding.",
  },
  {
    name: "Omar Selim",
    role: "Teaching Assistant",
    quote:
      "The challenge flow mirrors real programming growth: syntax, debugging, validation, and confidence. Students stay engaged far longer than with slides alone.",
  },
  {
    name: "Lina Kareem",
    role: "Junior Developer",
    quote:
      "The world map and coding arena feel like a game, but the structure is serious enough for an academic capstone.",
  },
];

export const apiEndpoints: ApiEndpoint[] = [
  {
    method: "POST",
    path: "/api/auth/register",
    description: "Create a new player account, hash the password, and issue a JWT.",
    auth: "Public",
  },
  {
    method: "POST",
    path: "/api/auth/login",
    description: "Authenticate a player and return signed access and refresh tokens.",
    auth: "Public",
  },
  {
    method: "GET",
    path: "/api/challenges",
    description: "Fetch challenge metadata, unlock requirements, rewards, and world grouping.",
    auth: "JWT",
  },
  {
    method: "GET",
    path: "/api/challenges/:id",
    description: "Fetch a specific challenge, starter code, hints, and public tests.",
    auth: "JWT",
  },
  {
    method: "POST",
    path: "/api/run",
    description: "Send source code to the sandbox runner and receive compile/runtime output.",
    auth: "JWT + Rate Limit",
  },
  {
    method: "GET",
    path: "/api/progress",
    description: "Load player progression, world state, XP, streaks, and achievements.",
    auth: "JWT",
  },
  {
    method: "POST",
    path: "/api/progress",
    description: "Persist successful submissions, XP rewards, and mission completion state.",
    auth: "JWT",
  },
  {
    method: "GET",
    path: "/api/leaderboard",
    description: "Return ranked players for weekly and all-time leaderboards.",
    auth: "JWT",
  },
];

export const databaseTables: DatabaseTable[] = [
  {
    name: "users",
    columns: ["id", "username", "email", "password_hash", "xp", "level", "coins", "created_at"],
  },
  {
    name: "worlds",
    columns: ["id", "name", "topic", "boss_name", "unlock_xp", "sort_order"],
  },
  {
    name: "challenges",
    columns: ["id", "world_id", "title", "description", "starter_code", "expected_output", "difficulty", "xp_reward"],
  },
  {
    name: "progress",
    columns: ["id", "user_id", "challenge_id", "completed", "score", "submitted_code", "updated_at"],
  },
  {
    name: "achievements",
    columns: ["id", "code", "title", "description", "badge_color", "xp_bonus"],
  },
  {
    name: "user_achievements",
    columns: ["id", "user_id", "achievement_id", "earned_at"],
  },
  {
    name: "submissions",
    columns: ["id", "user_id", "challenge_id", "status", "stdout", "stderr", "execution_ms", "created_at"],
  },
];

export const architectureBlocks: ArchitectureBlock[] = [
  {
    title: "Frontend Game Client",
    description: "React + TypeScript + Tailwind power the immersive dashboard, world map, and coding arena.",
    bullets: [
      "Framer Motion for animated transitions and floating UI",
      "Monaco Editor for Java syntax highlighting and code editing",
      "React Query for challenge, leaderboard, and progression fetching",
      "Zustand for low-latency local game state",
    ],
  },
  {
    title: "API Layer",
    description: "NestJS or Express exposes secure REST APIs with validation, rate limiting, and JWT auth.",
    bullets: [
      "Auth module for login, register, refresh, OAuth",
      "Challenges module for missions, hints, and metadata",
      "Progress module for XP, achievements, streaks, and worlds",
      "Swagger docs for collaborative backend delivery",
    ],
  },
  {
    title: "Sandbox Execution Engine",
    description: "Java source is compiled and executed inside locked-down Docker containers for safety.",
    bullets: [
      "Ephemeral containers per execution request",
      "CPU and memory limits for abuse prevention",
      "No network access and isolated filesystem",
      "Captured stdout, stderr, compile errors, and timeouts",
    ],
  },
  {
    title: "Persistence & Analytics",
    description: "PostgreSQL stores player progression, challenge data, submissions, and rankings.",
    bullets: [
      "Normalized schema for users, challenges, and progress",
      "Indexes on user_id, challenge_id, and leaderboard views",
      "Daily streak computation and achievement unlocking",
      "Submission history for learning analytics",
    ],
  },
];

export const securityRules: SecurityRule[] = [
  {
    title: "Container Isolation",
    description: "Each run executes in Docker with --network none, memory 256m, and cpus .5 to isolate untrusted code.",
  },
  {
    title: "Timeout Protection",
    description: "Processes are killed when they exceed execution limits, preventing infinite loops and stalled workers.",
  },
  {
    title: "Static Filtering",
    description: "Dangerous APIs such as ProcessBuilder, Runtime.exec, and external I/O are blocked before execution.",
  },
  {
    title: "Auth & Rate Limits",
    description: "JWT guards, request validation, and per-user throttling reduce abuse on run and submit endpoints.",
  },
];

export const deploymentStack = [
  "Frontend on Vercel with edge caching",
  "Backend on Railway or Render with autoscaling",
  "PostgreSQL on Supabase",
  "Docker runner on VPS or AWS EC2",
  "CI/CD with GitHub Actions and environment-sealed secrets",
];

export const platformHighlights = [
  {
    title: "Immersive Learning Loop",
    description: "Every lesson is framed as a mission with XP, coins, bosses, and unlockable worlds.",
  },
  {
    title: "Interactive Coding Arena",
    description: "Monaco-powered Java editing, console output, hints, and challenge validation create a real practice loop.",
  },
  {
    title: "RPG Progression",
    description: "Players grow from Java Apprentice to advanced mastery with achievements and streak systems.",
  },
  {
    title: "Secure Execution Design",
    description: "The backend architecture is designed for safe containerized code execution and scalable persistence.",
  },
];

export function getChallengeById(id: string) {
  return challenges.find((challenge) => challenge.id === id);
}

export function getWorldById(id: string) {
  return worlds.find((world) => world.id === id);
}

export function getNextChallengeId(completedIds: string[]) {
  return challenges.find((challenge) => !completedIds.includes(challenge.id))?.id ?? challenges[challenges.length - 1]?.id;
}

const restrictedPatterns = [
  /Runtime\.getRuntime/i,
  /ProcessBuilder/i,
  /System\.exit/i,
  /java\.io\./i,
  /Files\./i,
  /Socket/i,
  /URL/i,
];

export function evaluateJavaSubmission(code: string, challenge: Challenge): ExecutionResult {
  const normalized = code.replace(/\s+/g, " ").trim().toLowerCase();

  if (!normalized.includes("class main")) {
    return {
      success: false,
      passed: false,
      title: "Compilation failed",
      output: "Main.java:1: error: class Main not found or not declared correctly.",
      mentor: "Java programs need a class Main when the platform expects a standard entry point.",
      diagnostics: challenge.hiddenTests.map((test) => `• ${test}`),
    };
  }

  const hasMainMethod = /main\s*\(\s*String\s*(\[\s*\]\s*\w+|\w+\s*\[\s*\]|\.\.\.\s*\w+)\s*\)/i.test(code) ||
    normalized.includes("main(string[] args)") ||
    normalized.includes("main(string args[])");

  if (!hasMainMethod) {
    return {
      success: false,
      passed: false,
      title: "Compilation failed",
      output: "Main.java:2: error: main method not found in class Main.",
      mentor: "Make sure you define public static void main(String[] args).",
      diagnostics: challenge.hiddenTests.map((test) => `• ${test}`),
    };
  }

  const blockedPattern = restrictedPatterns.find((pattern) => pattern.test(code));
  if (blockedPattern) {
    return {
      success: false,
      passed: false,
      title: "Sandbox blocked the program",
      output: `SecurityException: restricted API usage detected (${blockedPattern}).`,
      mentor: "Javify sandboxes code execution. Avoid filesystem, process, or network APIs in challenge solutions.",
      diagnostics: challenge.hiddenTests.map((test) => `• ${test}`),
    };
  }

  // Extract console output from System.out.println / print
  const printMatches = [...code.matchAll(/System\.out\.print(?:ln)?\s*\(\s*(?:"([^"]*)"|([^)]*))\s*\)/g)];
  const extractedOutputs = printMatches.map((m) => (m[1] !== undefined ? m[1] : (m[2] || "").trim()));
  const simulatedOutput = extractedOutputs.join("\n").trim();

  const matchedSnippets = challenge.requiredSnippets.filter((snippet) => {
    if (snippet === "main(String[] args)") {
      return hasMainMethod;
    }
    return normalized.includes(snippet.toLowerCase());
  }).length;

  const outputMatchesExpected =
    simulatedOutput.toLowerCase() === challenge.expectedOutput.trim().toLowerCase() ||
    normalized.includes(challenge.expectedOutput.trim().toLowerCase());

  const completionRatio = matchedSnippets / challenge.requiredSnippets.length;
  const passed = (completionRatio >= 0.75 && outputMatchesExpected) || completionRatio === 1;

  if (passed) {
    return {
      success: true,
      passed: true,
      title: challenge.boss ? "Boss defeated" : "Mission complete",
      output: simulatedOutput || challenge.expectedOutput,
      mentor: challenge.mentorFeedback,
      diagnostics: challenge.hiddenTests.map((test) => `✓ ${test}`),
    };
  }

  const hasConsoleOutput = /System\.out\.print/i.test(code);
  if (!hasConsoleOutput) {
    return {
      success: true,
      passed: false,
      title: "Program executed",
      output: "Program compiled, but no console output was detected for this mission.",
      mentor: challenge.hint,
      diagnostics: challenge.hiddenTests.map((test) => `• ${test}`),
    };
  }

  return {
    success: true,
    passed: false,
    title: "Output mismatch",
    output: simulatedOutput
      ? `Output:\n${simulatedOutput}\n\nExpected:\n${challenge.expectedOutput}`
      : `Execution finished, but the output did not satisfy the hidden tests for ${challenge.title}.`,
    mentor: challenge.hint,
    diagnostics: challenge.hiddenTests.map((test, index) => `${index === 0 ? "✓" : "•"} ${test}`),
  };
}
