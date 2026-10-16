#!/usr/bin/env bash
# =========================================================================
# Render Native Build Script (Python + Node.js)
# =========================================================================
set -o errexit

echo "==> 1. Upgrading pip and installing Python dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "==> 2. Installing Node dependencies and building React frontend..."
cd frontend
npm install
npm run build
cd ..

echo "==> 3. Initializing Olist canonical datasets and running initial pipeline..."
python scripts/test_pipeline_run.py || true

echo "==> 4. Build completed successfully!"
