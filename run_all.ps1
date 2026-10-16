# Run CommerceFlow Backend and Frontend locally

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Starting CommerceFlow Data Platform        " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Start Backend in new process or job
Write-Host "Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "uvicorn backend.app.main:app --port 8000 --reload"

# Start Frontend in current terminal
Write-Host "Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Green
cd frontend
npm run dev
