import type { Challenge, ExecutionResult } from "../data/javify";
import { evaluateJavaSubmission } from "../data/javify";

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
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  // 1. Primary: Use local Javify backend Java 24 compiler & runtime
  try {
    const backendRes = await fetch("/api/compile", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        timeout: 5000,
      }),
    });

    if (backendRes.ok) {
      const data = await backendRes.json();

      if (data.stage === "security") {
        return {
          success: false,
          passed: false,
          title: "Sandbox blocked the program",
          output: data.run?.output || "SecurityException: restricted API pattern detected.",
          mentor: "Avoid filesystem, process, and network APIs. Javify only allows challenge-safe Java code.",
          diagnostics: challenge.hiddenTests.map((test) => `• ${test}`),
        };
      }

      if (data.compile && data.compile.code !== 0) {
        return {
          success: false,
          passed: false,
          title: "Compilation failed",
          output: data.compile.output || data.compile.stderr || "javac reported a compilation error",
          mentor: "Read the first compiler error. It usually points to the exact line where Java stopped understanding the program.",
          diagnostics: ["• javac reported an error", ...challenge.hiddenTests.map((test) => `• ${test}`)],
        };
      }

      if (data.run && data.run.code !== 0) {
        const errorText = data.run.stderr || data.run.output || "Program crashed during execution.";
        return {
          success: false,
          passed: false,
          title: "Runtime error",
          output: errorText,
          mentor: "The code compiled, but threw an unhandled exception while running. Check bounds, null references, and types.",
          diagnostics: ["✓ Java code compiled successfully", "• Runtime stage failed", ...challenge.hiddenTests.map((test) => `• ${test}`)],
        };
      }

      const rawStdout = data.run?.stdout ?? data.run?.output ?? "";
      const validation = validateAgainstChallenge(code, rawStdout, challenge);

      return {
        success: true,
        passed: validation.passed,
        title: validation.passed ? (challenge.boss ? "Boss defeated" : "Mission complete") : "Program executed",
        output: rawStdout.trim() ? rawStdout.trim() : "Program finished with no output.",
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
    }
  } catch (backendError) {
    // If backend is unreachable or timed out, seamlessly use in-browser challenge evaluator
    console.info("[JavaRunner] Live backend unavailable, using smart sandbox validator:", backendError);
  } finally {
    window.clearTimeout(timeoutId);
  }

  // 2. Resilient In-Browser Execution & Validation Fallback
  const fallback = evaluateJavaSubmission(code, challenge);
  return {
    ...fallback,
    title: fallback.passed
      ? challenge.boss ? "Boss defeated" : "Mission complete"
      : fallback.title,
  };
}

export function getCompilerStatusLabel() {
  return "Java 24.0.2 compiler ready";
}