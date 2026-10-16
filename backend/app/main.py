import os
import time
import asyncio
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx

from backend.app.database import engine, Base
from backend.app.api.endpoints import router as api_router

# Initialize database schemas
Base.metadata.create_all(bind=engine)

START_TIME = time.time()

app = FastAPI(
    title="KINETIQ Data Engineering Platform",
    description="Enterprise Data Platform built around real Brazilian E-Commerce data by Olist.",
    version="1.0.0"
)

# CORS setup for Vite frontend development & production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix="/api")

# Enhanced Health Check for Render & UptimeRobot monitoring
@app.get("/health")
def health_check():
    """
    Health check endpoint monitored by UptimeRobot every 5-10 minutes
    to prevent Render's free tier from sleeping/idling.
    """
    uptime_sec = round(time.time() - START_TIME, 2)
    return {
        "status": "HEALTHY",
        "service": "modelcraft-backend",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": uptime_sec,
        "message": "ModelCraft Analytics Engineering Platform is active and healthy."
    }

# -------------------------------------------------------------------------
# BACKGROUND KEEP-ALIVE WORKER (PREVENTS SLEEP ON RENDER FREE TIER)
# -------------------------------------------------------------------------
async def render_keep_alive_task():
    """
    Self-pinging background worker that periodically sends a request
    to this service's public Render URL every 10 minutes (600 seconds)
    to keep the instance awake 24/7.
    """
    # Render automatically sets RENDER_EXTERNAL_URL (e.g., https://commerceflow.onrender.com)
    external_url = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("KEEP_ALIVE_URL")
    if not external_url:
        return
        
    health_url = f"{external_url.rstrip('/')}/health"
    print(f"[Keep-Alive] Initializing self-pinging keep-alive worker for: {health_url}")
    
    # Wait 2 minutes after startup before first ping
    await asyncio.sleep(120)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            try:
                res = await client.get(health_url)
                print(f"[Keep-Alive] Ping {health_url} -> {res.status_code} at {datetime.utcnow().isoformat()}")
            except Exception as e:
                print(f"[Keep-Alive] Ping failed: {str(e)}")
                
            # Ping every 10 minutes (Render spins down after 15 minutes of inactivity)
            await asyncio.sleep(600)

@app.on_event("startup")
async def startup_event():
    # Start self-pinging keep-alive background worker
    asyncio.create_task(render_keep_alive_task())

# -------------------------------------------------------------------------
# SERVE PRODUCTION REACT FRONTEND (STATIC ASSETS & SPA ROUTING)
# -------------------------------------------------------------------------
# Look for built frontend in standard locations
candidates = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path("/app/frontend/dist"),
    Path("/app/dist"),
]
frontend_dist = next((c for c in candidates if c.exists()), None)

if frontend_dist and (frontend_dist / "index.html").exists():
    # Mount assets folder
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Serve index.html or static files for all frontend routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API or health endpoints
        if full_path.startswith("api") or full_path == "health" or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
