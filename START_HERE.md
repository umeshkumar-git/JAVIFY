# 🎯 Javify - START HERE

Welcome to Javify! This guide will get you up and running in **10 minutes**.

## ⚡ Quick Status

✅ **Frontend**: Installed and configured  
✅ **Backend**: Installed and configured  
✅ **Database**: PostgreSQL configured  
✅ **Connection**: Frontend ↔ Backend properly configured  

**Status**: Ready to run! Just need PostgreSQL running.

---

## 🚀 Get Started (3 Steps)

### Step 1: Install PostgreSQL

You don't have Docker, so you need PostgreSQL locally:

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
psql -U postgres -c "CREATE DATABASE javify_dev;"
```

**Linux (Ubuntu):**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE DATABASE javify_dev;"
```

**Windows:**
- Download: https://www.postgresql.org/download/windows/
- Install with default settings
- Create database using pgAdmin or command prompt

See [POSTGRES_SETUP.md](POSTGRES_SETUP.md) for detailed instructions.

### Step 2: Verify Connection

```bash
# Test PostgreSQL is running
psql -U postgres -d javify_dev -c "SELECT 1;"
```

Should return: `1` ✅

### Step 3: Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Look for: `Server running on http://localhost:4000` ✅

**Terminal 2 - Frontend (new terminal):**
```bash
npm run dev
```

Look for: `http://localhost:5173` ✅

---

## ✨ Verify Everything Works

### 1. Open Browser
Visit: **http://localhost:5173**

### 2. Check Network
- Open DevTools: **F12**
- Go to **Network** tab
- Refresh page
- Look for requests to `http://localhost:4000`

### 3. Test Backend Health
Visit: **http://localhost:4000/api/health**

Should show:
```json
{"status":"ok","timestamp":1692000000}
```

---

## 📁 Project Structure

```
javify/
├── src/                    # React Frontend
│   ├── App.tsx            # Main app component
│   ├── services/          # API client, services
│   ├── features/          # Feature modules
│   └── store/             # State management
├── backend/               # Node.js/Express Backend
│   ├── src/
│   │   ├── server.js      # Server setup
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── middleware/    # Auth, errors
│   └── prisma/            # Database
├── .env                   # Frontend config
└── backend/.env           # Backend config
```

---

## 🔗 Connection Configuration

**Frontend** → **Backend** connection is set up:
- Frontend connects to: `http://localhost:4000` ✅
- Backend allows origin: `http://localhost:5173` ✅
- All API routes registered and ready ✅

---

## 📊 Available API Endpoints

```
GET    /api/health              → Server status
POST   /api/auth/register       → Register user
POST   /api/auth/login          → Login
GET    /api/users/profile       → Get user profile
GET    /api/challenges          → List challenges
POST   /api/submissions         → Submit code
GET    /api/leaderboard         → Rankings
GET    /api/battle/battles       → Get battles
```

Full API docs available in backend routes.

---

## 🛠️ Useful Commands

### Setup
```bash
# Run complete setup
./run-setup.sh

# Check system status
./diagnose.sh
```

### Backend
```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Apply database migrations
npx prisma db push

# View database in UI
npx prisma studio

# Start dev server
npm run dev
```

### Frontend
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm build
```

### Database (PostgreSQL)
```bash
# Connect to database
psql -U postgres -d javify_dev

# Stop service (macOS)
brew services stop postgresql@16

# Check if running
brew services list | grep postgresql
```

---

## 🐛 Troubleshooting

### Frontend not connecting to backend
```bash
# Check backend is running on port 4000
lsof -i :4000

# Check frontend environment
cat .env  # Should show VITE_API_BASE_URL=http://localhost:4000
```

### Database connection error
```bash
# Verify PostgreSQL running
psql -U postgres -d javify_dev -c "SELECT 1;"

# Check database URL in backend/.env
cat backend/.env | grep DATABASE_URL
```

### Port already in use
```bash
# Kill process on port 4000
lsof -i :4000
kill -9 <PID>

# Kill process on port 5173
lsof -i :5173
kill -9 <PID>
```

### Dependency issues
```bash
# Clean install backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Clean install frontend
cd ..
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [QUICK_START.md](QUICK_START.md) | 5-minute quick setup |
| [SETUP.md](SETUP.md) | Complete setup guide |
| [POSTGRES_SETUP.md](POSTGRES_SETUP.md) | PostgreSQL installation |
| [README.md](README.md) | Project overview |

---

## 🎉 Next Steps

1. ✅ PostgreSQL running
2. ✅ Backend: `cd backend && npm run dev`
3. ✅ Frontend: `npm run dev`
4. ✅ Visit: http://localhost:5173
5. 🚀 Start coding!

---

## 💡 Tips

- **Use DevTools** (F12) to debug API calls
- **Check Console** for errors
- **Terminal will show** both frontend and backend logs
- **Prisma Studio** (`npx prisma studio`) for visual database management
- **Reload page** after restarting servers

---

## 🆘 Need Help?

1. Check **TROUBLESHOOTING** section above
2. Run diagnostic: `./diagnose.sh`
3. Check **POSTGRES_SETUP.md** for database issues
4. See **SETUP.md** for detailed instructions

---

**You're all set! Let's build something awesome! 🚀**
