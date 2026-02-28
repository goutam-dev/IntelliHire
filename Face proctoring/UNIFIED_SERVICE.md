# Unified Interview Analysis Service (Complete Handoff Documentation)

## 1) What this service is

This project is a **single stateless FastAPI microservice** for interview monitoring. It combines two pipelines into one backend:

1. **Face Identity + Liveness Pipeline**
   - InsightFace (`buffalo_l`) for face detection/embedding/verification
   - Anti-spoof model (`MiniFASNetV2.onnx`) for spoof detection
   - MediaPipe Face Landmarker for temporal liveness cues (blinks and movement)

2. **Object/Scene Monitoring Pipeline**
   - YOLOv8 (`yolov8n.pt`) for person count and suspicious object detection

The service exposes:
- **One registration endpoint** (`POST /api/register`)
- **One analysis WebSocket endpoint** (`WS /ws/analyze`)

No SQLite, no local report database, no frontend SPA, no email alerts.

---

## 2) Core design guarantees

### Stateless by design
- The service stores no candidate records locally.
- The caller sends canonical embedding during WebSocket connection init.
- Runtime state is in-memory only and exists only for one WebSocket session.

### Logic parity preserved
- Face formal alert threshold: **6 consecutive same-type failures**.
- Object violation confirmation: **must persist 2.0 seconds**.
- Object alert cooldown: **3 seconds** per violation key.
- Person filters and confidence thresholds remain unchanged.
- Service reports detections/alerts; it does **not** return final pass/fail decisions.

---

## 3) Project entrypoints and key files

- `app/main.py`
  - FastAPI app setup
  - CORS configuration
  - Startup preload of face, anti-spoof, and object models

- `app/routes.py`
  - `POST /api/register`
  - `WS /ws/analyze`
  - Unified per-frame response format

- `app/video_registration.py`
  - Canonical embedding computation from video frame batch
  - Quality filtering, scoring, top-K selection, embedding consistency checks

- `app/face_engine.py`
  - Face detection and similarity verification against canonical embedding

- `app/liveness.py`
  - Temporal liveness logic + MediaPipe integration
  - Uses anti-spoof result and temporal signals

- `app/anti_spoof.py`
  - MiniFASNetV2 inference wrapper

- `app/object_monitor.py`
  - YOLO inference
  - 2s stability confirmation + 3s cooldown logic
  - Annotated snapshot as base64 instead of file saving

- `app/config.py`
  - Unified thresholds and settings for both pipelines

---

## 4) API contract

## 4.1 Registration endpoint

**Method:** `POST /api/register`

### Request JSON
```json
{
  "candidate_id": "cand-001",
  "frames": [
    "data:image/jpeg;base64,...",
    "data:image/jpeg;base64,..."
  ]
}
```

### Behavior
- Decodes frame batch
- Runs canonical identity pipeline
- Returns canonical embedding + quality metadata
- Does not store anything locally

### Response JSON (example)
```json
{
  "success": true,
  "candidate_id": "cand-001",
  "canonical_embedding": [0.0123, -0.0087, 0.0044],
  "registration_type": "video_canonical",
  "frames_used": 10,
  "total_frames": 45,
  "usable_frames": 21,
  "quality_score": 0.742,
  "embedding_consistency": 0.812,
  "quality_breakdown": {
    "size": 0.91,
    "sharpness": 0.76,
    "confidence": 0.88,
    "pose": 0.71,
    "eye": 1.0,
    "blur_value": 121.2,
    "yaw_degrees": 7.8,
    "face_dimensions": "142x149"
  }
}
```

---

## 4.2 WebSocket endpoint

**Endpoint:** `WS /ws/analyze`

### Step A: send init message once after connect
```json
{
  "candidate_id": "cand-001",
  "canonical_embedding": [0.0123, -0.0087, 0.0044]
}
```

### Step B: send frame messages continuously
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

### Server per-frame response (example)
```json
{
  "type": "analysis",
  "timestamp": "2026-02-28T18:31:09.000000",
  "candidate_id": "cand-001",
  "face": {
    "similarity": 0.6132,
    "liveness_score": 0.782,
    "status": "ok",
    "formal_alert_raised": false,
    "violation_type": null,
    "num_faces": 1
  },
  "object": {
    "person_count": 1,
    "suspicious_objects": [],
    "stable_violations": [],
    "new_alert_fired": false,
    "alert_types": []
  },
  "snapshots": {
    "face": null,
    "object": null
  }
}
```

---

## 5) Face pipeline state logic (unchanged)

For each frame, face pipeline computes:
- face verification (`similarity`, `status`)
- liveness score (`liveness_score`, `is_live` internal)

Transient violation categories include:
- `no_face`
- `multiple_faces`
- `face_mismatch`
- `low_quality`
- `liveness_fail`

Formal alert logic:
- Track current violation type and consecutive count
- Raise formal alert only when:
  - count >= 6, and
  - count % 6 == 0

When formal alert occurs:
- an annotated face frame is generated
- returned as base64 in `snapshots.face`
- no disk write

---

## 6) Object pipeline state logic (unchanged)

For each frame, object pipeline computes:
- filtered person count
- suspicious objects list
- provisional violation flags

Then applies stability rules:
- each violation type must persist for 2.0s (`VIOLATION_CONFIRMATION_TIME`)
- only stable violations are considered active

Alert emission rules:
- per-violation cooldown of 3s (`ALERT_COOLDOWN`)
- new alert fires only when cooldown allows

When object alert fires:
- annotated object frame is generated
- returned as base64 in `snapshots.object`
- no disk write

---

## 7) Unified response semantics

### Face section
- `similarity`: current cosine similarity
- `liveness_score`: current liveness score
- `status`: one of `ok`, `no_face`, `multiple_faces`, `mismatch`, `liveness_fail`
- `formal_alert_raised`: whether 6-frame rule triggered this frame
- `violation_type`: violation that triggered formal face alert this frame

### Object section
- `person_count`: filtered count of persons this frame
- `suspicious_objects`: suspicious detections this frame
- `stable_violations`: violations that crossed 2s confirmation this frame
- `new_alert_fired`: whether object cooldown allowed new alert this frame
- `alert_types`: alert keys fired this frame

### Snapshots section
- `face`: base64 jpg if face formal alert fired, else `null`
- `object`: base64 jpg if object alert fired, else `null`

---

## 8) Configuration reference

All thresholds are in `app/config.py`.

Important values:
- `FACE_MATCH_THRESHOLD = 0.45`
- `LIVENESS_THRESHOLD = 0.5`
- `CONSECUTIVE_SAME_TYPE_TO_ALERT = 6`
- `VIDEO_REG_MAX_FRAMES = 60`
- `OBJECT_CONFIDENCE_THRESHOLD = 0.5`
- `PERSON_CONFIDENCE_THRESHOLD = 0.65`
- `MIN_PERSON_BOX_AREA = 5000`
- `VIOLATION_CONFIRMATION_TIME = 2.0`
- `ALERT_COOLDOWN = 3`

---

## 9) Model files and auto-download behavior

On a fresh machine, with internet access:

1. **InsightFace model pack**
   - Auto-downloaded by InsightFace when first needed

2. **MediaPipe face landmarker**
   - Auto-downloaded if missing:
   - `data/face_landmarker.task`

3. **Anti-spoof model**
   - Auto-downloaded if missing:
   - `data/antispoof_models/MiniFASNetV2.onnx`

4. **YOLO model**
   - Preferred path from config: `data/models/yolov8n.pt`
   - Optional env override: `OBJECT_MODEL_PATH`
   - If preferred path is missing, loader falls back to `yolov8n.pt` (Ultralytics download behavior)

---

## 10) Environment variables

Required:
- None

Optional:
- `OBJECT_MODEL_PATH`
  - Use when model is stored in a custom location
  - Example (Windows):
    - `OBJECT_MODEL_PATH=C:\\models\\yolov8n.pt`

---

## 11) Install and run

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Start service:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

3. Connect from interview module:
- call `POST /api/register`
- keep returned `canonical_embedding`
- open `WS /ws/analyze`
- send init message with `candidate_id` + `canonical_embedding`
- stream frames

---

## 12) Operational notes

- First startup can be slower due to model downloads and warm-up.
- If machine is offline and model cache is empty, startup or first request may fail.
- This service is compute-heavy; use GPU where available for production.
- CORS is currently open (`*`); restrict in production deployments as needed.

---

## 13) Error handling behavior

Registration errors:
- invalid/empty frames
- frame count exceeds max
- canonical embedding pipeline quality failure

WebSocket errors:
- missing init payload fields
- invalid embedding
- invalid frame payload
- runtime model/inference errors are logged and connection can close

---

## 14) Migration answer: can old object folder be deleted?

Yes.

The unified service no longer depends on `object detection by eshwar` for default model path.
Default model path is now local to this service (`data/models/yolov8n.pt`) with fallback download behavior.

So deleting the old object-detection folder will not affect this service, as long as:
- dependencies are installed, and
- the machine can download missing models (or models are already cached/local).

---

## 15) Minimal client-side sequence summary

1. Capture registration video frames
2. `POST /api/register` -> receive canonical embedding
3. Open `WS /ws/analyze`
4. Send init payload once with embedding
5. Send frames and consume one merged response per frame
6. Interview module decides enforcement policy

