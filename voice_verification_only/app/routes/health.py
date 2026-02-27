"""
Health Route — app/routes/health.py
GET /api/health
"""

from fastapi import APIRouter
from app.service import get_device

router = APIRouter()


@router.get("/api/health")
async def health():
    """
    Returns service readiness status.
    Node.js can poll this before opening a WebSocket session.
    """
    from app.service import _model
    return {
        "status": "ok",
        "device": get_device(),
        "model_loaded": _model is not None,
    }
