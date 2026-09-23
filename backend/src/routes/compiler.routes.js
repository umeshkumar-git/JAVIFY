import { Router } from "express";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import logger from "../utils/logger.js";

const router = Router();

const RESTRICTED_PATTERNS = [
  /Runtime\.getRuntime/i,
  /ProcessBuilder/i,
  /System\.exit/i,
  /java\.net\./i,
  /Socket/i,
  /URL\s*\(/i,
];

router.post("/", async (req, res) => {
  const { code, stdin = "", timeout = 5000 } = req.body || {};

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Java code string is required." });
  }

  // Security static filter
  const blocked = RESTRICTED_PATTERNS.find((p) => p.test(code));
  if (blocked) {
    return res.json({
      success: false,
      stage: "security",
      compile: null,
      run: {
        code: 1,
        stdout: "",
        stderr: `SecurityException: restricted API pattern blocked (${blocked.source}).`,
        output: `SecurityException: restricted API pattern blocked (${blocked.source}).`,
      },
    });
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "javify-run-"));
  const mainFile = path.join(tmpDir, "Main.java");

  try {
    fs.writeFileSync(mainFile, code, "utf-8");

    // Stage 1: Compile
    const compileResult = await new Promise((resolve) => {
      execFile("javac", ["Main.java"], { cwd: tmpDir, timeout: 6000 }, (err, stdout, stderr) => {
        resolve({ err, stdout: stdout || "", stderr: stderr || "" });
      });
    });

    if (compileResult.err || (compileResult.stderr && compileResult.stderr.includes("error:"))) {
      return res.json({
        success: false,
        stage: "compile",
        compile: {
          code: 1,
          stdout: compileResult.stdout,
          stderr: compileResult.stderr,
          output: compileResult.stderr || compileResult.stdout,
        },
        run: null,
      });
    }

    // Stage 2: Execute
    const runResult = await new Promise((resolve) => {
      const child = execFile(
        "java",
        ["-Xmx128m", "-XX:+UseSerialGC", "Main"],
        { cwd: tmpDir, timeout: Math.min(timeout, 8000) },
        (err, stdout, stderr) => {
          resolve({ err, stdout: stdout || "", stderr: stderr || "" });
        }
      );

      if (stdin && child.stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }
    });

    const runFailed = !!runResult.err || (runResult.stderr && runResult.stderr.includes("Exception"));

    return res.json({
      success: !runFailed,
      stage: runFailed ? "run" : "completed",
      compile: {
        code: 0,
        stdout: compileResult.stdout,
        stderr: compileResult.stderr,
      },
      run: {
        code: runFailed ? 1 : 0,
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        output: runResult.stdout || runResult.stderr,
      },
    });
  } catch (err) {
    logger.error("Compiler execution internal error", { error: err.message });
    return res.status(500).json({
      error: "Internal compiler execution error",
      details: err.message,
    });
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
});

export default router;
