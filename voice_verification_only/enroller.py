"""
Speaker Enrollment Module
Builds a robust reference embedding from multiple audio segments.
Supports: microphone enrollment, audio file enrollment, embedding save/load.
"""

import numpy as np
import torch
import torch.nn.functional as F
import sounddevice as sd
import soundfile as sf
import os
import time
import queue
from pathlib import Path
from typing import Union

from config import (
    SAMPLE_RATE, CHUNK_SAMPLES, ENROLLMENT_SEGMENTS,
    ENROLLMENT_MIN_DURATION_S, ENROLLMENT_SAVE_PATH,
    AUDIO_QUEUE_MAX_SECONDS,
)
from models import SpeakerEmbeddingModel
from vad import SileroVAD


class SpeakerEnroller:
    """
    Enrolls a speaker by collecting multiple voice segments and
    computing a mean embedding (centroid) for robust verification.

    Multi-segment enrollment significantly improves verification accuracy
    by capturing speaker variability (different phonemes, speaking styles).
    """

    def __init__(self, model: SpeakerEmbeddingModel, vad: SileroVAD):
        self.model = model
        self.vad = vad

    def enroll_from_file(self, audio_path: str, save_path: str = ENROLLMENT_SAVE_PATH) -> torch.Tensor:
        """
        Enroll from an audio file (WAV, FLAC, MP3, etc.).
        The file is segmented using VAD; multiple embeddings are averaged.

        Args:
            audio_path: Path to reference audio file
            save_path: Where to save the resulting embedding

        Returns:
            Reference speaker embedding tensor
        """
        print(f"\n[Enrollment] Loading audio file: {audio_path}")
        audio, sr = sf.read(audio_path, dtype="float32")

        # Resample if needed
        if audio.ndim > 1:
            audio = audio.mean(axis=1)  # Stereo → mono
        if sr != SAMPLE_RATE:
            audio = self._resample(audio, sr, SAMPLE_RATE)
            print(f"[Enrollment] Resampled from {sr}Hz to {SAMPLE_RATE}Hz")

        # Normalize amplitude
        audio = audio / (np.max(np.abs(audio)) + 1e-8)

        # Extract segments via VAD
        segments = self._extract_segments_from_audio(audio)

        if len(segments) == 0:
            print("[Enrollment] WARNING: No speech detected. Using full audio as fallback.")
            segments = [audio]

        print(f"[Enrollment] Found {len(segments)} speech segment(s)")
        return self._build_and_save_embedding(segments, save_path)

    def enroll_from_microphone(self, save_path: str = ENROLLMENT_SAVE_PATH) -> torch.Tensor:
        """
        Enroll by recording from microphone.
        Guides the user to speak multiple segments.

        Returns:
            Reference speaker embedding tensor
        """
        print("\n" + "═" * 60)
        print("  SPEAKER ENROLLMENT — Microphone Mode")
        print("═" * 60)
        print(f"  Please speak {ENROLLMENT_SEGMENTS} short sentences naturally.")
        print(f"  Each segment should be ≥{ENROLLMENT_MIN_DURATION_S}s of speech.")
        print("  Press Ctrl+C to cancel.")
        print("═" * 60)

        segments = []
        self.vad._reset_state()

        max_chunks = max(1, int(AUDIO_QUEUE_MAX_SECONDS * SAMPLE_RATE / CHUNK_SAMPLES))
        audio_queue: queue.Queue[np.ndarray] = queue.Queue(maxsize=max_chunks)

        def callback(indata, frames, time_info, status):
            if status:
                print(f"  [!] Audio status: {status}")
            chunk = indata[:, 0].copy()
            try:
                audio_queue.put_nowait(chunk)
            except queue.Full:
                try:
                    _ = audio_queue.get_nowait()
                except queue.Empty:
                    pass
                try:
                    audio_queue.put_nowait(chunk)
                except queue.Full:
                    pass

        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="float32",
            blocksize=CHUNK_SAMPLES,
            callback=callback,
        ):
            print("\n  🎤 Listening... speak now!\n")
            segment_idx = 0

            while segment_idx < ENROLLMENT_SEGMENTS:
                try:
                    chunk = audio_queue.get(timeout=0.1)
                except queue.Empty:
                    continue

                vad_result = self.vad.process_chunk(chunk)

                # Visual feedback
                bar = self._make_level_bar(chunk)
                state_label = {
                    "SILENCE": "🔇 SILENCE ",
                    "SPEECH": "🗣  SPEAKING",
                    "SEGMENT_READY": "✅ CAPTURED",
                }.get(vad_result["state"], vad_result["state"])

                current_dur = self.vad.get_current_duration_s()
                print(
                    f"\r  [{segment_idx + 1}/{ENROLLMENT_SEGMENTS}] "
                    f"{state_label} │{bar}│ "
                    f"VAD: {vad_result['confidence']:.2f} "
                    f"Duration: {current_dur:.1f}s    ",
                    end="",
                    flush=True,
                )

                if vad_result["segment_complete"] and vad_result["segment_audio"] is not None:
                    seg = vad_result["segment_audio"]
                    dur = len(seg) / SAMPLE_RATE
                    if dur >= ENROLLMENT_MIN_DURATION_S:
                        segment_idx += 1
                        segments.append(seg)
                        print(f"\n  ✓ Segment {segment_idx} recorded ({dur:.1f}s)")
                        if segment_idx < ENROLLMENT_SEGMENTS:
                            print(f"  → Please speak segment {segment_idx + 1}...\n")
                        time.sleep(0.3)
                    else:
                        print(f"\n  ⚠ Segment too short ({dur:.1f}s < {ENROLLMENT_MIN_DURATION_S}s), try again")

        print("\n\n  Processing enrollment...")
        return self._build_and_save_embedding(segments, save_path)

    def load_embedding(self, path: str = ENROLLMENT_SAVE_PATH) -> torch.Tensor:
        """Load a previously saved reference embedding."""
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"No saved embedding found at '{path}'. Please enroll first."
            )
        data = torch.load(path, weights_only=True)
        embedding = data["embedding"]
        print(f"[Enrollment] Loaded reference embedding from '{path}' "
              f"(segments={data.get('num_segments', '?')}, "
              f"dim={embedding.shape[-1]})")
        return embedding

    # ─── Private helpers ──────────────────────────────────────────────────────

    def _extract_segments_from_audio(self, audio: np.ndarray) -> list:
        """Run VAD over a full audio array and collect speech segments."""
        self.vad._reset_state()
        segments = []
        for i in range(0, len(audio) - CHUNK_SAMPLES + 1, CHUNK_SAMPLES):
            chunk = audio[i: i + CHUNK_SAMPLES]
            result = self.vad.process_chunk(chunk)
            if result["segment_complete"] and result["segment_audio"] is not None:
                dur = len(result["segment_audio"]) / SAMPLE_RATE
                if dur >= ENROLLMENT_MIN_DURATION_S:
                    segments.append(result["segment_audio"])

        # Flush any remaining speech
        remaining = self.vad.flush()
        if remaining is not None and len(remaining) / SAMPLE_RATE >= ENROLLMENT_MIN_DURATION_S:
            segments.append(remaining)

        return segments

    def _build_and_save_embedding(self, segments: list, save_path: str) -> torch.Tensor:
        """Extract embeddings from segments, average them, L2-normalize, save."""
        print(f"[Enrollment] Extracting embeddings from {len(segments)} segment(s)...")
        embeddings = []
        for i, seg in enumerate(segments):
            seg_normalized = seg / (np.max(np.abs(seg)) + 1e-8)
            emb = self.model.extract_embedding(seg_normalized)
            embeddings.append(emb)
            print(f"  Segment {i + 1}: shape={emb.shape}, norm={emb.norm().item():.4f}")

        # Mean embedding (centroid) — more robust than single embedding
        reference_embedding = torch.stack(embeddings).mean(dim=0)
        reference_embedding = F.normalize(reference_embedding, dim=-1)

        # Save
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {"embedding": reference_embedding, "num_segments": len(segments)},
            save_path,
        )
        print(f"\n[Enrollment] ✅ Reference embedding saved to '{save_path}'")
        print(f"  Embedding dim: {reference_embedding.shape[-1]}")
        return reference_embedding

    @staticmethod
    def _resample(audio: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
        """Simple resampling via scipy."""
        import scipy.signal
        num_samples = int(len(audio) * target_sr / orig_sr)
        return scipy.signal.resample(audio, num_samples).astype(np.float32)

    @staticmethod
    def _make_level_bar(chunk: np.ndarray, width: int = 20) -> str:
        rms = float(np.sqrt(np.mean(chunk ** 2)))
        filled = min(width, int(rms * width * 10))
        return "█" * filled + "░" * (width - filled)
