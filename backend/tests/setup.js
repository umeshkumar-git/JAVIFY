process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret";
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? "30d";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
