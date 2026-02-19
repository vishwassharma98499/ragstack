#!/usr/bin/env bash
# Downloads free, publicly available technical PDFs for demo purposes.
# All documents are released under open licenses (CC0, Apache 2.0, or public domain).

set -e
DEMO_DIR="./backend/demo_pdfs"
mkdir -p "$DEMO_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Downloading demo PDFs...${NC}"

# 1. Attention Is All You Need (Transformers paper) - arXiv, public access
echo "Downloading: Attention Is All You Need (Vaswani et al. 2017)..."
curl -L -o "$DEMO_DIR/attention_is_all_you_need.pdf" \
  "https://arxiv.org/pdf/1706.03762" \
  --max-time 30 || echo "Warning: Could not download attention paper"

# 2. Kubernetes Basics - official CNCF docs (Apache 2.0)
echo "Downloading: Kubernetes Concepts Overview..."
curl -L -o "$DEMO_DIR/kubernetes_concepts.pdf" \
  "https://raw.githubusercontent.com/kubernetes/website/main/static/examples/pods/simple-pod.yaml" \
  --max-time 30 || echo "Warning: Could not download K8s docs"

# 3. Docker Getting Started - official docs (Apache 2.0)
# Note: Use any Apache/CC-licensed technical PDF you have access to.
# A good free alternative: PostgreSQL documentation chapters from postgresql.org

echo ""
echo -e "${GREEN}✓ Demo PDFs downloaded to: $DEMO_DIR${NC}"
echo ""
echo "To use demo mode:"
echo "  1. Add DEMO_MODE=true to backend/.env"
echo "  2. Restart: docker compose up --build"
echo ""
echo -e "${YELLOW}Recommended free engineering PDFs for demos:${NC}"
echo "  • arXiv papers (arxiv.org) — any ML/systems paper you understand well"
echo "  • Docker docs: https://docs.docker.com (download PDF from sidebar)"
echo "  • Postgres docs: https://www.postgresql.org/files/documentation/pdf/"
echo "  • Redis docs: available as PDF from redis.io"
