/**
 * useVoiceProctoring.js
 *
 * Frontend hook for real-time voice proctoring during the interview.
 *
 * Architecture:
 *  - Creates an AudioContext at exactly 16 kHz — the browser's built-in
 *    high-quality sinc resampler handles the conversion from the mic's native
 *    rate (44.1 / 48 kHz) so we get clean 16 kHz audio with zero distortion.
 *  - Accumulates 3 seconds of samples (48 000 float32 = 192 000 bytes) then
 *    fires a single POST to the backend.  At 16 kHz that's ~20 POSTs/minute
 *    instead of the previous ~90, and gives the Python ResNet model enough
 *    voice context to make a reliable decision (Silero VAD min_speech = 250 ms).
 *  - All failures are swallowed — the interview is NEVER interrupted.
 *
 * @param {MediaStream} audioStream  The candidate's camera/mic stream
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import * as voiceProctoringApi from '../services/api/voiceProctoringApi';

// ── Constants ──────────────────────────────────────────────────────────────────
const TARGET_SAMPLE_RATE = 16000;   // Python voice service expects exactly 16 kHz
const CHUNK_SECONDS = 3;       // accumulate 3 s before each POST
const CHUNK_SAMPLES = TARGET_SAMPLE_RATE * CHUNK_SECONDS; // 48 000 samples = 192 000 bytes
const PROCESSOR_BUFFER = 4096;    // ScriptProcessorNode internal buffer (samples at 16 kHz)
const MAX_CHUNKS_IN_FLIGHT = 2;      // back-pressure: drop if already sending
const START_RETRY_MS = 8000;
const MAX_START_RETRIES = 15;

export function useVoiceProctoring(audioStream, shouldStream = true) {
    // ── Exposed state ──────────────────────────────────────────────────────────
    const [isActive, setIsActive] = useState(false);
    const [mismatchCount, setMismatchCount] = useState(0);
    const [enrollmentStatus, setEnrollmentStatus] = useState('unknown');

    // ── Internal refs ──────────────────────────────────────────────────────────
    const audioCtxRef = useRef(null);
    const processorRef = useRef(null);
    const sessionIdRef = useRef(null);
    const accumulatorRef = useRef(new Float32Array(0));   // rolling sample buffer
    const chunksInFlightRef = useRef(0);
    const stoppedRef = useRef(true);
    const shouldStreamRef = useRef(!!shouldStream);
    const retryTimerRef = useRef(null);
    const retryCountRef = useRef(0);

    const clearRetryTimer = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        shouldStreamRef.current = !!shouldStream;
        if (!shouldStreamRef.current) {
            // Drop buffered stale data collected while not in candidate-answer phase.
            accumulatorRef.current = new Float32Array(0);
        }
    }, [shouldStream]);

    useEffect(() => {
        return () => {
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
        };
    }, []);

    // ── Send one accumulated 3-second chunk ───────────────────────────────────
    const sendChunk = useCallback(async (float32Chunk) => {
        if (stoppedRef.current) return;
        if (chunksInFlightRef.current >= MAX_CHUNKS_IN_FLIGHT) return; // back-pressure

        const sessionId = sessionIdRef.current;
        if (!sessionId) return;

        // Float32Array → raw ArrayBuffer (no copy if possible)
        const buffer = float32Chunk.buffer.slice(
            float32Chunk.byteOffset,
            float32Chunk.byteOffset + float32Chunk.byteLength
        );

        chunksInFlightRef.current += 1;
        try {
            await voiceProctoringApi.sendAudioChunk(sessionId, buffer);
        } catch {
            // Silent drop — never surface to the user
        } finally {
            chunksInFlightRef.current = Math.max(0, chunksInFlightRef.current - 1);
        }
    }, []);

    // ── ScriptProcessorNode callback — gathers samples into 3-second chunks ───
    const processAudio = useCallback((event) => {
        if (stoppedRef.current) return;
        if (!shouldStreamRef.current) return;

        // AudioContext is at 16 kHz so channel data is already 16 kHz mono
        const incoming = event.inputBuffer.getChannelData(0); // Float32Array

        // Append to accumulator
        const prev = accumulatorRef.current;
        const merged = new Float32Array(prev.length + incoming.length);
        merged.set(prev, 0);
        merged.set(incoming, prev.length);

        // Send all complete 3-second slices
        let offset = 0;
        while (offset + CHUNK_SAMPLES <= merged.length) {
            const slice = merged.slice(offset, offset + CHUNK_SAMPLES);
            sendChunk(slice); // fire-and-forget
            offset += CHUNK_SAMPLES;
        }

        // Keep the remainder for next call
        accumulatorRef.current = merged.slice(offset);
    }, [sendChunk]);

    // ── Start voice proctoring ────────────────────────────────────────────────
    const startProctoring = useCallback(async (sessionId, elapsedSeconds = 0) => {
        if (!audioStream || !sessionId) return;
        if (!stoppedRef.current) return; // already running

        clearRetryTimer();

        stoppedRef.current = false;
        sessionIdRef.current = sessionId;
        accumulatorRef.current = new Float32Array(0);
        chunksInFlightRef.current = 0;

        // ── Tell backend to open the Python WS ──────────────────────────────────
        try {
            const result = await voiceProctoringApi.startVoiceProctoring(sessionId, elapsedSeconds);
            const { data } = result;

            if (data?.started === false) {
                // Enrollment not complete — voice proctoring unavailable, interview continues
                console.warn('[VoiceProctoring] Not started:', data.reason);
                setEnrollmentStatus('not_enrolled');
                setIsActive(false);
                stoppedRef.current = true;

                const reason = String(data?.reason || '').toLowerCase();
                const shouldRetry = reason.includes('not yet complete') || reason.includes('wait');
                if (shouldRetry && retryCountRef.current < MAX_START_RETRIES) {
                    retryCountRef.current += 1;
                    retryTimerRef.current = setTimeout(() => {
                        if (!stoppedRef.current) return;
                        startProctoring(sessionId, elapsedSeconds).catch(() => { });
                    }, START_RETRY_MS);
                }
                return;
            }

            retryCountRef.current = 0;
            setEnrollmentStatus('enrolled');
        } catch (err) {
            console.warn('[VoiceProctoring] Failed to start WS session:', err?.message);
            setEnrollmentStatus('failed');
            stoppedRef.current = true;
            return;
        }

        // ── Create AudioContext at exactly 16 kHz ────────────────────────────────
        // The browser's built-in sinc resampler converts mic audio from the
        // native device rate (44.1 / 48 kHz) to 16 kHz — far better quality
        // than manual linear interpolation.
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: TARGET_SAMPLE_RATE, // 16 000 Hz — browser resamples internally
            });

            const source = audioCtx.createMediaStreamSource(audioStream);
            // bufferSize=4096 at 16 kHz ≈ 256 ms per onaudioprocess call
            // eslint-disable-next-line no-undef
            const processor = audioCtx.createScriptProcessor(PROCESSOR_BUFFER, 1, 1);
            processor.onaudioprocess = processAudio;

            source.connect(processor);
            processor.connect(audioCtx.destination); // must be connected even if output unused

            audioCtxRef.current = audioCtx;
            processorRef.current = processor;

            setIsActive(true);
            console.log(`[VoiceProctoring] Active — ${audioCtx.sampleRate} Hz, ${CHUNK_SECONDS}s chunks`);
        } catch (err) {
            console.warn('[VoiceProctoring] AudioContext setup failed:', err.message);
            // Stop cleanly — interview continues without voice proctoring
            voiceProctoringApi.stopVoiceProctoring(sessionId).catch(() => { });
            stoppedRef.current = true;
            setIsActive(false);
        }
    }, [audioStream, processAudio, clearRetryTimer]);

    // ── Stop voice proctoring ─────────────────────────────────────────────────
    const stopProctoring = useCallback(async () => {
        stoppedRef.current = true;
        clearRetryTimer();

        // Flush any remaining partial accumulator as a final chunk if it's long
        // enough for Silero VAD to find speech (≥ 250 ms at 16 kHz = 4000 samples)
        const remaining = accumulatorRef.current;
        const sessionId = sessionIdRef.current;
        if (remaining.length >= 4000 && sessionId && chunksInFlightRef.current < MAX_CHUNKS_IN_FLIGHT) {
            const buffer = remaining.buffer.slice(remaining.byteOffset, remaining.byteOffset + remaining.byteLength);
            voiceProctoringApi.sendAudioChunk(sessionId, buffer).catch(() => { });
        }

        // Tear down Web Audio nodes
        try {
            processorRef.current?.disconnect();
            processorRef.current = null;
        } catch { }
        try {
            await audioCtxRef.current?.close();
            audioCtxRef.current = null;
        } catch { }

        // Tell backend to close the Python WS
        if (sessionId) {
            await voiceProctoringApi.stopVoiceProctoring(sessionId).catch(() => { });
        }

        setIsActive(false);
    }, [clearRetryTimer]);

    return {
        isActive,
        enrollmentStatus,
        mismatchCount,
        startProctoring,
        stopProctoring,
        recordMismatch: useCallback(() => setMismatchCount(p => p + 1), []),
    };
}

export default useVoiceProctoring;
