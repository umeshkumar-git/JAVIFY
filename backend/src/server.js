import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server as SocketServer } from "socket.io";

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
import { errorHandler } from "./middleware/errorHandler.js";
import { registerBattleSocket } from "./services/battleSocket.service.js";
import logger from "./utils/logger.js";
import { successResponse, errorResponse } from "./utils/apiResponse.js";

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

const generalLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 120,
	standardHeaders: true,
	legacyHeaders: false,
});
app.use("/api/", generalLimiter);

app.get("/api/health", (_req, res) =>
	res.json(successResponse({ status: "ok", timestamp: Date.now() })),
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/battles", battleRoutes);

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

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => logger.info(`Javify backend listening on :${PORT}`));
