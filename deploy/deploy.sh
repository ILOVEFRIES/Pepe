#!/usr/bin/env bash
set -e

# Resolve directories safely
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Script dir: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"

# Load environment variables
ENV_FILE="$PROJECT_ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo ".env file not found at $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

: "${PM2_NAME:? PM2_NAME is not set in .env}"
echo "PM2_NAME = $PM2_NAME"

# Ensure Bun is available
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun is not installed"
  exit 1
fi

# Deploy
cd "$PROJECT_ROOT"

git reset --hard
git pull origin main

bun install
bunx prisma generate
bunx prisma migrate deploy
bun run build

pm2 restart "$PM2_NAME" --update-env