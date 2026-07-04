import { env } from "../config/env.js";
import { prisma } from "../utils/prisma.js";

const STATIC_PATTERNS = [
  {
    test: /for\s*\(.*<=\s*\w+\.length/,
    type: "off-by-one",
    explanation:
      "Off-by-one error: Java array indexes range from 0 to length−1. Use `< arr.length` instead of `<= arr.length`.",
  },
  {
    test: /catch\s*\(\s*Exception\s+\w+\s*\)\s*\{\s*\}/,
    type: "silent-catch",
    explanation:
      "Swallowing exceptions hides bugs. Log or rethrow, or handle specific exception types instead of catching Exception.",
  },
  {
    test: /String\s+\w+\s*=\s*"";\s*for/,
    type: "string-concat",
    explanation:
      "Concatenating Strings in a loop creates many temporary objects. Use StringBuilder for O(n) performance.",
  },
  {
    test: /while\s*\(\s*true\s*\)/,
    type: "infinite-loop",
    explanation:
      "`while(true)` needs a clear exit condition (`break`) to avoid infinite execution and timeout.",
  },
];

function heuristicAnalysis(code) {
  const issues = STATIC_PATTERNS.filter((p) => p.test.test(code));
  if (issues.length === 0) {
    return {
      hint: "Your code looks structurally clean. Focus on edge cases such as empty input, very large values, and null references.",
      explanation:
        "No common antipatterns were detected. Verify the logical correctness against the problem constraints.",
      improvement: code,
      suggestions: [
        "Practice with edge-case-heavy challenges",
        "Try a harder difficulty in the same world",
        "Explore Java Streams to express the same logic functionally",
      ],
    };
  }

  const first = issues[0];
  return {
    hint: `Possible ${first.type}: ${first.explanation}`,
    explanation: issues.map((i) => `• ${i.explanation}`).join("\n"),
    improvement: `// AI suggested improvement\n// Address: ${issues.map((i) => i.type).join(", ")}\n\n${code}`,
    suggestions: [
      "Review the related Java fundamentals world",
      "Try the next mission in the same category",
      "Re-attempt this challenge after reviewing the hint",
    ],
  };
}

export async function analyzeSubmission({ userId, challengeId, code, requestedType = "hint" }) {
  const prompt = `Analyze this Java code for a learning challenge:\n\n${code}\n\nProvide ${requestedType}.`;
  const result = heuristicAnalysis(code);

  await prisma.aiInteraction.create({
    data: {
      userId,
      challengeId: challengeId ?? null,
      prompt,
      response: JSON.stringify(result),
      type: requestedType,
    },
  });

  return result;
}
