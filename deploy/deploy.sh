# Load Bun path dynamically
export PATH=$(dirname "$(which bun)"):$PATH

# Load .env from the parent folder
set -a
source ../.env
set +a

# Deployment steps
cd app/Pepe/
git pull origin master
bun install
bunx prisma generate
bunx prisma migrate deploy
bunx prisma generate
bun run build
#/ $PM2_NAME is defined in the .env file
pm2 restart $PM2_NAME
