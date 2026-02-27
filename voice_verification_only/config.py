"""
Configuration — Real-Time Speaker Verification System (ResNet34 backend)
"""

# ─── Audio Settings ───────────────────────────────────────────────────────────
SAMPLE_RATE = 16000          # Hz — required by all models
CHANNELS = 1                 # Mono
CHUNK_DURATION_MS = 32       # ms per VAD frame (Silero minimum is 512 samples @16k)
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_DURATION_MS / 1000)

# ─── Voice Activity Detection ─────────────────────────────────────────────────
VAD_THRESHOLD = 0.5          # Silero VAD confidence threshold (0-1)
VAD_MIN_SPEECH_DURATION_MS = 250    # Ignore speech bursts shorter than this
VAD_MIN_SILENCE_DURATION_MS = 400   # Silence needed to end a speech segment
VAD_SPEECH_PAD_MS = 100      # Pad speech segments on both sides

# ─── Speaker Verification ─────────────────────────────────────────────────────
# Model: pyannote/wespeaker-voxceleb-resnet34-LM (256-dim embeddings)
MODEL_BACKEND = "resnet"

# Verification window: accumulate this much speech before scoring
MIN_SEGMENT_DURATION_S = 1.5   # seconds of speech needed before scoring
MAX_SEGMENT_DURATION_S = 4.0   # clip segments longer than this

# Cosine similarity thresholds (tune after enrollment)
MATCH_THRESHOLD = 0.5         # Above this → MATCH  (lower = more permissive)
UNSURE_THRESHOLD = 0.4        # Between → UNSURE
# Below UNSURE_THRESHOLD → MISMATCH

# Score smoothing
SMOOTHING_WINDOW = 3           # Used for simple mean if EMA_ALPHA is None
EMA_ALPHA = 0.35               # 0-1, higher = react faster; set to None for mean
USE_SMOOTHED_FOR_DECISION = True

# Rolling reference update (only on MATCH)
ROLLING_REF_ENABLE = True
ROLLING_REF_ALPHA = 0.05        # 0-1, lower = slower adaptation
ROLLING_REF_MIN_SCORE = 0.75    # Minimum decision score to update reference

# ─── Enrollment ───────────────────────────────────────────────────────────────
ENROLLMENT_SEGMENTS = 5        # How many voice segments to use for enrollment
ENROLLMENT_MIN_DURATION_S = 2  # Each segment must be at least this long
ENROLLMENT_SAVE_PATH = "reference_speaker.pt"  # Saved embedding file

# ─── Display ──────────────────────────────────────────────────────────────────
SHOW_CONFIDENCE = True
SHOW_WAVEFORM_ASCII = False    # Real-time ASCII waveform in terminal

# Audio buffering
AUDIO_QUEUE_MAX_SECONDS = 4.0  # Drop oldest audio if processing falls behind

# Mismatch logging
MISMATCH_LOG_ENABLE = True
MISMATCH_LOG_DIR = "mismatch_logs"
MISMATCH_LOG_MIN_DURATION_S = 2.5

# ─── Service Settings ─────────────────────────────────────────────────────────
SERVICE_HOST = "0.0.0.0"
SERVICE_PORT = 8000
EMBEDDINGS_DIR = "embeddings"  # Where speaker .pt files are stored
