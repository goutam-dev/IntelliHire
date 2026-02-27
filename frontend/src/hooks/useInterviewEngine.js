/**
 * useInterviewEngine.js — Core interview state machine
 * 
 * Manages the full interview lifecycle, coordinating:
 *  - Backend session API (create → start → answer → complete)
 *  - Audio recording + Whisper transcription
 *  - VAD for speech detection
 *  - TTS for question delivery
 *  - Phase transitions and timing
 * 
 * State Machine:
 *   IDLE → INITIALIZING → ASKING → LISTENING → PROCESSING → ASKING → ... → COMPLETING → DONE
 * 
 * The UI component just renders based on the state exposed by this hook.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import * as interviewApi from '../services/api/interviewApi';

// ── Interview Engine States ──────────────────────────────────────────────────
export const ENGINE_STATE = {
  IDLE: 'IDLE',
  INITIALIZING: 'INITIALIZING',
  ASKING: 'ASKING',           // TTS speaking the question
  LISTENING: 'LISTENING',     // Recording + VAD active
  PROCESSING: 'PROCESSING',   // Transcribing + evaluating + generating next Q
  COMPLETING: 'COMPLETING',   // Generating final summary
  DONE: 'DONE',               // Summary available
  ERROR: 'ERROR',
};

// ── TTS Helper ───────────────────────────────────────────────────────────────
function speakText(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      setTimeout(resolve, 2000);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;

    // Select a natural-sounding voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))
    ) || voices.find(v => v.lang.startsWith('en-'));
    if (preferred) utterance.voice = preferred;

    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * @param {{ 
 *   applicationId: string,
 *   audioStream: MediaStream,
 *   startRecording: () => void,
 *   stopRecording: () => Promise<Blob>,
 *   startVAD: (callbacks) => void,
 *   stopVAD: () => void,
 * }} deps
 */
export function useInterviewEngine({
  applicationId,
  audioStream,
  startRecording,
  stopRecording,
  startVAD,
  stopVAD,
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [engineState, setEngineState] = useState(ENGINE_STATE.IDLE);
  const [sessionId, setSessionId] = useState(null);
  const [jobTitle, setJobTitle] = useState('Software Engineer');
  const [sessionConfig, setSessionConfig] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [evaluations, setEvaluations] = useState([]);
  const [interviewState, setInterviewState] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const sessionIdRef = useRef(null);
  const isPausedRef = useRef(false);
  const isTerminatingRef = useRef(false);
  const timerRef = useRef(null);
  const askNextRef = useRef(null); // Stable ref to askNextQuestion
  const answerStartTimeRef = useRef(null);
  const browserSttRef = useRef(null); // Browser STT for live transcript
  const pausedWhileListeningRef = useRef(false);
  const pausedWhileAskingRef = useRef(false);   // NEW: paused during TTS
  const pausedTurnIndexRef = useRef(null);
  const engineStateRef = useRef(ENGINE_STATE.IDLE); // NEW: live engine state
  const currentQuestionRef = useRef('');           // NEW: live current question

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (engineState === ENGINE_STATE.IDLE || engineState === ENGINE_STATE.DONE || engineState === ENGINE_STATE.ERROR) {
      return;
    }

    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          // Heartbeat every 30 seconds
          if (next % 30 === 0 && sessionIdRef.current) {
            interviewApi.updateSessionTime(sessionIdRef.current, next).catch(() => {});
          }
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [engineState]);

  // ── Browser STT for live transcript display ────────────────────────────────
  const startBrowserSTT = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    try {
      const rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 1;

      let accumulated = '';
      rec.onresult = (e) => {
        let interim = '';
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += t + ' ';
          else interim += t;
        }
        if (final) accumulated += final;
        setLiveTranscript(accumulated + interim);
      };

      rec.onerror = () => {};
      rec.onend = () => {
        // Auto-restart if still listening
        if (!isPausedRef.current && browserSttRef.current === rec) {
          try { rec.start(); } catch {}
        }
      };

      rec.start();
      browserSttRef.current = rec;
    } catch {}
  }, []);

  const stopBrowserSTT = useCallback(() => {
    try { browserSttRef.current?.stop(); } catch {}
    browserSttRef.current = null;
  }, []);

  // ── Core: Ask a question ───────────────────────────────────────────────────
  const askQuestion = useCallback(async (question, turnIndex) => {
    if (isPausedRef.current || isTerminatingRef.current) return;

    engineStateRef.current = ENGINE_STATE.ASKING;
    setEngineState(ENGINE_STATE.ASKING);
    currentQuestionRef.current = question;
    setCurrentQuestion(question);
    setCurrentTurnIndex(turnIndex);
    pausedTurnIndexRef.current = turnIndex;
    setLiveTranscript('');
    setFinalTranscript('');

    // Speak the question via TTS
    await speakText(question);

    // Guard: if paused or terminated while TTS was running, stop here.
    // pause() cancels TTS which resolves speakText early — this guard catches it.
    if (isPausedRef.current || isTerminatingRef.current) return;

    // Transition to listening
    engineStateRef.current = ENGINE_STATE.LISTENING;
    setEngineState(ENGINE_STATE.LISTENING);
    answerStartTimeRef.current = Date.now();

    // Start audio recording for Whisper
    startRecording();
    // Start browser STT for live display
    startBrowserSTT();

    // Start VAD — it will call onSilenceTimeout when the candidate stops speaking
    startVAD({
      onSpeechStart: () => {
        // Could update UI to show "speaking detected"
      },
      onSilenceTimeout: async () => {
        // Candidate finished speaking (or timed out)
        await processAnswer(turnIndex);
      },
    });
  }, [startRecording, startBrowserSTT, startVAD]);

  // ── Core: Process the answer ───────────────────────────────────────────────
  const processAnswer = useCallback(async (turnIndex) => {
    if (isPausedRef.current || isTerminatingRef.current) return;

    engineStateRef.current = ENGINE_STATE.PROCESSING;
    setEngineState(ENGINE_STATE.PROCESSING);
    stopVAD();
    stopBrowserSTT();

    const answerDurationMs = answerStartTimeRef.current ? Date.now() - answerStartTimeRef.current : 0;

    // Stop recording and get the audio blob
    const audioBlob = await stopRecording();

    let transcribedText = '';

    // Transcribe via Whisper on backend
    if (audioBlob && audioBlob.size > 1000) { // Min 1KB to be meaningful audio
      try {
        setLiveTranscript('Transcribing...');
        const result = await interviewApi.transcribeAudio(sessionIdRef.current, audioBlob);
        transcribedText = result.text || '';
      } catch (err) {
        console.warn('[Interview] Whisper transcription failed, using browser STT fallback:', err.message);
        // Fall back to whatever browser STT captured
        transcribedText = '';
      }
    }

    // If Whisper returned nothing, use the browser STT live transcript as fallback
    if (!transcribedText.trim()) {
      // Get the latest live transcript state
      transcribedText = ''; // Will be marked as no response
    }

    const answerText = transcribedText.trim() || '(no response detected)';
    setFinalTranscript(answerText);
    setLiveTranscript('');

    // Submit to backend — gets evaluation + next question
    try {
      const result = await interviewApi.submitAnswer(sessionIdRef.current, {
        answerText,
        turnIndex,
        answerDurationMs,
      });

      // Update evaluations
      if (result.evaluation) {
        setEvaluations(prev => [...prev, {
          ...result.evaluation,
          question: currentQuestion,
          answer: answerText,
        }]);
      }

      // Update interview state
      if (result.interviewState) {
        setInterviewState(result.interviewState);
        setQuestionCount(result.interviewState.questionCount || 0);
      }

      if (result.shouldEnd) {
        // Interview is ending
        await finishInterview();
      } else if (result.nextQuestion) {
        // Brief pause for natural pacing, then ask next question
        await new Promise(r => setTimeout(r, 1000));
        askNextRef.current?.(result.nextQuestion, result.turnIndex);
      }
    } catch (err) {
      console.error('[Interview] Submit answer failed:', err);
      setError(`Failed to process answer: ${err.message}`);
      setEngineState(ENGINE_STATE.ERROR);
    }
  }, [stopVAD, stopBrowserSTT, stopRecording, currentQuestion]);

  // Keep askQuestion ref up to date
  useEffect(() => {
    askNextRef.current = askQuestion;
  }, [askQuestion]);

  // ── Finish: Generate closing + summary ─────────────────────────────────────
  const finishInterview = useCallback(async (cheatingData = {}) => {
    if (isTerminatingRef.current) return;
    isTerminatingRef.current = true;

    setEngineState(ENGINE_STATE.COMPLETING);

    // Speak closing line
    const closingLine = 'That concludes our interview session. Thank you so much for your time today — we will be in touch soon with the next steps. Take care!';
    await speakText(closingLine);

    // Get full summary from backend
    try {
      const result = await interviewApi.completeSession(sessionIdRef.current, cheatingData);
      setSummary(result);
    } catch (err) {
      console.warn('[Interview] Complete session failed:', err.message);
      // Still transition to done, just without backend summary
      setSummary({
        scoring: { averageScore: null, overallVerdict: 'Session ended' },
        turns: evaluations.map((e, i) => ({ index: i, ...e })),
      });
    }

    setEngineState(ENGINE_STATE.DONE);
  }, [evaluations]);

  // ── Initialize + Start ─────────────────────────────────────────────────────
  const initialize = useCallback(async () => {
    if (!applicationId) return;

    setEngineState(ENGINE_STATE.INITIALIZING);
    setError(null);

    try {
      // Create session
      const session = await interviewApi.createSession(applicationId);
      const sid = session.sessionId;
      setSessionId(sid);
      sessionIdRef.current = sid;
      if (session.jobTitle) setJobTitle(session.jobTitle);
      if (session.config) setSessionConfig(session.config);

      // Start session — gets first question
      const result = await interviewApi.startSession(sid);

      if (result?.ended) {
        setSummary(result.summary || null);
        setEngineState(ENGINE_STATE.DONE);
        return;
      }

      if (!result?.question) {
        throw new Error('Interview start did not return a question');
      }

      // Small delay for natural pacing
      await new Promise(r => setTimeout(r, 800));

      // Ask the first question
      setQuestionCount(1);
      askNextRef.current?.(result.question, result.turnIndex);
    } catch (err) {
      console.error('[Interview] Initialization failed:', err);
      const backendErrorMessage = err?.response?.data?.error || err?.response?.data?.message;
      setError(`Failed to start interview: ${backendErrorMessage || err.message}`);
      setEngineState(ENGINE_STATE.ERROR);
    }
  }, [applicationId]);

  // ── Pause / Resume ─────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    // Read the LIVE engine state via ref (not the closed-over React state)
    const liveState = engineStateRef.current;

    // Set paused BEFORE cancelling TTS so the speakText guard fires correctly
    isPausedRef.current = true;

    pausedWhileListeningRef.current = liveState === ENGINE_STATE.LISTENING;
    pausedWhileAskingRef.current = liveState === ENGINE_STATE.ASKING;

    // Cancel any in-flight TTS. This resolves speakText early via onend,
    // but isPausedRef is already true so the guard in askQuestion will stop it.
    window.speechSynthesis?.cancel();

    stopVAD();
    stopBrowserSTT();

    if (pausedWhileListeningRef.current) {
      stopRecording().catch(() => {});
    }
  }, [stopVAD, stopBrowserSTT, stopRecording]);

  const resume = useCallback(() => {
    if (isTerminatingRef.current) return;

    isPausedRef.current = false;

    const turnIndex = pausedTurnIndexRef.current;

    if (pausedWhileAskingRef.current) {
      // Was paused while TTS was reading the question — re-ask it
      pausedWhileAskingRef.current = false;
      pausedWhileListeningRef.current = false;
      const question = currentQuestionRef.current;
      if (question && turnIndex != null) {
        askNextRef.current?.(question, turnIndex);
      }
      return;
    }

    if (!pausedWhileListeningRef.current) {
      // Paused during PROCESSING or another non-interactive phase — do nothing
      return;
    }

    if (turnIndex == null) {
      pausedWhileListeningRef.current = false;
      return;
    }

    // Was paused while listening — resume recording and VAD for the same turn
    engineStateRef.current = ENGINE_STATE.LISTENING;
    setEngineState(ENGINE_STATE.LISTENING);
    answerStartTimeRef.current = Date.now();

    startRecording();
    startBrowserSTT();
    startVAD({
      onSpeechStart: () => {},
      onSilenceTimeout: async () => {
        await processAnswer(turnIndex);
      },
    });

    pausedWhileListeningRef.current = false;
  }, [startRecording, startBrowserSTT, startVAD, processAnswer]);

  // ── Terminate (for proctoring violations) ──────────────────────────────────
  const terminate = useCallback(async (cheatingData = {}) => {
    if (isTerminatingRef.current) return;

    window.speechSynthesis?.cancel();
    stopVAD();
    stopBrowserSTT();

    const terminationLine = 'This interview has been automatically terminated due to a proctoring integrity violation. Your session data has been submitted to the hiring team.';
    await speakText(terminationLine);

    await finishInterview({
      ...cheatingData,
      terminationReason: cheatingData.terminationReason || 'Integrity threshold exceeded',
    });
  }, [stopVAD, stopBrowserSTT, finishInterview]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
      stopBrowserSTT();
    };
  }, [stopBrowserSTT]);

  return {
    // State
    engineState,
    sessionId,
    jobTitle,
    sessionConfig,
    currentQuestion,
    currentTurnIndex,
    questionCount,
    liveTranscript,
    finalTranscript,
    evaluations,
    interviewState,
    summary,
    error,
    elapsedSeconds,

    // Actions
    initialize,
    pause,
    resume,
    terminate,
    finishInterview,
  };
}

export default useInterviewEngine;
