#!/usr/bin/env bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║        DocChat - Local RAG Setup       ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"

# Check Docker Compose
if ! docker compose version > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker Compose V2 not found. Update Docker Desktop.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose found${NC}"

# Detect mode
USE_GROQ=false
if [ -f "backend/.env" ]; then
    if grep -q "USE_GROQ=true" backend/.env 2>/dev/null; then
        USE_GROQ=true
    fi
fi

if [ "$USE_GROQ" = true ]; then
    echo -e "${YELLOW}⚡ Groq mode detected - no Ollama needed${NC}"

    # Check for API key
    if ! grep -q "GROQ_API_KEY=gr" backend/.env 2>/dev/null; then
        echo -e "${RED}✗ GROQ_API_KEY not set in backend/.env${NC}"
        echo "Get a free key at https://console.groq.com"
        exit 1
    fi

    echo -e "${BLUE}Starting with Groq backend...${NC}"
    docker compose -f docker-compose.groq.yml up --build -d
else
    echo -e "${YELLOW}⚡ Local Ollama mode (Mistral will be pulled - ~4GB download on first run)${NC}"

    echo -e "${BLUE}Starting all services...${NC}"
    docker compose up --build -d
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Services Starting            ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Frontend : http://localhost:3000      ║${NC}"
echo -e "${GREEN}║  Backend  : http://localhost:8000      ║${NC}"
echo -e "${GREEN}║  API Docs : http://localhost:8000/docs ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "Logs: ${YELLOW}docker compose logs -f${NC}"
echo -e "Stop: ${YELLOW}docker compose down${NC}"
echo ""

if [ "$USE_GROQ" = false ]; then
    echo -e "${YELLOW}Note: First startup pulls Mistral (~4GB). This can take 5-15 minutes.${NC}"
    echo -e "Monitor: ${YELLOW}docker compose logs -f ollama-init${NC}"
fi
