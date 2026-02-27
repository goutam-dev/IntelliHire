"""
mic_capture.py — Python Microphone Capture Helper
===================================================
Spawned by verify.js (Node.js) as a child process.
Captures audio from the microphone using sounddevice (same backend as the
main Python system), and writes raw float32 PCM bytes to stdout.

Node.js reads these bytes and forwards them as 512-sample WebSocket chunks
to the verification service.

Usage (called by Node.js automatically):
  python mic_capture.py [--device DEVICE_ID]
"""

import sys
import argparse
import numpy as np
import sounddevice as sd
import queue

SAMPLE_RATE  = 16000
CHANNELS     = 1
CHUNK        = 512         # samples per chunk (matches CHUNK_SAMPLES in config.py)
DTYPE        = "float32"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--device", type=int, default=None,
                        help="Audio input device ID (default: system default)")
    args = parser.parse_args()

    q: queue.Queue = queue.Queue()

    def callback(indata, frames, time_info, status):
        if status:
            print(f"[mic] {status}", file=sys.stderr)
        q.put(indata[:, 0].copy())

    sys.stderr.write(f"[mic] Starting capture: {SAMPLE_RATE}Hz mono float32 (device={args.device})\n")
    sys.stderr.flush()

    # Write raw bytes — stdout must be in binary mode
    stdout_bin = sys.stdout.buffer

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype=DTYPE,
        blocksize=CHUNK,
        device=args.device,
        callback=callback,
    ):
        sys.stderr.write("[mic] Capturing... (kill process to stop)\n")
        sys.stderr.flush()
        while True:
            try:
                chunk = q.get(timeout=1.0)
                stdout_bin.write(chunk.astype(np.float32).tobytes())
                stdout_bin.flush()
            except queue.Empty:
                continue
            except (BrokenPipeError, IOError):
                # Node.js closed the pipe (Ctrl+C)
                break


if __name__ == "__main__":
    main()
