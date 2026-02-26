/**
 * useAudioRecorder.js — Records audio chunks from a MediaStream
 * 
 * Used alongside useVAD: the VAD determines when to start/stop recording,
 * and this hook captures the raw audio for backend transcription via Whisper.
 * 
 * Outputs a Blob suitable for upload to the /transcribe endpoint.
 */

import { useRef, useCallback, useState } from 'react';

/**
 * @param {MediaStream} stream — must contain audio tracks
 * @returns {{
 *   isRecording: boolean,
 *   startRecording: () => void,
 *   stopRecording: () => Promise<Blob>,
 *   getBlob: () => Blob|null,
 * }}
 */
export function useAudioRecorder(stream) {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const resolveRef = useRef(null);

  const getMimeType = () => {
    // Prefer opus in webm for best Whisper compatibility
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  };

  const startRecording = useCallback(() => {
    if (!stream || recorderRef.current?.state === 'recording') return;

    chunksRef.current = [];
    const mimeType = getMimeType();

    try {
      // Create an audio-only stream from the input
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn('[AudioRecorder] No audio tracks in stream');
        return;
      }
      const audioStream = new MediaStream(audioTracks);

      const recorder = new MediaRecorder(audioStream, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        resolveRef.current?.(blob);
        resolveRef.current = null;
      };

      recorder.onerror = (e) => {
        console.error('[AudioRecorder] Error:', e);
        setIsRecording(false);
        resolveRef.current?.(null);
        resolveRef.current = null;
      };

      recorderRef.current = recorder;
      // Record in 500ms chunks for progressive data availability
      recorder.start(500);
      setIsRecording(true);
    } catch (err) {
      console.error('[AudioRecorder] Failed to start:', err);
    }
  }, [stream]);

  /**
   * Stop recording and return the audio Blob.
   * Returns a Promise that resolves with the Blob.
   */
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        // Return whatever we have
        const blob = chunksRef.current.length > 0
          ? new Blob(chunksRef.current, { type: 'audio/webm' })
          : null;
        resolve(blob);
        return;
      }

      resolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  const getBlob = useCallback(() => {
    if (chunksRef.current.length === 0) return null;
    return new Blob(chunksRef.current, { type: 'audio/webm' });
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    getBlob,
  };
}

export default useAudioRecorder;
