#!/bin/zsh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"
APP_URL="http://127.0.0.1:5173/?launch=$(date +%s)"

EXISTING_PIDS=("${(@f)$(lsof -tiTCP:5173 -sTCP:LISTEN 2>/dev/null || true)}")
EXISTING_PIDS=("${(@)EXISTING_PIDS:#}")
if (( ${#EXISTING_PIDS[@]} )); then
  echo "Stopping existing local server on port 5173..."
  kill "${EXISTING_PIDS[@]}" 2>/dev/null || true
  sleep 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Opening $APP_URL"
(sleep 2 && open "$APP_URL") &
npm run dev -- --force --strictPort
