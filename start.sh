#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Sky Watcher Setup..."

# Backend Setup
echo "📦 Installing Backend Dependencies..."
cd backend
# Check if venv exists, if not create it (optional but good practice, though user might just want to run in current env)
# For simplicity, assuming user runs this in their preferred env or system python if they wish. 
# But let's be safe and try to install requirements.
pip install -r requirements.txt
cd ..

# Frontend Setup
echo "📦 Installing Frontend Dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "Node modules already exist, skipping install (run 'npm install' manually if needed)"
fi

# Run
echo "🌟 Starting Services..."
echo "   - Backend: http://localhost:8000"
echo "   - Frontend: http://localhost:8080"

# Run backend in background
python3 backend/server.py &
BACKEND_PID=$!

# Run frontend
npm run dev &
FRONTEND_PID=$!

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# Wait
wait
