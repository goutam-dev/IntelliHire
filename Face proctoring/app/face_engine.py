"""
Face Engine — Core face detection, embedding extraction, and verification.
Uses InsightFace with the buffalo_l (ArcFace) model for highest accuracy.

Key design decisions:
- Uses cosine similarity for embedding comparison (ArcFace embeddings are L2-normalized)
- Multi-face detection to catch "helper" presence
- Quality checks on detected faces (size, confidence) to avoid matching on low-quality detections
"""

import logging
import numpy as np
import cv2
from insightface.app import FaceAnalysis

from app.config import INSIGHTFACE_MODEL, FACE_MATCH_THRESHOLD, MAX_FACES_ALLOWED

logger = logging.getLogger(__name__)


class FaceEngine:
    """
    High-accuracy face verification engine using InsightFace (ArcFace).
    
    ArcFace achieves >99.5% accuracy on LFW benchmark. The buffalo_l model
    provides the best accuracy among open-source face recognition models.
    """

    def __init__(self):
        self._app = None

    def initialize(self):
        """Load the InsightFace model. Call once at startup."""
        logger.info(f"Loading InsightFace model: {INSIGHTFACE_MODEL}")
        self._app = FaceAnalysis(
            name=INSIGHTFACE_MODEL,
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
        )
        # det_size determines detection resolution. Higher = better detection of small faces.
        self._app.prepare(ctx_id=0, det_size=(640, 640))
        logger.info("InsightFace model loaded successfully")

    @property
    def app(self):
        if self._app is None:
            self.initialize()
        return self._app

    def detect_faces(self, image: np.ndarray) -> list:
        """
        Detect all faces in an image.
        
        Args:
            image: BGR image as numpy array (OpenCV format)
            
        Returns:
            List of face objects with bbox, landmarks, embedding, etc.
        """
        faces = self.app.get(image)
        return faces

    def get_embedding(self, image: np.ndarray) -> tuple:
        """
        Detect the primary face and extract its 512-dim ArcFace embedding.
        
        Returns:
            (embedding, num_faces, face_bbox) or (None, num_faces, None) if no face found
        """
        faces = self.detect_faces(image)
        num_faces = len(faces)

        if num_faces == 0:
            return None, 0, None

        # Pick the largest face (most likely the primary subject)
        primary_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        
        # Quality check: face should be at least 80x80 pixels
        face_width = primary_face.bbox[2] - primary_face.bbox[0]
        face_height = primary_face.bbox[3] - primary_face.bbox[1]
        if face_width < 80 or face_height < 80:
            logger.warning(f"Face too small for reliable verification: {face_width:.0f}x{face_height:.0f}")
            return None, num_faces, None

        # Quality check: detection confidence
        if hasattr(primary_face, 'det_score') and primary_face.det_score < 0.5:
            logger.warning(f"Low detection confidence: {primary_face.det_score:.3f}")
            return None, num_faces, None

        embedding = primary_face.normed_embedding  # Already L2-normalized by ArcFace
        bbox = primary_face.bbox.tolist()
        
        return embedding, num_faces, bbox

    @staticmethod
    def compare_embeddings(emb1: np.ndarray, emb2: np.ndarray) -> float:
        """
        Compute cosine similarity between two face embeddings.
        
        ArcFace embeddings are L2-normalized, so cosine similarity = dot product.
        Range: -1 (completely different) to 1 (identical).
        Typical same-person scores: 0.5 - 0.8+
        Typical different-person scores: -0.1 - 0.3
        """
        emb1 = np.array(emb1, dtype=np.float32)
        emb2 = np.array(emb2, dtype=np.float32)
        
        # Normalize just in case
        emb1 = emb1 / (np.linalg.norm(emb1) + 1e-10)
        emb2 = emb2 / (np.linalg.norm(emb2) + 1e-10)
        
        similarity = float(np.dot(emb1, emb2))
        return similarity

    def verify(self, image: np.ndarray, registered_embedding: np.ndarray, 
               threshold: float = None) -> dict:
        """
        Full verification pipeline: detect face, extract embedding, compare.
        
        Args:
            image: BGR image (numpy array)
            registered_embedding: The embedding from registration
            threshold: Cosine similarity threshold (default from config)
            
        Returns:
            dict with keys:
                - is_match: bool
                - similarity: float (cosine similarity score)
                - num_faces: int
                - multiple_faces: bool (True if >MAX_FACES_ALLOWED)
                - face_bbox: list or None
                - status: str ('verified', 'mismatch', 'no_face', 'multiple_faces', 'low_quality')
        """
        if threshold is None:
            threshold = FACE_MATCH_THRESHOLD

        embedding, num_faces, face_bbox = self.get_embedding(image)

        result = {
            "is_match": False,
            "similarity": 0.0,
            "num_faces": num_faces,
            "multiple_faces": num_faces > MAX_FACES_ALLOWED,
            "face_bbox": face_bbox,
            "status": "unknown"
        }

        if num_faces == 0:
            result["status"] = "no_face"
            return result

        if embedding is None:
            result["status"] = "low_quality"
            return result

        if num_faces > MAX_FACES_ALLOWED:
            result["status"] = "multiple_faces"
            # Still verify the primary face
            similarity = self.compare_embeddings(embedding, registered_embedding)
            result["similarity"] = similarity
            result["is_match"] = similarity >= threshold
            return result

        similarity = self.compare_embeddings(embedding, registered_embedding)
        result["similarity"] = similarity
        result["is_match"] = similarity >= threshold
        result["status"] = "verified" if result["is_match"] else "mismatch"

        return result


# Global singleton
face_engine = FaceEngine()
