"""
Enrollment Route — app/routes/enroll.py
POST /api/enroll

Accepts a multipart audio file upload + speaker_id.
Uses the EXISTING enroller logic (enroll_from_bytes) — core unchanged.
Returns structured JSON with the embedding_path for future verification.
"""

import io
import os
import uuid
import numpy as np
import torch
import torch.nn.functional as F
import soundfile as sf

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path

from app.service import get_model, get_vad
from config import (
    SAMPLE_RATE, CHUNK_SAMPLES, EMBEDDINGS_DIR,
    ENROLLMENT_MIN_DURATION_S,
)
from vad import SileroVAD


router = APIRouter()


def _extract_segments(audio: np.ndarray, vad: SileroVAD) -> list:
    """
    Run VAD over a full audio array and collect speech segments.
    This is the IDENTICAL logic from enroller.py _extract_segments_from_audio —
    no changes to how segments are extracted.
    """
    vad._reset_state()
    segments = []
    for i in range(0, len(audio) - CHUNK_SAMPLES + 1, CHUNK_SAMPLES):
        chunk = audio[i: i + CHUNK_SAMPLES]
        result = vad.process_chunk(chunk)
        if result["segment_complete"] and result["segment_audio"] is not None:
            dur = len(result["segment_audio"]) / SAMPLE_RATE
            if dur >= ENROLLMENT_MIN_DURATION_S:
                segments.append(result["segment_audio"])

    remaining = vad.flush()
    if remaining is not None and len(remaining) / SAMPLE_RATE >= ENROLLMENT_MIN_DURATION_S:
        segments.append(remaining)

    return segments


def _build_embedding(segments: list, model) -> torch.Tensor:
    """
    Extract embeddings from each segment, compute mean, L2-normalize.
    This is the IDENTICAL logic from enroller.py _build_and_save_embedding —
    no changes to how the reference embedding is computed.
    """
    embeddings = []
    for seg in segments:
        seg_normalized = seg / (np.max(np.abs(seg)) + 1e-8)
        emb = model.extract_embedding(seg_normalized)
        embeddings.append(emb)

    reference_embedding = torch.stack(embeddings).mean(dim=0)
    reference_embedding = F.normalize(reference_embedding, dim=-1)
    return reference_embedding


@router.post("/api/enroll")
async def enroll(
    audio: UploadFile = File(..., description="WAV/FLAC/MP3 audio file of the speaker"),
    speaker_id: str = Form(default=None, description="Unique speaker identifier (auto-generated if omitted)"),
):
    """
    Enroll a speaker from an uploaded audio file.

    Returns:
        {
          "status": "success",
          "speaker_id": "abc123",
          "embedding_path": "embeddings/abc123.pt",
          "num_segments": 3,
          "embedding_dim": 256,
          "duration_s": 8.2
        }
    """
    # Auto-generate speaker_id if not provided
    if not speaker_id or not speaker_id.strip():
        speaker_id = str(uuid.uuid4())

    # Sanitize — prevent path traversal
    speaker_id = speaker_id.strip().replace("/", "_").replace("\\", "_")

    try:
        audio_bytes = await audio.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read audio file: {e}")

    # Decode audio from bytes (supports WAV, FLAC, MP3, OGG, etc.)
    try:
        audio_array, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unsupported or corrupt audio format: {e}")

    # Stereo → mono
    if audio_array.ndim > 1:
        audio_array = audio_array.mean(axis=1)

    # Resample if needed (same logic as enroller.py)
    if sr != SAMPLE_RATE:
        import scipy.signal
        num_samples = int(len(audio_array) * SAMPLE_RATE / sr)
        audio_array = scipy.signal.resample(audio_array, num_samples).astype(np.float32)

    # Normalize amplitude (same as enroller.py)
    duration_s = round(len(audio_array) / SAMPLE_RATE, 2)
    audio_array = audio_array / (np.max(np.abs(audio_array)) + 1e-8)

    if duration_s < ENROLLMENT_MIN_DURATION_S:
        raise HTTPException(
            status_code=422,
            detail=f"Audio too short ({duration_s:.1f}s). Need at least {ENROLLMENT_MIN_DURATION_S}s of speech.",
        )

    # Extract speech segments via VAD (shared singleton VAD, reset per-request)
    model = get_model()
    vad = get_vad()
    segments = _extract_segments(audio_array, vad)

    if len(segments) == 0:
        # Fallback: use whole audio (same fallback as enroller.py)
        segments = [audio_array]

    # Build reference embedding (identical logic to enroller.py)
    reference_embedding = _build_embedding(segments, model)

    # Persist to embeddings/{speaker_id}.pt
    save_dir = Path(EMBEDDINGS_DIR)
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / f"{speaker_id}.pt"

    torch.save(
        {"embedding": reference_embedding, "num_segments": len(segments)},
        str(save_path),
    )

    return {
        "status": "success",
        "speaker_id": speaker_id,
        "embedding_path": str(save_path).replace("\\", "/"),
        "num_segments": len(segments),
        "embedding_dim": int(reference_embedding.shape[-1]),
        "duration_s": duration_s,
    }
