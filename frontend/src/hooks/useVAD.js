/**
 * useVAD.js — Voice Activity Detection hook
 * 
 * Uses Web Audio API to detect actual voice energy from the microphone stream.
 * This replaces the naive silence-timeout approach with proper energy-based VAD.
 * 
 * Features:
 *  - Adaptive noise floor calibration (first 500ms)
 *  - Configurable speech/silence thresholds
 *  - Hysteresis to avoid rapid flapping between speech/silence states
 *  - Events: onSpeechStart, onSpeechEnd, onSilenceTimeout
 *  - Exposes real-time energy level for UI visualisation
 */

import { useRef, useCallback, useEffect, useState } from 'react';

/** Default VAD configuration */
const DEFAULT_CONFIG = {
  /** Energy threshold above noise floor to detect speech (0–1 scale after normalization) */
  speechThreshold: 0.015,
  /** How many consecutive silence frames before firing onSilenceTimeout */
  silenceTimeoutMs: 6000,
  /** Initial wait — if no speech at all within this time, fire silence timeout */
  initialWaitMs: 25000,
  /** Noise floor calibration duration */
  calibrationMs: 500,
  /** Analysis frame interval */
  frameIntervalMs: 50,
  /** Hysteresis frames — must sustain speech/silence for N frames before state change */
  hysteresisFrames: 3,
};

/**
 * @param {MediaStream} stream — must contain at least one audio track
 * @param {Object} config — overrides for DEFAULT_CONFIG
 * @returns {{ 
 *   isListening: boolean,
 *   isSpeaking: boolean,
 *   energyLevel: number,
 *   startListening: (callbacks) => void,
 *   stopListening: () => string,
 * }}
 */
export function useVAD(stream, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(0);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const frameTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const initialWaitTimerRef = useRef(null);
  const stateRef = useRef({
    speechStarted: false,
    noiseFloor: 0,
    calibrating: true,
    calibrationSamples: [],
    consecutiveSpeech: 0,
    consecutiveSilence: 0,
    speaking: false,
  });
  const callbacksRef = useRef({});
  const stoppedRef = useRef(true);

  const cleanup = useCallback(() => {
    stoppedRef.current = true;
    clearInterval(frameTimerRef.current);
    clearTimeout(silenceTimerRef.current);

    clearTimeout(initialWaitTimerRef.current);
    setIsListening(false);
    setIsSpeaking(false);
    setEnergyLevel(0);

    // Don't close audioCtx — it may be shared (e.g., for waveform)
    analyserRef.current = null;
    stateRef.current = {
      speechStarted: false,
      noiseFloor: 0,
      calibrating: true,
      calibrationSamples: [],
      consecutiveSpeech: 0,
      consecutiveSilence: 0,
      speaking: false,
    };
  }, []);

  /**
   * Begin voice activity detection.
   * @param {{ onSpeechStart, onSpeechEnd, onSilenceTimeout, onEnergyChange }} callbacks
   */
  const startListening = useCallback((callbacks = {}) => {
    if (!stream) return;

    cleanup();
    stoppedRef.current = false;
    callbacksRef.current = callbacks;

    // Set up audio analysis
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    setIsListening(true);

    // ── Calibration phase ──────────────────────────────────────────────────
    const calibrationEnd = Date.now() + cfg.calibrationMs;

    // ── Frame analysis loop ────────────────────────────────────────────────
    frameTimerRef.current = setInterval(() => {
      if (stoppedRef.current) return;

      analyser.getFloatTimeDomainData(dataArray);

      // Calculate RMS energy
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      setEnergyLevel(rms);
      callbacks.onEnergyChange?.(rms);

      const state = stateRef.current;

      // Calibration: collect noise floor samples
      if (state.calibrating) {
        state.calibrationSamples.push(rms);
        if (Date.now() >= calibrationEnd) {
          state.calibrating = false;
          const avg = state.calibrationSamples.reduce((a, b) => a + b, 0) / state.calibrationSamples.length;
          state.noiseFloor = avg;
        }
        return;
      }

      // Determine if current frame is speech
      const isFrameSpeech = rms > state.noiseFloor + cfg.speechThreshold;

      if (isFrameSpeech) {
        state.consecutiveSpeech += 1;
        state.consecutiveSilence = 0;
      } else {
        state.consecutiveSilence += 1;
        state.consecutiveSpeech = 0;
      }

      // Apply hysteresis
      if (!state.speaking && state.consecutiveSpeech >= cfg.hysteresisFrames) {
        state.speaking = true;
        setIsSpeaking(true);

        if (!state.speechStarted) {
          state.speechStarted = true;
          clearTimeout(initialWaitTimerRef.current);
          callbacks.onSpeechStart?.();
        }

        // Reset silence timeout whenever speech resumes
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (state.speaking && state.consecutiveSilence >= cfg.hysteresisFrames) {
        state.speaking = false;
        setIsSpeaking(false);

        // Start silence timeout countdown
        if (state.speechStarted && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (!stoppedRef.current) {
              callbacks.onSilenceTimeout?.();
            }
          }, cfg.silenceTimeoutMs);
        }
      }
    }, cfg.frameIntervalMs);

    // ── Initial wait timeout ───────────────────────────────────────────────
    initialWaitTimerRef.current = setTimeout(() => {
      if (!stoppedRef.current && !stateRef.current.speechStarted) {
        callbacks.onSilenceTimeout?.();
      }
    }, cfg.initialWaitMs);


  }, [stream, cfg, cleanup]);

  /**
   * Stop listening and clean up.
   */
  const stopListening = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    isListening,
    isSpeaking,
    energyLevel,
    startListening,
    stopListening,
    analyser: analyserRef.current,
  };
}

export default useVAD;
