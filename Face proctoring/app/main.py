"""
Unified Interview Analysis Microservice.
Stateless service combining face verification + object detection.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.face_engine import face_engine
from app.liveness import get_anti_spoof
from app.object_monitor import ObjectDetectorEngine
from app.routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("=" * 60)
    logger.info("  Unified Interview Analysis Microservice")
    logger.info("=" * 60)
    
    # Pre-load face recognition model (takes a few seconds on first run)
    logger.info("Loading face recognition model (this may take a moment)...")
    face_engine.initialize()
    logger.info("Face recognition model ready")
    
    # Pre-load anti-spoofing models
    logger.info("Loading anti-spoofing models...")
    get_anti_spoof()
    logger.info("Anti-spoofing models ready")

    # Pre-load YOLO object detector
    logger.info("Loading object detection model...")
    app.state.object_engine = ObjectDetectorEngine()
    logger.info("Object detection model ready")
    
    logger.info("Server is ready at http://localhost:8000")
    logger.info("=" * 60)
    
    yield
    
    logger.info("Shutting down...")


app = FastAPI(
    title="Unified Interview Analysis Service",
    description="Stateless face verification and object detection analysis microservice",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(router)
