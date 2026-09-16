# 🗄️ PostgreSQL Setup Guide for Javify

Since Docker is not available on your system, you'll need to install PostgreSQL locally.

## 🍎 macOS Installation (Using Homebrew)

### Step 1: Install PostgreSQL

```bash
# Install PostgreSQL 16
brew install postgresql@16

# Verify installation
psql --version
```

### Step 2: Start PostgreSQL Service

```bash
# Start PostgreSQL service
brew services start postgresql@16

# Verify it's running
brew services list | grep postgresql
```

### Step 3: Create the Database

```bash
# Connect to PostgreSQL as default user
psql -U postgres

# Inside psql prompt, create the database:
CREATE DATABASE javify_dev;

# Verify database was created
\l

# Exit psql
\q
```

### Step 4: Verify Connection

```bash
# Test connection to the new database
psql -U postgres -d javify_dev

# You should see the prompt: javify_dev=#
# Exit with \q
```

---

## 🐧 Linux Installation (Ubuntu/Debian)

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql

# Create database
sudo -u postgres psql -c "CREATE DATABASE javify_dev;"
```

---

## 🪟 Windows Installation

1. Download installer: https://www.postgresql.org/download/windows/
2. Run the installer
3. Note the password you set for the `postgres` user
4. During installation, select port 5432 (default)
5. Finish installation

Then create the database using `pgAdmin` or command prompt:
```powershell
psql -U postgres

# Inside psql:
CREATE DATABASE javify_dev;
\q
```

---

## ✅ Verify Setup Before Running Javify

```bash
# Test database connection
psql -U postgres -d javify_dev -c "SELECT 1;"

# You should see: 1 (meaning connection successful)
```

---

## 🚀 After Database Setup

Once PostgreSQL is running and the database is created:

### 1. Check Backend .env

Make sure `backend/.env` has:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/javify_dev"
```

Replace `password` with your actual PostgreSQL password (set during installation).

### 2. Generate Prisma Client

```bash
cd backend
npx prisma generate
```

### 3. Apply Database Schema

```bash
# This creates all tables
npx prisma db push
```

### 4. Start Servers

**Terminal 1:**
```bash
cd backend
npm run dev
```

**Terminal 2:**
```bash
npm run dev
```

---

## 🔧 Common Issues

### "ECONNREFUSED - Connection refused"
- PostgreSQL is not running
- Solution: `brew services start postgresql@16`

### "role 'postgres' does not exist"
- PostgreSQL installation issue
- Solution: Reinstall PostgreSQL

### "database 'javify_dev' does not exist"
- Database not created
- Solution: Run `psql -U postgres -c "CREATE DATABASE javify_dev;"`

### "password authentication failed"
- Wrong password in DATABASE_URL
- Solution: Check your PostgreSQL password and update `.env`

---

## 📊 Database Management Tools

### PgAdmin (GUI)
```bash
# Install PgAdmin
brew install pgadmin4

# Open pgAdmin
open /Applications/pgAdmin\ 4.app
```

### Prisma Studio (Built-in)
```bash
cd backend
npx prisma studio

# Opens http://localhost:5555
```

---

## 🛑 Stop PostgreSQL

```bash
# macOS
brew services stop postgresql@16

# Linux
sudo systemctl stop postgresql

# Windows (in PowerShell as admin)
net stop postgresql-x64-16
```

---

## 📚 Next Steps

After PostgreSQL is running:
1. Run: `./run-setup.sh`
2. Terminal 1: `cd backend && npm run dev`
3. Terminal 2: `npm run dev`
4. Visit: http://localhost:5173

**Verify connection works** → Check http://localhost:4000/api/health
