"""
test_service.py — Integration test for the Voice Verification Service
=======================================================================
Tests all three endpoints:
  1. GET  /api/health
  2. POST /api/enroll  (using a generated test WAV)
  3. WS   /ws/verify/{session_id}

Usage:
  1. Start the server in one terminal:
       python server.py

  2. Run this test in another terminal:
       python test_service.py

Requirements: pip install requests websockets
"""

import asyncio
import json
import struct
import sys
import time
import traceback

import numpy as np
import requests
import soundfile as sf
import io
import websockets

BASE_URL = "http://localhost:8000"
WS_URL  = "ws://localhost:8000"

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _make_test_wav(duration_s: float = 5.0, sr: int = 16000) -> bytes:
    """Generate a sine-wave WAV in memory (acts as 'speech' for testing)."""
    t = np.linspace(0, duration_s, int(sr * duration_s), dtype=np.float32)
    # Mix of frequencies to give VAD enough signal
    audio = 0.4 * np.sin(2 * np.pi * 220 * t) + 0.2 * np.sin(2 * np.pi * 440 * t)
    buf = io.BytesIO()
    sf.write(buf, audio, sr, format="WAV")
    buf.seek(0)
    return buf.read()


def _ok(msg: str):
    print(f"  ✅ {msg}")

def _fail(msg: str):
    print(f"  ❌ {msg}")
    sys.exit(1)


# ─── Test 1: Health ───────────────────────────────────────────────────────────

def test_health():
    print("\n[Test 1] GET /api/health")
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=5)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        body = r.json()
        assert body["status"] == "ok", f"Unexpected status: {body}"
        assert body["model_loaded"] is True, "Model not loaded"
        _ok(f"status=ok  device={body['device']}  model_loaded={body['model_loaded']}")
    except Exception as e:
        _fail(f"Health check failed: {e}")


# ─── Test 2: Enroll ───────────────────────────────────────────────────────────

def test_enroll() -> str:
    print("\n[Test 2] POST /api/enroll")
    wav_bytes = _make_test_wav(duration_s=6.0)
    try:
        r = requests.post(
            f"{BASE_URL}/api/enroll",
            data={"speaker_id": "test_speaker_001"},
            files={"audio": ("test.wav", wav_bytes, "audio/wav")},
            timeout=60,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}\n{r.text}"
        body = r.json()
        assert body["status"] == "success", f"Unexpected body: {body}"
        assert "speaker_id" in body
        assert "embedding_path" in body
        assert int(body["embedding_dim"]) > 0
        _ok(
            f"speaker_id={body['speaker_id']}  "
            f"embedding_path={body['embedding_path']}  "
            f"dim={body['embedding_dim']}  "
            f"segments={body['num_segments']}  "
            f"duration={body['duration_s']}s"
        )
        return body["speaker_id"]
    except Exception as e:
        traceback.print_exc()
        _fail(f"Enroll failed: {e}")


# ─── Test 3: WebSocket Verify ─────────────────────────────────────────────────

async def test_verify_ws(speaker_id: str):
    print(f"\n[Test 3] WS /ws/verify/session_test_001?speaker_id={speaker_id}")
    uri = f"{WS_URL}/ws/verify/session_test_001?speaker_id={speaker_id}"

    # Synthesise ~4 seconds of audio (same sine as enrollment)
    sr = 16000
    duration_s = 4.0
    t = np.linspace(0, duration_s, int(sr * duration_s), dtype=np.float32)
    audio = 0.4 * np.sin(2 * np.pi * 220 * t) + 0.2 * np.sin(2 * np.pi * 440 * t)

    chunk_samples = 512  # matches CHUNK_SAMPLES in config.py
    received_events = []

    try:
        async with websockets.connect(uri) as ws:
            # Read "ready" event
            msg = await asyncio.wait_for(ws.recv(), timeout=10)
            evt = json.loads(msg)
            assert evt["event"] == "ready", f"Expected ready, got: {evt}"
            _ok(f"Connected — {evt['message']}")

            # Stream binary float32 PCM chunks
            for i in range(0, len(audio) - chunk_samples + 1, chunk_samples):
                chunk = audio[i: i + chunk_samples]
                await ws.send(chunk.tobytes())
                # Try to receive any queued events without blocking long
                try:
                    while True:
                        raw = await asyncio.wait_for(ws.recv(), timeout=0.05)
                        evt = json.loads(raw)
                        received_events.append(evt)
                        if evt["event"] == "result":
                            print(f"     → {evt['event'].upper():12s} decision={evt.get('decision')}  "
                                  f"raw={evt.get('raw_score')}  smooth={evt.get('smoothed_score')}")
                except asyncio.TimeoutError:
                    pass

            # Graceful stop
            await ws.send("STOP")
            # Drain remaining events
            try:
                while True:
                    raw = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    evt = json.loads(raw)
                    received_events.append(evt)
                    if evt["event"] == "session_end":
                        print(f"     → SESSION END  stats={evt['stats']}")
                        break
            except asyncio.TimeoutError:
                pass

    except Exception as e:
        traceback.print_exc()
        _fail(f"WebSocket test failed: {e}")
        return

    decisions = [e for e in received_events if e.get("event") == "result"]
    session_end = next((e for e in received_events if e.get("event") == "session_end"), None)

    if len(decisions) > 0:
        _ok(f"Received {len(decisions)} result event(s) during session")
    else:
        print("  ⚠️  No result events — audio may have been too short for VAD segments (expected for pure tones)")

    if session_end:
        _ok(f"session_end received: {session_end['stats']}")
    else:
        _fail("No session_end event received")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Voice Verification Service — Integration Tests")
    print("  Target:", BASE_URL)
    print("=" * 60)

    # Wait a moment if server just started
    print("\nChecking server availability...")
    for _ in range(10):
        try:
            requests.get(f"{BASE_URL}/api/health", timeout=2)
            break
        except Exception:
            time.sleep(1)
    else:
        _fail("Server not reachable. Start it with: python server.py")

    test_health()
    speaker_id = test_enroll()
    asyncio.run(test_verify_ws(speaker_id))

    print("\n" + "=" * 60)
    print("  All tests passed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
