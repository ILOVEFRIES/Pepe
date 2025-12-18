#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Script dir: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"

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

# Ensure Bun is in PATH
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun is not installed. Please install it first."
  exit 1
fi

# Git update
git fetch origin master
git reset --hard origin/master

# Build & migrate
cd "$PROJECT_ROOT"
echo "Current dir: $(pwd)"
ls -l prisma/schema.prisma

bun install
bunx prisma generate --schema "$PROJECT_ROOT/prisma/schema.prisma"
bunx prisma migrate deploy --schema "$PROJECT_ROOT/prisma/schema.prisma"
bun run build


# Restart PM2
pm2 restart "$PM2_NAME" --update-env
