"""
Real-Time Speaker Verification System
======================================
Usage:
  python main.py enroll --mic                     # Enroll from microphone
  python main.py enroll --file /path/to/audio.wav  # Enroll from file
  python main.py verify                            # Verify from microphone
  python main.py verify --file /path/to/audio.wav  # Verify a file offline
  python main.py list-devices                      # List audio input devices
"""

import argparse
import sys
import time
import torch
import numpy as np

from config import ENROLLMENT_SAVE_PATH, MODEL_BACKEND, MATCH_THRESHOLD, UNSURE_THRESHOLD
from models import load_model
from vad import SileroVAD
from enroller import SpeakerEnroller
from verifier import (
    RealTimeSpeakerVerifier, VerificationResult,
    DECISION_MATCH, DECISION_MISMATCH, DECISION_UNSURE,
    DECISION_SILENCE, DECISION_PENDING,
)


# ─── Terminal Display Callback ────────────────────────────────────────────────

# ANSI colors
_GREEN  = "\033[92m"
_RED    = "\033[91m"
_YELLOW = "\033[93m"
_CYAN   = "\033[96m"
_GRAY   = "\033[90m"
_RESET  = "\033[0m"
_BOLD   = "\033[1m"

_last_state = [None]
_last_print_time = [0.0]

def terminal_callback(result: VerificationResult):
    """Pretty-print verification results to terminal."""
    now = time.time()

    # Only print state changes or periodic updates (not every frame)
    should_print = (
        result.decision != _last_state[0]
        or result.raw_score is not None  # Always print scored segments
        or (now - _last_print_time[0]) > 0.5  # Periodic silence update
    )
    if not should_print:
        return

    _last_state[0] = result.decision
    _last_print_time[0] = now

    ts = f"[{result.timestamp:6.1f}s]"

    if result.decision == DECISION_SILENCE:
        print(f"\r{_GRAY}{ts} 🔇 SILENCE{_RESET}                              ", end="", flush=True)

    elif result.decision == DECISION_PENDING:
        bar = "▓" * int(result.segment_duration / 0.1) + "░" * max(0, 15 - int(result.segment_duration / 0.1))
        print(f"\r{_CYAN}{ts} 🗣  SPEAKING │{bar}│ {result.segment_duration:.1f}s{_RESET}   ", end="", flush=True)

    elif result.decision == DECISION_MATCH:
        score_bar = _score_bar(result.smoothed_score or 0)
        print(f"\n{ts} {_GREEN}{_BOLD}✅  MATCH{_RESET}     "
              f"score={_GREEN}{result.raw_score:.3f}{_RESET}  "
              f"smooth={result.smoothed_score:.3f}  "
              f"dur={result.segment_duration:.1f}s  {score_bar}")

    elif result.decision == DECISION_MISMATCH:
        score_bar = _score_bar(result.smoothed_score or 0)
        print(f"\n{ts} {_RED}{_BOLD}❌  MISMATCH{_RESET}  "
              f"score={_RED}{result.raw_score:.3f}{_RESET}  "
              f"smooth={result.smoothed_score:.3f}  "
              f"dur={result.segment_duration:.1f}s  {score_bar}")

    elif result.decision == DECISION_UNSURE:
        score_bar = _score_bar(result.smoothed_score or 0)
        print(f"\n{ts} {_YELLOW}{_BOLD}⚠️   UNSURE{_RESET}   "
              f"score={_YELLOW}{result.raw_score:.3f}{_RESET}  "
              f"smooth={result.smoothed_score:.3f}  "
              f"dur={result.segment_duration:.1f}s  {score_bar}")


def _score_bar(score: float, width: int = 20) -> str:
    """Visual bar for similarity score."""
    filled = max(0, min(width, int(score * width)))
    color = _GREEN if score >= MATCH_THRESHOLD else (_YELLOW if score >= UNSURE_THRESHOLD else _RED)
    return f"{color}{'█' * filled}{'░' * (width - filled)}{_RESET} {score:.2f}"


# ─── Commands ─────────────────────────────────────────────────────────────────

def cmd_enroll(args):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\n[System] Using device: {device}")
    print(f"[System] Model backend: {MODEL_BACKEND}")

    model = load_model(device)
    vad = SileroVAD(device=device)
    enroller = SpeakerEnroller(model, vad)

    if args.file:
        enroller.enroll_from_file(args.file, save_path=args.output)
    else:
        enroller.enroll_from_microphone(save_path=args.output)


def cmd_verify(args):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\n[System] Using device: {device}")
    print(f"[System] Model backend: {MODEL_BACKEND}")
    print(f"[System] Thresholds: MATCH≥{MATCH_THRESHOLD}  UNSURE≥{UNSURE_THRESHOLD}")

    model = load_model(device)
    vad = SileroVAD(device=device)
    enroller = SpeakerEnroller(model, vad)

    # Load reference embedding
    ref_path = args.reference or ENROLLMENT_SAVE_PATH
    reference_embedding = enroller.load_embedding(ref_path)

    verifier = RealTimeSpeakerVerifier(model, vad, reference_embedding)
    verifier.on_result(terminal_callback)

    _print_header()

    if args.file:
        # Offline verification mode
        _verify_file(args.file, verifier)
    else:
        # Real-time microphone mode
        verifier.start(device=args.device_id)


def _verify_file(path: str, verifier: RealTimeSpeakerVerifier):
    """Run verification on a file (offline mode)."""
    import soundfile as sf
    import scipy.signal

    print(f"\n[Verifier] Offline verification of: {path}")
    audio, sr = sf.read(path, dtype="float32")
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if sr != 16000:
        import scipy.signal
        audio = scipy.signal.resample(audio, int(len(audio) * 16000 / sr)).astype(np.float32)
    audio = audio / (np.max(np.abs(audio)) + 1e-8)

    from config import CHUNK_SAMPLES
    verifier._start_time = time.time()
    verifier._running = True

    for i in range(0, len(audio) - CHUNK_SAMPLES + 1, CHUNK_SAMPLES):
        chunk = audio[i: i + CHUNK_SAMPLES]
        vad_result = verifier.vad.process_chunk(chunk)

        if vad_result["state"] == "SEGMENT_READY" and vad_result["segment_audio"] is not None:
            from config import MIN_SEGMENT_DURATION_S
            dur = len(vad_result["segment_audio"]) / 16000
            if dur >= MIN_SEGMENT_DURATION_S:
                verifier._process_segment(vad_result["segment_audio"])

    remaining = verifier.vad.flush()
    if remaining is not None and len(remaining) / 16000 >= 0.5:
        verifier._process_segment(remaining)

    verifier._print_session_stats()


def cmd_list_devices(args):
    import sounddevice as sd
    print("\nAvailable audio input devices:")
    print("─" * 50)
    for i, dev in enumerate(sd.query_devices()):
        if dev["max_input_channels"] > 0:
            default = " ← DEFAULT" if i == sd.default.device[0] else ""
            print(f"  [{i:2d}] {dev['name']}{default}")
    print()


def _print_header():
    print("\n" + "═" * 60)
    print("  REAL-TIME SPEAKER VERIFICATION")
    print("  Decision Legend:")
    print(f"  {_GREEN}✅ MATCH{_RESET}    — Same speaker as reference")
    print(f"  {_RED}❌ MISMATCH{_RESET}  — Different speaker")
    print(f"  {_YELLOW}⚠️  UNSURE{_RESET}   — Low confidence")
    print(f"  {_GRAY}🔇 SILENCE{_RESET}  — No speech detected")
    print("═" * 60)


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Real-Time Speaker Verification System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Enroll command
    p_enroll = subparsers.add_parser("enroll", help="Enroll a reference speaker")
    src = p_enroll.add_mutually_exclusive_group()
    src.add_argument("--mic", action="store_true", default=True, help="Enroll from microphone (default)")
    src.add_argument("--file", type=str, help="Enroll from an audio file")
    p_enroll.add_argument("--output", default=ENROLLMENT_SAVE_PATH, help="Output embedding file path")

    # Verify command
    p_verify = subparsers.add_parser("verify", help="Run real-time speaker verification")
    p_verify.add_argument("--reference", type=str, default=None, help="Path to reference embedding file")
    p_verify.add_argument("--file", type=str, help="Verify an audio file instead of microphone")
    p_verify.add_argument("--device-id", type=int, default=None, help="Microphone device ID (see list-devices)")

    # List devices command
    subparsers.add_parser("list-devices", help="List available microphone devices")

    args = parser.parse_args()

    if args.command == "enroll":
        cmd_enroll(args)
    elif args.command == "verify":
        cmd_verify(args)
    elif args.command == "list-devices":
        cmd_list_devices(args)


if __name__ == "__main__":
    main()
