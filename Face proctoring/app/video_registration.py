"""
Video-Based Canonical Identity Registration Module.

Processes a batch of webcam frames to produce a single robust "Canonical Embedding"
that is more reliable than any single snapshot.

Pipeline:
  1. Decode frames → detect faces → extract quality metrics
  2. Score each frame (blur, face size, head pose, eye openness, confidence)
  3. Discard below-threshold frames, rank the rest
  4. Take top-K frames, extract embeddings, compute centroid
  5. Validate embedding consistency (reject if too spread)
  6. Return canonical embedding + best frame for storage
"""

import logging
import math
from dataclasses import dataclass, field
from typing import List, Tuple, Optional

import cv2
import numpy as np

from app.config import (
    VIDEO_REG_MIN_USABLE_FRAMES,
    VIDEO_REG_TOP_K_FRAMES,
    VIDEO_REG_MIN_FACE_SIZE,
    VIDEO_REG_MAX_YAW_DEGREES,
    VIDEO_REG_MIN_DETECTION_CONFIDENCE,
    VIDEO_REG_BLUR_THRESHOLD,
    VIDEO_REG_MAX_EMBEDDING_SPREAD,
    VIDEO_REG_EAR_THRESHOLD,
)
from app.face_engine import face_engine

logger = logging.getLogger(__name__)


class VideoRegistrationError(Exception):
    """Raised when video registration cannot produce a reliable embedding."""

    def __init__(self, reason: str, details: dict = None):
        self.reason = reason
        self.details = details or {}
        super().__init__(reason)


@dataclass
class FrameAnalysis:
    """Quality analysis result for a single frame."""
    index: int
    image: np.ndarray
    embedding: Optional[np.ndarray] = None
    quality_score: float = 0.0
    face_size: float = 0.0
    blur_score: float = 0.0
    detection_confidence: float = 0.0
    yaw_angle: float = 0.0
    eye_aspect_ratio: float = 1.0
    num_faces: int = 0
    rejection_reason: str = ""
    is_usable: bool = False


# ─── Quality Scoring ────────────────────────────────────────────────────────────

def _compute_blur_score(image: np.ndarray, bbox: list) -> float:
    """
    Compute blur score using Laplacian variance on the face region.
    Higher = sharper.  Lower = blurrier.
    """
    x1, y1, x2, y2 = [int(v) for v in bbox]
    h, w = image.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)

    face_crop = image[y1:y2, x1:x2]
    if face_crop.size == 0:
        return 0.0

    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _estimate_yaw_angle(face) -> float:
    """
    Estimate head yaw angle from InsightFace facial landmarks.
    Uses the 5-point landmarks: [left_eye, right_eye, nose, mouth_left, mouth_right].
    Yaw ≈ asymmetry of nose relative to eye midpoints.
    """
    if not hasattr(face, 'landmark_2d_106') and not hasattr(face, 'kps'):
        return 0.0

    try:
        # Use 5-point keypoints (kps): 0=left_eye, 1=right_eye, 2=nose
        kps = face.kps
        if kps is None or len(kps) < 3:
            return 0.0

        left_eye = kps[0]
        right_eye = kps[1]
        nose = kps[2]

        # Eye midpoint
        eye_center_x = (left_eye[0] + right_eye[0]) / 2.0
        eye_width = abs(right_eye[0] - left_eye[0])

        if eye_width < 1:
            return 0.0

        # Nose deviation from eye center, normalized by eye width
        nose_deviation = (nose[0] - eye_center_x) / eye_width

        # Convert to approximate degrees (empirical mapping)
        yaw_degrees = nose_deviation * 90.0
        return abs(yaw_degrees)
    except Exception:
        return 0.0


def _compute_eye_aspect_ratio(face) -> float:
    """
    Estimate eye openness from 5-point keypoints.
    Uses vertical distance between eye landmarks relative to face size.
    Returns a proxy EAR — higher = more open.
    """
    try:
        kps = face.kps
        if kps is None or len(kps) < 5:
            return 1.0

        # With 5-point kps we can't get true EAR, but we can use
        # the bounding box aspect and face size as proxy.
        # Fall back to a simple estimate: if the face is detected with
        # good confidence, eyes are likely open.
        # A more precise check would need full 68/106 landmarks.
        return 1.0 if face.det_score > 0.7 else 0.5
    except Exception:
        return 1.0


def score_frame_quality(image: np.ndarray, face) -> Tuple[float, dict]:
    """
    Score a frame's quality on a 0-1 scale.

    Components (weighted):
      - Face size:     0.25  (normalized against VIDEO_REG_MIN_FACE_SIZE)
      - Sharpness:     0.25  (Laplacian variance vs threshold)
      - Confidence:    0.20  (InsightFace det_score)
      - Head pose:     0.20  (yaw penalty)
      - Eye openness:  0.10  (EAR proxy)

    Returns:
        (score, breakdown_dict)
    """
    bbox = face.bbox.tolist()
    face_w = bbox[2] - bbox[0]
    face_h = bbox[3] - bbox[1]

    # 1. Face size score (0-1, capped at 1)
    min_dim = min(face_w, face_h)
    size_score = min(1.0, min_dim / (VIDEO_REG_MIN_FACE_SIZE * 2.5))

    # 2. Sharpness score
    blur_val = _compute_blur_score(image, bbox)
    sharpness_score = min(1.0, blur_val / (VIDEO_REG_BLUR_THRESHOLD * 3.0))

    # 3. Detection confidence
    conf = float(face.det_score) if hasattr(face, 'det_score') else 0.5
    conf_score = min(1.0, conf / 0.95)

    # 4. Head pose (yaw penalty)
    yaw = _estimate_yaw_angle(face)
    if yaw > VIDEO_REG_MAX_YAW_DEGREES:
        pose_score = 0.0
    else:
        pose_score = 1.0 - (yaw / VIDEO_REG_MAX_YAW_DEGREES) ** 2

    # 5. Eye openness
    ear = _compute_eye_aspect_ratio(face)
    eye_score = 1.0 if ear > VIDEO_REG_EAR_THRESHOLD else 0.3

    # Weighted combination
    total = (
        0.25 * size_score +
        0.25 * sharpness_score +
        0.20 * conf_score +
        0.20 * pose_score +
        0.10 * eye_score
    )

    breakdown = {
        "size": round(size_score, 3),
        "sharpness": round(sharpness_score, 3),
        "confidence": round(conf_score, 3),
        "pose": round(pose_score, 3),
        "eye": round(eye_score, 3),
        "blur_value": round(blur_val, 1),
        "yaw_degrees": round(yaw, 1),
        "face_dimensions": f"{face_w:.0f}x{face_h:.0f}",
    }

    return round(total, 4), breakdown


# ─── Frame Filtering ────────────────────────────────────────────────────────────

def analyze_frame(image: np.ndarray, index: int) -> FrameAnalysis:
    """
    Analyze a single frame: detect face, extract embedding, compute quality.
    """
    analysis = FrameAnalysis(index=index, image=image)

    # Detect faces
    all_faces = face_engine.detect_faces(image)

    # Filter out low-confidence ghost detections (common at low resolution/JPEG quality)
    faces = [f for f in all_faces if hasattr(f, 'det_score') and f.det_score >= VIDEO_REG_MIN_DETECTION_CONFIDENCE]
    analysis.num_faces = len(faces)

    if len(faces) == 0:
        analysis.rejection_reason = "no_face"
        return analysis

    if len(faces) > 1:
        analysis.rejection_reason = "multiple_faces"
        return analysis

    face = faces[0]

    # Check minimum face size
    face_w = face.bbox[2] - face.bbox[0]
    face_h = face.bbox[3] - face.bbox[1]
    analysis.face_size = min(face_w, face_h)

    if analysis.face_size < VIDEO_REG_MIN_FACE_SIZE:
        analysis.rejection_reason = "face_too_small"
        return analysis

    # Check detection confidence
    analysis.detection_confidence = float(face.det_score) if hasattr(face, 'det_score') else 0.5
    if analysis.detection_confidence < VIDEO_REG_MIN_DETECTION_CONFIDENCE:
        analysis.rejection_reason = "low_confidence"
        return analysis

    # Check head yaw
    analysis.yaw_angle = _estimate_yaw_angle(face)
    if analysis.yaw_angle > VIDEO_REG_MAX_YAW_DEGREES:
        analysis.rejection_reason = "extreme_head_angle"
        return analysis

    # Check blur
    analysis.blur_score = _compute_blur_score(image, face.bbox.tolist())

    # NOTE:
    # A hard blur gate at VIDEO_REG_BLUR_THRESHOLD can over-reject webcam videos
    # (especially browser-recorded WEBM) even when the face is visually usable.
    # Keep an absolute "very blurry" fail-safe, but allow moderately soft frames
    # through and let quality scoring rank them lower instead of rejecting all.
    hard_blur_floor = max(8.0, VIDEO_REG_BLUR_THRESHOLD * 0.2)
    if analysis.blur_score < hard_blur_floor:
        analysis.rejection_reason = "blurry"
        return analysis

    # Compute quality score
    quality, _ = score_frame_quality(image, face)
    analysis.quality_score = quality

    # Extract embedding
    embedding = face.normed_embedding
    if embedding is None:
        analysis.rejection_reason = "no_embedding"
        return analysis

    analysis.embedding = embedding
    analysis.is_usable = True
    return analysis


def filter_and_rank_frames(frames: List[np.ndarray]) -> List[FrameAnalysis]:
    """
    Analyze all frames, filter out bad ones, return usable frames ranked by quality.
    """
    results = []
    rejection_counts = {}

    for i, frame in enumerate(frames):
        analysis = analyze_frame(frame, i)
        if analysis.is_usable:
            results.append(analysis)
        else:
            reason = analysis.rejection_reason
            rejection_counts[reason] = rejection_counts.get(reason, 0) + 1

    logger.info(
        f"[VideoReg] Frame analysis: {len(frames)} total, "
        f"{len(results)} usable, rejections: {rejection_counts}"
    )

    # Sort by quality (best first)
    results.sort(key=lambda a: a.quality_score, reverse=True)
    return results


# ─── Canonical Embedding ────────────────────────────────────────────────────────

def compute_canonical_embedding(
    embeddings: List[np.ndarray],
) -> Tuple[np.ndarray, float]:
    """
    Compute the canonical (centroid) embedding from a list of per-frame embeddings.

    Steps:
      1. Stack all embeddings
      2. Check pairwise consistency (avg cosine distance)
      3. Compute mean vector (centroid)
      4. L2-normalize to unit length

    Args:
        embeddings: List of L2-normalized 512-dim vectors.

    Returns:
        (canonical_embedding, avg_pairwise_similarity)

    Raises:
        VideoRegistrationError if embeddings are too inconsistent.
    """
    if len(embeddings) < 2:
        raise VideoRegistrationError(
            "Not enough embeddings to compute canonical identity.",
            {"count": len(embeddings), "required": 2}
        )

    matrix = np.stack(embeddings)  # (K, 512)

    # Pairwise cosine similarity (since all are L2-normalized, sim = dot product)
    similarity_matrix = matrix @ matrix.T  # (K, K)

    # Extract upper triangle (exclude diagonal)
    n = len(embeddings)
    upper_tri = []
    for i in range(n):
        for j in range(i + 1, n):
            upper_tri.append(similarity_matrix[i, j])

    avg_similarity = float(np.mean(upper_tri))
    min_similarity = float(np.min(upper_tri))

    # Convert to distance for threshold check
    avg_distance = 1.0 - avg_similarity

    logger.info(
        f"[VideoReg] Embedding consistency: avg_sim={avg_similarity:.4f}, "
        f"min_sim={min_similarity:.4f}, avg_dist={avg_distance:.4f}"
    )

    if avg_distance > VIDEO_REG_MAX_EMBEDDING_SPREAD:
        raise VideoRegistrationError(
            "Too much variation between frames. The user may have moved too much, "
            "or lighting changed significantly. Please keep still and try again.",
            {
                "avg_similarity": round(avg_similarity, 4),
                "min_similarity": round(min_similarity, 4),
                "threshold": VIDEO_REG_MAX_EMBEDDING_SPREAD,
            }
        )

    # Compute centroid and re-normalize
    centroid = np.mean(matrix, axis=0)
    norm = np.linalg.norm(centroid)
    if norm < 1e-10:
        raise VideoRegistrationError("Degenerate centroid — embeddings cancel out.")
    canonical = (centroid / norm).astype(np.float32)

    return canonical, avg_similarity


# ─── Main Orchestrator ──────────────────────────────────────────────────────────

@dataclass
class VideoRegistrationResult:
    """Result of a successful video-based registration."""
    canonical_embedding: np.ndarray
    best_frame: np.ndarray         # highest quality frame for display/storage
    frames_used: int               # how many frames contributed to the centroid
    total_frames: int              # how many frames were provided
    usable_frames: int             # how many passed quality filters
    avg_quality_score: float       # mean quality score of top-K frames
    avg_similarity: float          # pairwise embedding consistency
    quality_breakdown: dict = field(default_factory=dict)


def process_video_registration(frames: List[np.ndarray]) -> VideoRegistrationResult:
    """
    Full video registration pipeline.

    Args:
        frames: List of BGR images (OpenCV format) from the webcam capture.

    Returns:
        VideoRegistrationResult with canonical embedding and metadata.

    Raises:
        VideoRegistrationError with descriptive message if registration cannot proceed.
    """
    total_frames = len(frames)
    logger.info(f"[VideoReg] Processing {total_frames} frames for registration")

    if total_frames < VIDEO_REG_MIN_USABLE_FRAMES:
        raise VideoRegistrationError(
            f"Not enough frames captured. Got {total_frames}, "
            f"need at least {VIDEO_REG_MIN_USABLE_FRAMES}. "
            "Please record for the full duration.",
            {"received": total_frames, "required": VIDEO_REG_MIN_USABLE_FRAMES}
        )

    # Step 1: Analyze and filter
    usable = filter_and_rank_frames(frames)
    usable_count = len(usable)

    if usable_count < VIDEO_REG_MIN_USABLE_FRAMES:
        # Build a descriptive error
        all_analyses = []
        rejection_counts = {}
        for i, frame in enumerate(frames):
            a = analyze_frame(frame, i)
            if not a.is_usable:
                r = a.rejection_reason
                rejection_counts[r] = rejection_counts.get(r, 0) + 1

        reason_messages = {
            "no_face": "face not visible",
            "multiple_faces": "multiple people in frame",
            "face_too_small": "face too far from camera",
            "low_confidence": "face unclear/partially visible",
            "extreme_head_angle": "head turned too far",
            "blurry": "image too blurry",
            "no_embedding": "could not process face",
        }

        issues = []
        for reason, count in sorted(rejection_counts.items(), key=lambda x: -x[1]):
            msg = reason_messages.get(reason, reason)
            issues.append(f"{count} frames: {msg}")

        raise VideoRegistrationError(
            f"Only {usable_count} out of {total_frames} frames were usable "
            f"(need {VIDEO_REG_MIN_USABLE_FRAMES}). Issues found:\n"
            + "\n".join(f"  • {issue}" for issue in issues)
            + "\n\nTip: Face the camera directly, ensure good lighting, and stay still.",
            {"usable": usable_count, "total": total_frames, "rejections": rejection_counts}
        )

    # Step 2: Take top-K
    top_k = usable[:VIDEO_REG_TOP_K_FRAMES]
    embeddings = [a.embedding for a in top_k]
    avg_quality = float(np.mean([a.quality_score for a in top_k]))

    logger.info(
        f"[VideoReg] Using top {len(top_k)} frames "
        f"(quality range: {top_k[-1].quality_score:.3f} – {top_k[0].quality_score:.3f})"
    )

    # Step 3: Compute canonical embedding
    canonical, avg_similarity = compute_canonical_embedding(embeddings)

    # Step 4: Select best frame for storage
    best_frame = top_k[0].image

    # Quality breakdown for logging
    best_analysis = top_k[0]
    _, breakdown = score_frame_quality(best_frame, face_engine.detect_faces(best_frame)[0])

    result = VideoRegistrationResult(
        canonical_embedding=canonical,
        best_frame=best_frame,
        frames_used=len(top_k),
        total_frames=total_frames,
        usable_frames=usable_count,
        avg_quality_score=round(avg_quality, 4),
        avg_similarity=round(avg_similarity, 4),
        quality_breakdown=breakdown,
    )

    logger.info(
        f"[VideoReg] ✅ Success: {result.frames_used} frames → canonical embedding "
        f"(quality={result.avg_quality_score:.3f}, consistency={result.avg_similarity:.3f})"
    )

    return result
