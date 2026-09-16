#!/bin/bash

# Javify Backend & Frontend Setup Script

echo "🚀 Javify Setup Script"
echo "====================="
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed."
    echo "📖 Please install Docker from: https://www.docker.com/products/docker-desktop"
    echo ""
    echo "Alternative: Install PostgreSQL locally"
    echo "  brew install postgresql@16"
    echo "  brew services start postgresql@16"
    exit 1
fi

echo "✅ Docker found"
echo ""

# Start PostgreSQL container
echo "📦 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is accessible
echo "🔍 Checking PostgreSQL connection..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start. Check logs with: docker-compose logs postgres"
        exit 1
    fi
    echo "⏳ Attempt $i/30..."
    sleep 1
done

echo ""
echo "📚 Running Prisma migrations..."
cd backend
npx prisma migrate deploy || npx prisma db push

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "🎉 Frontend and Backend are now ready to connect!"
echo ""
echo "To start the servers, run in separate terminals:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: npm run dev"
