import { executeJavaInDocker } from "./sandbox.service.js";
import logger from "../utils/logger.js";

/**
 * Judge a Java submission against a set of test cases.
 * Each test case has { input, expectedOutput, weight }.
 */
export async function judgeSubmission({ code, testCases, memoryLimit, timeLimit }) {
  let passed = 0;
  let totalWeight = 0;
  let earnedWeight = 0;
  let maxExecutionTime = 0;
  let maxMemory = 0;
  let firstFailure = null;
  const details = [];

  for (const test of testCases) {
    totalWeight += test.weight ?? 1;
    try {
      const result = await executeJavaInDocker({
        code,
        stdin: test.input ?? "",
        memoryLimit: memoryLimit ?? 256,
        timeLimit: timeLimit ?? 4000,
      });

      const actual = (result.stdout ?? "").trim();
      const expected = (test.expectedOutput ?? "").trim();
      const ok = actual === expected && !result.compileError && !result.runtimeError;

      maxExecutionTime = Math.max(maxExecutionTime, result.executionTime ?? 0);
      maxMemory = Math.max(maxMemory, result.memoryUsage ?? 0);

      if (ok) {
        passed += 1;
        earnedWeight += test.weight ?? 1;
      } else if (!firstFailure) {
        firstFailure = {
          input: test.input,
          expected,
          actual,
          compileError: result.compileError,
          runtimeError: result.runtimeError,
        };
      }

      details.push({
        ok,
        weight: test.weight ?? 1,
        executionTime: result.executionTime,
        memoryUsage: result.memoryUsage,
        diff: ok ? null : { expected, actual },
      });
    } catch (error) {
      logger.error("Judge case failed", { error: error.message });
      details.push({ ok: false, error: error.message });
      if (!firstFailure) firstFailure = { error: error.message };
    }
  }

  const score = totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100);
  let result;
  if (passed === testCases.length) result = "PASSED";
  else if (passed > 0) result = "PARTIAL";
  else result = "FAILED";

  return {
    result,
    score,
    passedTests: passed,
    totalTests: testCases.length,
    executionTime: maxExecutionTime,
    memoryUsage: maxMemory,
    firstFailure,
    details,
  };
}
