"""
Speaker Embedding Model Backend — ResNet34 (pyannote.audio)
Produces L2-normalized embeddings for cosine similarity comparison.
Model: pyannote/wespeaker-voxceleb-resnet34-LM
"""

import numpy as np
import torch
import torch.nn.functional as F
from abc import ABC, abstractmethod
from config import SAMPLE_RATE, MODEL_BACKEND

# ─── Compatibility Patches ───────────────────────────────────────────────────

# Patch: huggingface_hub >= 0.24 renamed use_auth_token → token.
# pyannote.audio's Model.from_pretrained() still passes the old kwarg on some
# versions, which causes a TypeError.  Wrap hf_hub_download to silently remap
# the old kwarg to the new one.
try:
    import huggingface_hub
    _original_hf_hub_download = huggingface_hub.hf_hub_download

    def _patched_hf_hub_download(*args, **kwargs):
        if "use_auth_token" in kwargs:
            val = kwargs.pop("use_auth_token")
            if val is not None and "token" not in kwargs:
                kwargs["token"] = val
        return _original_hf_hub_download(*args, **kwargs)

    huggingface_hub.hf_hub_download = _patched_hf_hub_download
    print("[Patch] huggingface_hub use_auth_token -> token -- fixed")
except Exception as e:
    print(f"[Patch] huggingface_hub patch skipped: {e}")

# ─────────────────────────────────────────────────────────────────────────────


class SpeakerEmbeddingModel(ABC):
    """Abstract base for speaker embedding models."""

    @abstractmethod
    def extract_embedding(self, audio: np.ndarray) -> torch.Tensor:
        """
        Extract a speaker embedding from an audio segment.

        Args:
            audio: float32 np.ndarray, shape (N,), range [-1, 1], 16kHz

        Returns:
            L2-normalized embedding tensor, shape (D,)
        """

    @staticmethod
    def cosine_similarity(emb1: torch.Tensor, emb2: torch.Tensor) -> float:
        """Cosine similarity in [-1, 1]. For normalized vectors, equivalent to dot product."""
        return float(F.cosine_similarity(emb1.unsqueeze(0), emb2.unsqueeze(0)).item())


# ─── ResNet34 Speaker Model (pyannote.audio) ─────────────────────────────────

class ResNetSpeakerModel(SpeakerEmbeddingModel):
    """
    ResNet34 speaker embedding model via pyannote.audio.
    Model: pyannote/wespeaker-voxceleb-resnet34-LM
    EER competitive with ECAPA-TDNN, 256-dim embeddings.
    """

    def __init__(self, device: str = "cuda"):
        try:
            from pyannote.audio import Model, Inference
        except Exception as exc:
            raise RuntimeError(
                "ResNet backend requires pyannote.audio. Install it with: pip install pyannote.audio"
            ) from exc

        print("[Model] Loading ResNet34 speaker model (pyannote.audio)...")
        self.model = Model.from_pretrained("pyannote/wespeaker-voxceleb-resnet34-LM")
        self.inference = Inference(
            self.model,
            window="whole",
            device=torch.device(device),
        )
        self.device = device
        print(f"[Model] ResNet34 speaker model ready on {device}")

    @torch.no_grad()
    def extract_embedding(self, audio: np.ndarray) -> torch.Tensor:
        waveform = torch.from_numpy(audio).float().unsqueeze(0)
        embedding = self.inference({"waveform": waveform, "sample_rate": SAMPLE_RATE})
        if isinstance(embedding, np.ndarray):
            embedding = torch.from_numpy(embedding)
        embedding = embedding.squeeze()
        return F.normalize(embedding, dim=-1)


# ─── Factory ─────────────────────────────────────────────────────────────────

def load_model_by_name(backend: str, device: str = "cuda") -> SpeakerEmbeddingModel:
    """Load a model backend by name (case-insensitive)."""
    name = backend.lower()
    if name in ("resnet", "resnet_sv", "resnet-voxceleb"):
        return ResNetSpeakerModel(device)
    raise ValueError(
        f"Unknown model backend: {backend!r}. Only 'resnet' is supported."
    )


def load_model(device: str = "cuda") -> SpeakerEmbeddingModel:
    """Load the configured model backend."""
    return load_model_by_name(MODEL_BACKEND, device)
