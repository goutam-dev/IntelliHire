"""
server.py — FastAPI Service Entry Point
========================================
Start with: python server.py
              OR
             uvicorn server:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
  GET  /api/health                    — Service readiness check
  POST /api/enroll                    — Speaker enrollment (multipart audio upload)
  WS   /ws/verify/{session_id}        — Real-time streaming verification
  GET  /docs                          — Auto-generated Swagger UI
  GET  /redoc                         — ReDoc API documentation
"""

from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import SERVICE_HOST, SERVICE_PORT
from app.service import init_service
from app.routes.health import router as health_router
from app.routes.enroll import router as enroll_router
from app.routes.verify_ws import router as verify_ws_router


# ─── Lifespan: load model + VAD once at startup ───────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler.
    - STARTUP:  loads ResNet34 model + SileroVAD (expensive, done once)
    - SHUTDOWN: nothing special needed (model is GC'd)
    """
    print("\n[Server] ⏳ Loading models, please wait...\n")
    device = init_service()
    print(f"\n[Server] ✅ Service ready on device={device}\n")
    yield
    print("\n[Server] 🛑 Shutting down")


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Voice Verification Service",
    description=(
        "Speaker verification service for the IntelliHire interview platform.\n\n"
        "**Flow:**\n"
        "1. `POST /api/enroll` — Upload a speaker's audio to create a reference embedding\n"
        "2. `WS /ws/verify/{session_id}?speaker_id=<id>` — Stream audio chunks for live verification\n\n"
        "Node.js sends binary float32 PCM frames (16kHz, mono). "
        "The server responds with JSON events: `silence`, `pending`, `result`, `session_end`."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS (allow Node.js backend to connect) ──────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Tighten in production: e.g. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(enroll_router)
app.include_router(verify_ws_router)


# ─── Dev runner ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host=SERVICE_HOST,
        port=SERVICE_PORT,
        reload=False,   # Set True for development hot-reload
        log_level="info",
    )
