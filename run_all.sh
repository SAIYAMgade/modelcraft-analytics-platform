#!/usr/bin/env bash
set -e

echo "============================================="
echo "  Starting CommerceFlow Data Platform        "
echo "============================================="

# Start backend in background
echo "Starting FastAPI Backend on http://localhost:8000..."
uvicorn backend.app.main:app --port 8000 --reload &
BACKEND_PID=$!

trap "kill $BACKEND_PID" EXIT

# Start frontend
echo "Starting Vite Frontend on http://localhost:5173..."
cd frontend
npm run dev
