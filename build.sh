#!/usr/bin/env bash
# ── STEM Academy — local build script ────────────────────────────────────────
# Builds the Docker images on your Mac and packages them for Synology.
# No .env file needed — all secrets are runtime-only and never baked in.
#
# Usage:  chmod +x build.sh && ./build.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

IMAGE_API="stem-academy-api:latest"
IMAGE_WEB="stem-academy-web:latest"
OUT="stem-academy-images.tar.gz"

echo "🔨  Building images for linux/amd64 (Synology) — this may take a few minutes..."
docker buildx build --platform linux/amd64 --load -t stem-academy-api:latest ./backend
docker buildx build --platform linux/amd64 --load -t stem-academy-web:latest ./frontend

echo ""
echo "📦  Saving images → ${OUT} ..."
docker save "$IMAGE_API" "$IMAGE_WEB" | gzip > "$OUT"

SIZE=$(du -sh "$OUT" | cut -f1)

echo ""
echo "✅  Build complete — ${OUT} (${SIZE})"
echo ""
echo "──────────────────────────────────────────────────────────────────"
echo "  Upload to Synology (all visible files + the tar):"
echo ""
echo "    docker-compose.yml"
echo "    app.env                   ← your filled-in config (no dot prefix)"
echo "    app.env.example           ← blank template for reference"
echo "    backend/src/db/init.sql   ← needed for the postgres volume mount"
echo "    ${OUT}"
echo ""
echo "  Then on Synology:"
echo ""
echo "    docker load -i ${OUT}"
echo "    docker compose up -d"
echo "──────────────────────────────────────────────────────────────────"
