"""
Liveness Detection Module — Deep learning anti-spoofing with temporal analysis.

Primary: MiniFASNetV2 ONNX model classifies face as Real/Fake per frame.
Secondary: Blink/movement tracking via MediaPipe for video replay detection.

The DL model score is used directly as the liveness score.
Temporal bonuses/penalties only apply after sufficient time has elapsed.
"""

import logging
import os
import time
import urllib.request
from collections import deque

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

from app.config import (
    MIN_BLINKS_PER_30S,
    LIVENESS_THRESHOLD,
    DATA_DIR,
    LIVENESS_MIN_FACE_WIDTH,
    LIVENESS_MIN_FACE_HEIGHT,
    LIVENESS_MIN_BRIGHTNESS,
    LIVENESS_MIN_BLUR_VAR,
    LIVENESS_MAX_ABS_YAW_DEG,
    LIVENESS_MAX_ABS_PITCH_DEG,
)
from app.anti_spoof import AntiSpoofPredictor

logger = logging.getLogger(__name__)

# MediaPipe model
MODEL_PATH = os.path.join(DATA_DIR, "face_landmarker.task")
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"

BLINK_BLENDSHAPE_THRESHOLD = 0.4

# Head pose landmarks
NOSE_TIP = 1
CHIN = 152
LEFT_EYE_CORNER = 263
RIGHT_EYE_CORNER = 33
FOREHEAD = 10


def ensure_model_downloaded():
    """Download FaceLandmarker model if missing."""
    if not os.path.exists(MODEL_PATH):
        logger.info("Downloading FaceLandmarker model...")
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        logger.info("FaceLandmarker model downloaded to %s", MODEL_PATH)


# Singleton anti-spoof predictor
_anti_spoof: AntiSpoofPredictor = None


def get_anti_spoof() -> AntiSpoofPredictor:
    """Get or create the global anti-spoof predictor."""
    global _anti_spoof
    if _anti_spoof is None:
        logger.info("Loading MiniFASNet anti-spoofing models...")
        _anti_spoof = AntiSpoofPredictor()
        logger.info("Anti-spoofing models loaded successfully")
    return _anti_spoof


class LivenessDetector:
    """
    Liveness detector using MiniFASNetV2 + temporal analysis.
    """

    def __init__(self):
        ensure_model_downloaded()
        
        base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
        options = mp_vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=False,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            running_mode=mp_vision.RunningMode.IMAGE
        )
        self._landmarker = mp_vision.FaceLandmarker.create_from_options(options)
        self._anti_spoof = get_anti_spoof()
        
        # Temporal buffers
        self._blink_values = deque(maxlen=150)
        self._pose_history = deque(maxlen=50)
        self._blink_count = 0
        self._last_blink_state = False
        self._start_time = time.time()
        # Rolling DL scores — keep 7 for smoothing
        self._spoof_scores = deque(maxlen=7)

    def reset(self):
        """Reset all buffers for a new session."""
        self._blink_values.clear()
        self._pose_history.clear()
        self._blink_count = 0
        self._last_blink_state = False
        self._start_time = time.time()
        self._spoof_scores.clear()

    @staticmethod
    def _estimate_pose_deg(landmarks) -> tuple:
        """Estimate coarse yaw/pitch in degrees from landmark geometry."""
        try:
            nose = landmarks[NOSE_TIP]
            left_eye = landmarks[LEFT_EYE_CORNER]
            right_eye = landmarks[RIGHT_EYE_CORNER]
            chin = landmarks[CHIN]
            forehead = landmarks[FOREHEAD]
        except Exception:
            return 0.0, 0.0

        eye_mid_x = (left_eye.x + right_eye.x) / 2.0
        eye_mid_y = (left_eye.y + right_eye.y) / 2.0

        eye_dx = max(abs(right_eye.x - left_eye.x), 1e-6)
        face_dy = max(abs(chin.y - forehead.y), 1e-6)

        # Calibrated coarse pose mapping:
        # - horizontal offset around eye midpoint estimates yaw
        # - vertical ratio is biased because nose is naturally below eye line
        #   in a frontal face, so subtract neutral ratio before scaling.
        yaw_ratio = (nose.x - eye_mid_x) / eye_dx
        pitch_ratio = (nose.y - eye_mid_y) / face_dy
        neutral_pitch_ratio = 0.22

        yaw = yaw_ratio * 70.0
        pitch = (pitch_ratio - neutral_pitch_ratio) * 140.0

        return float(yaw), float(pitch)

    @staticmethod
    def _assess_frame_quality(image: np.ndarray, face_bbox: list, landmarks=None) -> dict:
        """Return frame quality metrics and whether the frame is reliable for anti-spoof evidence."""
        metrics = {
            "is_reliable": False,
            "reason": "missing_face_bbox",
            "brightness": None,
            "blur_var": None,
            "face_w": None,
            "face_h": None,
            "yaw_deg": None,
            "pitch_deg": None,
        }

        if not face_bbox or len(face_bbox) != 4:
            return metrics

        x1, y1, x2, y2 = [int(v) for v in face_bbox]
        h, w = image.shape[:2]

        x1 = max(0, min(x1, w - 1))
        y1 = max(0, min(y1, h - 1))
        x2 = max(0, min(x2, w - 1))
        y2 = max(0, min(y2, h - 1))

        if x2 <= x1 or y2 <= y1:
            metrics["reason"] = "invalid_face_bbox"
            return metrics

        face_w = x2 - x1
        face_h = y2 - y1
        metrics["face_w"] = int(face_w)
        metrics["face_h"] = int(face_h)

        if face_w < LIVENESS_MIN_FACE_WIDTH or face_h < LIVENESS_MIN_FACE_HEIGHT:
            metrics["reason"] = "face_too_small"
            return metrics

        roi = image[y1:y2, x1:x2]
        if roi.size == 0:
            metrics["reason"] = "empty_face_crop"
            return metrics

        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        brightness = float(np.mean(gray))
        blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        metrics["brightness"] = brightness
        metrics["blur_var"] = blur_var

        if brightness < LIVENESS_MIN_BRIGHTNESS:
            metrics["reason"] = "too_dark"
            return metrics

        if blur_var < LIVENESS_MIN_BLUR_VAR:
            metrics["reason"] = "too_blurry"
            return metrics

        if landmarks is not None and len(landmarks) > max(NOSE_TIP, LEFT_EYE_CORNER, RIGHT_EYE_CORNER, CHIN, FOREHEAD):
            yaw_deg, pitch_deg = LivenessDetector._estimate_pose_deg(landmarks)
            metrics["yaw_deg"] = yaw_deg
            metrics["pitch_deg"] = pitch_deg

            if abs(yaw_deg) > LIVENESS_MAX_ABS_YAW_DEG:
                metrics["reason"] = "extreme_yaw"
                return metrics

            if abs(pitch_deg) > LIVENESS_MAX_ABS_PITCH_DEG:
                metrics["reason"] = "extreme_pitch"
                return metrics

        metrics["is_reliable"] = True
        metrics["reason"] = "ok"
        return metrics

    def check_liveness(self, image: np.ndarray, face_bbox: list = None) -> dict:
        """
        Multi-signal liveness check.
        """
        elapsed = time.time() - self._start_time

        result = {
            "is_live": True,
            "liveness_score": 0.5,
            "status": "live",
            "blink_count": self._blink_count,
            "has_movement": False,
            "spoof_label": "Unknown",
            "details": "Analyzing...",
            "quality": {
                "is_reliable": False,
                "reason": "initializing",
            },
        }

        # ═══ LAYER 1: Deep Learning Anti-Spoofing ═══
        raw_dl_score = None
        spoof_result = None
        quality = self._assess_frame_quality(image, face_bbox, landmarks=None)
        result["quality"] = quality

        # ═══ LAYER 2: Temporal Analysis (MediaPipe) ═══
        temporal_bonus = 0.0
        
        rgb_image = image[:, :, ::-1].copy()
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

        try:
            detection_result = self._landmarker.detect(mp_image)
        except Exception as e:
            logger.warning(f"FaceLandmarker error: {e}")
            detection_result = None

        if detection_result and detection_result.face_landmarks:
            landmarks = detection_result.face_landmarks[0]
            img_h, img_w = image.shape[:2]

            quality = self._assess_frame_quality(image, face_bbox, landmarks=landmarks)
            result["quality"] = quality

            # Blink detection
            if detection_result.face_blendshapes:
                blendshapes = detection_result.face_blendshapes[0]
                blink_left = 0.0
                blink_right = 0.0
                for bs in blendshapes:
                    if bs.category_name == "eyeBlinkLeft":
                        blink_left = bs.score
                    elif bs.category_name == "eyeBlinkRight":
                        blink_right = bs.score

                avg_blink = (blink_left + blink_right) / 2.0
                self._blink_values.append(avg_blink)

                eye_closed = avg_blink > BLINK_BLENDSHAPE_THRESHOLD
                if self._last_blink_state and not eye_closed:
                    self._blink_count += 1
                self._last_blink_state = eye_closed

            # Head pose tracking
            pose_indices = [NOSE_TIP, CHIN, LEFT_EYE_CORNER, RIGHT_EYE_CORNER, FOREHEAD]
            pose_points = []
            for idx in pose_indices:
                if idx < len(landmarks):
                    lm = landmarks[idx]
                    pose_points.extend([lm.x * img_w, lm.y * img_h, lm.z * img_w])
            self._pose_history.append(pose_points)

            has_movement = False
            if len(self._pose_history) >= 5:
                pose_array = np.array(list(self._pose_history))
                pose_variance = np.mean(np.var(pose_array, axis=0))
                has_movement = pose_variance > 0.3
            result["has_movement"] = has_movement

            # Temporal bonus/penalty (only after 8s)
            if elapsed > 8:
                if self._blink_count >= 2:
                    temporal_bonus += 0.05
                elif elapsed > 15 and self._blink_count == 0:
                    temporal_bonus -= 0.03

                if has_movement:
                    temporal_bonus += 0.03

        # Only reliable frames contribute anti-spoof evidence.
        if quality["is_reliable"]:
            try:
                spoof_result = self._anti_spoof.predict(image, face_bbox)
                raw_dl_score = spoof_result["real_score"]
                self._spoof_scores.append(raw_dl_score)
                result["spoof_label"] = spoof_result["label"]
            except Exception as e:
                logger.warning(f"Anti-spoof prediction error: {e}")

        # Smoothed score using rolling mean
        if len(self._spoof_scores) >= 3:
            smoothed_dl = float(np.mean(list(self._spoof_scores)))
        elif len(self._spoof_scores) > 0:
            smoothed_dl = float(np.mean(list(self._spoof_scores)))
        else:
            smoothed_dl = 0.5  # No data yet

        # ═══ COMBINE ═══
        combined = smoothed_dl + temporal_bonus
        combined = max(0.0, min(1.0, combined))

        result["liveness_score"] = round(combined, 3)
        if not quality["is_reliable"]:
            result["status"] = "uncertain"
            result["is_live"] = True
        else:
            result["status"] = "live" if combined >= LIVENESS_THRESHOLD else "fail"
            result["is_live"] = combined >= LIVENESS_THRESHOLD
        result["blink_count"] = self._blink_count
        result["quality"] = quality

        # Log every frame for debugging
        raw_str = f"{raw_dl_score:.3f}" if raw_dl_score is not None else "N/A"
        logger.info(
            f"[Liveness] raw={raw_str} "
            f"smooth={smoothed_dl:.3f} "
            f"temporal={temporal_bonus:+.3f} "
            f"combined={combined:.3f} "
            f"live={'YES' if result['is_live'] else 'NO'} "
            f"status={result['status']} "
            f"quality={quality.get('reason')} "
            f"yaw={quality.get('yaw_deg') if quality.get('yaw_deg') is not None else 'N/A'} "
            f"pitch={quality.get('pitch_deg') if quality.get('pitch_deg') is not None else 'N/A'} "
            f"blinks={self._blink_count}"
        )

        # Build details
        details = []
        if spoof_result and spoof_result["label"] == "Fake":
            details.append(f"Spoof detected ({spoof_result['fake_score']:.2f})")
        if quality.get("reason") not in (None, "ok"):
            details.append(f"Uncertain frame: {quality.get('reason')}")
        if elapsed > 10 and self._blink_count == 0:
            details.append("No blinks detected")
        if elapsed > 10 and not result["has_movement"]:
            details.append("No head movement")
        if not details:
            details.append("OK")
        result["details"] = "; ".join(details)

        return result

    def close(self):
        """Release MediaPipe resources."""
        if self._landmarker:
            self._landmarker.close()
