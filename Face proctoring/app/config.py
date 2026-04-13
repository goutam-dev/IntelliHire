"""
Unified configuration for the stateless interview analysis microservice.
Contains all thresholds/settings for both face verification and object detection.
"""

import os

# --- Paths ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

# --- Face Verification (InsightFace ArcFace) ---
FACE_MATCH_THRESHOLD = 0.45
MAX_FACES_ALLOWED = 1
INSIGHTFACE_MODEL = "buffalo_l"

# --- Liveness Detection ---
LIVENESS_THRESHOLD = 0.5
EAR_BLINK_THRESHOLD = 0.22
MIN_BLINKS_PER_30S = 2
LIVENESS_MIN_FACE_WIDTH = 96
LIVENESS_MIN_FACE_HEIGHT = 96
LIVENESS_MIN_BRIGHTNESS = 45.0
LIVENESS_MIN_BLUR_VAR = 25.0
LIVENESS_MAX_ABS_YAW_DEG = 55.0
LIVENESS_MAX_ABS_PITCH_DEG = 55.0

# --- Face Alert System ---
CONSECUTIVE_SAME_TYPE_TO_ALERT = 6
CONSECUTIVE_FAILURES_TO_ALERT = CONSECUTIVE_SAME_TYPE_TO_ALERT
VERIFICATION_INTERVAL_MS = 2000

# --- Video-Based Registration (Canonical Identity) ---
VIDEO_REG_MIN_USABLE_FRAMES = 5
VIDEO_REG_MAX_FRAMES = 60
VIDEO_REG_TOP_K_FRAMES = 10
VIDEO_REG_MIN_FACE_SIZE = 50
VIDEO_REG_MAX_YAW_DEGREES = 30
VIDEO_REG_MIN_DETECTION_CONFIDENCE = 0.65
VIDEO_REG_BLUR_THRESHOLD = 40.0
VIDEO_REG_MAX_EMBEDDING_SPREAD = 0.6
VIDEO_REG_EAR_THRESHOLD = 0.20

# --- Object Detection (YOLOv8) ---
OBJECT_MODEL_PATH = os.getenv(
	"OBJECT_MODEL_PATH",
	os.path.join(DATA_DIR, "models", "yolov8n.pt"),
)
OBJECT_CONFIDENCE_THRESHOLD = 0.25
PERSON_CONFIDENCE_THRESHOLD = 0.65
MIN_PERSON_BOX_AREA = 5000

# Object violation logic thresholds (must remain unchanged)
ALERT_COOLDOWN = 3
DETECTION_BUFFER_SIZE = 5
MIN_DETECTIONS_FOR_ALERT = 2
VIOLATION_CONFIRMATION_TIME = 0.5
OBJECT_MISSING_GRACE_TIME = 6.0

# Person detection rules
ALLOW_MULTIPLE_PEOPLE = False
MAX_ALLOWED_PEOPLE = 1
ALERT_ON_NO_PERSON = True

# Suspicious objects (COCO classes)
SUSPICIOUS_OBJECTS = {
	"cell phone": {
		"enabled": True,
		"display_name": "Mobile Phone",
		"severity": "high",
	},
	"laptop": {
		"enabled": True,
		"display_name": "Laptop",
		"severity": "medium",
	},
	"book": {
		"enabled": True,
		"display_name": "Book/Notebook",
		"severity": "medium",
	},
	"keyboard": {
		"enabled": False,
		"display_name": "External Keyboard",
		"severity": "low",
	},
	"mouse": {
		"enabled": False,
		"display_name": "Mouse",
		"severity": "low",
	},
	"tvmonitor": {
		"enabled": True,
		"display_name": "Monitor/Screen",
		"severity": "high",
	},
}
