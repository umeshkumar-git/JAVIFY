# Javify Backend

Production-grade Node.js + Express + Prisma + PostgreSQL + Socket.io backend for Javify.

## Architecture

```
backend/
├── prisma/
│   └── schema.prisma          # PostgreSQL schema (Users, Challenges, Submissions, etc.)
├── src/
│   ├── config/                # Env loading
│   ├── controllers/           # (Logic is inlined in routes for simplicity)
│   ├── middleware/            # auth, errorHandler, validate
│   ├── routes/                # auth, users, challenges, submissions, analytics, ai, leaderboard, recommendations, battles
│   ├── services/              # auth, token, email, judge, sandbox, ai, battleSocket
│   ├── utils/                 # logger, prisma
│   └── server.js              # Entry point
└── package.json
```

## Setup

```bash
cd backend
npm install

# Configure environment
cp .env.example .env

# Initialize database
npx prisma generate
npx prisma migrate dev --name init

# Start dev server
npm run dev
```

## Required Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/javify
JWT_SECRET=replace-with-strong-secret
JWT_REFRESH_SECRET=replace-with-strong-secret
CORS_ORIGIN=http://localhost:5173

# Email / SMTP (optional — falls back to console)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-key
SMTP_FROM="Javify <no-reply@javify.dev>"

# AI Mentor (optional — falls back to heuristic engine)
OPENAI_API_KEY=sk-...

# Sandbox runner
DOCKER_RUNNER_IMAGE=openjdk:17-slim
```

## REST API

### Authentication
- `POST /api/auth/signup` — `{ name, email, password }`
- `POST /api/auth/login` — `{ email, password }`
- `POST /api/auth/refresh` — `{ refreshToken }`
- `POST /api/auth/logout` — `{ refreshToken }`
- `POST /api/auth/send-otp` — `{ email, purpose }`
- `POST /api/auth/verify-otp` — `{ email, code, purpose }`

### Users
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/users/me/progress`
- `GET /api/users` (admin only)

### Challenges
- `GET /api/challenges`
- `GET /api/challenges/:id`
- `POST /api/challenges` (admin/moderator)
- `PATCH /api/challenges/:id` (admin/moderator)
- `DELETE /api/challenges/:id` (admin)

### Submissions
- `POST /api/submissions` — runs the Java judge with hidden + visible test cases
- `GET /api/submissions/me`

### AI Mentor
- `POST /api/ai/analyze` — returns `{ hint, explanation, improvement, suggestions[] }`

### Leaderboard
- `GET /api/leaderboard?period=weekly|monthly|all-time`

### Recommendations
- `GET /api/recommendations/me` — adaptive learning suggestions

### Multiplayer Battles
- `POST /api/battles` — create room (returns `roomCode`)
- `POST /api/battles/join` — join room by code
- `GET /api/battles/me`

### Real-time Battle Events (Socket.io)
- `battle:join` `{ battleId, userId }`
- `battle:progress` `{ battleId, userId, progress }`
- `battle:complete` `{ battleId, userId }` → awards 50 XP + 100 coins to winner

## Security

- Helmet headers
- Per-IP rate limiting (`120 req/min` global, `10 req/min` auth)
- Zod request validation
- JWT access (15m) + refresh (30d) tokens
- bcrypt password hashing (cost 12)
- Centralized error handler
- Role-based authorization (`STUDENT`, `MODERATOR`, `ADMIN`)

## Sandbox Execution

Java code is executed inside an isolated Docker container:
- `--network none`
- Memory + CPU limits
- Hard timeout
- `no-new-privileges`
- Tmpfs root for `/tmp/run`
- Auto-removed after each run
- Static guard against dangerous APIs (Runtime, ProcessBuilder, java.io.File, sockets, URL)
