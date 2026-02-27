"""
Service Singleton — app/service.py
===================================
Loads the ML model and VAD exactly once at server startup.
All routes access them via get_model() and get_vad().
"""

import torch
from models import SpeakerEmbeddingModel, load_model
from vad import SileroVAD

# Module-level singletons (populated during lifespan startup)
_model: SpeakerEmbeddingModel | None = None
_vad: SileroVAD | None = None
_device: str = "cpu"


def init_service() -> str:
    """
    Load model + VAD. Called once from server lifespan.
    Returns the device string being used.
    """
    global _model, _vad, _device

    _device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[Service] Initializing on device: {_device}")

    _model = load_model(_device)
    _vad = SileroVAD(device=_device)

    print("[Service] ✅ Model and VAD ready")
    return _device


def get_model() -> SpeakerEmbeddingModel:
    if _model is None:
        raise RuntimeError("Service not initialized. Call init_service() first.")
    return _model


def get_vad() -> SileroVAD:
    if _vad is None:
        raise RuntimeError("Service not initialized. Call init_service() first.")
    return _vad


def get_device() -> str:
    return _device
