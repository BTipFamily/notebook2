#!/usr/bin/env bash
set -e

echo "🚀 Setting up Enterprise Knowledge Workspace"
echo "============================================="

# ── Backend ──────────────────────────────────────
echo ""
echo "📦 Setting up Python backend..."
cd backend

if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 not found. Install from https://python.org" && exit 1
fi

# Use Python 3.12 if available (3.13+ lacks tokenizers wheels)
PYTHON=$(which python3.12 2>/dev/null || which python3.11 2>/dev/null || which python3)
echo "Using Python: $PYTHON ($($PYTHON --version))"
$PYTHON -m venv .venv
source .venv/bin/activate

pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created backend/.env — open it and set ANTHROPIC_API_KEY"
else
  echo "ℹ️  backend/.env already exists"
fi

mkdir -p uploads chroma_db
cd ..

# ── Frontend ─────────────────────────────────────
echo ""
echo "📦 Setting up Node.js frontend..."
cd frontend

if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org" && exit 1
fi

npm install --silent
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env and set ANTHROPIC_API_KEY=sk-ant-..."
echo "  2. Run:  ./run_dev.sh"
echo "  3. Open: http://localhost:5173"
echo "  4. Login: admin@company.com / changeme123"
