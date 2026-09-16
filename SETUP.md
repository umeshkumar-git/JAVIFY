# Frontend & Backend Connection Setup Guide

## ✅ What's Been Done

1. **Created `.env` file** - Backend environment variables configured
2. **Changed database to PostgreSQL** - Prisma schema updated
3. **Created `docker-compose.yml`** - Easy PostgreSQL setup via Docker
4. **Created setup script** - Automated setup for convenience

## 🔧 Prerequisites

You need **one** of the following:

### Option A: Docker (Recommended)
```bash
# Install Docker Desktop from: https://www.docker.com/products/docker-desktop
```

### Option B: PostgreSQL Local Install
```bash
# macOS with Homebrew
brew install postgresql@16
brew services start postgresql@16
```

## 🚀 Quick Setup (Docker)

### Step 1: Make setup script executable
```bash
chmod +x setup.sh
```

### Step 2: Run the setup script
```bash
./setup.sh
```

The script will:
- Start PostgreSQL in Docker
- Wait for it to be ready
- Run database migrations
- Set everything up for you

### Step 3: Start the servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Backend will run on: `http://localhost:4000`

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Frontend will run on: `http://localhost:5173`

## 🔗 Verify Connection

1. **Check Backend Health:**
   - Visit: `http://localhost:4000/api/health`
   - Should return: `{"status":"ok","timestamp":123456789}`

2. **Frontend to Backend:**
   - Go to frontend: `http://localhost:5173`
   - Open browser DevTools (F12)
   - Check Network tab - API calls should go to `http://localhost:4000`

## 🛠️ Manual Setup (Without Docker)

If you prefer manual setup:

### 1. Install PostgreSQL
```bash
brew install postgresql@16
brew services start postgresql@16
```

### 2. Create database
```bash
psql -U postgres -c "CREATE DATABASE javify_dev;"
```

### 3. Backend setup
```bash
cd backend
npm run prisma:generate
npx prisma db push
npm run dev
```

### 4. Frontend setup (new terminal)
```bash
npm run dev
```

## 📋 Configuration Files

### Backend `.env` (`backend/.env`)
- `PORT=4000` - Backend server port
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Authentication key
- `CORS_ORIGIN=http://localhost:5173` - Allows frontend requests

### Frontend API Client (`src/services/apiClient.ts`)
- Automatically connects to `http://localhost:4000`
- Uses `VITE_API_BASE_URL` environment variable if set

## ✨ Features Connected

- ✅ Authentication (Login/Register)
- ✅ User Profile Management
- ✅ Challenge Submission
- ✅ Leaderboard
- ✅ AI Mentor
- ✅ GitHub Integration
- ✅ Real-time Battles (WebSocket)
- ✅ Analytics

## 🐛 Troubleshooting

### Port 4000 already in use
```bash
# Find and kill the process
lsof -i :4000
kill -9 <PID>
```

### PostgreSQL connection error
```bash
# Verify PostgreSQL is running
psql -U postgres -c "\l"

# Or check Docker container
docker-compose logs postgres
```

### Database migration fails
```bash
cd backend
npx prisma migrate reset  # WARNING: Deletes all data
```

### Clear node_modules and reinstall
```bash
cd backend && rm -rf node_modules package-lock.json && npm install
cd .. && rm -rf node_modules package-lock.json && npm install
```

## 📚 Next Steps

1. Configure optional features in `.env`:
   - `OPENAI_API_KEY` - For AI Mentor
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - For OAuth
   - `SMTP_*` - For email notifications

2. Start developing! The frontend and backend are now connected.

## 🔗 API Endpoints Reference

All endpoints are prefixed with `/api/`:
- `/auth/*` - Authentication
- `/users/*` - User management
- `/challenges/*` - Challenge management
- `/submissions/*` - Code submissions
- `/leaderboard/*` - Leaderboard
- `/analytics/*` - Analytics
- `/ai/*` - AI mentor
- `/github/*` - GitHub integration
- `/battle/*` - Real-time battles
