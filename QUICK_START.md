# 🚀 Javify - Quick Start Guide

## Prerequisites

You need **one** of these installed:
- ✅ **Docker** (recommended) - https://www.docker.com/products/docker-desktop
- ✅ **PostgreSQL** - https://www.postgresql.org/download/

## ⚡ Ultra-Quick Setup (5 minutes)

### 1️⃣ Setup Everything
```bash
chmod +x run-setup.sh
./run-setup.sh
```

The script will:
- ✅ Check Node.js and npm
- ✅ Start PostgreSQL (via Docker)
- ✅ Install all dependencies
- ✅ Setup database

### 2️⃣ Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```

You'll see: `Server running on http://localhost:4000` ✅

### 3️⃣ Start Frontend (Terminal 2)
```bash
npm run dev
```

You'll see: `http://localhost:5173` ✅

### 4️⃣ Open Browser
Visit: **http://localhost:5173**

## ✅ Verify Connection

1. **Open DevTools** (F12 in browser)
2. **Go to Network tab**
3. **Refresh the page**
4. **Look for API calls to http://localhost:4000**

✨ If you see requests, backend & frontend are connected!

## 🛠️ Manual Backend Only Setup

If you don't have Docker:

```bash
# Install PostgreSQL locally (macOS)
brew install postgresql@16
brew services start postgresql@16

# Create database
psql -U postgres -c "CREATE DATABASE javify_dev;"

# Setup backend
cd backend
npm install
npx prisma db push
npm run dev
```

## 🔧 Configuration Files

- **Frontend**: `.env` (contains `VITE_API_BASE_URL=http://localhost:4000`)
- **Backend**: `backend/.env` (contains database and server config)

## 📊 API Endpoints (All under `/api/`)

- `/auth/*` - Login, Register, OAuth
- `/users/*` - User profiles
- `/challenges/*` - Coding challenges
- `/submissions/*` - Code submissions
- `/leaderboard/*` - Rankings
- `/battle/*` - Multiplayer battles
- `/health` - Server health check

## 🐛 Troubleshooting

### "Port 4000 already in use"
```bash
# Kill process on port 4000
lsof -i :4000
kill -9 <PID>
```

### "Cannot connect to database"
```bash
# Check PostgreSQL running
psql -U postgres -c "\l"

# Or check Docker
docker-compose logs postgres
```

### "Module not found" errors
```bash
# Reinstall dependencies
cd backend && rm -rf node_modules && npm install
cd .. && rm -rf node_modules && npm install
```

## 🎯 Common Tasks

### Run database migrations
```bash
cd backend
npx prisma migrate dev
```

### Reset database (⚠️ deletes all data)
```bash
cd backend
npx prisma migrate reset
```

### View database UI
```bash
cd backend
npx prisma studio
```

### Build for production
```bash
# Frontend
npm run build

# Backend
# No build needed - just deploy the files
```

## 📚 Full Documentation

See [SETUP.md](SETUP.md) for detailed setup and troubleshooting.

## 🚨 Emergency Reset

If something breaks:

```bash
# Stop servers (Ctrl+C)

# Clean everything
rm -rf backend/node_modules node_modules
rm backend/.prisma

# Start fresh
./run-setup.sh
```

---

**Need help?** Check SETUP.md or README.md
