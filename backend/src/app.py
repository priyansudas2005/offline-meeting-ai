import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Setup python path so we can import src modules
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from src.services.database.db import init_db
from src.api import meetings, qa, settings, analytics
from src.utils.logger import get_logger

logger = get_logger(__name__)

# Initialize DB on startup
init_db()

app = FastAPI(
    title="SAMVAD V2.0 API Server",
    description="Secure Offline Meeting Assistant REST backend",
    version="2.0.0"
)

# CORS middleware for development mapping
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(meetings.router, prefix="/api")
app.include_router(qa.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")

# Mount recordings static folder so browser can stream play WAV audio
RECORDINGS_DIR = Path("backend/data/recordings")
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static/recordings", StaticFiles(directory=str(RECORDINGS_DIR)), name="recordings")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "SAMVAD V2.0 Offline API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
