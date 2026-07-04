import type { Challenge, ExecutionResult } from "../data/javify";
import { evaluateJavaSubmission } from "../data/javify";

const PISTON_API_BASE = "https://emkc.org/api/v2/piston";
const DEFAULT_JAVA_VERSION = "15.0.2";

type PistonRuntime = {
  language: string;
  version: string;
  aliases?: string[];
};

type PistonStage = {
  stdout?: string;
  stderr?: string;
  output?: string;
  code?: number | null;
  signal?: string | null;
};

type PistonExecuteResponse = {
  language?: string;
  version?: string;
  compile?: PistonStage;
  run?: PistonStage;
  message?: string;
};

let cachedJavaVersion: string | null = null;

const restrictedPatterns = [
  /Runtime\.getRuntime/i,
  /ProcessBuilder/i,
  /System\.exit/i,
  /java\.io\./i,
  /Files\./i,
  /Socket/i,
  /URL/i,
];

function normalizeOutput(output: string) {
  return output.replace(/\r\n/g, "\n").trim();
}

function formatCompilerOutput(response: PistonExecuteResponse) {
  const compileOutput = [response.compile?.stdout, response.compile?.stderr]
    .filter(Boolean)
    .join("")
    .trim();
  const runOutput = [response.run?.stdout, response.run?.stderr].filter(Boolean).join("").trim();

  if (compileOutput && runOutput) {
    return `Compile:\n${compileOutput}\n\nRun:\n${runOutput}`;
  }

  return runOutput || compileOutput || response.message || "Program finished with no output.";
}

function buildDiagnostics(challenge: Challenge, passed: boolean, outputMatched: boolean, snippetsMatched: boolean) {
  if (passed) {
    return [
      "✓ Java code compiled successfully",
      "✓ Program executed in the sandbox compiler",
      ...challenge.hiddenTests.map((test) => `✓ ${test}`),
    ];
  }

  return [
    outputMatched ? "✓ Output matches the expected result" : "• Output does not match the expected result",
    snippetsMatched ? "✓ Required Java concept appears in the code" : "• Required Java concept was not detected",
    ...challenge.hiddenTests.map((test) => `• ${test}`),
  ];
}

function validateAgainstChallenge(code: string, output: string, challenge: Challenge) {
  const normalizedCode = code.replace(/\s+/g, " ").trim().toLowerCase();
  const outputMatched = normalizeOutput(output) === normalizeOutput(challenge.expectedOutput);
  const snippetsMatched = challenge.requiredSnippets.every((snippet) =>
    normalizedCode.includes(snippet.toLowerCase())
  );

  return {
    outputMatched,
    snippetsMatched,
    passed: outputMatched && snippetsMatched,
  };
}

async function fetchJavaVersion(signal: AbortSignal) {
  if (cachedJavaVersion) {
    return cachedJavaVersion;
  }

  const response = await fetch(`${PISTON_API_BASE}/runtimes`, { signal });
  if (!response.ok) {
    return DEFAULT_JAVA_VERSION;
  }

  const runtimes = (await response.json()) as PistonRuntime[];
  const javaRuntime = runtimes.find(
    (runtime) => runtime.language === "java" || runtime.aliases?.includes("java")
  );

  cachedJavaVersion = javaRuntime?.version ?? DEFAULT_JAVA_VERSION;
  return cachedJavaVersion;
}

export async function runJavaWithCompiler(code: string, challenge: Challenge): Promise<ExecutionResult> {
  const blockedPattern = restrictedPatterns.find((pattern) => pattern.test(code));
  if (blockedPattern) {
    return {
      success: false,
      passed: false,
      title: "Sandbox blocked the program",
      output: `SecurityException: restricted API usage detected (${blockedPattern}).`,
      mentor: "Avoid filesystem, process, and network APIs. Javify only allows challenge-safe Java code.",
      diagnostics: challenge.hiddenTests.map((test) => `• ${test}`),
    };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);

  try {
    const version = await fetchJavaVersion(controller.signal);
    const response = await fetch(`${PISTON_API_BASE}/execute`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: "java",
        version,
        files: [
          {
            name: "Main.java",
            content: code,
          },
        ],
        stdin: "",
        args: [],
        compile_timeout: 10000,
        run_timeout: 4000,
        compile_memory_limit: 256000000,
        run_memory_limit: 256000000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Compiler returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as PistonExecuteResponse;
    const output = formatCompilerOutput(data);
    const compileFailed = typeof data.compile?.code === "number" && data.compile.code !== 0;
    const runFailed = typeof data.run?.code === "number" && data.run.code !== 0;

    if (compileFailed) {
      return {
        success: false,
        passed: false,
        title: "Compilation failed",
        output,
        mentor: "Read the first compiler error. It usually points to the exact line where Java stopped understanding the program.",
        diagnostics: ["• javac reported an error", ...challenge.hiddenTests.map((test) => `• ${test}`)],
      };
    }

    if (runFailed) {
      return {
        success: false,
        passed: false,
        title: "Runtime error",
        output,
        mentor: "The code compiled, but crashed while running. Check array indexes, null references, arithmetic, and infinite loops.",
        diagnostics: ["✓ Java code compiled", "• Runtime stage failed", ...challenge.hiddenTests.map((test) => `• ${test}`)],
      };
    }

    const rawStdout = data.run?.stdout ?? data.run?.output ?? "";
    const validation = validateAgainstChallenge(code, rawStdout, challenge);

    return {
      success: true,
      passed: validation.passed,
      title: validation.passed ? (challenge.boss ? "Boss defeated" : "Mission complete") : "Program executed",
      output: rawStdout.trim() ? rawStdout.trim() : output,
      mentor: validation.passed
        ? challenge.mentorFeedback
        : validation.outputMatched
          ? "Your output is correct, but the hidden concept checks did not pass. Use the required Java structure for this world."
          : challenge.hint,
      diagnostics: buildDiagnostics(
        challenge,
        validation.passed,
        validation.outputMatched,
        validation.snippetsMatched
      ),
    };
  } catch (error) {
    const fallback = evaluateJavaSubmission(code, challenge);
    const message = error instanceof Error ? error.message : "Unknown compiler connection error";

    return {
      ...fallback,
      title: "Compiler offline fallback",
      output: `The live Java compiler could not be reached (${message}).\n\nFallback validation result:\n${fallback.output}`,
      mentor: "The public compiler service may be rate-limited or offline. Javify kept the mission usable with local fallback validation.",
      diagnostics: ["• Live compiler unavailable", ...fallback.diagnostics],
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function getCompilerStatusLabel() {
  return cachedJavaVersion ? `Java ${cachedJavaVersion}` : "Java compiler ready";
}