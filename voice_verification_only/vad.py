"""
Voice Activity Detection using Silero VAD
Best-in-class VAD — extremely accurate, runs on CPU or GPU in milliseconds.
"""

import numpy as np
import torch
import collections
from config import (
    SAMPLE_RATE, CHUNK_SAMPLES, VAD_THRESHOLD,
    VAD_MIN_SPEECH_DURATION_MS, VAD_MIN_SILENCE_DURATION_MS, VAD_SPEECH_PAD_MS
)


class SileroVAD:
    """
    Silero VAD wrapper with stateful speech/silence tracking.
    Handles:
      - Short noise bursts (not flagged as speech)
      - Short silences mid-speech (not treated as segment boundaries)
      - Padding around speech segments
    """

    def __init__(self, device: str = "cpu"):
        self.device = device
        print("[VAD] Loading Silero VAD model...")
        self.model, self.utils = torch.hub.load(
            repo_or_dir="snakers4/silero-vad",
            model="silero_vad",
            force_reload=False,
            onnx=False,
        )
        self.model = self.model.to(device)
        self.model.eval()

        # Derived timing constants
        self._min_speech_frames = int(VAD_MIN_SPEECH_DURATION_MS / (CHUNK_SAMPLES / SAMPLE_RATE * 1000))
        self._min_silence_frames = int(VAD_MIN_SILENCE_DURATION_MS / (CHUNK_SAMPLES / SAMPLE_RATE * 1000))
        self._pad_frames = int(VAD_SPEECH_PAD_MS / (CHUNK_SAMPLES / SAMPLE_RATE * 1000))

        self._reset_state()
        print(f"[VAD] Ready (threshold={VAD_THRESHOLD}, "
              f"min_speech={VAD_MIN_SPEECH_DURATION_MS}ms, "
              f"min_silence={VAD_MIN_SILENCE_DURATION_MS}ms)")

    def _reset_state(self):
        self.triggered = False
        self.speech_frame_count = 0
        self.silence_frame_count = 0
        self.current_segment_frames: list = []
        # Ring buffer for pre-padding (pad before speech starts)
        self._pre_buffer = collections.deque(maxlen=self._pad_frames + 1)

    @torch.no_grad()
    def process_chunk(self, audio_chunk: np.ndarray) -> dict:
        """
        Process one audio chunk and return VAD state.

        Args:
            audio_chunk: float32 numpy array, shape (CHUNK_SAMPLES,), range [-1, 1]

        Returns:
            dict with keys:
              - 'is_speech': bool — is this frame speech?
              - 'confidence': float — VAD confidence score
              - 'segment_complete': bool — a full speech segment just finished
              - 'segment_audio': np.ndarray or None — the completed segment audio
              - 'state': str — one of 'SILENCE', 'SPEECH', 'SEGMENT_READY'
        """
        # Silero VAD requires at least 512 samples per chunk (16kHz -> 32ms)
        if audio_chunk.shape[0] < 512:
            pad_width = 512 - audio_chunk.shape[0]
            audio_for_vad = np.pad(audio_chunk, (0, pad_width), mode="constant")
        else:
            audio_for_vad = audio_chunk

        # Convert to tensor
        audio_tensor = torch.FloatTensor(audio_for_vad).to(self.device)
        # Silero expects shape (1, samples) or (samples,)
        confidence = float(self.model(audio_tensor, SAMPLE_RATE).item())
        is_speech = confidence >= VAD_THRESHOLD

        result = {
            "is_speech": is_speech,
            "confidence": confidence,
            "segment_complete": False,
            "segment_audio": None,
            "state": "SILENCE",
        }

        # Always add to pre-buffer (for padding)
        self._pre_buffer.append(audio_chunk.copy())

        if not self.triggered:
            if is_speech:
                self.speech_frame_count += 1
                if self.speech_frame_count >= self._min_speech_frames:
                    # Speech onset confirmed
                    self.triggered = True
                    self.silence_frame_count = 0
                    # Prepend pre-buffer frames (padding before speech)
                    for frame in list(self._pre_buffer)[:-1]:
                        self.current_segment_frames.append(frame)
                    self.current_segment_frames.append(audio_chunk.copy())
                    result["state"] = "SPEECH"
                else:
                    result["state"] = "SILENCE"
            else:
                self.speech_frame_count = 0
                result["state"] = "SILENCE"
        else:
            # Currently in speech
            self.current_segment_frames.append(audio_chunk.copy())
            result["state"] = "SPEECH"

            if not is_speech:
                self.silence_frame_count += 1
                if self.silence_frame_count >= self._min_silence_frames:
                    # Speech ended
                    segment = np.concatenate(self.current_segment_frames)
                    # Add post-pad (already included since we keep adding frames)
                    result["segment_complete"] = True
                    result["segment_audio"] = segment
                    result["state"] = "SEGMENT_READY"
                    # Reset for next segment
                    self.triggered = False
                    self.speech_frame_count = 0
                    self.silence_frame_count = 0
                    self.current_segment_frames = []
            else:
                self.silence_frame_count = 0

        return result

    def get_current_duration_s(self) -> float:
        """How many seconds of audio have been accumulated in the current segment."""
        if not self.current_segment_frames:
            return 0.0
        return len(self.current_segment_frames) * CHUNK_SAMPLES / SAMPLE_RATE

    def flush(self) -> np.ndarray | None:
        """Force-flush any accumulated speech (e.g., on program exit)."""
        if self.triggered and len(self.current_segment_frames) > 0:
            segment = np.concatenate(self.current_segment_frames)
            self._reset_state()
            return segment
        self._reset_state()
        return None
