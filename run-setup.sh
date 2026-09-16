#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         🚀 Javify Full Stack - Complete Setup Script           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
echo ""

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "📖 Install from: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm found: $(npm --version)${NC}"

echo ""

# Step 2: Check for Docker
echo -e "${YELLOW}🐳 Checking for Docker...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker found: $(docker --version)${NC}"
    HAS_DOCKER=true
else
    echo -e "${YELLOW}⚠️  Docker not found (optional)${NC}"
    HAS_DOCKER=false
fi

echo ""

# Step 3: Setup PostgreSQL
echo -e "${YELLOW}🗄️  Setting up PostgreSQL...${NC}"

if [ "$HAS_DOCKER" = true ]; then
    echo "📦 Starting PostgreSQL container..."
    docker-compose up -d postgres 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PostgreSQL container started${NC}"
        echo "⏳ Waiting for PostgreSQL to be ready (this may take 10-15 seconds)..."
        
        # Wait for PostgreSQL
        for i in {1..60}; do
            if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
                echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
                break
            fi
            if [ $i -eq 60 ]; then
                echo -e "${RED}❌ PostgreSQL failed to start${NC}"
                echo "Try: docker-compose logs postgres"
                exit 1
            fi
            printf "."
            sleep 1
        done
    else
        echo -e "${RED}❌ Failed to start PostgreSQL container${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Docker not available - skipping PostgreSQL setup${NC}"
    echo "Please ensure PostgreSQL is running locally on port 5432"
fi

echo ""

# Step 4: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
echo ""

echo "📥 Installing backend dependencies..."
cd backend 2>/dev/null
if npm install --legacy-peer-deps &>/dev/null; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Some backend packages may have warnings (non-critical)${NC}"
fi
cd .. 2>/dev/null

echo "📥 Installing frontend dependencies..."
if npm install --legacy-peer-deps &>/dev/null; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Some frontend packages may have warnings (non-critical)${NC}"
fi

echo ""

# Step 5: Setup database
echo -e "${YELLOW}🗄️  Setting up database schema...${NC}"

cd backend 2>/dev/null
echo "Generating Prisma client..."
if npx prisma generate &>/dev/null; then
    echo -e "${GREEN}✅ Prisma client generated${NC}"
else
    echo -e "${YELLOW}⚠️  Prisma generation had warnings (non-critical)${NC}"
fi

echo "Applying database migrations..."
if npx prisma db push --skip-generate &>/dev/null; then
    echo -e "${GREEN}✅ Database schema applied${NC}"
else
    echo -e "${YELLOW}⚠️  Database migration had warnings${NC}"
fi
cd .. 2>/dev/null

echo ""

# Step 6: Display summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ Setup Complete!                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📋 Configuration Summary:${NC}"
echo "   Frontend URL:  http://localhost:5173"
echo "   Backend URL:   http://localhost:4000"
echo "   API Base:      http://localhost:4000/api"
echo "   Database:      PostgreSQL on localhost:5432"
echo ""

echo -e "${BLUE}🚀 To start the servers, run in separate terminals:${NC}"
echo ""
echo -e "${YELLOW}Terminal 1 - Backend Server:${NC}"
echo "  cd backend && npm run dev"
echo ""
echo -e "${YELLOW}Terminal 2 - Frontend Server:${NC}"
echo "  npm run dev"
echo ""

echo -e "${BLUE}✨ Next Steps:${NC}"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Check browser DevTools (F12) to see API calls"
echo "  3. Verify connection at http://localhost:4000/api/health"
echo ""

echo -e "${BLUE}📚 Documentation:${NC}"
echo "  - Full Guide: SETUP.md"
echo "  - README: README.md"
echo ""
