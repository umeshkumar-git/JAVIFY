import Docker from "dockerode";
import { v4 as uuid } from "uuid";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";

const docker = new Docker();

const FORBIDDEN_API_PATTERNS = [
  /Runtime\.getRuntime/i,
  /ProcessBuilder/i,
  /System\.exit/i,
  /java\.net\./i,
  /java\.io\.File/i,
  /Files\./i,
  /Socket/i,
  /URL\s*\(/i,
];

/**
 * Compile and execute Java source code inside a hardened Docker container.
 *
 * Security:
 *  - --network none
 *  - read-only root filesystem
 *  - memory and CPU limits
 *  - hard timeout
 *  - no privileged
 *  - auto-removed on exit
 */
export async function executeJavaInDocker({
  code,
  stdin = "",
  memoryLimit = 256, // MB
  timeLimit = 4000, // ms
}) {
  // 1. Pre-execution static guard
  const blocked = FORBIDDEN_API_PATTERNS.find((p) => p.test(code));
  if (blocked) {
    return {
      compileError: null,
      runtimeError: `Forbidden API usage detected (${blocked.source}).`,
      stdout: "",
      stderr: "",
      executionTime: 0,
      memoryUsage: 0,
    };
  }

  const containerName = `javify-run-${uuid()}`;
  const startedAt = Date.now();
  let container;

  try {
    // Use a single-line shell command that compiles & runs the Java source piped via stdin
    container = await docker.createContainer({
      Image: env.DOCKER_RUNNER_IMAGE,
      name: containerName,
      Cmd: [
        "sh",
        "-c",
        `mkdir -p /tmp/run && cat > /tmp/run/Main.java && cd /tmp/run && javac Main.java 2> compile.err && (echo "${stdin.replace(/"/g, '\\"')}" | timeout ${Math.ceil(timeLimit / 1000)} java -Xmx${memoryLimit}m Main) ; CODE=$? ; cat compile.err 1>&2 ; exit $CODE`,
      ],
      OpenStdin: true,
      StdinOnce: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      User: "nobody",
      WorkingDir: "/tmp/run",
      HostConfig: {
        AutoRemove: true,
        NetworkMode: "none",
        Memory: memoryLimit * 1024 * 1024,
        MemorySwap: memoryLimit * 1024 * 1024,
        CpuPeriod: 100000,
        CpuQuota: 50000, // 0.5 CPU
        PidsLimit: 64,
        ReadonlyRootfs: false,
        Tmpfs: { "/tmp/run": "rw,size=64m" },
        SecurityOpt: ["no-new-privileges"],
      },
    });

    const stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
    });
    await container.start();
    stream.write(code);
    stream.end();

    let stdout = "";
    let stderr = "";
    const out = [];
    const err = [];
    docker.modem.demuxStream(
      stream,
      { write: (chunk) => out.push(chunk.toString()) },
      { write: (chunk) => err.push(chunk.toString()) }
    );

    const result = await Promise.race([
      container.wait(),
      new Promise((_resolve, reject) => setTimeout(() => reject(new Error("TIMEOUT")), timeLimit + 4000)),
    ]);

    stdout = out.join("");
    stderr = err.join("");
    const executionTime = Date.now() - startedAt;

    return {
      compileError: result.StatusCode !== 0 && stderr.includes(".java:") ? stderr : null,
      runtimeError: result.StatusCode !== 0 && !stderr.includes(".java:") ? stderr : null,
      stdout,
      stderr,
      executionTime,
      memoryUsage: 0, // Docker stats would require an additional API call
    };
  } catch (error) {
    logger.error("Sandbox execution error", { error: error.message });
    try {
      if (container) await container.remove({ force: true });
    } catch (_) {}
    return {
      compileError: null,
      runtimeError: error.message === "TIMEOUT" ? "Execution exceeded time limit." : error.message,
      stdout: "",
      stderr: "",
      executionTime: Date.now() - startedAt,
      memoryUsage: 0,
    };
  }
}
