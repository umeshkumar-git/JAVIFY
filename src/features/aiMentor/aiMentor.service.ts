import { apiRequest, isBackendConfigured, tokenStore } from "../../services/apiClient";

export type AiAnalysisType = "hint" | "explanation" | "improve" | "suggestion";

export interface AiAnalysisResult {
  hint: string;
  explanation: string;
  improvement: string;
  suggestions: string[];
}

const STATIC_PATTERNS: Array<{ test: RegExp; type: string; message: string }> = [
  {
    test: /for\s*\(.*<=\s*\w+\.length/,
    type: "off-by-one",
    message:
      "Off-by-one error: Java array indexes range from 0 to length−1. Use `< arr.length` instead of `<= arr.length`.",
  },
  {
    test: /catch\s*\(\s*Exception\s+\w+\s*\)\s*\{\s*\}/,
    type: "silent-catch",
    message:
      "Swallowing exceptions hides bugs. Log or rethrow them, or catch specific exception types.",
  },
  {
    test: /String\s+\w+\s*=\s*"";\s*for/,
    type: "string-concat-loop",
    message:
      "Concatenating Strings in a loop creates many temporary objects. Use StringBuilder for O(n) performance.",
  },
  {
    test: /while\s*\(\s*true\s*\)/,
    type: "infinite-loop",
    message:
      "`while(true)` needs a clear exit condition (`break`) to avoid infinite execution.",
  },
  {
    test: /\.equals\s*\(\s*null\s*\)/,
    type: "null-equals",
    message: "Calling `.equals(null)` will throw NullPointerException. Use `== null` instead.",
  },
  {
    test: /==\s*"[^"]+"|"[^"]+"\s*==/,
    type: "string-equality",
    message:
      "Compare Strings with `.equals(...)`, not `==`. The `==` operator only checks reference equality.",
  },
  {
    test: /int\s+\w+\s*=\s*\w+\s*\/\s*\w+/,
    type: "integer-division",
    message:
      "Integer division truncates the result. Cast one operand to double for fractional results.",
  },
];

function heuristicAnalysis(code: string): AiAnalysisResult {
  const issues = STATIC_PATTERNS.filter((p) => p.test.test(code));

  if (issues.length === 0) {
    return {
      hint: "Your code looks structurally clean. Focus on edge cases — empty input, very large values, and null references.",
      explanation:
        "No common antipatterns were detected. Verify logical correctness against the problem's constraints and edge cases.",
      improvement:
        "// Your code is well-structured.\n// Consider adding input validation and edge-case handling.\n\n" + code,
      suggestions: [
        "Try a harder difficulty in the same world",
        "Practice edge-case-heavy challenges",
        "Explore Java Streams to express the same logic functionally",
      ],
    };
  }

  const first = issues[0];
  return {
    hint: `Possible ${first.type}: ${first.message}`,
    explanation: issues.map((i) => `• ${i.message}`).join("\n\n"),
    improvement:
      `// AI suggested improvements:\n// Address: ${issues.map((i) => i.type).join(", ")}\n\n` + code,
    suggestions: [
      `Review fundamentals related to: ${issues.map((i) => i.type).join(", ")}`,
      "Re-attempt this challenge after applying the fix",
      "Try the next mission in this world to reinforce the concept",
    ],
  };
}

export async function analyzeCode(
  code: string,
  challengeId?: string,
  type: AiAnalysisType = "hint"
): Promise<AiAnalysisResult> {
  if (isBackendConfigured()) {
    try {
      return await apiRequest<AiAnalysisResult>("/api/ai/analyze", {
        method: "POST",
        body: { code, challengeId, type },
        authToken: tokenStore.getAccessToken() ?? undefined,
      });
    } catch (error) {
      console.warn("[ai-mentor] Backend unavailable, using local heuristic", error);
    }
  }
  return heuristicAnalysis(code);
}
