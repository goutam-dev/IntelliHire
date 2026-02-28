"""
Anti-Spoofing Module — Deep learning-based photo/screen detection.

Uses MiniFASNetV2 (Silent-Face-Anti-Spoofing) ONNX model to distinguish
real faces from printed photos, screen displays, and other attacks.

Only MiniFASNetV2 (scale 2.7) is used because MiniFASNetV1SE (scale 4.0)
was found to be extremely noisy for real faces, randomly fluctuating
between 0.25-0.95. MiniFASNetV2 is rock solid (0.93-0.99 for real faces,
<0.01 for photos).

Model source: https://github.com/minivision-ai/Silent-Face-Anti-Spoofing
ONNX weights: https://github.com/yakhyo/face-anti-spoofing
"""

import logging
import os
import urllib.request

import cv2
import numpy as np
import onnxruntime as ort

from app.config import DATA_DIR

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(DATA_DIR, "antispoof_models")
MODEL_PATH = os.path.join(MODELS_DIR, "MiniFASNetV2.onnx")
MODEL_SCALE = 2.7
MODEL_URL = "https://github.com/yakhyo/face-anti-spoofing/releases/download/weights/MiniFASNetV2.onnx"


def ensure_models_downloaded():
    """Download anti-spoofing model if missing."""
    if not os.path.exists(MODEL_PATH):
        logger.info("Downloading MiniFASNetV2 model...")
        os.makedirs(MODELS_DIR, exist_ok=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        logger.info("MiniFASNetV2 downloaded to %s", MODEL_PATH)


class AntiSpoofPredictor:
    """
    ONNX-based face anti-spoofing using MiniFASNetV2.
    
    Output: softmax [fake_prob, real_prob]
    - Index 0 = Fake probability
    - Index 1 = Real probability
    """

    def __init__(self):
        ensure_models_downloaded()
        
        self._session = ort.InferenceSession(
            MODEL_PATH,
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        input_cfg = self._session.get_inputs()[0]
        output_cfg = self._session.get_outputs()[0]
        input_shape = input_cfg.shape
        
        self._input_name = input_cfg.name
        self._input_h = input_shape[2] if len(input_shape) > 2 else 80
        self._input_w = input_shape[3] if len(input_shape) > 3 else 80
        self._output_name = output_cfg.name
        
        logger.info(f"Loaded MiniFASNetV2 (input: {input_shape}, scale: {MODEL_SCALE})")

    def _crop_face(self, image: np.ndarray, bbox_xywh: list) -> np.ndarray:
        """Crop face region with scale expansion and resize for model input."""
        src_h, src_w = image.shape[:2]
        x, y, box_w, box_h = bbox_xywh

        actual_scale = min(
            (src_h - 1) / max(box_h, 1),
            (src_w - 1) / max(box_w, 1),
            MODEL_SCALE
        )

        new_w = box_w * actual_scale
        new_h = box_h * actual_scale
        center_x = x + box_w / 2
        center_y = y + box_h / 2

        x1 = max(0, int(center_x - new_w / 2))
        y1 = max(0, int(center_y - new_h / 2))
        x2 = min(src_w - 1, int(center_x + new_w / 2))
        y2 = min(src_h - 1, int(center_y + new_h / 2))

        cropped = image[y1:y2 + 1, x1:x2 + 1]
        if cropped.size == 0:
            return np.zeros((self._input_h, self._input_w, 3), dtype=np.float32)

        return cv2.resize(cropped, (self._input_w, self._input_h))

    def _softmax(self, x: np.ndarray) -> np.ndarray:
        """Standard softmax."""
        e_x = np.exp(x - np.max(x, axis=1, keepdims=True))
        return e_x / e_x.sum(axis=1, keepdims=True)

    def predict(self, image: np.ndarray, bbox_xyxy: list) -> dict:
        """
        Predict if a face is real or fake.
        
        Args:
            image: BGR image
            bbox_xyxy: [x1, y1, x2, y2] face bounding box
            
        Returns:
            dict with: is_real, real_score, fake_score, label, model_scores
        """
        x1, y1, x2, y2 = [int(v) for v in bbox_xyxy]
        bbox_xywh = [x1, y1, x2 - x1, y2 - y1]

        face = self._crop_face(image, bbox_xywh)
        face = face.astype(np.float32)
        face = np.transpose(face, (2, 0, 1))  # HWC → CHW
        face = np.expand_dims(face, axis=0)

        outputs = self._session.run(
            [self._output_name],
            {self._input_name: face}
        )
        
        logits = outputs[0]
        probs = self._softmax(logits)[0]  # [fake_prob, real_prob]
        
        real_score = float(probs[1])
        fake_score = float(probs[0])
        is_real = real_score > 0.5
        label = "Real" if is_real else "Fake"

        return {
            "is_real": is_real,
            "real_score": round(real_score, 4),
            "fake_score": round(fake_score, 4),
            "label": label,
            "model_scores": {"MiniFASNetV2": {"real": round(real_score, 4), "fake": round(fake_score, 4)}},
        }
