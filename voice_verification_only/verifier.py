"""
Real-Time Speaker Verification Engine

Pipeline:
  Microphone → Chunks → VAD → Speech Segments → Embedding → Cosine Similarity → Decision

Features:
  - Silence is properly handled (never flagged as mismatch)
  - Score smoothing via exponential moving average
  - Per-segment and rolling decisions
  - Callback-based event system
  - Thread-safe
"""

import numpy as np
import torch
import sounddevice as sd
import time
import os
import threading
import queue
import collections
from dataclasses import dataclass, field
from typing import Callable, Optional

from config import (
    SAMPLE_RATE, CHUNK_SAMPLES,
    MATCH_THRESHOLD, UNSURE_THRESHOLD, SMOOTHING_WINDOW,
    MIN_SEGMENT_DURATION_S, MAX_SEGMENT_DURATION_S,
    SHOW_CONFIDENCE,
    EMA_ALPHA, USE_SMOOTHED_FOR_DECISION,
    AUDIO_QUEUE_MAX_SECONDS,
    ROLLING_REF_ENABLE, ROLLING_REF_ALPHA, ROLLING_REF_MIN_SCORE,
    MISMATCH_LOG_ENABLE, MISMATCH_LOG_DIR, MISMATCH_LOG_MIN_DURATION_S,
)
from models import SpeakerEmbeddingModel
from vad import SileroVAD


# ─── Result Types ─────────────────────────────────────────────────────────────

DECISION_MATCH    = "MATCH"
DECISION_MISMATCH = "MISMATCH"
DECISION_UNSURE   = "UNSURE"
DECISION_SILENCE  = "SILENCE"
DECISION_PENDING  = "PENDING"  # Not enough audio yet


@dataclass
class VerificationResult:
    decision: str                  # MATCH | MISMATCH | UNSURE | SILENCE | PENDING
    raw_score: Optional[float]     # Cosine similarity for this segment (None if silence/pending)
    smoothed_score: Optional[float]# Smoothed score over last N segments
    segment_duration: float        # Duration of the processed segment (seconds)
    timestamp: float               # Time since verification started
    extra: dict = field(default_factory=dict)


# ─── Verifier ─────────────────────────────────────────────────────────────────

class RealTimeSpeakerVerifier:
    """
    Real-time speaker verification against a reference embedding.

    Usage:
        verifier = RealTimeSpeakerVerifier(model, vad, reference_embedding)
        verifier.on_result(my_callback)  # Optional callback
        verifier.start()
        # ... runs until verifier.stop()
    """

    def __init__(
        self,
        model: SpeakerEmbeddingModel,
        vad: SileroVAD,
        reference_embedding: torch.Tensor,
    ):
        self.model = model
        self.vad = vad
        self.reference_embedding = reference_embedding

        self._result_callbacks: list[Callable[[VerificationResult], None]] = []
        self._running = False
        self._start_time: float = 0.0

        # Score history for smoothing
        self._score_history: collections.deque = collections.deque(maxlen=SMOOTHING_WINDOW)
        self._ema_score: Optional[float] = None

        # Stats
        self.stats = {
            "segments_processed": 0,
            "match_count": 0,
            "mismatch_count": 0,
            "unsure_count": 0,
            "silence_frames": 0,
            "speech_frames": 0,
            "dropped_chunks": 0,
        }

        max_chunks = max(1, int(AUDIO_QUEUE_MAX_SECONDS * SAMPLE_RATE / CHUNK_SAMPLES))
        self._audio_queue: queue.Queue[np.ndarray] = queue.Queue(maxsize=max_chunks)
        self._process_thread: Optional[threading.Thread] = None

    def on_result(self, callback: Callable[[VerificationResult], None]):
        """Register a callback to receive VerificationResult on each decision."""
        self._result_callbacks.append(callback)
        return self  # Allow chaining

    def start(self, device: Optional[int] = None):
        """Start the real-time verification loop."""
        self._running = True
        self._start_time = time.time()
        self.vad._reset_state()
        self._score_history.clear()
        self._ema_score = None

        # Start processing thread
        self._process_thread = threading.Thread(target=self._process_loop, daemon=True)
        self._process_thread.start()

        # Start audio stream (blocks until stop() is called)
        print("\n[Verifier] 🎤 Listening... (Ctrl+C to stop)\n")
        try:
            with sd.InputStream(
                samplerate=SAMPLE_RATE,
                channels=1,
                dtype="float32",
                blocksize=CHUNK_SAMPLES,
                callback=self._audio_callback,
                device=device,
            ):
                while self._running:
                    time.sleep(0.1)
        except KeyboardInterrupt:
            pass
        finally:
            self.stop()

    def stop(self):
        """Stop the verification loop gracefully."""
        self._running = False
        if self._process_thread and self._process_thread.is_alive():
            self._process_thread.join(timeout=2.0)

        # Flush any remaining speech
        remaining = self.vad.flush()
        if remaining is not None:
            dur = len(remaining) / SAMPLE_RATE
            if dur >= 0.5:
                self._process_segment(remaining)

        self._print_session_stats()

    # ─── Internal ─────────────────────────────────────────────────────────────

    def _audio_callback(self, indata, frames, time_info, status):
        """sounddevice callback — runs in audio thread, must be fast."""
        if status:
            pass  # Ignore minor buffer warnings
        chunk = indata[:, 0].copy()
        try:
            self._audio_queue.put_nowait(chunk)
        except queue.Full:
            self.stats["dropped_chunks"] += 1
            try:
                _ = self._audio_queue.get_nowait()
            except queue.Empty:
                pass
            try:
                self._audio_queue.put_nowait(chunk)
            except queue.Full:
                self.stats["dropped_chunks"] += 1

    def _process_loop(self):
        """Processing thread — runs VAD and triggers verification."""
        while self._running:
            try:
                chunk = self._audio_queue.get(timeout=0.1)
            except queue.Empty:
                continue

            vad_result = self.vad.process_chunk(chunk)
            now = time.time() - self._start_time

            if vad_result["state"] == "SILENCE":
                self.stats["silence_frames"] += 1
                result = VerificationResult(
                    decision=DECISION_SILENCE,
                    raw_score=None,
                    smoothed_score=self._get_smoothed_score(),
                    segment_duration=0.0,
                    timestamp=now,
                )
                self._emit(result)

            elif vad_result["state"] == "SPEECH":
                self.stats["speech_frames"] += 1
                current_dur = self.vad.get_current_duration_s()

                # Force-process if segment exceeds max duration
                # (prevents waiting too long between decisions)
                if current_dur >= MAX_SEGMENT_DURATION_S:
                    forced_segment = np.concatenate(self.vad.current_segment_frames)
                    self.vad.current_segment_frames = []
                    self.vad.silence_frame_count = 0
                    self._process_segment(forced_segment, forced=True)
                else:
                    result = VerificationResult(
                        decision=DECISION_PENDING,
                        raw_score=None,
                        smoothed_score=self._get_smoothed_score(),
                        segment_duration=current_dur,
                        timestamp=now,
                    )
                    self._emit(result)

            elif vad_result["state"] == "SEGMENT_READY":
                seg = vad_result["segment_audio"]
                if seg is not None:
                    dur = len(seg) / SAMPLE_RATE
                    if dur >= MIN_SEGMENT_DURATION_S:
                        self._process_segment(seg)
                    else:
                        # Too short to be reliable — emit pending
                        result = VerificationResult(
                            decision=DECISION_PENDING,
                            raw_score=None,
                            smoothed_score=self._get_smoothed_score(),
                            segment_duration=dur,
                            timestamp=now,
                            extra={"reason": "segment_too_short"},
                        )
                        self._emit(result)

    def _process_segment(self, audio: np.ndarray, forced: bool = False):
        """Extract embedding, compare to reference, emit result."""
        dur = len(audio) / SAMPLE_RATE
        now = time.time() - self._start_time

        # Normalize
        audio = audio / (np.max(np.abs(audio)) + 1e-8)

        # Extract embedding
        with torch.no_grad():
            embedding = self.model.extract_embedding(audio)

        if self.reference_embedding.device != embedding.device:
            self.reference_embedding = self.reference_embedding.to(embedding.device)

        # Cosine similarity
        score = SpeakerEmbeddingModel.cosine_similarity(embedding, self.reference_embedding)
        self._score_history.append(score)
        smoothed = self._get_smoothed_score()
        decision_score = smoothed if (USE_SMOOTHED_FOR_DECISION and smoothed is not None) else score

        # Decision
        if decision_score >= MATCH_THRESHOLD:
            decision = DECISION_MATCH
            self.stats["match_count"] += 1
        elif decision_score >= UNSURE_THRESHOLD:
            decision = DECISION_UNSURE
            self.stats["unsure_count"] += 1
        else:
            decision = DECISION_MISMATCH
            self.stats["mismatch_count"] += 1

        self.stats["segments_processed"] += 1

        result = VerificationResult(
            decision=decision,
            raw_score=score,
            smoothed_score=smoothed,
            segment_duration=dur,
            timestamp=now,
            extra={"forced": forced},
        )
        self._emit(result)

        if decision == DECISION_MATCH:
            self._maybe_update_reference(embedding, decision_score)
        elif decision == DECISION_MISMATCH and MISMATCH_LOG_ENABLE:
            self._save_mismatch_audio(audio, score, smoothed, decision_score, dur, forced)

    def _emit(self, result: VerificationResult):
        """Dispatch result to all registered callbacks."""
        for cb in self._result_callbacks:
            try:
                cb(result)
            except Exception as e:
                print(f"[Verifier] Callback error: {e}")

    def _get_smoothed_score(self) -> Optional[float]:
        if not self._score_history:
            return None
        if EMA_ALPHA is None:
            return float(sum(self._score_history) / len(self._score_history))
        if self._ema_score is None:
            self._ema_score = float(self._score_history[-1])
        else:
            self._ema_score = float(EMA_ALPHA * self._score_history[-1] + (1 - EMA_ALPHA) * self._ema_score)
        return self._ema_score

    def _maybe_update_reference(self, embedding: torch.Tensor, decision_score: float):
        if not ROLLING_REF_ENABLE:
            return
        if decision_score < ROLLING_REF_MIN_SCORE:
            return
        alpha = float(ROLLING_REF_ALPHA)
        updated = (1 - alpha) * self.reference_embedding + alpha * embedding
        self.reference_embedding = torch.nn.functional.normalize(updated, dim=-1)

    def _save_mismatch_audio(
        self,
        audio: np.ndarray,
        raw_score: float,
        smoothed_score: Optional[float],
        decision_score: float,
        duration_s: float,
        forced: bool,
    ):
        try:
            import soundfile as sf
        except Exception:
            return

        os.makedirs(MISMATCH_LOG_DIR, exist_ok=True)

        min_samples = int(MISMATCH_LOG_MIN_DURATION_S * SAMPLE_RATE)
        if len(audio) < min_samples:
            pad = min_samples - len(audio)
            audio_to_save = np.pad(audio, (0, pad), mode="constant")
            duration_s = len(audio_to_save) / SAMPLE_RATE
        else:
            audio_to_save = audio

        ts = time.strftime("%Y%m%d_%H%M%S")
        score_tag = f"{decision_score:.3f}".replace(".", "p")
        dur_tag = f"{duration_s:.2f}".replace(".", "p")
        forced_tag = "forced" if forced else "normal"
        filename = f"mismatch_{ts}_score{score_tag}_dur{dur_tag}_{forced_tag}.wav"
        path = os.path.join(MISMATCH_LOG_DIR, filename)

        try:
            sf.write(path, audio_to_save, SAMPLE_RATE)
        except Exception:
            return

    def _print_session_stats(self):
        total = self.stats["segments_processed"]
        if total == 0:
            return
        print("\n\n" + "═" * 60)
        print("  SESSION SUMMARY")
        print("═" * 60)
        print(f"  Segments analyzed : {total}")
        print(f"  MATCH             : {self.stats['match_count']} "
              f"({self.stats['match_count']/total*100:.1f}%)")
        print(f"  MISMATCH          : {self.stats['mismatch_count']} "
              f"({self.stats['mismatch_count']/total*100:.1f}%)")
        print(f"  UNSURE            : {self.stats['unsure_count']} "
              f"({self.stats['unsure_count']/total*100:.1f}%)")
        print("═" * 60)
"""
VerifierSession — WebSocket-friendly per-session speaker verifier.
Appended to verifier.py at service setup time.
"""

# ─── WebSocket / Service Session Verifier ────────────────────────────────────

class VerifierSession:
    """
    Per-WebSocket-connection speaker verifier.

    Unlike RealTimeSpeakerVerifier, this class:
      - Has NO sounddevice / microphone dependency
      - Is driven by external audio chunks (from WebSocket binary frames)
      - Returns VerificationResult objects directly instead of using callbacks
      - Is safe to call from async route handlers (no internal threads)

    ALL core logic is IDENTICAL to RealTimeSpeakerVerifier:
      - Same VAD processing (same SileroVAD, same _reset_state)
      - Same scoring pipeline (embedding → cosine similarity → decision)
      - Same score smoothing / EMA
      - Same thresholds (MATCH_THRESHOLD, UNSURE_THRESHOLD)
      - Same rolling reference update
      - Same mismatch audio logging
      - Same stats structure
    """

    def __init__(
        self,
        model: SpeakerEmbeddingModel,
        reference_embedding: torch.Tensor,
    ):
        from app.service import get_device

        self.model = model
        self.reference_embedding = reference_embedding

        # IMPORTANT: Each session gets its OWN SileroVAD instance.
        # The singleton VAD in app/service.py is only for enrollment (sequential).
        # Concurrent WebSocket sessions MUST NOT share VAD state —
        # triggered, current_segment_frames, silence_frame_count are per-utterance mutable.
        self._vad: SileroVAD = SileroVAD(device=get_device())

        # Score smoothing (identical to RealTimeSpeakerVerifier)
        self._score_history: collections.deque = collections.deque(maxlen=SMOOTHING_WINDOW)
        self._ema_score: Optional[float] = None

        self._start_time: float = time.time()

        # Stats (same structure as RealTimeSpeakerVerifier.stats)
        self.stats = {
            "segments_processed": 0,
            "match_count": 0,
            "mismatch_count": 0,
            "unsure_count": 0,
            "silence_frames": 0,
            "speech_frames": 0,
        }


    def process_chunk(self, audio_chunk: np.ndarray) -> list:
        """
        Feed one audio chunk through VAD and return a list of VerificationResult.
        Identical pipeline to RealTimeSpeakerVerifier._process_loop():
          chunk -> vad.process_chunk() -> _score_segment() -> VerificationResult
        """
        results = []
        now = time.time() - self._start_time

        vad_result = self._vad.process_chunk(audio_chunk)

        if vad_result["state"] == "SILENCE":
            self.stats["silence_frames"] += 1
            results.append(VerificationResult(
                decision=DECISION_SILENCE,
                raw_score=None,
                smoothed_score=self._get_smoothed_score(),
                segment_duration=0.0,
                timestamp=now,
                extra={"vad_confidence": round(vad_result["confidence"], 4)},
            ))

        elif vad_result["state"] == "SPEECH":
            self.stats["speech_frames"] += 1
            current_dur = self._vad.get_current_duration_s()

            # Force-process if segment exceeds max duration
            # (identical to RealTimeSpeakerVerifier._process_loop)
            if current_dur >= MAX_SEGMENT_DURATION_S:
                forced_segment = np.concatenate(self._vad.current_segment_frames)
                self._vad.current_segment_frames = []
                self._vad.silence_frame_count = 0
                results.append(self._score_segment(forced_segment, forced=True))
            else:
                results.append(VerificationResult(
                    decision=DECISION_PENDING,
                    raw_score=None,
                    smoothed_score=self._get_smoothed_score(),
                    segment_duration=current_dur,
                    timestamp=now,
                    extra={"vad_confidence": round(vad_result["confidence"], 4)},
                ))

        elif vad_result["state"] == "SEGMENT_READY":
            seg = vad_result["segment_audio"]
            if seg is not None:
                dur = len(seg) / SAMPLE_RATE
                if dur >= MIN_SEGMENT_DURATION_S:
                    results.append(self._score_segment(seg))
                else:
                    results.append(VerificationResult(
                        decision=DECISION_PENDING,
                        raw_score=None,
                        smoothed_score=self._get_smoothed_score(),
                        segment_duration=dur,
                        timestamp=now,
                        extra={"reason": "segment_too_short"},
                    ))

        return results

    def flush(self) -> list:
        """
        Flush any remaining buffered speech at session end.
        Mirrors RealTimeSpeakerVerifier.stop() flush logic.
        """
        results = []
        remaining = self._vad.flush()
        if remaining is not None:
            dur = len(remaining) / SAMPLE_RATE
            if dur >= 0.5:
                results.append(self._score_segment(remaining))
        return results

    def get_stats(self) -> dict:
        """Return session statistics (same fields as RealTimeSpeakerVerifier.stats)."""
        return dict(self.stats)

    # ─── Internal (identical logic to RealTimeSpeakerVerifier) ───────────────

    def _score_segment(self, audio: np.ndarray, forced: bool = False) -> VerificationResult:
        """
        Core scoring pipeline — EXACTLY the same as RealTimeSpeakerVerifier._process_segment().
        Returns instead of emitting via callback. No other changes.
        """
        dur = len(audio) / SAMPLE_RATE
        now = time.time() - self._start_time

        # Normalize
        audio = audio / (np.max(np.abs(audio)) + 1e-8)

        # Extract embedding
        with torch.no_grad():
            embedding = self.model.extract_embedding(audio)

        if self.reference_embedding.device != embedding.device:
            self.reference_embedding = self.reference_embedding.to(embedding.device)

        # Cosine similarity
        score = SpeakerEmbeddingModel.cosine_similarity(embedding, self.reference_embedding)
        self._score_history.append(score)
        smoothed = self._get_smoothed_score()
        decision_score = smoothed if (USE_SMOOTHED_FOR_DECISION and smoothed is not None) else score

        # Decision (same thresholds)
        if decision_score >= MATCH_THRESHOLD:
            decision = DECISION_MATCH
            self.stats["match_count"] += 1
        elif decision_score >= UNSURE_THRESHOLD:
            decision = DECISION_UNSURE
            self.stats["unsure_count"] += 1
        else:
            decision = DECISION_MISMATCH
            self.stats["mismatch_count"] += 1

        self.stats["segments_processed"] += 1

        result = VerificationResult(
            decision=decision,
            raw_score=score,
            smoothed_score=smoothed,
            segment_duration=dur,
            timestamp=now,
            extra={"forced": forced},
        )

        # Rolling reference update on MATCH
        if decision == DECISION_MATCH:
            self._maybe_update_reference(embedding, decision_score)
        # Mismatch audio logging
        elif decision == DECISION_MISMATCH and MISMATCH_LOG_ENABLE:
            self._save_mismatch_audio(audio, score, smoothed, decision_score, dur, forced)

        return result

    def _get_smoothed_score(self) -> Optional[float]:
        """Identical to RealTimeSpeakerVerifier._get_smoothed_score()."""
        if not self._score_history:
            return None
        if EMA_ALPHA is None:
            return float(sum(self._score_history) / len(self._score_history))
        if self._ema_score is None:
            self._ema_score = float(self._score_history[-1])
        else:
            self._ema_score = float(
                EMA_ALPHA * self._score_history[-1] + (1 - EMA_ALPHA) * self._ema_score
            )
        return self._ema_score

    def _maybe_update_reference(self, embedding: torch.Tensor, decision_score: float):
        """Identical to RealTimeSpeakerVerifier._maybe_update_reference()."""
        if not ROLLING_REF_ENABLE:
            return
        if decision_score < ROLLING_REF_MIN_SCORE:
            return
        alpha = float(ROLLING_REF_ALPHA)
        updated = (1 - alpha) * self.reference_embedding + alpha * embedding
        self.reference_embedding = torch.nn.functional.normalize(updated, dim=-1)

    def _save_mismatch_audio(
        self,
        audio: np.ndarray,
        raw_score: float,
        smoothed_score: Optional[float],
        decision_score: float,
        duration_s: float,
        forced: bool,
    ):
        """Identical to RealTimeSpeakerVerifier._save_mismatch_audio()."""
        try:
            import soundfile as sf
        except Exception:
            return

        os.makedirs(MISMATCH_LOG_DIR, exist_ok=True)

        min_samples = int(MISMATCH_LOG_MIN_DURATION_S * SAMPLE_RATE)
        if len(audio) < min_samples:
            pad = min_samples - len(audio)
            audio_to_save = np.pad(audio, (0, pad), mode="constant")
            duration_s = len(audio_to_save) / SAMPLE_RATE
        else:
            audio_to_save = audio

        ts = time.strftime("%Y%m%d_%H%M%S")
        score_tag = f"{decision_score:.3f}".replace(".", "p")
        dur_tag = f"{duration_s:.2f}".replace(".", "p")
        forced_tag = "forced" if forced else "normal"
        filename = f"mismatch_{ts}_score{score_tag}_dur{dur_tag}_{forced_tag}.wav"
        path = os.path.join(MISMATCH_LOG_DIR, filename)

        try:
            sf.write(path, audio_to_save, SAMPLE_RATE)
        except Exception:
            pass
