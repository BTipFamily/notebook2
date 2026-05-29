#!/usr/bin/env bash
# Starts both backend and frontend dev servers.
# Ctrl+C stops both.

trap 'kill $(jobs -p) 2>/dev/null; echo ""; echo "Servers stopped."' INT TERM EXIT

echo "Starting Enterprise Knowledge Workspace (dev mode)"
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:5173"
echo "  API docs → http://localhost:8000/api/docs"
echo ""

# Backend
(
  cd backend
  # Support both Windows-native (.venv/Scripts) and Unix/macOS (.venv/bin) venvs
  source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate 2>/dev/null || true
  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
) &

sleep 2

# Frontend
(
  cd frontend
  npm run dev
) &

wait
