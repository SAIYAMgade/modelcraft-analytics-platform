#!/usr/bin/env bash
# =========================================================================
# Render Start Script
# Runs Uvicorn bound to Render's dynamic $PORT (default 8000)
# =========================================================================
set -o errexit

echo "==> Starting CommerceFlow on port ${PORT:-8000}..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
