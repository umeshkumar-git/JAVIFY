#!/bin/bash

# Start both frontend and backend servers

echo "🚀 Javify - Starting Frontend & Backend"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "📋 Prerequisites check..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
echo "✅ npm: $(npm --version)"

echo ""
echo "🎯 Starting servers..."
echo ""

# Create a function to show the banner
show_banner() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    🎉 Ready to Code!                           ║"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║ Frontend:  http://localhost:5173                              ║"
    echo "║ Backend:   http://localhost:4000                              ║"
    echo "║ Health:    http://localhost:4000/api/health                   ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "💡 Tips:"
    echo "  - Open DevTools (F12) to see API calls"
    echo "  - Check Network tab for requests to backend"
    echo "  - Press Ctrl+C in each terminal to stop servers"
    echo ""
}

# Start backend in background
if [ -d "backend" ]; then
    echo "🔷 Starting Backend Server..."
    echo "   Running: cd backend && npm run dev"
    echo ""
    
    (cd backend && npm run dev) &
    BACKEND_PID=$!
    
    sleep 3
    echo "   Backend PID: $BACKEND_PID"
    echo ""
else
    echo "❌ Backend directory not found"
    exit 1
fi

# Start frontend
echo "🔷 Starting Frontend Server..."
echo "   Running: npm run dev"
echo ""

npm run dev &
FRONTEND_PID=$!

echo "   Frontend PID: $FRONTEND_PID"
echo ""

show_banner

# Handle graceful shutdown
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo '✅ Servers stopped'; exit 0" SIGINT SIGTERM

# Keep the script running
wait
