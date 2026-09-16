import "dotenv/config";

export const env = {
  PORT: parseInt(process.env.PORT ?? "4000", 10),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET ?? "change-me-in-production",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "change-me-refresh",
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? "15m",
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? "30d",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? "587", 10),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM ?? "Javify <no-reply@javify.dev>",
  DOCKER_RUNNER_IMAGE: process.env.DOCKER_RUNNER_IMAGE ?? "openjdk:17-slim",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  // GitHub OAuth + secure token storage
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,
  GITHUB_TOKEN_ENCRYPTION_KEY: process.env.GITHUB_TOKEN_ENCRYPTION_KEY,
};
