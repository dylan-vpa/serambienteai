#!/bin/bash

# 🚀 Pre-deployment Checklist Script

echo "🔍 Checking project setup before deployment..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0

# Check if .env files exist
echo ""
echo "📋 Checking environment files..."

if [ -f "server/.env" ]; then
    echo -e "${GREEN}✓${NC} server/.env exists"
else
    echo -e "${RED}✗${NC} server/.env missing (copy from .env.example)"
    errors=$((errors+1))
fi

if [ -f "client/.env" ]; then
    echo -e "${GREEN}✓${NC} client/.env exists"
else
    echo -e "${RED}✗${NC} client/.env missing (copy from .env.example)"
    errors=$((errors+1))
fi

# Check if uploads directory exists
echo ""
echo "📁 Checking directories..."

if [ -d "server/uploads" ]; then
    echo -e "${GREEN}✓${NC} server/uploads directory exists"
else
    echo -e "${YELLOW}!${NC} Creating server/uploads directory"
    mkdir -p server/uploads/reports
fi

# Check if node_modules exist
echo ""
echo "📦 Checking dependencies..."

if [ -d "server/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Server dependencies installed"
else
    echo -e "${RED}✗${NC} Server dependencies missing (run: cd server && npm install)"
    errors=$((errors+1))
fi

if [ -d "client/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Client dependencies installed"
else
    echo -e "${RED}✗${NC} Client dependencies missing (run: cd client && npm install)"
    errors=$((errors+1))
fi

# Check if Prisma is set up
echo ""
echo "🗄️  Checking database..."

if [ -d "server/node_modules/.prisma" ]; then
    echo -e "${GREEN}✓${NC} Prisma client generated"
else
    echo -e "${YELLOW}!${NC} Prisma client needs generation (run: cd server && npx prisma generate)"
fi

# Check if Ollama is running
echo ""
echo "🤖 Checking Ollama..."

if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Ollama is running"
    
    if curl -s http://localhost:11434/api/tags | grep -q "llama3.2:3b"; then
        echo -e "${GREEN}✓${NC} llama3.2:3b model is available"
    else
        echo -e "${YELLOW}!${NC} llama3.2:3b model not found (run: ollama pull llama3.2:3b)"
    fi
else
    echo -e "${RED}✗${NC} Ollama is not running (start with: ollama serve)"
    errors=$((errors+1))
fi

# Summary
echo ""
echo "======================================"
if [ $errors -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to deploy 🚀${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review DEPLOYMENT.md for AWS setup"
    echo "2. Update environment variables for production"
    echo "3. Run: git add . && git commit -F COMMIT_MESSAGE.md"
    echo "4. Push to your repository"
else
    echo -e "${RED}✗ Found $errors error(s). Please fix before deploying.${NC}"
fi
echo "======================================"
