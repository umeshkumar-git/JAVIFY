import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/middleware/**/*.js",
        "src/services/auth.service.js",
        "src/services/challenge.service.js",
        "src/services/token.service.js",
        "src/services/user.service.js",
        "src/utils/apiResponse.js",
      ],
      exclude: [
        "src/server.js",
        "src/utils/prisma.js",
        "src/repositories/**/*.js",
        "src/queue/**/*.js",
        "src/routes/**/*.js",
        "src/services/ai.service.js",
        "src/services/email.service.js",
        "src/services/github.service.js",
        "src/services/judge.service.js",
        "src/services/queue.service.js",
        "src/services/sandbox.service.js",
        "src/services/battleSocket.service.js",
        "src/utils/cache.js",
      ],
      thresholds: {
        statements: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
});
