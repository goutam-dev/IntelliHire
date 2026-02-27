"""
WebSocket Verification Route — app/routes/verify_ws.py
========================================================
WS /ws/verify/{session_id}?speaker_id=abc123

Protocol (Node.js client → Server):
  - Connect with ?speaker_id=<id> query param (obtained from /api/enroll response)
  - Send raw binary frames: float32 PCM audio chunks at 16kHz mono
    (each frame should be CHUNK_SAMPLES * 4 bytes = 512 samples * 4 = 2048 bytes)
  - Send text message "STOP" to gracefully end session

Protocol (Server → Node.js client):
  JSON text frames, event field determines type:
  { "event": "silence",     "timestamp": 1.2 }
  { "event": "pending",     "timestamp": 2.1, "segment_duration": 0.8 }
  { "event": "result",      "timestamp": 3.5, "decision": "MATCH",
                             "raw_score": 0.72, "smoothed_score": 0.69,
                             "segment_duration": 2.1 }
  { "event": "session_end", "stats": { ... } }
  { "event": "error",       "message": "..." }

All core verification logic (VAD, embedding, cosine similarity, smoothing,
thresholds, mismatch detection) is handled by VerifierSession in verifier.py
and is UNCHANGED.
"""

import json
import os
import numpy as np
import torch
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from starlette.websockets import WebSocketState

from app.service import get_model, get_vad
from app.websocket_manager import manager
from verifier import (
    VerifierSession,
    DECISION_SILENCE, DECISION_PENDING,
)
from config import CHUNK_SAMPLES, EMBEDDINGS_DIR

router = APIRouter()


@router.websocket("/ws/verify/{session_id}")
async def verify_ws(
    websocket: WebSocket,
    session_id: str,
    speaker_id: str = Query(..., description="Speaker ID returned from /api/enroll"),
):
    """
    Real-time WebSocket verification endpoint.

    Node.js connects here, streams binary audio chunks, and receives
    structured JSON verification events in real-time.
    """
    await websocket.accept()
    manager.register(session_id, websocket)

    # ── Load reference embedding ──────────────────────────────────────────────
    embedding_path = Path(EMBEDDINGS_DIR) / f"{speaker_id}.pt"
    if not embedding_path.exists():
        await _send(websocket, {
            "event": "error",
            "message": f"Speaker not found: '{speaker_id}'. Please enroll first via POST /api/enroll.",
        })
        await websocket.close(code=1008)
        manager.unregister(session_id)
        return

    try:
        data = torch.load(str(embedding_path), weights_only=True)
        reference_embedding = data["embedding"]
    except Exception as e:
        await _send(websocket, {"event": "error", "message": f"Failed to load embedding: {e}"})
        await websocket.close(code=1011)
        manager.unregister(session_id)
        return

    # ── Create per-session verifier (uses same core logic, no sounddevice) ────
    model = get_model()
    verifier_session = VerifierSession(model, reference_embedding)

    await _send(websocket, {
        "event": "ready",
        "session_id": session_id,
        "speaker_id": speaker_id,
        "message": "Session ready. Start streaming binary float32 PCM audio at 16kHz mono.",
    })

    # ── Main receive loop ─────────────────────────────────────────────────────
    try:
        while True:
            msg = await websocket.receive()

            # Graceful stop via text message
            if msg["type"] == "websocket.receive":
                if msg.get("text") == "STOP":
                    break

                raw = msg.get("bytes")
                if raw is None:
                    continue

                # Decode binary frame → float32 numpy array
                try:
                    chunk = np.frombuffer(raw, dtype=np.float32).copy()
                except Exception:
                    await _send(websocket, {
                        "event": "error",
                        "message": "Invalid binary frame. Expected float32 PCM bytes.",
                    })
                    continue

                if len(chunk) == 0:
                    continue

                # ── Feed chunk through VerifierSession ────────────────────────
                # This is the exact same pipeline: VAD → embedding → cosine sim
                results = verifier_session.process_chunk(chunk)

                for result in results:
                    if result.decision == DECISION_SILENCE:
                        await _send(websocket, {
                            "event": "silence",
                            "timestamp": round(result.timestamp, 3),
                            "vad_confidence": result.extra.get("vad_confidence"),
                        })

                    elif result.decision == DECISION_PENDING:
                        await _send(websocket, {
                            "event": "pending",
                            "timestamp": round(result.timestamp, 3),
                            "segment_duration": round(result.segment_duration, 3),
                            "vad_confidence": result.extra.get("vad_confidence"),
                        })

                    else:
                        # MATCH / MISMATCH / UNSURE
                        await _send(websocket, {
                            "event": "result",
                            "timestamp": round(result.timestamp, 3),
                            "decision": result.decision,
                            "raw_score": round(result.raw_score, 4) if result.raw_score is not None else None,
                            "smoothed_score": round(result.smoothed_score, 4) if result.smoothed_score is not None else None,
                            "segment_duration": round(result.segment_duration, 3),
                        })

            elif msg["type"] == "websocket.disconnect":
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await _send(websocket, {"event": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        # Flush any remaining audio buffered in the session (same as verifier.stop())
        remaining_results = verifier_session.flush()
        for result in remaining_results:
            try:
                if result.decision not in (DECISION_SILENCE, DECISION_PENDING):
                    await _send(websocket, {
                        "event": "result",
                        "timestamp": round(result.timestamp, 3),
                        "decision": result.decision,
                        "raw_score": round(result.raw_score, 4) if result.raw_score is not None else None,
                        "smoothed_score": round(result.smoothed_score, 4) if result.smoothed_score is not None else None,
                        "segment_duration": round(result.segment_duration, 3),
                    })
            except Exception:
                pass

        # Send session summary stats
        try:
            await _send(websocket, {
                "event": "session_end",
                "stats": verifier_session.get_stats(),
            })
        except Exception:
            pass

        manager.unregister(session_id)
        if websocket.client_state != WebSocketState.DISCONNECTED:
            try:
                await websocket.close()
            except Exception:
                pass


async def _send(ws: WebSocket, payload: dict):
    """Helper — send a JSON event to the client."""
    try:
        await ws.send_text(json.dumps(payload))
    except Exception:
        pass
