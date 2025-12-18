#!/usr/bin/env bash
set -euo pipefail

# Move to repo root (deploy/ -> repo root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Load env
set -a
source .env
set +a

# Deploy
git fetch origin
git reset --hard origin/master

bun install
bunx prisma generate
bunx prisma migrate deploy
bun run build

pm2 restart "$PM2_NAME" --update-env
