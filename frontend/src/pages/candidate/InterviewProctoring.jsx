/**
 * InterviewProctoring.jsx — AI-Led Interview Proctoring Interface (v3)
 *
 * Production-grade redesign:
 *  - All LLM/STT logic runs on the backend (no API keys in browser)
 *  - Whisper-based transcription via backend proxy
 *  - Real energy-based VAD (useVAD hook)
 *  - Structured state machine (useInterviewEngine hook)
 *  - Clean separation: UI ← hooks ← services ← backend
 *
 * Phase Flow:  TERMS → PERMISSIONS → INTERVIEW → SUMMARY | ERROR
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, Camera, Mic, Monitor, Mic2,
  CheckCircle, XCircle, Circle, Loader2, Volume2,
  Radio, Clock, TrendingUp, Award,
} from 'lucide-react';

import { useInterviewEngine, ENGINE_STATE } from '../../hooks/useInterviewEngine';
import { useVAD } from '../../hooks/useVAD';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useVoiceProctoring } from '../../hooks/useVoiceProctoring';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import * as faceProctoringApi from '../../services/api/faceProctoringApi';
import * as voiceProctoringApi from '../../services/api/voiceProctoringApi';

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PHASE = { TERMS: 'TERMS', PERMISSIONS: 'PERMISSIONS', INTERVIEW: 'INTERVIEW', SUMMARY: 'SUMMARY', ERROR: 'ERROR' };

const CHEATING_THRESHOLD = 10;
const CHEATING_SCORES = {
  tab_switch: 2, window_switch: 2, browser_minimize: 2,
  exit_fullscreen: 3, screen_switch: 3, copy_paste: 4,
  right_click: 1, multiple_screens: 5,
};
const CHEATING_LABELS = {
  tab_switch: 'Tab / Browser Switch', window_switch: 'Window Switch (Alt-Tab)',
  browser_minimize: 'Browser Minimized', exit_fullscreen: 'Exited Fullscreen',
  screen_switch: 'Active Screen Switched', copy_paste: 'Copy / Paste Attempt',
  right_click: 'Right-Click Attempt', multiple_screens: 'Multiple Screens Detected',
};

const isFullscreenActive = () => !!(
  document.fullscreenElement || document.webkitFullscreenElement ||
  document.mozFullScreenElement || document.msFullscreenElement
);
const getResumeConditions = () => ({
  fullscreen: isFullscreenActive(),
  tabFocused: !document.hidden,
  windowActive: document.hasFocus(),
});

const FACE_PROCTORING_FRAME_INTERVAL_MS = 2000;
const FACE_PROCTORING_MAX_WIDTH = 640;
const FACE_PROCTORING_JPEG_QUALITY = 0.85;
const FACE_PROCTORING_LOG_PREFIX = '[FaceProctoring:UI]';

const TERMS_LIST = [
  { id: 1, title: 'Recording Consent', body: 'By proceeding you give IntelliHire irrevocable consent to record your audio, video, and screen activity for the entire duration of this interview session.' },
  { id: 2, title: 'Audio & Video Capture', body: 'Your microphone and camera must remain active at all times. Disabling either device mid-session will terminate the interview.' },
  { id: 3, title: 'Screen Recording', body: 'Your full screen will be recorded. Switching tabs or opening unauthorized applications will be logged as suspicious behaviour.' },
  { id: 4, title: 'Single Occupancy', body: 'You must be alone in the room. Background movement detection is active.' },
  { id: 5, title: 'Communication Standards', body: 'Respond in clear spoken English only. No external assistance, notes, or secondary devices are permitted.' },
  { id: 6, title: 'Data & Privacy', body: 'Session data is encrypted and retained for 90 days in compliance with data-protection regulations.' },
  { id: 7, title: 'Termination', body: 'Repeated integrity violations will result in automatic session termination and disqualification.' },
];

// ── Animations ───────────────────────────────────────────────────────────────
const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4 } } };
const slideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MICRO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function RecDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
    </span>
  );
}

function VoiceActivityBars({ analyser, isSpeaking, energyLevel }) {
  const BAR_COUNT = 42;
  const [bars, setBars] = useState(() => Array(BAR_COUNT).fill(0.1));
  const rafRef = useRef(null);
  const dataRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const flatten = () => {
      setBars(prev => prev.map((_, i) => (i % 9 === 0 ? 0.12 : 0.08)));
    };

    if (!analyser) {
      flatten();
      return undefined;
    }

    const sampleCount = analyser.fftSize || 2048;
    dataRef.current = new Uint8Array(sampleCount);

    const draw = () => {
      if (!mounted) return;
      rafRef.current = requestAnimationFrame(draw);

      const data = dataRef.current;
      analyser.getByteTimeDomainData(data);

      const silent = !isSpeaking && energyLevel < 0.02;
      const next = new Array(BAR_COUNT);
      const stride = Math.max(1, Math.floor(data.length / BAR_COUNT));

      for (let i = 0; i < BAR_COUNT; i++) {
        const start = i * stride;
        const end = Math.min(data.length, start + stride);
        let sum = 0;
        for (let j = start; j < end; j++) {
          sum += Math.abs((data[j] - 128) / 128);
        }
        const avg = sum / Math.max(1, end - start);
        const boosted = Math.min(1, avg * 4.8 + energyLevel * 2.6);
        next[i] = silent ? (i % 9 === 0 ? 0.12 : 0.08) : Math.max(0.1, boosted);
      }

      setBars(prev => prev.map((v, i) => (v * 0.68) + (next[i] * 0.32)));
    };

    draw();

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isSpeaking, energyLevel]);

  return (
    <div className="relative h-14 w-full rounded-2xl border border-emerald-400/20 bg-[#071a33]/75 overflow-hidden">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-emerald-300/20" />
      <div className="relative z-10 h-full px-3 flex items-center gap-1">
        {bars.map((value, idx) => (
          <motion.span
            key={idx}
            className={`flex-1 max-w-[4px] rounded-full ${isSpeaking || energyLevel > 0.02 ? 'bg-emerald-300' : 'bg-emerald-200/60'}`}
            animate={{
              height: `${Math.round(6 + (value * 34))}px`,
              opacity: isSpeaking || energyLevel > 0.02 ? 0.95 : 0.55,
            }}
            transition={{ duration: 0.09, ease: 'linear' }}
          />
        ))}
      </div>
    </div>
  );
}

/** ChatGPT-style word-by-word typewriter synced with TTS speech.
 *  Uses speech boundary events as source-of-truth when available,
 *  and falls back to timer pacing only if boundary events are unavailable. */
function TypewriterText({ text, speechCharIndex }) {
  const [timerCount, setTimerCount] = useState(0);
  const scrollRef = useRef(null);
  const wordsRef = useRef([]);
  const wordCharIndicesRef = useRef([]);

  // Precompute word positions and start timer whenever text changes
  useEffect(() => {
    if (!text) { wordsRef.current = []; wordCharIndicesRef.current = []; setTimerCount(0); return; }
    const words = text.split(/\s+/);
    wordsRef.current = words;

    // Build array of starting char index for each word
    const indices = [];
    let pos = 0;
    for (const word of words) {
      const idx = text.indexOf(word, pos);
      indices.push(idx >= 0 ? idx : pos);
      pos = (idx >= 0 ? idx : pos) + word.length;
    }
    wordCharIndicesRef.current = indices;

    // Start a timer to reveal words at ~TTS speed (rate 0.95 ≈ 142 wpm ≈ 420ms/word)
    setTimerCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTimerCount(i);
      if (i >= words.length) clearInterval(interval);
    }, 420);
    return () => clearInterval(interval);
  }, [text]);

  // Calculate how many words boundary events want to show
  const boundaryCount = useMemo(() => {
    if (!text || speechCharIndex < 0) return 0;
    if (speechCharIndex >= text.length) return wordsRef.current.length;
    let count = 0;
    for (const idx of wordCharIndicesRef.current) {
      if (idx <= speechCharIndex) count++;
      else break;
    }
    return count;
  }, [text, speechCharIndex]);

  const hasBoundaryEvents = speechCharIndex >= 0;
  const visibleCount = hasBoundaryEvents ? boundaryCount : timerCount;
  const isComplete = text && visibleCount >= wordsRef.current.length;

  // Auto-scroll when new words appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  if (!text) return null;
  const words = wordsRef.current;

  return (
    <div
      ref={scrollRef}
      className="w-full max-w-3xl max-h-[50vh] overflow-y-auto px-8 py-6 rounded-2xl bg-slate-900/50 border border-slate-700/40 backdrop-blur-sm"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(100,116,139,0.4) transparent',
        userSelect: 'none',
      }}
      onContextMenu={e => e.preventDefault()}
    >
      <p className="text-3xl lg:text-4xl font-bold text-white leading-snug">
        {words.slice(0, visibleCount).map((word, idx) => (
          <span
            key={idx}
            className="inline-block opacity-0 animate-[fadeInWord_0.25s_ease-out_forwards]"
            style={{ animationDelay: '0ms' }}
          >
            {word}{idx < visibleCount - 1 ? '\u00A0' : ''}
          </span>
        ))}
        {!isComplete && visibleCount > 0 && (
          <span
            className="inline-block w-[3px] h-[1.1em] bg-emerald-400 ml-1 align-text-bottom rounded-sm"
            style={{ animation: 'cursorBlink 0.8s steps(2) infinite' }}
          />
        )}
      </p>

      <style>{`
        @keyframes fadeInWord {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROCTORING TOAST SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const TOAST_DURATION_MS = 7000; // 7 seconds — long enough to read a full message

const TOAST_STYLES = {
  face: {
    border: 'border-amber-500/50',
    bg: 'bg-amber-950/95',
    iconBg: 'bg-amber-500/15 border-amber-500/30',
    iconColor: 'text-amber-400',
    titleColor: 'text-amber-300',
    msgColor: 'text-amber-400/80',
    bar: 'bg-amber-500',
  },
  object: {
    border: 'border-orange-500/50',
    bg: 'bg-orange-950/95',
    iconBg: 'bg-orange-500/15 border-orange-500/30',
    iconColor: 'text-orange-400',
    titleColor: 'text-orange-300',
    msgColor: 'text-orange-400/80',
    bar: 'bg-orange-500',
  },
  voice: {
    border: 'border-violet-500/50',
    bg: 'bg-violet-950/95',
    iconBg: 'bg-violet-500/15 border-violet-500/30',
    iconColor: 'text-violet-400',
    titleColor: 'text-violet-300',
    msgColor: 'text-violet-400/80',
    bar: 'bg-violet-500',
  },
};

function SingleToast({ toast, onDismiss }) {
  const style = TOAST_STYLES[toast.category] || TOAST_STYLES.face;
  const IconComp = toast.icon;

  return (
    <motion.div
      layout
      key={toast.id}
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.92, transition: { duration: 0.22 } }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className={`relative w-80 rounded-xl border shadow-2xl overflow-hidden backdrop-blur-md ${style.border} ${style.bg}`}
    >
      {/* Progress drain bar at top */}
      <motion.div
        className={`absolute top-0 left-0 h-0.5 ${style.bar}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: TOAST_DURATION_MS / 1000, ease: 'linear' }}
      />

      <div className="flex items-start gap-3 px-4 py-3.5 pt-4">
        {/* Icon */}
        <div className={`flex-shrink-0 h-8 w-8 rounded-full border flex items-center justify-center mt-0.5 ${style.iconBg}`}>
          <IconComp size={15} className={style.iconColor} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold tracking-wide uppercase leading-4 ${style.titleColor}`}>{toast.title}</p>
          <p className={`text-xs mt-1 leading-relaxed ${style.msgColor}`}>{toast.message}</p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition-colors mt-0.5"
          aria-label="Dismiss"
        >
          <XCircle size={14} />
        </button>
      </div>
    </motion.div>
  );
}

function ProctoringToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[10000] flex flex-col-reverse gap-2.5 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <SingleToast toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 1: TERMS MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function TermsModal({ onAccept }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setScrolledToBottom(true);
  };

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div variants={slideUp} initial="hidden" animate="visible"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-7 py-5 border-b border-slate-700/60 bg-slate-800/60">
          <Shield className="text-emerald-400 flex-shrink-0" size={26} />
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Candidate Integrity Agreement</h2>
            <p className="text-xs text-slate-400 mt-0.5">Read all terms carefully before proceeding.</p>
          </div>
        </div>

        {/* Scrollable terms */}
        <div ref={scrollRef} onScroll={handleScroll}
          className="overflow-y-auto max-h-[52vh] px-7 py-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900">
          <div className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/50">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">Key Requirements</p>
            <ul className="space-y-2">
              {[
                { icon: '🎙️', text: 'Audio, Video & Screen will be recorded continuously.' },
                { icon: '👁', text: 'Eye-contact tracking is active — look at the screen only.' },
                { icon: '🧍', text: 'Only you may be present — background movement is monitored.' },
                { icon: '📊', text: 'Respond in clear spoken English only.' },
                { icon: '⏱️', text: 'Interview flow is adaptive; question sequence and completion are decided by the interviewer AI.' },
              ].map(item => (
                <li key={item.text} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-base leading-5 flex-shrink-0">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          {TERMS_LIST.map((term, idx) => (
            <div key={term.id}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{idx + 1}. {term.title}</p>
              <p className="text-sm text-slate-300 leading-relaxed">{term.body}</p>
              {idx < TERMS_LIST.length - 1 && <div className="mt-5 border-b border-slate-700/40" />}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-slate-700/60 bg-slate-800/40 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-500 cursor-pointer" disabled={!scrolledToBottom} />
            <span className="text-sm text-slate-300">
              I have read and agree to the <span className="text-emerald-400 font-medium">Candidate Integrity Agreement</span> in full.
            </span>
          </label>
          {!scrolledToBottom && (
            <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
              <AlertTriangle size={13} /> Scroll to the bottom to enable acceptance.
            </p>
          )}
          <button onClick={onAccept} disabled={!checked || !scrolledToBottom}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white transition-colors">
            Accept &amp; Start Interview
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 2: PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

const PERM_STEPS = [
  { id: 'camera', label: 'Camera & Microphone', icon: Camera, description: 'Required to capture your interview feed and voice responses.' },
  { id: 'screen', label: 'Screen Recording (Entire Screen)', icon: Monitor, description: 'Required to ensure no unauthorised resources are used. You MUST share your Entire Screen.' },
];

let _permissionsRequested = false;

function PermissionsScreen({ onGranted, onDenied }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stepStatus, setStepStatus] = useState({ camera: 'idle', screen: 'idle' });
  const [screenShareHint, setScreenShareHint] = useState(null);
  const streamsRef = useRef({ camera: null, screen: null });
  const hasStartedRef = useRef(false);

  const requestPermissions = useCallback(async () => {
    if (_permissionsRequested || hasStartedRef.current) return;
    _permissionsRequested = true;
    hasStartedRef.current = true;

    // Camera + Mic
    setStepStatus(s => ({ ...s, camera: 'requesting' }));
    let cameraStream;
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      streamsRef.current.camera = cameraStream;
      setStepStatus(s => ({ ...s, camera: 'granted' }));
      setStepIndex(1);
    } catch {
      _permissionsRequested = false;
      setStepStatus(s => ({ ...s, camera: 'denied' }));
      onDenied('Camera & Microphone permission was denied. These are mandatory for proctoring.');
      return;
    }

    // Screen Share
    setStepStatus(s => ({ ...s, screen: 'requesting' }));
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always', displaySurface: 'monitor' },
          audio: false,
          preferCurrentTab: false,
          selfBrowserSurface: 'exclude',
          surfaceSwitching: 'exclude',
        });

        const track = screenStream.getVideoTracks()[0];
        const surface = track?.getSettings?.()?.displaySurface;
        if (surface && surface !== 'monitor') {
          screenStream.getTracks().forEach(t => t.stop());
          if (attempt < MAX_ATTEMPTS) {
            setScreenShareHint(`⚠️ You shared a ${surface === 'browser' ? 'browser tab' : surface}. Please choose "Entire Screen".`);
            continue;
          } else {
            cameraStream.getTracks().forEach(t => t.stop());
            _permissionsRequested = false;
            setStepStatus(s => ({ ...s, screen: 'denied' }));
            onDenied('You must share your Entire Screen. Session cancelled.');
            return;
          }
        }

        streamsRef.current.screen = screenStream;
        setScreenShareHint(null);
        setStepStatus(s => ({ ...s, screen: 'granted' }));
        setTimeout(() => onGranted(streamsRef.current), 600);
        return;
      } catch {
        cameraStream.getTracks().forEach(t => t.stop());
        _permissionsRequested = false;
        setStepStatus(s => ({ ...s, screen: 'denied' }));
        onDenied('Screen Recording permission was denied. Session cancelled.');
        return;
      }
    }
  }, [onGranted, onDenied]);

  useEffect(() => { requestPermissions(); }, []); // eslint-disable-line

  const iconForStatus = (status) => {
    if (status === 'granted') return <CheckCircle className="text-emerald-400" size={22} />;
    if (status === 'denied') return <XCircle className="text-red-400" size={22} />;
    if (status === 'requesting') return <Loader2 className="text-sky-400 animate-spin" size={22} />;
    return <Circle className="text-slate-600" size={22} />;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <motion.div variants={slideUp} initial="hidden" animate="visible"
        className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-14 w-14 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mb-4">
            <Shield className="text-sky-400" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Requesting Permissions</h1>
          <p className="text-sm text-slate-400 mt-2">Please approve each browser prompt.</p>
        </div>
        <div className="space-y-4">
          {PERM_STEPS.map((step, idx) => {
            const status = stepStatus[step.id];
            const isActive = idx === stepIndex && (status === 'idle' || status === 'requesting');
            return (
              <div key={step.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors duration-300 ${isActive ? 'border-sky-500/40 bg-sky-500/5' :
                  status === 'granted' ? 'border-emerald-500/30 bg-emerald-500/5' :
                    status === 'denied' ? 'border-red-500/30 bg-red-500/5' :
                      'border-slate-700/50 bg-slate-800/40'
                  }`}>
                <div className="mt-0.5">{iconForStatus(status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{step.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                  {status === 'requesting' && <p className="text-xs text-sky-400 mt-1 font-medium animate-pulse">Waiting…</p>}
                  {status === 'granted' && <p className="text-xs text-emerald-400 mt-1 font-medium">Granted ✓</p>}
                </div>
              </div>
            );
          })}
        </div>
        {screenShareHint && (
          <div className="mt-4 flex items-start gap-2.5 bg-amber-900/30 border border-amber-500/40 text-amber-300 text-xs rounded-xl px-4 py-3">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{screenShareHint}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 3: INTERVIEW INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

function InterviewInterface({ streams, applicationId, onComplete }) {
  const { camera: cameraStream } = streams;

  // ── Hooks setup ────────────────────────────────────────────────────────────
  const { isRecording: isAudioRecording, startRecording, stopRecording } = useAudioRecorder(cameraStream);
  const {
    isListening: vadListening, isSpeaking: vadSpeaking, energyLevel,
    startListening: startVAD, stopListening: stopVAD, analyser: vadAnalyser,
  } = useVAD(cameraStream);

  const engine = useInterviewEngine({
    applicationId,
    audioStream: cameraStream,
    startRecording,
    stopRecording,
    startVAD: startVAD,
    stopVAD: stopVAD,
  });

  // Voice Proctoring — runs in parallel with the interview, non-blocking
  const {
    isActive: vpActive,
    enrollmentStatus: vpEnrollmentStatus,
    mismatchCount: vpMismatchCount,
    startProctoring,
    stopProctoring,
  } = useVoiceProctoring(cameraStream, engine.engineState === ENGINE_STATE.LISTENING);
  const vpStartedRef = useRef(false);
  const fpStartedRef = useRef(false);
  const fpFrameInFlightRef = useRef(false);
  const fpCanvasRef = useRef(null);
  const fpFrameIntervalRef = useRef(null);
  const fpRetryTimerRef = useRef(null);
  const fpRetryCountRef = useRef(0);
  const fpForwardFailCountRef = useRef(0);
  const [fpActive, setFpActive] = useState(false);
  const [fpEnrollmentStatus, setFpEnrollmentStatus] = useState('unknown');
  const pauseInterviewRef = useRef(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const initializedRef = useRef(false);
  const summaryHandledRef = useRef(false);

  // ── Anti-cheating state ────────────────────────────────────────────────────
  const [cheatingReport, setCheatingReport] = useState([]);
  const [totalCheatingScore, setTotalCheatingScore] = useState(0);
  const [cheatingWarning, setCheatingWarning] = useState(null);
  const [proctoringViolation, setProctoringViolation] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showEndInterviewConfirm, setShowEndInterviewConfirm] = useState(false);
  const [isEndingInterview, setIsEndingInterview] = useState(false);
  const [pauseMode, setPauseMode] = useState('lockdown');
  const [pauseReason, setPauseReason] = useState('');
  const [resumeConditions, setResumeConditions] = useState(getResumeConditions());
  const [videoRecording, setVideoRecording] = useState(false);

  const cheatingReportRef = useRef([]);
  const totalCheatingScoreRef = useRef(0);
  const recordCheatingEventRef = useRef(null);
  const isPausedRef = useRef(false);
  const isTerminatingRef = useRef(false);
  const lastViolationAtRef = useRef({});
  // Stores screenshots: { [eventType]: [dataURL, ...] }
  const screenshotCapturesRef = useRef({});

  // ── Proctoring toast notifications ─────────────────────────────────────────
  const [proctoringToasts, setProctoringToasts] = useState([]);
  const toastTimersRef = useRef({});

  const dismissToast = useCallback((id) => {
    clearTimeout(toastTimersRef.current[id]);
    delete toastTimersRef.current[id];
    setProctoringToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showProctoringToast = useCallback((category, icon, title, message) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setProctoringToasts(prev => [...prev, { id, category, icon, title, message }]);
    toastTimersRef.current[id] = setTimeout(() => {
      setProctoringToasts(prev => prev.filter(t => t.id !== id));
      delete toastTimersRef.current[id];
    }, TOAST_DURATION_MS);
  }, []);

  // Clear all toast timers on unmount
  useEffect(() => {
    return () => {
      Object.values(toastTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  // ── Attach camera to video element ─────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current && cameraStream) videoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  // ── Video MediaRecorder ────────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraStream) return;
    try {
      const recorder = new MediaRecorder(cameraStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus' : 'video/webm',
      });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setVideoRecording(true);
    } catch (err) {
      console.error('MediaRecorder init error:', err);
    }
    return () => {
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
    };
  }, [cameraStream]);

  // ── Enter fullscreen on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (!isFullscreenActive()) {
        try {
          const el = document.documentElement;
          const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
          if (req) await req.call(el);
        } catch { }
      }
    })();
  }, []);

  // ── Initialize interview engine ────────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    engine.initialize();
  }, []); // eslint-disable-line

  // ── Screenshot capture utility ─────────────────────────────────────────────
  const captureScreenshot = useCallback(async () => {
    try {
      const track = streams.screen?.getVideoTracks?.()[0];
      if (!track || track.readyState === 'ended') return null;
      // Use ImageCapture API to grab a frame from the screen-share track
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      bitmap.close();
      return canvas.toDataURL('image/jpeg', 0.6);
    } catch {
      return null;
    }
  }, [streams.screen]);

  // ── Transition to summary when engine is done ──────────────────────────────
  useEffect(() => {
    if (engine.engineState !== ENGINE_STATE.DONE || !engine.summary) return;
    if (summaryHandledRef.current) return;
    summaryHandledRef.current = true;

    (async () => {
      // Stop voice proctoring and pass all data up
      try {
        if (engine.sessionId) await faceProctoringApi.stopFaceProctoring(engine.sessionId);
      } catch { }
      await stopProctoring();
      onComplete(
        engine.summary,
        cheatingReportRef.current,
        totalCheatingScoreRef.current,
        screenshotCapturesRef.current,
        vpMismatchCount
      );
    })();
  }, [engine.engineState, engine.summary, onComplete, stopProctoring, vpMismatchCount]);

  // ── Start voice proctoring once candidate-answer phase starts ──────────────
  // We wait until engineState === LISTENING so AI TTS/question audio is not
  // sent into speaker verification.
  // on the first sessionId we see.  The engine may return a resumed/stale
  // session ID from getActiveSession, then create a NEW session internally;
  // by the time we hit LISTENING, engine.sessionId is 100% the correct, final
  // interview session that will be used for transcribe / answer / complete.
  useEffect(() => {
    if (vpStartedRef.current) return;
    if (!engine.sessionId) return;
    if (engine.engineState !== ENGINE_STATE.LISTENING) return;

    vpStartedRef.current = true;
    startProctoring(engine.sessionId, engine.elapsedSeconds);
  }, [engine.sessionId, engine.engineState, startProctoring, engine.elapsedSeconds]);

  // ── Voice mismatch toast (polls backend every 5s) ─────────────────────────
  // The voice mismatch detection happens entirely server-side via WebSocket.
  // The frontend has no real-time notification, so we poll the lightweight
  // /voice-proctoring/status endpoint to check for new mismatches.
  const vpMismatchPollCountRef = useRef(0);
  useEffect(() => {
    if (!engine.sessionId) return;

    const poll = setInterval(async () => {
      if (isPausedRef.current || isTerminatingRef.current) return;
      try {
        const res = await voiceProctoringApi.getVoiceProctoringStatus(engine.sessionId);
        const serverCount = res?.data?.mismatchCount ?? 0;
        if (serverCount > vpMismatchPollCountRef.current) {
          vpMismatchPollCountRef.current = serverCount;
          showProctoringToast(
            'voice',
            Mic2,
            'Voice Verification Notice',
            'Your voice pattern does not match the registered candidate profile. Please speak clearly and ensure you are responding in your own voice.'
          );
        }
      } catch {
        // Non-fatal — silently ignore poll failures
      }
    }, 1500); // poll every 1.5 seconds to match face proctoring

    return () => clearInterval(poll);
  }, [engine.sessionId, showProctoringToast]);

  // ── Start face proctoring once answer phase begins ─────────────────────────
  useEffect(() => {
    if (fpStartedRef.current) return;
    if (!engine.sessionId) return;
    if (engine.engineState !== ENGINE_STATE.LISTENING) return;

    fpStartedRef.current = true;
    console.debug(
      FACE_PROCTORING_LOG_PREFIX,
      'start request',
      {
        sessionId: engine.sessionId,
        elapsedSeconds: engine.elapsedSeconds,
        frameIntervalMs: FACE_PROCTORING_FRAME_INTERVAL_MS,
      }
    );
    faceProctoringApi.startFaceProctoring(engine.sessionId, engine.elapsedSeconds)
      .then((result) => {
        const data = result?.data || {};
        if (data.started) {
          console.debug(
            FACE_PROCTORING_LOG_PREFIX,
            'start success',
            { sessionId: engine.sessionId, candidateId: data.candidateId || null }
          );
          setFpActive(true);
          setFpEnrollmentStatus('enrolled');
          fpRetryCountRef.current = 0;
          fpForwardFailCountRef.current = 0;
        } else {
          console.warn(
            FACE_PROCTORING_LOG_PREFIX,
            'start returned not started',
            { sessionId: engine.sessionId, reason: data?.reason || 'unknown' }
          );
          setFpActive(false);
          setFpEnrollmentStatus('not_enrolled');

          const reason = String(data?.reason || '').toLowerCase();
          const shouldRetry = reason.includes('not yet complete') || reason.includes('wait');
          if (shouldRetry && fpRetryCountRef.current < 15) {
            fpRetryCountRef.current += 1;
            console.debug(
              FACE_PROCTORING_LOG_PREFIX,
              'scheduling enrollment retry',
              { sessionId: engine.sessionId, retryCount: fpRetryCountRef.current, retryDelayMs: 8000 }
            );
            fpRetryTimerRef.current = setTimeout(() => {
              fpStartedRef.current = false;
              setFpEnrollmentStatus(prev => (prev === 'retrying' ? 'not_enrolled' : 'retrying'));
            }, 8000);
          }
        }
      })
      .catch((err) => {
        console.warn(
          FACE_PROCTORING_LOG_PREFIX,
          'start request failed',
          { sessionId: engine.sessionId, error: err?.message || 'unknown' }
        );
        setFpActive(false);
        setFpEnrollmentStatus('failed');
      });
  }, [engine.sessionId, engine.engineState, engine.elapsedSeconds, fpEnrollmentStatus]);

  useEffect(() => {
    if (!engine.sessionId) return;
    console.debug(
      FACE_PROCTORING_LOG_PREFIX,
      'state changed',
      { sessionId: engine.sessionId, active: fpActive, enrollmentStatus: fpEnrollmentStatus }
    );
  }, [engine.sessionId, fpActive, fpEnrollmentStatus]);

  const pauseInterview = useCallback((reason, mode = 'lockdown') => {
    if (isPausedRef.current || isTerminatingRef.current) return;
    isPausedRef.current = true;
    engine.pause();
    setPauseMode(mode);
    setIsPaused(true);
    setPauseReason(
      reason || (mode === 'no_face'
        ? 'Face not visible. Please turn on camera, face the camera, and stay clearly visible to continue.'
        : 'Interview paused. Return to fullscreen to continue.')
    );
    setResumeConditions(getResumeConditions());
  }, [engine.pause]);

  useEffect(() => {
    pauseInterviewRef.current = pauseInterview;
  }, [pauseInterview]);

  const captureFaceFrame = useCallback(async () => {
    const ensureCanvas = (width, height) => {
      if (!fpCanvasRef.current) fpCanvasRef.current = document.createElement('canvas');
      const canvas = fpCanvasRef.current;
      canvas.width = width;
      canvas.height = height;
      return canvas;
    };

    const getCaptureSize = (sourceWidth, sourceHeight) => {
      const safeWidth = Math.max(1, Math.round(sourceWidth || FACE_PROCTORING_MAX_WIDTH));
      const safeHeight = Math.max(1, Math.round(sourceHeight || safeWidth));
      const scale = Math.min(1, FACE_PROCTORING_MAX_WIDTH / safeWidth);
      return {
        width: Math.max(1, Math.round(safeWidth * scale)),
        height: Math.max(1, Math.round(safeHeight * scale)),
      };
    };

    const drawToDataUrl = (source, width, height) => {
      const canvas = ensureCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(source, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', FACE_PROCTORING_JPEG_QUALITY);
    };

    const video = videoRef.current;
    if (video && video.readyState >= 2) {
      const { width, height } = getCaptureSize(video.videoWidth, video.videoHeight);
      return drawToDataUrl(video, width, height);
    }

    try {
      const track = cameraStream?.getVideoTracks?.()?.[0];
      if (!track || track.readyState === 'ended') return null;
      if (typeof ImageCapture === 'undefined') return null;

      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      const { width, height } = getCaptureSize(bitmap.width, bitmap.height);
      const dataUrl = drawToDataUrl(bitmap, width, height);
      bitmap.close();
      return dataUrl;
    } catch {
      return null;
    }
  }, [cameraStream]);

  // ── Stream face/object analysis frames periodically ─────────────────────────
  useEffect(() => {
    if (!fpActive) return;
    if (!engine.sessionId) return;

    console.debug(
      FACE_PROCTORING_LOG_PREFIX,
      'frame streaming started',
      { sessionId: engine.sessionId, intervalMs: FACE_PROCTORING_FRAME_INTERVAL_MS }
    );

    fpFrameIntervalRef.current = setInterval(async () => {
      if (isPausedRef.current || isTerminatingRef.current) return;
      if (fpFrameInFlightRef.current) return;

      const image = await captureFaceFrame();
      if (!image) return;

      fpFrameInFlightRef.current = true;
      try {
        const frameResponse = await faceProctoringApi.sendFaceFrame(engine.sessionId, image);
        const frameData = frameResponse?.data || {};

        if (frameData.forwarded === false) {
          fpForwardFailCountRef.current += 1;
          console.warn(
            FACE_PROCTORING_LOG_PREFIX,
            'frame not forwarded',
            {
              sessionId: engine.sessionId,
              consecutiveFailCount: fpForwardFailCountRef.current,
              failReason: frameData?.failReason || 'unknown',
              wsReadyState: frameData?.wsReadyState || 'n/a',
            }
          );

          if (fpForwardFailCountRef.current >= 3) {
            console.warn(
              FACE_PROCTORING_LOG_PREFIX,
              'auto disabling after consecutive frame forward failures',
              {
                sessionId: engine.sessionId,
                threshold: 3,
                intervalMs: FACE_PROCTORING_FRAME_INTERVAL_MS,
              }
            );
            setFpActive(false);
            fpStartedRef.current = false;
            setFpEnrollmentStatus('retrying');
          }
          return;
        }

        if (fpForwardFailCountRef.current > 0) {
          console.debug(
            FACE_PROCTORING_LOG_PREFIX,
            'frame forwarding recovered',
            { sessionId: engine.sessionId, previousFailCount: fpForwardFailCountRef.current }
          );
        }
        fpForwardFailCountRef.current = 0;

        const faceSignal = frameData.faceSignal;
        const objectSignal = frameData.objectSignal;

        // no_face → existing pause behaviour (unchanged)
        if (faceSignal?.kind === 'formal_face_alert' && faceSignal?.isNoFace) {
          pauseInterviewRef.current?.(
            'Face not visible. Please turn on camera, face the camera, and stay clearly visible to continue.',
            'no_face'
          );
        } else if (faceSignal?.kind === 'formal_face_alert' && !faceSignal?.isNoFace) {
          // Non-no-face face violation → show informative toast
          const vt = (faceSignal.violationType || faceSignal.status || '').toLowerCase();
          let faceTitle = 'Face Verification Notice';
          let faceMsg;
          if (vt.includes('multiple') || (typeof faceSignal.numFaces === 'number' && faceSignal.numFaces > 1)) {
            faceMsg = 'Multiple faces detected on camera. Please ensure only you are visible during the interview.';
          } else if (vt.includes('liveness')) {
            faceMsg = 'Liveness check could not be completed. Please look directly at the camera and ensure you are in a well-lit environment.';
          } else if (vt.includes('mismatch') || vt.includes('similarity') || vt.includes('low')) {
            faceMsg = 'We\'re having difficulty matching your face. Please ensure you are well-lit, facing the camera squarely, and your face is fully visible without obstruction.';
          } else {
            faceMsg = 'Face verification issue detected. Please ensure your face is clearly visible, centered, and well-lit in the camera.';
          }
          showProctoringToast('face', AlertTriangle, faceTitle, faceMsg);
        }

        // Object alert → show informative toast
        if (objectSignal?.kind === 'object_alert') {
          const types = (objectSignal.alertTypes || []).map(t => String(t || '').toLowerCase()).filter(Boolean);
          const suspicious = (objectSignal.suspiciousObjects || [])
            .map((s) => {
              if (typeof s === 'string') return s.toLowerCase();
              if (s && typeof s === 'object') {
                return String(s.object || s.label || s.type || '').toLowerCase();
              }
              return '';
            })
            .filter(Boolean);
          const allTypes = [...types, ...suspicious];
          let objTitle = 'Environment Alert';
          let objMsg;
          if (allTypes.some(t => t.includes('phone') || t.includes('cell') || t.includes('mobile'))) {
            objMsg = 'A mobile phone was detected. Please put all devices away — only your interview computer is permitted.';
          } else if (allTypes.some(t => t.includes('book') || t.includes('paper') || t.includes('note') || t.includes('document'))) {
            objMsg = 'Notes or written materials were detected. Please clear your desk — no reference materials are allowed during the interview.';
          } else if (typeof objectSignal.personCount === 'number' && objectSignal.personCount > 1) {
            objMsg = 'More than one person detected in the frame. You must be alone during the interview.';
          } else {
            objMsg = 'Unauthorized objects or additional persons detected. Please clear your environment and ensure you are alone.';
          }
          showProctoringToast('object', Shield, objTitle, objMsg);
        }

      } catch (err) {
        console.warn(
          FACE_PROCTORING_LOG_PREFIX,
          'sendFaceFrame request failed',
          { sessionId: engine.sessionId, error: err?.message || 'unknown' }
        );
        // Non-blocking by design
      } finally {
        fpFrameInFlightRef.current = false;
      }
    }, FACE_PROCTORING_FRAME_INTERVAL_MS); // 2.0s interval to align with backend 6x threshold (~12s)

    return () => {
      console.debug(
        FACE_PROCTORING_LOG_PREFIX,
        'frame streaming cleanup',
        { sessionId: engine.sessionId }
      );
      if (fpRetryTimerRef.current) {
        clearTimeout(fpRetryTimerRef.current);
        fpRetryTimerRef.current = null;
      }
      if (fpFrameIntervalRef.current) {
        clearInterval(fpFrameIntervalRef.current);
        fpFrameIntervalRef.current = null;
      }
    };
  }, [fpActive, engine.sessionId, captureFaceFrame, showProctoringToast, pauseInterview]);

  useEffect(() => {
    return () => {
      if (fpFrameIntervalRef.current) {
        clearInterval(fpFrameIntervalRef.current);
        fpFrameIntervalRef.current = null;
      }
      if (engine.sessionId) {
        faceProctoringApi.stopFaceProctoring(engine.sessionId).catch(() => { });
      }
    };
  }, [engine.sessionId]);

  // ── Anti-cheating: recordCheatingEvent ─────────────────────────────────────
  const recordCheatingEvent = useCallback((eventType, message) => {
    if (isTerminatingRef.current) return;
    const points = CHEATING_SCORES[eventType] ?? 1;
    const nowIso = new Date().toISOString();
    const newTotal = totalCheatingScoreRef.current + points;
    totalCheatingScoreRef.current = newTotal;

    // Delay screenshot capture so the OS finishes switching windows/apps.
    // Capturing immediately would grab the proctoring page itself (still visible
    // at the moment of the event); after ~1 second the screen-share frame shows
    // whatever the candidate actually switched to.
    setTimeout(() => {
      captureScreenshot().then((dataUrl) => {
        if (dataUrl) {
          const prev = screenshotCapturesRef.current[eventType] || [];
          screenshotCapturesRef.current = {
            ...screenshotCapturesRef.current,
            [eventType]: [...prev, dataUrl],
          };
        }
      });
    }, 1000);

    const existingIndex = cheatingReportRef.current.findIndex(r => r.eventType === eventType);
    let updatedReport;
    if (existingIndex >= 0) {
      updatedReport = cheatingReportRef.current.map((r, i) =>
        i === existingIndex
          ? { ...r, count: r.count + 1, lastAt: nowIso, totalPoints: (r.count + 1) * r.points }
          : r
      );
    } else {
      updatedReport = [...cheatingReportRef.current, {
        eventType, label: CHEATING_LABELS[eventType] ?? eventType, message,
        count: 1, points, totalPoints: points, firstAt: nowIso, lastAt: nowIso,
      }];
    }
    cheatingReportRef.current = updatedReport;
    setCheatingReport([...updatedReport]);
    setTotalCheatingScore(newTotal);

    if (newTotal >= CHEATING_THRESHOLD) {
      setProctoringViolation({ count: newTotal, message });
      isTerminatingRef.current = true;
      engine.terminate({
        cheatingEvents: updatedReport,
        totalCheatingScore: newTotal,
        terminationReason: `Integrity threshold exceeded (${newTotal}/${CHEATING_THRESHOLD})`,
      });
    } else {
      setCheatingWarning({ score: newTotal, message, eventType, points });
      setTimeout(() => setCheatingWarning(null), 4500);
    }
  }, [engine.terminate, captureScreenshot]);

  useEffect(() => { recordCheatingEventRef.current = recordCheatingEvent; }, [recordCheatingEvent]);

  // ── Proctoring lockdown listeners ──────────────────────────────────────────
  useEffect(() => {
    const shouldRecord = (eventType, cooldownMs = 1200) => {
      const now = Date.now();
      const last = lastViolationAtRef.current[eventType] || 0;
      if (now - last < cooldownMs) return false;
      lastViolationAtRef.current[eventType] = now;
      return true;
    };

    const flagAndPause = (eventType, message, pauseDetail) => {
      if (isTerminatingRef.current) return;
      if (shouldRecord(eventType)) recordCheatingEventRef.current?.(eventType, message);
      pauseInterview(pauseDetail, 'lockdown');
    };

    const handleVisibilityChange = () => {
      setResumeConditions(getResumeConditions());
      if (document.hidden) {
        const isMinimized = window.outerWidth === 0 || window.outerHeight === 0;
        flagAndPause(
          isMinimized ? 'browser_minimize' : 'tab_switch',
          isMinimized ? 'Browser minimized' : 'Tab switch detected',
          isMinimized ? 'Browser was minimized.' : 'Tab switch detected.'
        );
      }
    };

    const handleWindowBlur = () => {
      if (!document.hidden && !isTerminatingRef.current) {
        flagAndPause('window_switch', 'Window lost focus', 'Window focus lost.');
      }
    };

    const handleWindowFocus = () => setResumeConditions(getResumeConditions());

    const handleFullscreenChange = () => {
      setResumeConditions(getResumeConditions());
      if (!isFullscreenActive() && !isTerminatingRef.current) {
        flagAndPause('exit_fullscreen', 'Fullscreen exited', 'Fullscreen was exited.');
      }
    };

    const screenTrack = streams.screen?.getVideoTracks?.()?.[0];
    const handleScreenShareEnded = () => {
      if (!isTerminatingRef.current) {
        setProctoringViolation({ count: CHEATING_THRESHOLD, message: 'Screen sharing stopped' });
        isTerminatingRef.current = true;
        engine.terminate({
          cheatingEvents: cheatingReportRef.current,
          totalCheatingScore: CHEATING_THRESHOLD,
          terminationReason: 'Screen sharing was stopped',
        });
      }
    };

    // Monitor enforcement
    const monitorId = setInterval(() => {
      if (isTerminatingRef.current) return;
      const checks = getResumeConditions();
      setResumeConditions(checks);
      if (!checks.fullscreen || !checks.tabFocused || !checks.windowActive) {
        pauseInterview('Return to fullscreen to continue.');
      }
      if (window.screen?.isExtended === true) {
        flagAndPause('multiple_screens', 'Multiple monitors detected', 'Multiple displays detected.');
      }
    }, 800);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    if (screenTrack) screenTrack.addEventListener('ended', handleScreenShareEnded);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      if (screenTrack) screenTrack.removeEventListener('ended', handleScreenShareEnded);
      clearInterval(monitorId);
    };
  }, [streams.screen, engine.terminate, pauseInterview]);

  // ── Keyboard / clipboard lockdown ──────────────────────────────────────────
  useEffect(() => {
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    const blockCopy = (e) => { e.preventDefault(); recordCheatingEventRef.current?.('copy_paste', 'Copy/cut attempted'); };
    const blockContextMenu = (e) => { e.preventDefault(); recordCheatingEventRef.current?.('right_click', 'Right-click attempted'); };
    const blockPaste = (e) => { e.preventDefault(); recordCheatingEventRef.current?.('copy_paste', 'Paste attempted'); };
    const blockKeys = (e) => {
      const key = e.key.toLowerCase();
      if (e.ctrlKey && ['c', 'x', 'a', 'u', 'p', 's', 'v'].includes(key)) { e.preventDefault(); e.stopPropagation(); }
      if (e.key === 'F12') { e.preventDefault(); e.stopPropagation(); }
      if (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) { e.preventDefault(); e.stopPropagation(); }
      if (e.ctrlKey && e.key === 'Tab') { e.preventDefault(); }
      if (e.ctrlKey && key === 't') { e.preventDefault(); }
      if (e.ctrlKey && key === 'n') { e.preventDefault(); }
      if (e.ctrlKey && (key === 'w' || e.key === 'F4')) { e.preventDefault(); }
      if (e.altKey && e.key === 'F4') { e.preventDefault(); }
      if ((e.ctrlKey && key === 'r') || e.key === 'F5') { e.preventDefault(); }
      if (e.key === 'F11') { e.preventDefault(); }
      if (e.key === 'Escape') { e.preventDefault(); }
      if (e.key === 'PrintScreen') { e.preventDefault(); }
      if (e.metaKey) { e.preventDefault(); }
    };

    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = 'Leaving will terminate your interview.'; return e.returnValue; };

    document.addEventListener('copy', blockCopy);
    document.addEventListener('cut', blockCopy);
    document.addEventListener('paste', blockPaste);
    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('keydown', blockKeys, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.body.style.userSelect = prevUserSelect;
      document.body.style.webkitUserSelect = '';
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('cut', blockCopy);
      document.removeEventListener('paste', blockPaste);
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockKeys, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // ── Resume handler ─────────────────────────────────────────────────────────
  const handleReturnToFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (req) await req.call(el);
    } catch { }

    // Wait a tick for fullscreen to take effect
    await new Promise(r => setTimeout(r, 300));

    const checks = getResumeConditions();
    setResumeConditions(checks);
    if (!checks.fullscreen || !checks.tabFocused || !checks.windowActive) return;

    isPausedRef.current = false;
    setIsPaused(false);
    setPauseMode('lockdown');
    setPauseReason('');
    engine.resume();
  }, [engine.resume]);

  // ── Computed values ────────────────────────────────────────────────────────
  const formattedTime = useMemo(() => {
    const m = Math.floor(engine.elapsedSeconds / 60).toString().padStart(2, '0');
    const s = (engine.elapsedSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [engine.elapsedSeconds]);

  const avgScore = useMemo(() => {
    const scored = engine.evaluations.filter(e => e.score != null);
    if (!scored.length) return null;
    return Math.round((scored.reduce((acc, e) => acc + e.score, 0) / scored.length) * 10) / 10;
  }, [engine.evaluations]);

  const statusConfig = useMemo(() => {
    switch (engine.engineState) {
      case ENGINE_STATE.ASKING:
        return { label: 'AI Speaking…', color: 'text-sky-400', dot: 'bg-sky-400', icon: Volume2 };
      case ENGINE_STATE.LISTENING:
        return { label: 'Listening…', color: 'text-emerald-400', dot: 'bg-emerald-400', icon: Mic };
      case ENGINE_STATE.PROCESSING:
        return { label: 'Processing…', color: 'text-amber-400', dot: 'bg-amber-400', icon: Loader2 };
      case ENGINE_STATE.COMPLETING:
        return { label: 'Wrapping up…', color: 'text-purple-400', dot: 'bg-purple-400', icon: Clock };
      case ENGINE_STATE.INITIALIZING:
        return { label: 'Starting…', color: 'text-sky-400', dot: 'bg-sky-400', icon: Loader2 };
      default:
        return { label: 'Idle', color: 'text-slate-500', dot: 'bg-slate-600', icon: Circle };
    }
  }, [engine.engineState]);

  const isNoFacePause = pauseMode === 'no_face';
  const listeningActive = vadSpeaking || energyLevel > 0.02;

  const handleConfirmEndInterview = useCallback(async () => {
    if (isEndingInterview || engine.engineState !== ENGINE_STATE.LISTENING) return;

    setShowEndInterviewConfirm(false);
    setIsEndingInterview(true);
    try {
      stopVAD();
      await stopRecording().catch(() => { });
      await engine.finishInterview({
        completionContext: {
          completionInitiator: 'candidate',
          completionTrigger: 'candidate_end_button',
          completionDetail: 'Candidate ended interview via explicit UI confirmation.',
        },
      });
    } finally {
      setIsEndingInterview(false);
    }
  }, [isEndingInterview, engine, stopVAD, stopRecording]);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#020817] text-white flex flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6 py-3 bg-[#050f25]/90 border-b border-[#193252]/70 backdrop-blur-md z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <Shield className="text-emerald-400" size={20} />
          <span className="font-bold text-sm tracking-tight text-white">
            IntelliHire <span className="text-slate-400 font-normal">/ AI Interview</span>
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-[#2c4668] bg-[#0b1f3c]/70 ${statusConfig.color}`}>
            {[ENGINE_STATE.PROCESSING, ENGINE_STATE.COMPLETING, ENGINE_STATE.INITIALIZING].includes(engine.engineState)
              ? <Loader2 size={12} className="animate-spin" />
              : <span className={`h-2 w-2 rounded-full ${statusConfig.dot} animate-pulse`} />}
            {statusConfig.label}
          </div>
          {avgScore !== null && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-[#0b1f3c]/70 border border-[#2c4668] rounded-full px-3 py-1.5">
              <TrendingUp size={12} className="text-emerald-400" /> Avg {avgScore}/10
            </div>
          )}
          {vpActive && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-[#0b1f3c]/70 border border-[#2c4668] rounded-full px-3 py-1.5">
              <Mic2 size={11} className="text-emerald-400" /> Voice
            </div>
          )}
          {fpEnrollmentStatus === 'enrolled' && fpActive && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-[#0b1f3c]/70 border border-[#2c4668] rounded-full px-3 py-1.5">
              <Camera size={11} className="text-sky-400" /> Face/Object
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-200 bg-[#0b1f3c]/70 border border-[#2c4668] rounded-full px-3 py-1.5">
            <Radio size={12} className="text-slate-300" /> {formattedTime}
          </div>
          {videoRecording && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-300 bg-[#3a0f17]/70 border border-red-500/30 rounded-full px-3 py-1.5">
              <RecDot /> REC
            </div>
          )}
        </div>
      </header>

      <div className="h-0.5 bg-slate-800">
        <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: '100%' }} />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        <section className="relative lg:w-1/2 min-h-[45vh] lg:min-h-full border-r border-[#12335f]/40 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_45%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.1),transparent_40%),linear-gradient(160deg,#020817_0%,#03132f_55%,#020617_100%)]" />
          <main className="relative h-full px-6 lg:px-12 py-8 lg:py-12 flex flex-col">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.22em]">
              Question {engine.questionCount || 1}
            </div>

            <div className="flex-1 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {engine.currentQuestion ? (
                  <motion.div key={engine.currentQuestion} variants={slideUp} initial="hidden" animate="visible" exit="exit"
                    className="w-full flex justify-center">
                    <TypewriterText text={engine.currentQuestion} speechCharIndex={engine.speechCharIndex} />
                  </motion.div>
                ) : (
                  <motion.div key="loading" variants={fadeIn} initial="hidden" animate="visible" className="flex flex-col items-center gap-3">
                    <Loader2 className="text-slate-400 animate-spin" size={34} />
                    <p className="text-slate-400 text-sm text-center">
                      {engine.engineState === ENGINE_STATE.INITIALIZING ? 'Setting up your interview session...' : 'Generating your next question...'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-4 lg:pt-0 min-h-[132px]">
              <AnimatePresence mode="wait">
                {engine.engineState === ENGINE_STATE.LISTENING ? (
                  <motion.div
                    key="listening-footer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="w-full"
                  >
                    <div className="w-full max-w-[900px] min-h-16 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.06] backdrop-blur-sm px-3 py-3 lg:px-4 flex items-center justify-between gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <motion.div
                          className="relative h-12 w-12 rounded-full bg-[#2d3a53] flex items-center justify-center flex-shrink-0"
                          animate={{ scale: listeningActive ? 1.08 : 1 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                        >
                          <motion.span
                            className="absolute inset-0 rounded-full border border-[#8bb8ff]/25"
                            animate={{ scale: listeningActive ? [1, 1.18, 1] : 1, opacity: listeningActive ? [0.2, 0.45, 0.2] : 0.18 }}
                            transition={{ duration: 1.1, repeat: listeningActive ? Infinity : 0, ease: 'easeInOut' }}
                          />
                          <motion.span
                            className="absolute inset-[8px] rounded-full bg-[#435478]"
                            animate={{ scale: listeningActive ? 1.03 : 1 }}
                            transition={{ duration: 0.2 }}
                          />
                          <Mic size={20} className="relative z-10 text-[#a9ccff]" />
                        </motion.div>
                        <div className="min-w-0 flex-1">
                          <VoiceActivityBars analyser={vadAnalyser} isSpeaking={vadSpeaking} energyLevel={energyLevel} />
                          <p className="mt-1 text-xs text-slate-400">
                            {listeningActive ? 'Voice detected. Capturing your answer...' : 'Mic is active. Waiting for your voice...'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowEndInterviewConfirm(true)}
                          disabled={isEndingInterview}
                          className="h-11 px-4 rounded-full border border-red-400/50 bg-red-500/15 text-red-200 text-xs font-semibold tracking-wide uppercase hover:bg-red-500/25 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                          aria-label="End interview"
                        >
                          End interview
                        </button>
                        <button
                          type="button"
                          onClick={() => engine.completeCurrentAnswer?.()}
                          disabled={isEndingInterview}
                          className="h-11 px-4 rounded-full bg-gradient-to-r from-emerald-500/90 to-cyan-400/90 text-[#031525] text-xs font-semibold tracking-wide uppercase shadow-[0_8px_20px_rgba(16,185,129,0.28)] hover:brightness-105 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                          aria-label="Complete answer and continue"
                        >
                          Complete answer
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : engine.finalTranscript ? (
                  <motion.div
                    key="transcript-footer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-xl border border-emerald-500/25 bg-[#03152f]/80 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Transcribed Answer</p>
                      <p className="text-[11px] text-slate-400">{engine.engineState === ENGINE_STATE.PROCESSING ? 'Processing...' : statusConfig.label}</p>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">"{engine.finalTranscript}"</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="status-footer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2 text-slate-300 text-xl font-semibold"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-400 animate-pulse" />
                    {statusConfig.label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </section>

        <section className="relative lg:w-1/2 min-h-[45vh] lg:min-h-full bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover bg-slate-950" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

          <div className="absolute bottom-4 left-4 right-4 lg:bottom-5 lg:left-5 lg:right-5 z-10 flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-[#1d2433]/75 px-4 py-2 text-red-300 text-xl font-semibold backdrop-blur-md">
              <RecDot /> <span className="text-base">REC</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-500/40 bg-[#1d2433]/75 px-4 py-2 text-slate-200 text-xl font-semibold backdrop-blur-md">
              <Camera size={17} className="text-slate-300" />
              <span className="text-base">Camera</span>
              <span className="text-slate-400 text-base font-medium">{formattedTime}</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-500/40 bg-[#1d2433]/75 px-4 py-2 text-slate-200 text-xl font-semibold backdrop-blur-md">
              <Mic size={17} className="text-slate-300" />
              <span className="text-base">Mic</span>
            </div>
          </div>
        </section>
      </div>

      {/* ── Cheating warning banner ─────────────────── */}
      <AnimatePresence>
        {cheatingWarning && (
          <motion.div key="cheat-warning" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4">
            <div className="flex items-start gap-3 bg-amber-950 border border-amber-500/50 rounded-xl px-5 py-3.5 shadow-2xl">
              <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1 min-w-0">
                <p className="text-amber-300 text-sm font-semibold">Integrity Warning — +{cheatingWarning.points} pts</p>
                <p className="text-amber-400/80 text-xs mt-0.5">{cheatingWarning.message}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-amber-400 text-xs font-bold">{cheatingWarning.score}/{CHEATING_THRESHOLD}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pause overlay ─────────────────────────────── */}
      <AnimatePresence>
        {isPaused && !proctoringViolation && (
          <motion.div key="pause-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] flex flex-col items-center justify-center select-none"
            style={{ background: 'rgba(0,0,0,0.98)', backdropFilter: 'blur(12px)' }}
            onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <motion.div initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }}
              className="max-w-lg w-full mx-4 rounded-2xl overflow-hidden border border-red-500/40 bg-[#0d0708]">
              <div className="flex items-center gap-3 bg-red-950/70 border-b border-red-900/60 px-7 py-5">
                <div className="h-10 w-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                  <AlertTriangle className="text-red-400" size={20} />
                </div>
                <div>
                  <p className="text-red-400 font-bold text-base">Interview Paused</p>
                  <p className="text-red-500/70 text-xs mt-0.5">{isNoFacePause ? 'Face not detected — session paused' : 'Violation detected — session frozen'}</p>
                </div>
                {!isNoFacePause && (
                  <div className={`ml-auto px-4 py-1.5 rounded-full border text-xs font-bold ${totalCheatingScore >= CHEATING_THRESHOLD * 0.7 ? 'bg-red-900/60 border-red-500/40 text-red-400' :
                    'bg-slate-800 border-slate-700/50 text-slate-400'
                    }`}>{totalCheatingScore}/{CHEATING_THRESHOLD} pts</div>
                )}
              </div>
              <div className="px-7 py-6 space-y-5">
                <div className="flex items-start gap-3 bg-slate-900/80 border border-slate-700/40 rounded-xl px-4 py-3.5">
                  {isNoFacePause
                    ? <Camera className="text-slate-400 flex-shrink-0 mt-0.5" size={18} />
                    : <Monitor className="text-slate-400 flex-shrink-0 mt-0.5" size={18} />}
                  <p className="text-slate-200 text-sm">{pauseReason || (isNoFacePause
                    ? 'Face not visible. Please face the camera and stay visible.'
                    : 'Return to fullscreen to continue.')}</p>
                </div>
                {isNoFacePause && (
                  <div className="bg-slate-900/80 border border-slate-700/40 rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Make sure camera is ON, your face is centered, and your full face remains visible in good lighting.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Resume conditions</p>
                  {[
                    { label: 'Fullscreen active', check: resumeConditions.fullscreen },
                    { label: 'Tab focused', check: resumeConditions.tabFocused },
                    { label: 'Window active', check: resumeConditions.windowActive },
                  ].map(({ label, check }) => (
                    <div key={label} className="flex items-center gap-2.5 text-xs">
                      {check ? <CheckCircle size={13} className="text-emerald-400" /> : <XCircle size={13} className="text-red-400" />}
                      <span className={check ? 'text-emerald-300' : 'text-slate-400'}>{label}</span>
                    </div>
                  ))}
                </div>
                {!isNoFacePause && (
                  <div className="bg-amber-950/50 border border-amber-800/40 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-amber-400 text-xs font-semibold">Integrity Score</p>
                      <p className="text-amber-400 text-xs font-bold font-mono">{totalCheatingScore} / {CHEATING_THRESHOLD}</p>
                    </div>
                    <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${totalCheatingScore >= CHEATING_THRESHOLD * 0.7 ? 'bg-red-500' :
                        totalCheatingScore >= CHEATING_THRESHOLD * 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} style={{ width: `${Math.min(100, (totalCheatingScore / CHEATING_THRESHOLD) * 100)}%` }} />
                    </div>
                  </div>
                )}
                <button onClick={handleReturnToFullscreen}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2.5">
                  <Monitor size={16} /> Return to Fullscreen &amp; Resume
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Termination overlay ─────────────────────── */}
      <AnimatePresence>
        {proctoringViolation && (
          <motion.div key="violation-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full mx-4 rounded-2xl p-8 border bg-red-950 border-red-500/50 shadow-2xl text-center">
              <div className="h-16 w-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="text-red-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-red-400 mb-3">Session Terminated</h2>
              <p className="text-slate-300 text-sm mb-2">
                This interview has been <strong className="text-red-400">automatically terminated</strong> due to integrity violations.
              </p>
              <div className="flex items-center justify-center gap-2 my-3">
                <span className="text-3xl font-black text-red-400">{totalCheatingScore}</span>
                <span className="text-slate-500 text-sm">/ {CHEATING_THRESHOLD} pts</span>
              </div>
              <p className="text-slate-500 text-xs mt-3">Your session data has been submitted to the hiring team.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Proctoring toast notifications ────────────── */}
      <ProctoringToastContainer toasts={proctoringToasts} onDismiss={dismissToast} />

      <ConfirmDialog
        open={showEndInterviewConfirm}
        title="End Interview?"
        message="Are you sure you want to end the interview now? This will submit your session and cannot be resumed."
        confirmLabel={isEndingInterview ? 'Ending...' : 'Yes, end interview'}
        cancelLabel="Cancel"
        variant="danger"
        onCancel={() => {
          if (isEndingInterview) return;
          setShowEndInterviewConfirm(false);
        }}
        onConfirm={handleConfirmEndInterview}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 4: SUMMARY SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

// ── Screenshot lightbox ───────────────────────────────────────────────────────
function ScreenshotLightbox({ src, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-5xl w-full mx-4" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-slate-400 hover:text-white text-sm font-medium flex items-center gap-1"
        >
          <XCircle size={18} /> Close
        </button>
        <img
          src={src}
          alt="Violation screenshot"
          className="w-full rounded-xl border border-slate-600/60 shadow-2xl"
        />
      </div>
    </div>
  );
}

// ── Screenshot row expander ───────────────────────────────────────────────────
function ScreenshotRow({ screenshots }) {
  const [expanded, setExpanded] = React.useState(false);
  const [lightboxSrc, setLightboxSrc] = React.useState(null);
  if (!screenshots || screenshots.length === 0) return null;
  return (
    <>
      <tr>
        <td colSpan={3} className="pb-3 pt-1">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-sky-400 hover:text-sky-300 transition-colors"
          >
            <Camera size={11} />
            {expanded ? 'Hide' : 'Show'} {screenshots.length} screenshot{screenshots.length > 1 ? 's' : ''}
          </button>
          {expanded && (
            <div className="mt-2 flex flex-wrap gap-2">
              {screenshots.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxSrc(src)}
                  className="relative group rounded-lg overflow-hidden border border-slate-600/60 hover:border-sky-500/60 transition-colors focus:outline-none"
                  title={`Screenshot ${i + 1}`}
                >
                  <img
                    src={src}
                    alt={`Screenshot ${i + 1}`}
                    className="h-20 w-auto object-cover block"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Monitor size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="absolute bottom-1 right-1.5 text-[9px] font-bold text-white/70">#{i + 1}</span>
                </button>
              ))}
            </div>
          )}
        </td>
      </tr>
      {lightboxSrc && <ScreenshotLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}

function SummaryScreen({ jobTitle }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <motion.div variants={slideUp} initial="hidden" animate="visible"
        className="w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-7 py-5 border-b border-slate-700/60 bg-slate-800/60">
          <Award className="text-emerald-400 flex-shrink-0" size={26} />
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Interview Complete</h2>
            <p className="text-xs text-slate-400 mt-0.5">{jobTitle} — AI Interview Session</p>
          </div>
        </div>

        <div className="px-7 py-8 space-y-6 text-center">
          {/* Success icon */}
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="text-emerald-400" size={40} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Thank You for Completing Your Interview</h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
              Your interview session has been securely submitted and will be reviewed by the employer. 
              You will be notified about the next steps in due course.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
            <p className="text-xs text-slate-500">
              All session data including your responses, audio, and video has been encrypted and securely stored.
              The hiring team will review your performance and proctoring report.
            </p>
          </div>

          <button onClick={() => { try { window.close(); } catch { } window.location.href = '/'; }}
            className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors">
            Return to Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ERROR SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <motion.div variants={slideUp} initial="hidden" animate="visible"
        className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
        <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
          <XCircle className="text-red-400" size={26} />
        </div>
        <h2 className="text-xl font-bold text-red-400 mb-3">Interview Session Cancelled</h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-3">{message}</p>
        <p className="text-xs text-slate-500 mb-8">All proctoring permissions are mandatory. Contact the hiring team if you believe this is an error.</p>
        <a href="/" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl border border-slate-700/60">
          Return to Dashboard
        </a>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOT — STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════════

export default function InterviewProctoring() {
  const { applicationId } = useParams();
  const location = useLocation();
  const jobTitle = location.state?.jobTitle || 'Software Engineer';

  const [phase, setPhase] = useState(PHASE.TERMS);
  const [errorMessage, setErrorMessage] = useState('');
  const [streams, setStreams] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryCheatReport, setSummaryCheatReport] = useState([]);
  const [summaryCheatScore, setSummaryCheatScore] = useState(0);
  const [summaryScreenshots, setSummaryScreenshots] = useState({});
  const [summaryVoiceMismatches, setSummaryVoiceMismatches] = useState(0);

  const handleAcceptTerms = useCallback(async () => {
    try {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (req) await req.call(el);
    } catch { }
    setPhase(PHASE.PERMISSIONS);
  }, []);

  const handlePermissionsGranted = useCallback((grantedStreams) => {
    setStreams(grantedStreams);
    setPhase(PHASE.INTERVIEW);
  }, []);

  const handlePermissionsDenied = useCallback((msg) => {
    setErrorMessage(msg);
    setPhase(PHASE.ERROR);
  }, []);

  const handleInterviewComplete = useCallback((summary, cheatingReport = [], totalCheatingScore = 0, screenshotCaptures = {}, voiceMismatches = 0) => {
    try {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch { }
    setSummaryData(summary);
    setSummaryCheatReport(cheatingReport);
    setSummaryCheatScore(totalCheatingScore);
    setSummaryScreenshots(screenshotCaptures);
    setSummaryVoiceMismatches(voiceMismatches);
    setPhase(PHASE.SUMMARY);
  }, []);

  return (
    <div className="bg-slate-950 min-h-screen">
      <AnimatePresence mode="wait">
        {phase === PHASE.TERMS && (
          <motion.div key="terms" variants={fadeIn} initial="hidden" animate="visible" exit="hidden">
            <TermsModal onAccept={handleAcceptTerms} />
          </motion.div>
        )}
        {phase === PHASE.PERMISSIONS && (
          <motion.div key="permissions" variants={fadeIn} initial="hidden" animate="visible" exit="hidden">
            <PermissionsScreen onGranted={handlePermissionsGranted} onDenied={handlePermissionsDenied} />
          </motion.div>
        )}
        {phase === PHASE.INTERVIEW && streams && (
          <motion.div key="interview" variants={fadeIn} initial="hidden" animate="visible" exit="hidden">
            <InterviewInterface streams={streams} applicationId={applicationId} onComplete={handleInterviewComplete} />
          </motion.div>
        )}
        {phase === PHASE.SUMMARY && (
          <motion.div key="summary" variants={fadeIn} initial="hidden" animate="visible" exit="hidden">
            <SummaryScreen
              jobTitle={jobTitle}
              summary={summaryData}
              cheatingReport={summaryCheatReport}
              totalCheatingScore={summaryCheatScore}
              screenshotCaptures={summaryScreenshots}
              localVoiceMismatches={summaryVoiceMismatches}
            />
          </motion.div>
        )}
        {phase === PHASE.ERROR && (
          <motion.div key="error" variants={fadeIn} initial="hidden" animate="visible" exit="hidden">
            <ErrorScreen message={errorMessage} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
