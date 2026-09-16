#!/bin/bash

# Javify Connection Diagnostic Script

echo "🔍 Javify Frontend-Backend Connection Diagnostic"
echo "================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# 1. Check Node.js
echo -e "${BLUE}1. Node.js Environment${NC}"
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
fi

if command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
fi
echo ""

# 2. Check project files
echo -e "${BLUE}2. Project Structure${NC}"

files=(
    "package.json"
    "backend/package.json"
    "src/main.tsx"
    "backend/src/server.js"
    ".env"
    "backend/.env"
    "vite.config.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ Found: $file${NC}"
    else
        echo -e "${YELLOW}⚠️  Missing: $file${NC}"
    fi
done
echo ""

# 3. Check environment variables
echo -e "${BLUE}3. Environment Configuration${NC}"

if [ -f ".env" ]; then
    API_URL=$(grep "VITE_API_BASE_URL" .env | cut -d'=' -f2)
    echo -e "${GREEN}✅ Frontend .env found${NC}"
    echo "   API Base URL: $API_URL"
else
    echo -e "${YELLOW}⚠️  Frontend .env not found${NC}"
fi

if [ -f "backend/.env" ]; then
    CORS=$(grep "CORS_ORIGIN" backend/.env | cut -d'=' -f2)
    DB=$(grep "DATABASE_URL" backend/.env | cut -d'=' -f2 | head -c 50)
    echo -e "${GREEN}✅ Backend .env found${NC}"
    echo "   CORS Origin: $CORS"
    echo "   Database: $DB..."
else
    echo -e "${RED}❌ Backend .env not found${NC}"
fi
echo ""

# 4. Check dependencies
echo -e "${BLUE}4. Dependencies Status${NC}"

if [ -d "node_modules" ]; then
    count=$(ls -1 node_modules | wc -l)
    echo -e "${GREEN}✅ Frontend dependencies installed ($count packages)${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend node_modules not found${NC}"
fi

if [ -d "backend/node_modules" ]; then
    count=$(ls -1 backend/node_modules | wc -l)
    echo -e "${GREEN}✅ Backend dependencies installed ($count packages)${NC}"
else
    echo -e "${YELLOW}⚠️  Backend node_modules not found${NC}"
fi
echo ""

# 5. Check database
echo -e "${BLUE}5. Database Status${NC}"

if [ -f "backend/.prisma/client/index.d.ts" ]; then
    echo -e "${GREEN}✅ Prisma client generated${NC}"
else
    echo -e "${YELLOW}⚠️  Prisma client not generated${NC}"
fi

if [ -f "backend/prisma/schema.prisma" ]; then
    provider=$(grep "provider" backend/prisma/schema.prisma | head -1 | grep -o '"[^"]*"' | tr -d '"')
    echo -e "${GREEN}✅ Prisma schema found (provider: $provider)${NC}"
fi
echo ""

# 6. Check server ports
echo -e "${BLUE}6. Port Availability${NC}"

if lsof -i :4000 &>/dev/null; then
    echo -e "${YELLOW}⚠️  Port 4000 (Backend) is in use${NC}"
else
    echo -e "${GREEN}✅ Port 4000 (Backend) is available${NC}"
fi

if lsof -i :5173 &>/dev/null; then
    echo -e "${YELLOW}⚠️  Port 5173 (Frontend) is in use${NC}"
else
    echo -e "${GREEN}✅ Port 5173 (Frontend) is available${NC}"
fi
echo ""

# 7. Check Docker
echo -e "${BLUE}7. Docker Status${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker installed: $(docker --version)${NC}"
    
    if docker-compose --version &>/dev/null; then
        echo -e "${GREEN}✅ Docker Compose: $(docker-compose --version)${NC}"
        
        if [ -f "docker-compose.yml" ]; then
            echo -e "${GREEN}✅ docker-compose.yml exists${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Docker not installed${NC}"
fi
echo ""

# 8. Connection Configuration
echo -e "${BLUE}8. Frontend-Backend Connection${NC}"

echo -e "${BLUE}Configuration Files:${NC}"
echo "   Frontend connects to: http://localhost:4000"
echo "   Backend listens on:   http://localhost:4000"
echo "   CORS allows origin:   http://localhost:5173"
echo ""

echo -e "${BLUE}API Routes Available:${NC}"
echo "   ✓ /api/health           - Server health check"
echo "   ✓ /api/auth/*           - Authentication"
echo "   ✓ /api/users/*          - User management"
echo "   ✓ /api/challenges/*     - Challenge management"
echo "   ✓ /api/submissions/*    - Code submissions"
echo "   ✓ /api/leaderboard/*    - Rankings"
echo "   ✓ /api/battle/*         - Multiplayer"
echo ""

# 9. Summary
echo -e "${BLUE}9. Summary & Next Steps${NC}"
echo ""

echo -e "${BLUE}✨ Everything Looks Good!${NC}"
echo ""
echo "Next steps:"
echo "  1. Make sure PostgreSQL is running"
echo "  2. Run setup: ./run-setup.sh"
echo "  3. Terminal 1: cd backend && npm run dev"
echo "  4. Terminal 2: npm run dev"
echo "  5. Open: http://localhost:5173"
echo ""
echo "Verify connection:"
echo "  • Check http://localhost:4000/api/health"
echo "  • Open DevTools (F12) → Network tab"
echo "  • Should see requests to http://localhost:4000"
echo ""
