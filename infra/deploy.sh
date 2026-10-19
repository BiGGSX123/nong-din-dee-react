#!/usr/bin/env bash
# Re-run this on the VM (inside /opt/nong-din-dee/app) after every `git pull`
# to rebuild and redeploy. Requires .env.prod next to docker-compose.prod.yml
# (see infra/README.md for what it needs).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> building frontend"
docker run --rm -v "$PWD":/app -w /app node:20-alpine sh -c "npm ci && npm run build"

echo "==> building + starting db + api containers"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo "==> waiting for the database to accept connections"
until docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db pg_isready -U ndd -d ndd >/dev/null 2>&1; do
  sleep 1
done

echo "==> pushing schema + seeding default content (safe to re-run, upserts only)"
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T api npx prisma db push
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T api node prisma/seed.js

echo "==> reloading nginx"
nginx -t
systemctl reload nginx

echo "==> done"
