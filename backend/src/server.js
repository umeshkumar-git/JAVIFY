import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server as SocketServer } from "socket.io";
import swaggerUi from "swagger-ui-express";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import challengeRoutes from "./routes/challenge.routes.js";
import submissionRoutes from "./routes/submission.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import recommendationRoutes from "./routes/recommendation.routes.js";
import battleRoutes from "./routes/battle.routes.js";
import githubRoutes from "./routes/github.routes.js";
import gatewayRoutes from "./routes/gateway.routes.js";
import bffRoutes from "./routes/bff.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { registerBattleSocket } from "./services/battleSocket.service.js";
import { registerSessionSyncSocket } from "./services/sessionSync.service.js";
import { createRedisRateLimiter } from "./middleware/redisRateLimiter.js";
import logger from "./utils/logger.js";
import { successResponse, errorResponse } from "./utils/apiResponse.js";
import { connectRedis } from "./utils/cache.js";
import { startWorkers } from "./queue/workers.js";
import { swaggerSpec } from "./docs/swagger.js";

const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
	cors: {
		origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
		credentials: true,
	},
});

app.use(helmet());
app.use(
	cors({
		origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
		credentials: true,
	}),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("combined"));

const generalLimiter = createRedisRateLimiter({
	windowMs: 60 * 1000,
	max: 120,
	keyPrefix: "rl:api",
});
app.use("/api/", generalLimiter);

app.get("/health", (_req, res) =>
	res.json(
		successResponse({
			status: "ok",
			service: "javify-api",
			timestamp: Date.now(),
		}),
	),
);

app.get("/api/health", (_req, res) =>
	res.json(
		successResponse({
			status: "ok",
			service: "javify-api",
			timestamp: Date.now(),
		}),
	),
);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
	explorer: true,
	customSiteTitle: "Javify API Docs",
}));

app.get("/api/docs.json", (_req, res) => {
	res.json(swaggerSpec);
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/battles", battleRoutes);
app.use("/api/gateway", gatewayRoutes);
app.use("/api/bff", bffRoutes);

// GitHub OAuth uses the /auth namespace per spec (popup redirect)
app.use("/auth/github", githubRoutes);

app.use((req, res) => {
	res.status(404).json(
		errorResponse(
			"ROUTE_NOT_FOUND",
			`Route ${req.originalUrl} was not found.`,
		),
	);
});

app.use(errorHandler);

registerBattleSocket(io);
registerSessionSyncSocket(io);

async function startServer() {
	await connectRedis();
	await startWorkers();
	const PORT = process.env.PORT || 4000;
	server.listen(PORT, () =>
		logger.info(`Javify backend listening on :${PORT}`),
	);
}

startServer();
