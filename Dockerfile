# =========================================================================
# STAGE 1: Build React 19 Frontend
# =========================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# =========================================================================
# STAGE 2: Python Backend & Production Runtime
# =========================================================================
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for reportlab & sqlite
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy application backend & scripts
COPY backend/ ./backend/
COPY scripts/ ./scripts/
COPY tests/ ./tests/

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Initialize directories for raw data, warehouse, and documents
RUN mkdir -p data/raw data/quarantine data/warehouse data/documents

# Run pipeline initialization to pre-seed canonical datasets
RUN python scripts/test_pipeline_run.py || true

# Default environment variables
ENV PORT=8000
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Start Uvicorn bound to Render's dynamic $PORT
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
