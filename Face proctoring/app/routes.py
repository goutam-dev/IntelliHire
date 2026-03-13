import asyncio
import base64
import json
import logging
from datetime import datetime
from typing import List, Optional

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.config import CONSECUTIVE_SAME_TYPE_TO_ALERT, VIDEO_REG_MAX_FRAMES
from app.face_engine import face_engine
from app.liveness import LivenessDetector
from app.object_monitor import ObjectMonitorSession
from app.video_registration import VideoRegistrationError, process_video_registration

logger = logging.getLogger(__name__)
router = APIRouter()


class RegistrationRequest(BaseModel):
    candidate_id: str
    frames: List[str]


def decode_base64_image(data: str) -> Optional[np.ndarray]:
    if "," in data:
        data = data.split(",", 1)[1]
    try:
        img_bytes = base64.b64decode(data)
    except Exception:
        return None
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def encode_frame_base64(frame: np.ndarray) -> Optional[str]:
    ok, buffer = cv2.imencode(".jpg", frame)
    if not ok:
        return None
    return base64.b64encode(buffer).decode("utf-8")


def annotate_face_alert(frame: np.ndarray, face_status: str, similarity: float, liveness_score: float) -> np.ndarray:
    annotated = frame.copy()
    _, width = annotated.shape[:2]

    overlay = annotated.copy()
    cv2.rectangle(overlay, (0, 0), (width, 130), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.7, annotated, 0.3, 0, annotated)

    cv2.putText(
        annotated,
        "FACE ALERT",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        (0, 0, 255),
        3,
    )
    cv2.putText(
        annotated,
        f"Status: {face_status}",
        (20, 75),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2,
    )
    cv2.putText(
        annotated,
        f"Similarity: {similarity:.4f} | Liveness: {liveness_score:.4f}",
        (20, 105),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.65,
        (0, 255, 255),
        2,
    )

    return annotated


@router.post("/api/register")
async def register_candidate_video(request: RegistrationRequest):
    if len(request.frames) == 0:
        raise HTTPException(400, "No frames provided. Please record a video first.")

    if len(request.frames) > VIDEO_REG_MAX_FRAMES:
        raise HTTPException(400, f"Too many frames ({len(request.frames)}). Maximum is {VIDEO_REG_MAX_FRAMES}.")

    decoded_frames = []
    for i, b64 in enumerate(request.frames):
        img = decode_base64_image(b64)
        if img is not None:
            decoded_frames.append(img)
        else:
            logger.warning("[VideoReg] Frame %s could not be decoded, skipping.", i)

    if len(decoded_frames) == 0:
        raise HTTPException(400, "All frames were invalid. Please try recording again.")

    try:
        result = process_video_registration(decoded_frames)
    except VideoRegistrationError as e:
        raise HTTPException(400, str(e.reason))

    return {
        "success": True,
        "candidate_id": request.candidate_id,
        "canonical_embedding": result.canonical_embedding.astype(np.float32).tolist(),
        "registration_type": "video_canonical",
        "frames_used": result.frames_used,
        "total_frames": result.total_frames,
        "usable_frames": result.usable_frames,
        "quality_score": result.avg_quality_score,
        "embedding_consistency": result.avg_similarity,
        "quality_breakdown": result.quality_breakdown,
    }


@router.websocket("/ws/analyze")
async def websocket_analyze(websocket: WebSocket):
    await websocket.accept()

    liveness = LivenessDetector()
    object_session = ObjectMonitorSession(websocket.app.state.object_engine)

    current_violation_type = None
    consecutive_same_type = 0

    candidate_id = None
    registered_embedding = None

    try:
        init_raw = await websocket.receive_text()
        init_msg = json.loads(init_raw)

        candidate_id = init_msg.get("candidate_id")
        embedding_raw = init_msg.get("canonical_embedding")

        if not candidate_id:
            await websocket.send_json({"type": "error", "message": "Missing candidate_id in init message"})
            await websocket.close()
            return

        if not isinstance(embedding_raw, list) or len(embedding_raw) == 0:
            await websocket.send_json({"type": "error", "message": "Missing canonical_embedding in init message"})
            await websocket.close()
            return

        registered_embedding = np.array(embedding_raw, dtype=np.float32)
        norm = np.linalg.norm(registered_embedding)
        if norm < 1e-10:
            await websocket.send_json({"type": "error", "message": "Invalid canonical_embedding"})
            await websocket.close()
            return
        registered_embedding = registered_embedding / norm

        await websocket.send_json(
            {
                "type": "connected",
                "candidate_id": candidate_id,
                "message": "Unified analysis stream connected",
            }
        )

        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            if "image" not in msg:
                continue

            img = decode_base64_image(msg["image"])
            if img is None:
                await websocket.send_json({"type": "error", "message": "Invalid frame"})
                continue

            face_frame = img.copy()
            object_frame = img.copy()

            async def run_face_pipeline():
                def _face_job():
                    verify_result = face_engine.verify(face_frame, registered_embedding)
                    liveness_result = liveness.check_liveness(face_frame, face_bbox=verify_result.get("face_bbox"))

                    alert_type = "none"
                    is_ok = True

                    if verify_result["status"] == "no_face":
                        alert_type = "no_face"
                        is_ok = False
                    elif verify_result["status"] == "multiple_faces":
                        alert_type = "multiple_faces"
                        is_ok = False
                    elif verify_result["status"] == "mismatch":
                        alert_type = "face_mismatch"
                        is_ok = False
                    elif verify_result["status"] == "low_quality":
                        alert_type = "low_quality"
                        is_ok = False

                    if not liveness_result["is_live"] and alert_type == "none":
                        alert_type = "liveness_fail"
                        is_ok = False

                    if is_ok:
                        face_status = "ok"
                    elif alert_type == "face_mismatch":
                        face_status = "mismatch"
                    elif alert_type == "low_quality":
                        face_status = "mismatch"
                    else:
                        face_status = alert_type

                    return {
                        "verify": verify_result,
                        "liveness": liveness_result,
                        "alert_type": alert_type,
                        "is_ok": is_ok,
                        "face_status": face_status,
                    }

                return await asyncio.to_thread(_face_job)

            async def run_object_pipeline():
                return await asyncio.to_thread(object_session.analyze_frame, object_frame)

            face_data, object_data = await asyncio.gather(run_face_pipeline(), run_object_pipeline())

            alert_type = face_data["alert_type"]
            is_ok = face_data["is_ok"]
            similarity = float(face_data["verify"].get("similarity", 0.0))
            liveness_score = float(face_data["liveness"].get("liveness_score", 0.0))
            num_faces = int(face_data["verify"].get("num_faces", 0))

            if is_ok:
                if current_violation_type is not None or consecutive_same_type > 0:
                    logger.info(
                        "[FaceWS][%s] RECOVERY status=ok similarity=%.4f liveness=%.4f num_faces=%d (counter reset from type=%s count=%d)",
                        candidate_id,
                        similarity,
                        liveness_score,
                        num_faces,
                        current_violation_type,
                        consecutive_same_type,
                    )
                current_violation_type = None
                consecutive_same_type = 0
            else:
                if alert_type == current_violation_type:
                    consecutive_same_type += 1
                else:
                    current_violation_type = alert_type
                    consecutive_same_type = 1

                logger.info(
                    "[FaceWS][%s] VIOLATION status=%s type=%s similarity=%.4f liveness=%.4f num_faces=%d consecutive=%d/%d",
                    candidate_id,
                    face_data["face_status"],
                    current_violation_type,
                    similarity,
                    liveness_score,
                    num_faces,
                    consecutive_same_type,
                    CONSECUTIVE_SAME_TYPE_TO_ALERT,
                )

            formal_face_alert = (
                consecutive_same_type >= CONSECUTIVE_SAME_TYPE_TO_ALERT
                and consecutive_same_type % CONSECUTIVE_SAME_TYPE_TO_ALERT == 0
            )

            if formal_face_alert:
                logger.warning(
                    "[FaceWS][%s] FORMAL_ALERT type=%s status=%s consecutive=%d similarity=%.4f liveness=%.4f num_faces=%d",
                    candidate_id,
                    current_violation_type,
                    face_data["face_status"],
                    consecutive_same_type,
                    similarity,
                    liveness_score,
                    num_faces,
                )

            face_snapshot = None
            if formal_face_alert:
                annotated_face = annotate_face_alert(
                    face_frame,
                    face_data["face_status"],
                    face_data["verify"]["similarity"],
                    face_data["liveness"]["liveness_score"],
                )
                face_snapshot = encode_frame_base64(annotated_face)

            response = {
                "type": "analysis",
                "timestamp": datetime.utcnow().isoformat(),
                "candidate_id": candidate_id,
                "face": {
                    "similarity": round(float(face_data["verify"]["similarity"]), 4),
                    "liveness_score": round(float(face_data["liveness"]["liveness_score"]), 4),
                    "status": face_data["face_status"],
                    "formal_alert_raised": formal_face_alert,
                    "violation_type": current_violation_type if formal_face_alert else None,
                    "num_faces": int(face_data["verify"]["num_faces"]),
                },
                "object": {
                    "person_count": object_data["person_count"],
                    "suspicious_objects": object_data["suspicious_objects"],
                    "stable_violations": object_data["stable_violations"],
                    "new_alert_fired": object_data["new_alert"],
                    "alert_types": object_data["alert_types"],
                },
                "snapshots": {
                    "face": face_snapshot,
                    "object": object_data["snapshot_base64"],
                },
            }

            await websocket.send_json(response)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for candidate %s", candidate_id)
    except Exception as e:
        logger.exception("WebSocket error: %s", e)
    finally:
        liveness.close()
