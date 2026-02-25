/**
 * InterviewProctoring.jsx
 * AI-Led Interview Proctoring Interface â€” v2
 *
 * Key improvements over v1:
 *  1. Time-based interview (20-30 min target, no fixed question count)
 *  2. Real-time speech-to-text shown character-by-character as candidate speaks
 *  3. LLM adopts persona of a senior expert hiring for the specific role
 *  4. Adaptive follow-up: deep-dives when answer is strong, pivots topics otherwise
 *  5. Parallel evaluation + question generation â€“ zero idle gap between turns
 *  6. Graceful wrap-up at time limit with session summary screen
 *
 * State Machine:  TERMS  â†’  PERMISSIONS  â†’  INTERVIEW  â†’  SUMMARY  |  ERROR
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../lib/api";
import {
  Shield,
  AlertTriangle,
  Camera,
  Mic,
  Monitor,
  CheckCircle,
  XCircle,
  Circle,
  Loader2,
  Volume2,
  Radio,
  Clock,
  TrendingUp,
  MessageSquare,
  Award,
} from "lucide-react";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Constants
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PHASE = {
  TERMS: "TERMS",
  PERMISSIONS: "PERMISSIONS",
  INTERVIEW: "INTERVIEW",
  SUMMARY: "SUMMARY",
  ERROR: "ERROR",
};

/** Interview duration window (seconds) */
const INTERVIEW_MIN_SECONDS = 20 * 60; // 20 min
const INTERVIEW_MAX_SECONDS = 30 * 60; // 30 min

const TERMS = [
  {
    id: 1,
    title: "Recording Consent",
    body: "By proceeding you give IntelliHire irrevocable consent to record your audio, video, and screen activity for the entire duration of this interview session. Recordings are stored securely and used solely for evaluation purposes.",
  },
  {
    id: 2,
    title: "Audio & Video Capture",
    body: "Your microphone and camera must remain active at all times. The system will continuously capture audio and video. Disabling either device mid-session will immediately terminate the interview and may be flagged as a violation.",
  },  {
    id: 3,
    title: "Screen Recording",
    body: "Your full screen (or the selected window) will be recorded. Switching tabs, minimising the browser, or opening unauthorised applications is prohibited and will be logged as suspicious behaviour.",
  },
  {
    id: 4,
    title: "Eye-Contact & Gaze Tracking",
    body: "AI-powered gaze analysis is active throughout. You are required to maintain eye contact with the screen at all times. Looking away from the screen for extended periods will be flagged and may affect your evaluation score.",
  },
  {
    id: 5,
    title: "Single Occupancy Rule",
    body: "You must be alone in the room. Background movement detection is active. The presence of another person, voice, or significant background activity will be detected and logged as a potential integrity violation.",
  },
  {
    id: 6,
    title: "Communication Standards",
    body: "Responses must be delivered verbally in clear English only. No external assistance, written notes, secondary devices, or AI-generated prompts are permitted. The use of any such aids constitutes academic fraud.",
  },
  {
    id: 7,
    title: "Data & Privacy",
    body: "Session data is encrypted in transit and at rest. Access is restricted to authorised IntelliHire evaluators only. Data is retained for 90 days post-session in compliance with applicable data-protection regulations.",
  },
  {
    id: 8,
    title: "Termination & Disqualification",
    body: "Repeated integrity violations will result in automatic session termination and permanent disqualification from this recruitment cycle. IntelliHire reserves the right to share findings with the hiring organisation.",
  },
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Groq API helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Build a senior-expert interviewer persona from the job title.
 * e.g. "Python Developer" â†’ "a Senior Python Developer with 12+ years of industry
 * experience, currently leading engineering hiring at a top-tier tech company"
 */
function buildInterviewerPersona(jobTitle = "") {
  const title = jobTitle.trim() || "Software Engineer";
  const seniorityKeywords = /senior|lead|principal|staff|head|chief|director/i;
  const hasSeniority = seniorityKeywords.test(title);
  const baseLine = hasSeniority
    ? `You are a ${title} with 15+ years of hands-on industry experience`
    : `You are a Senior ${title} with 12+ years of hands-on industry experience`;
  return (
    `${baseLine}, now serving as the lead technical interviewer at a top-tier tech company. ` +
    `You are rigorous, insightful, and know exactly what separates great ${title}s from average ones. ` +
    `You have personally hired dozens of ${title}s and understand every trick candidates use to bluff. ` +
    `Your interview style is conversational yet precise â€” you push deeper when you spot interesting signals, ` +
    `change topics when an answer is weak, and always keep the overall picture of the candidate in mind.`
  );
}

/**
 * Determine interview phase based on elapsed time.
 * Used to steer the LLM toward opening / body / closing questions.
 */
function getInterviewPhaseHint(elapsedSeconds) {
  if (elapsedSeconds < 5 * 60) {
    return "OPENING: You have just started. Warm up the candidate with a brief welcome and an introduction question.";
  }
  if (elapsedSeconds < INTERVIEW_MIN_SECONDS) {
    return `MAIN BODY: ${Math.round((INTERVIEW_MIN_SECONDS - elapsedSeconds) / 60)} minutes remain in the core session. Probe deeply and vary topics â€” technical, behavioural, situational.`;
  }
  if (elapsedSeconds < INTERVIEW_MAX_SECONDS) {
    return `CLOSING: Interview is in the final window. Ask 1-2 high-level, motivational, or culture-fit questions before wrapping up.`;
  }
  return "WRAP_UP: Time is up. Give a brief warm closing statement and end the session.";
}

/**
 * generateQuestionFromGroq
 * Persona-driven, time-aware, adaptive question generation.
 *
 * @param {Array<{role,content}>}  conversationHistory
 * @param {string}                 jobTitle
 * @param {{ jobDescription?, requirements?, candidateInfo? }} context
 * @param {number}                 elapsedSeconds
 * @param {{ score?, feedback? }|null} lastEval  â€“ evaluation of the previous answer
 * @returns {Promise<string>}
 */
async function generateQuestionFromGroq(
  conversationHistory = [],
  jobTitle = "Software Engineer",
  context = {},
  elapsedSeconds = 0,
  lastEval = null
) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const persona = buildInterviewerPersona(jobTitle);
  const phaseHint = getInterviewPhaseHint(elapsedSeconds);

  let systemPrompt = `${persona}\n\n`;
  if (context.jobDescription) systemPrompt += `## Job Description\n${context.jobDescription}\n\n`;
  if (context.requirements?.length > 0)
    systemPrompt += `## Key Requirements\n${context.requirements.map((r) => `- ${r}`).join("\n")}\n\n`;
  if (context.candidateInfo) systemPrompt += `## Candidate Background\n${context.candidateInfo}\n\n`;
  systemPrompt += `## Interview Phase\n${phaseHint}\n\n`;

  if (lastEval?.score !== null && lastEval?.score !== undefined) {
    if (lastEval.score >= 7) {
      systemPrompt += `The candidate's last answer was strong (score ${lastEval.score}/10: "${lastEval.feedback}"). ` +
        `Consider going DEEPER on the same topic or exploring an advanced edge case.\n\n`;
    } else if (lastEval.score <= 4) {
      systemPrompt += `The candidate's last answer was weak (score ${lastEval.score}/10: "${lastEval.feedback}"). ` +
        `PIVOT to a completely different topic to give them a fresh chance.\n\n`;
    } else {
      systemPrompt += `The last answer was average (score ${lastEval.score}/10). Continue naturally to the next relevant topic.\n\n`;
    }
  }

  const questionCount = conversationHistory.filter((m) => m.role === "assistant").length;
  const unansweredCount = conversationHistory.filter(
    (m) => m.role === "user" && m.content.startsWith("(no response")
  ).length;

  if (questionCount === 0) {
    systemPrompt += `This is the FIRST question. Welcome the candidate briefly (one sentence) and ask them to introduce ` +
      `themselves and describe their most relevant experience for this ${jobTitle} role.`;
  } else {
    systemPrompt +=
      `## Cross-Examination Strategy\n` +
      `You MUST actively reference specifics from the candidate's resume (projects, technologies, past roles, achievements) ` +
      `when formulating questions. Cross-examine their claims -- if they mentioned a project or technology in their resume ` +
      `or an earlier answer, dig deeper: ask HOW they implemented it, what technical challenges they faced, ` +
      `what tradeoffs they made, and what they would do differently now. If an earlier answer was vague or unconvincing, ` +
      `challenge it directly with a targeted follow-up.\n\n` +
      `## When to End the Interview\n` +
      `You have asked ${questionCount} question(s) so far. The candidate has left ${unansweredCount} question(s) unanswered. ` +
      `You MAY decide to end the interview when BOTH conditions are true: ` +
      `(a) you have asked at least 8 questions, AND ` +
      `(b) you feel confident in your overall assessment -- ` +
      `whether positive (thoroughly impressed) or negative (consistently poor or evasive answers). ` +
      `To signal that the interview should end, output ONLY this exact token on its own: [END_INTERVIEW]\n\n` +
      `Otherwise, ask the NEXT interview question. Output ONLY the question -- ` +
      `no preamble, no "Great answer", no pleasantries, no numbering. One concise, focused question.`;
  }

  // Fallback questions when no API key is configured
  if (!apiKey) {
    const fallbacks = [
      `Tell me about yourself and your most relevant experience as a ${jobTitle}.`,
      "Describe the most technically challenging problem you've solved and walk me through your approach.",
      "How do you stay current with developments in your field?",
      "Give me an example of a time you disagreed with a technical decision and how you handled it.",
      "What does good code / great work look like to you?",
      "How do you approach debugging or solving a problem you've never seen before?",
      "Tell me about a project you're most proud of and why.",
      "Where do you see your career in three years?",
    ];
    return fallbacks[Math.min(questionCount, fallbacks.length - 1)];
  }

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...conversationHistory],
        max_tokens: 220,
        temperature: 0.75,
      }),
    });
    if (!res.ok) throw new Error(`Groq API ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "Tell me more about your most recent project.";
  } catch (err) {
    console.error("[Groq] Question generation failed:", err);
    return "Could you expand on your background and what draws you to this role?";
  }
}

/**
 * evaluateAnswerWithGroq
 * Rapid evaluation â€” runs in parallel with question generation.
 * Returns { score: 1-10, feedback: string, topics: string[] }
 */
async function evaluateAnswerWithGroq(question, answer, jobTitle = "") {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || !answer || answer.startsWith("(no response")) return { score: null, feedback: null, topics: [] };
  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              `You are a strict technical interviewer evaluating a candidate for a ${jobTitle} role. ` +
              `Evaluate the answer. Respond ONLY with a JSON object â€” no markdown, no extra text:\n` +
              `{ "score": <1-10>, "feedback": "<one sentence>", "topics": ["<topic covered>"] }`,
          },
          { role: "user", content: `Question: ${question}\n\nAnswer: ${answer}` },
        ],
        max_tokens: 160,
        temperature: 0.2,
      }),
    });
    if (!res.ok) return { score: null, feedback: null, topics: [] };
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content?.trim() ?? "{}");
    return { score: parsed.score ?? null, feedback: parsed.feedback ?? null, topics: parsed.topics ?? [] };
  } catch {
    return { score: null, feedback: null, topics: [] };
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  TTS â€” speaks text, returns a Promise that resolves when speech ends
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function handleSpeak(text, onStart, onEnd) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      onStart?.();
      setTimeout(() => { onEnd?.(); resolve(); }, 2000);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => onStart?.();
    utterance.onend = () => { onEnd?.(); resolve(); };
    utterance.onerror = () => { onEnd?.(); resolve(); };
    window.speechSynthesis.speak(utterance);
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  STT â€” real-time interim + final transcription
//  Uses continuous mode + interimResults so text appears as the user speaks.
//  Returns a stop() function.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function startListeningRealtime(stream, onInterim, onFinal, onError) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    onError?.(new Error("SpeechRecognition not supported"));
    return () => { };
  }

  let stopped = false;
  let finalText = "";
  let retryCount = 0;
  const MAX_RETRIES = 5;
  const INITIAL_WAIT_MS = 30000;    // 30s for candidate to BEGIN speaking
  const SILENCE_TIMEOUT_MS = 8000;  // push final if silent for 8s after speech starts
  const HARD_TIMEOUT_MS = 90000;    // absolute cap per answer
  let silenceTimer = null;
  let hardTimer = null;
  let initialWaitTimer = null;
  let speechStarted = false;
  let rec = null;

  const resetSilenceTimer = () => {
    // First speech detected — cancel the 30-second initial-wait countdown
    if (!speechStarted) {
      speechStarted = true;
      clearTimeout(initialWaitTimer);
      initialWaitTimer = null;
    }
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      if (!stopped) {
        stopped = true;
        try { rec?.stop(); } catch { }
        clearTimeout(hardTimer);
        onFinal(finalText || "(no response detected)");
      }
    }, SILENCE_TIMEOUT_MS);
  };

  const createRec = () => {
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;   // real-time partial results
    r.maxAlternatives = 1;
    r.continuous = true;       // keep mic open until we stop it

    r.onresult = (e) => {
      resetSilenceTimer();
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      if (final) finalText += final;
      onInterim(finalText + interim);
    };

    r.onerror = (e) => {
      if (!stopped && (e.error === "no-speech" || e.error === "aborted") && retryCount < MAX_RETRIES) {
        retryCount++;
        try { rec = createRec(); rec.start(); } catch { }
        return;
      }
      if (!stopped) {
        stopped = true;
        clearTimeout(silenceTimer);
        clearTimeout(hardTimer);
        onFinal(finalText || "(no response detected)");
      }
    };

    r.onend = () => {
      if (!stopped && retryCount < MAX_RETRIES) {
        retryCount++;
        try { rec = createRec(); rec.start(); } catch { }
      } else if (!stopped) {
        stopped = true;
        clearTimeout(silenceTimer);
        clearTimeout(hardTimer);
        onFinal(finalText || "(no response detected)");
      }
    };

    return r;
  };

  rec = createRec();
  rec.start();

  // 30-second initial wait — if the candidate hasn't spoken a single word, mark as unanswered
  initialWaitTimer = setTimeout(() => {
    if (!stopped && !speechStarted) {
      stopped = true;
      clearTimeout(hardTimer);
      try { rec?.stop(); } catch { }
      onFinal("(no response - timed out)");
    }
  }, INITIAL_WAIT_MS);

  hardTimer = setTimeout(() => {
    if (!stopped) {
      stopped = true;
      clearTimeout(silenceTimer);
      clearTimeout(initialWaitTimer);
      try { rec?.stop(); } catch { }
      onFinal(finalText || "(no response â€” timed out)");
    }
  }, HARD_TIMEOUT_MS);

  return () => {
    stopped = true;
    clearTimeout(silenceTimer);
    clearTimeout(hardTimer);
    clearTimeout(initialWaitTimer);
    try { rec?.stop(); } catch { }
    if (finalText) onFinal(finalText);
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Animation variants
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4 } } };
const slideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Reusable micro-components
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Animated pulsing dot indicating a live recording status */
function RecDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
    </span>
  );
}

/** Audio waveform visualiser drawn on a canvas */
function WaveformVisualiser({ analyser }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(99,202,183,0.85)";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={48}
      className="w-full h-12 block"
    />
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  PHASE 1 â€“ Terms Modal
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TermsModal({ onAccept }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setScrolledToBottom(true);
    }
  };

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-7 py-5 border-b border-slate-700/60 bg-slate-800/60">
          <Shield className="text-emerald-400 flex-shrink-0" size={26} />
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Candidate Integrity Agreement
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Read all terms carefully before proceeding.
            </p>
          </div>
        </div>

        {/* Scrollable terms */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-auto max-h-[52vh] px-7 py-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900"
        >
          {/* Key rules summary */}
          <div className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/50">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">
              Key Requirements
            </p>
            <ul className="space-y-2">
              {[
                { icon: "ðŸŽ™ï¸", text: "Audio, Video & Screen will be recorded continuously." },
                { icon: "ðŸ‘ï¸", text: "Eye-contact tracking is active â€” look at the screen only." },
                { icon: "ðŸ§", text: "Only you may be present â€” background movement is monitored." },
                { icon: "ðŸ”Š", text: "Respond in clear spoken English only." },
                { icon: "â±ï¸", text: "Interview duration: 20â€“30 minutes of adaptive questions." },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-base leading-5 flex-shrink-0">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Full terms */}
          {TERMS.map((term, idx) => (
            <div key={term.id}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                {idx + 1}. {term.title}
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">{term.body}</p>
              {idx < TERMS.length - 1 && (
                <div className="mt-5 border-b border-slate-700/40" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-slate-700/60 bg-slate-800/40 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-500 cursor-pointer"
              disabled={!scrolledToBottom}
            />
            <span className="text-sm text-slate-300">
              I have read and agree to the{" "}
              <span className="text-emerald-400 font-medium">
                Candidate Integrity Agreement
              </span>{" "}
              in full. I understand that violations will affect my evaluation and that this interview will run for 20â€“30 minutes.
            </span>
          </label>

          {!scrolledToBottom && (
            <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
              <AlertTriangle size={13} />
              Scroll to the bottom of the agreement to enable acceptance.
            </p>
          )}

          <button
            onClick={onAccept}
            disabled={!checked || !scrolledToBottom}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Accept &amp; Start Interview (20â€“30 min)
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  PHASE 2 â€“ Permissions Screen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PERM_STEPS = [
  { id: "camera", label: "Camera & Microphone", icon: Camera, description: "Required to capture your interview feed and voice responses throughout the session." },
  { id: "screen", label: "Screen Recording", icon: Monitor, description: "Required to ensure no unauthorised resources are used during the 20â€“30 min session." },
];

function PermissionsScreen({ onGranted, onDenied }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stepStatus, setStepStatus] = useState({ camera: "idle", screen: "idle" });
  const streamsRef = useRef({ camera: null, screen: null });

  const requestPermissions = useCallback(async () => {
    // â”€â”€ Step 1: Camera + Mic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    setStepStatus((s) => ({ ...s, camera: "requesting" }));
    let cameraStream;
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      streamsRef.current.camera = cameraStream;
      setStepStatus((s) => ({ ...s, camera: "granted" }));
      setStepIndex(1);
    } catch {
      setStepStatus((s) => ({ ...s, camera: "denied" }));
      onDenied("Camera & Microphone permission was denied. Please allow access and refresh the page.");
      return;
    }

    // â”€â”€ Step 2: Screen Share â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    setStepStatus((s) => ({ ...s, screen: "requesting" }));
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });
      streamsRef.current.screen = screenStream;
      setStepStatus((s) => ({ ...s, screen: "granted" }));

      // Brief delay so the user sees "Granted" before transition
      setTimeout(() => onGranted(streamsRef.current), 600);
    } catch {
      cameraStream.getTracks().forEach((t) => t.stop());
      setStepStatus((s) => ({ ...s, screen: "denied" }));
      onDenied("Screen Recording permission was denied. This permission is mandatory. Please allow access and refresh the page.");
    }
  }, [onGranted, onDenied]);

  useEffect(() => {
    requestPermissions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const iconForStatus = (status) => {
    if (status === "granted") return <CheckCircle className="text-emerald-400" size={22} />;
    if (status === "denied") return <XCircle className="text-red-400" size={22} />;
    if (status === "requesting") return <Loader2 className="text-sky-400 animate-spin" size={22} />;
    return <Circle className="text-slate-600" size={22} />;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-14 w-14 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mb-4">
            <Shield className="text-sky-400" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Requesting Permissions
          </h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            IntelliHire requires the following permissions to commence proctoring.
            Please approve each browser prompt.
          </p>
        </div>

        <div className="space-y-4">
          {PERM_STEPS.map((step, idx) => {
            const status = stepStatus[step.id];
            const isActive = idx === stepIndex && (status === "idle" || status === "requesting");
            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors duration-300 ${isActive
                  ? "border-sky-500/40 bg-sky-500/5"
                  : status === "granted"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : status === "denied"
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-slate-700/50 bg-slate-800/40"
                  }`}
              >
                <div className="mt-0.5">{iconForStatus(status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{step.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                  {status === "requesting" && (
                    <p className="text-xs text-sky-400 mt-1 font-medium animate-pulse">
                      Waiting for browser approvalâ€¦
                    </p>
                  )}
                  {status === "granted" && (
                    <p className="text-xs text-emerald-400 mt-1 font-medium">
                      Permission granted âœ“
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  PHASE 3 â€“ Interview Interface
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AI_VOICE_STATUS = {
  IDLE: "IDLE",
  SPEAKING: "SPEAKING",
  LISTENING: "LISTENING",
  PROCESSING: "PROCESSING",
  WRAPPING_UP: "WRAPPING_UP",
};

function InterviewInterface({ streams, jobTitle = "Software Engineer", applicationId, onComplete }) {
  const { camera: cameraStream } = streams;

  // â”€â”€ Refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const stopListeningRef = useRef(null);
  const askNextQuestionRef = useRef(null);
  const questionCounterRef = useRef(0);
  const interviewContextRef = useRef({});
  const lastEvalRef = useRef(null);
  const elapsedRef = useRef(0);
  const wrappingUpRef = useRef(false);
  /** Tracks how many questions in a row the candidate has not answered */
  const consecutiveSilentRef = useRef(0);
  /** Total unanswered/skipped questions this session */
  const totalUnansweredRef = useRef(0);

  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [aiStatus, setAiStatus] = useState(AI_VOICE_STATUS.IDLE);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  /** Interim transcript shown in real-time as user speaks */
  const [liveTranscript, setLiveTranscript] = useState("");
  /** Final confirmed transcript of the last answer */
  const [finalTranscript, setFinalTranscript] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analyser, setAnalyser] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [timeWarning, setTimeWarning] = useState(false);

  // â”€â”€ Fetch application context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!applicationId) return;
    (async () => {
      try {
        const res = await api.get(`/job-applications/${applicationId}`);
        const app = res.data?.data;
        if (!app) return;
        const ctx = {};
        if (app.jobId) {
          ctx.jobDescription = app.jobId.description || "";
          ctx.requirements = app.jobId.requirements || app.jobId.skills || [];
        }
        const profile = app.applicationProfile?.personalInfo;
        const resumeSummary = app.applicationProfile?.summary || app.resume?.extractedText || "";
        if (profile || resumeSummary) {
          let info = "";
          if (profile?.name) info += `Name: ${profile.name}\n`;
          if (profile?.email) info += `Email: ${profile.email}\n`;
          if (profile?.location) info += `Location: ${profile.location}\n`;
          if (resumeSummary) info += `Resume Summary: ${resumeSummary.slice(0, 2000)}`;
          ctx.candidateInfo = info;
        }
        interviewContextRef.current = ctx;
        console.info("[Interview] Context loaded:", Object.keys(ctx));
      } catch (err) {
        console.warn("[Interview] Context fetch failed:", err.message);
      }
    })();
  }, [applicationId]);

  // â”€â”€ Attach camera â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (videoRef.current && cameraStream) videoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  // â”€â”€ Audio analyser (waveform) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!cameraStream) return;
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(cameraStream);
    const analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 512;
    source.connect(analyserNode);
    audioCtxRef.current = audioCtx;
    analyserRef.current = analyserNode;
    setAnalyser(analyserNode);
    return () => audioCtx.close();
  }, [cameraStream]);

  // â”€â”€ Session timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSeconds((s) => {
        const next = s + 1;
        elapsedRef.current = next;
        if (next === INTERVIEW_MIN_SECONDS - 5 * 60) setTimeWarning(true);
        if (next >= INTERVIEW_MAX_SECONDS && !wrappingUpRef.current) {
          wrappingUpRef.current = true;
          setAiStatus(AI_VOICE_STATUS.WRAPPING_UP);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // â”€â”€ MediaRecorder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!cameraStream) return;
    try {
      const recorder = new MediaRecorder(cameraStream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm",
      });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("MediaRecorder init error:", err);
    }
    return () => {
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    };
  }, [cameraStream]);

  // â”€â”€ Formatted timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const formattedTime = useMemo(() => {
    const m = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
    const s = (elapsedSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [elapsedSeconds]);

  const progressPct = useMemo(
    () => Math.min(100, Math.round((elapsedSeconds / INTERVIEW_MAX_SECONDS) * 100)),
    [elapsedSeconds]
  );

  const avgScore = useMemo(() => {
    const scored = evaluations.filter((e) => e.score !== null);
    if (!scored.length) return null;
    return Math.round((scored.reduce((acc, e) => acc + e.score, 0) / scored.length) * 10) / 10;
  }, [evaluations]);

  // â”€â”€ Core interview loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const askNextQuestion = useCallback(
    async (history) => {
      if (wrappingUpRef.current) {
        setAiStatus(AI_VOICE_STATUS.WRAPPING_UP);
        const closingLine =
          "That brings us to the end of our session. Thank you so much for your time today â€” we'll be in touch soon with next steps. Take care!";
        await handleSpeak(closingLine, () => setAiStatus(AI_VOICE_STATUS.WRAPPING_UP), () => { });
        setTimeout(() => onComplete?.(history, evaluations), 1500);
        return;
      }

      setAiStatus(AI_VOICE_STATUS.PROCESSING);
      setLiveTranscript("");
      setFinalTranscript("");

      try {
        const question = await generateQuestionFromGroq(
          history,
          jobTitle,
          interviewContextRef.current,
          elapsedRef.current,
          lastEvalRef.current
        );

        // LLM-triggered interview termination
        if (question.trim() === "[END_INTERVIEW]" || question.includes("[END_INTERVIEW]")) {
          if (!wrappingUpRef.current) {
            wrappingUpRef.current = true;
            setAiStatus(AI_VOICE_STATUS.WRAPPING_UP);
            const closingLine =
              "I have gathered enough information to make a thorough assessment. " +
              "That concludes our interview session. Thank you so much for your time today. " +
              "We will be in touch soon with the next steps. Take care!";
            await handleSpeak(closingLine, () => setAiStatus(AI_VOICE_STATUS.WRAPPING_UP), () => {});
            setTimeout(() => onComplete?.(history, evaluations), 1500);
          }
          return;
        }

        questionCounterRef.current += 1;
        setCurrentQuestion(question);
        setQuestionIndex(questionCounterRef.current);

        await handleSpeak(
          question,
          () => setAiStatus(AI_VOICE_STATUS.SPEAKING),
          () => setAiStatus(AI_VOICE_STATUS.LISTENING)
        );

        if (wrappingUpRef.current) return;

        setAiStatus(AI_VOICE_STATUS.LISTENING);
        setLiveTranscript("");

        stopListeningRef.current?.();
        stopListeningRef.current = startListeningRealtime(
          cameraStream,
          (interim) => setLiveTranscript(interim),
          async (finalText) => {
            stopListeningRef.current = null;
            setFinalTranscript(finalText);
            setLiveTranscript("");
            setAiStatus(AI_VOICE_STATUS.PROCESSING);

            const isUnanswered = finalText.startsWith("(no response");

            if (isUnanswered) {
              consecutiveSilentRef.current += 1;
              totalUnansweredRef.current += 1;
              console.warn(
                `[Interview] No response -- consecutive: ${consecutiveSilentRef.current}, total: ${totalUnansweredRef.current}`
              );
              setEvaluations((prev) => [
                ...prev,
                {
                  score: 0,
                  feedback: "No response given -- question was skipped.",
                  topics: [],
                  question,
                  answer: finalText,
                  unanswered: true,
                },
              ]);
            } else {
              consecutiveSilentRef.current = 0;
            }

            const updatedHistory = [
              ...history,
              { role: "assistant", content: question },
              { role: "user", content: finalText },
            ];
            setConversationHistory(updatedHistory);

            // Auto-terminate after 3 consecutive silent questions
            if (consecutiveSilentRef.current >= 3) {
              if (!wrappingUpRef.current) {
                wrappingUpRef.current = true;
                setAiStatus(AI_VOICE_STATUS.WRAPPING_UP);
                const terminationLine =
                  "I notice you have not been able to respond to the last few questions. " +
                  "I will need to conclude our session here. " +
                  "Thank you for your time today. We will be in touch with our findings shortly.";
                await handleSpeak(terminationLine, () => setAiStatus(AI_VOICE_STATUS.WRAPPING_UP), () => {});
                setTimeout(() => onComplete?.(updatedHistory, evaluations), 1500);
              }
              return;
            }

            // Evaluate in parallel -- don't block next question on it
            if (!isUnanswered) {
              evaluateAnswerWithGroq(question, finalText, jobTitle).then((evalResult) => {
                lastEvalRef.current = evalResult;
                if (evalResult.score !== null) {
                  console.info(`[Eval] Q${questionCounterRef.current} | Score: ${evalResult.score}/10 | ${evalResult.feedback}`);
                  setEvaluations((prev) => [...prev, { ...evalResult, question, answer: finalText }]);
                }
              });
            } else {
              lastEvalRef.current = { score: 0, feedback: "No response -- question was skipped.", topics: [] };
            }

            await new Promise((r) => setTimeout(r, 1200));
            askNextQuestionRef.current?.(updatedHistory);
          },
          (err) => {
            console.warn("[STT] Error:", err);
            consecutiveSilentRef.current += 1;
            totalUnansweredRef.current += 1;
            const updatedHistory = [
              ...history,
              { role: "assistant", content: question },
              { role: "user", content: "(no response detected)" },
            ];
            setConversationHistory(updatedHistory);
            setEvaluations((prev) => [
              ...prev,
              {
                score: 0,
                feedback: "No response given -- question was skipped.",
                topics: [],
                question,
                answer: "(no response detected)",
                unanswered: true,
              },
            ]);
            if (consecutiveSilentRef.current >= 3 && !wrappingUpRef.current) {
              wrappingUpRef.current = true;
              setAiStatus(AI_VOICE_STATUS.WRAPPING_UP);
              const terminationLine =
                "I notice you have not been able to respond to the last few questions. " +
                "I will need to conclude our session here. " +
                "Thank you for your time today. We will be in touch with our findings shortly.";
              handleSpeak(terminationLine, () => setAiStatus(AI_VOICE_STATUS.WRAPPING_UP), () => {}).then(() => {
                setTimeout(() => onComplete?.(updatedHistory, evaluations), 1500);
              });
              return;
            }
            setTimeout(() => askNextQuestionRef.current?.(updatedHistory), 2000);
          }
        );
      } catch (err) {
        console.error("[Interview] Question generation error:", err);
        setTimeout(() => askNextQuestionRef.current?.(history), 3000);
      }
    },
    [cameraStream, jobTitle, evaluations, onComplete]
  );

  useEffect(() => { askNextQuestionRef.current = askNextQuestion; }, [askNextQuestion]);

  useEffect(() => {
    console.info(`[Interview] Session started | App: ${applicationId} | Role: ${jobTitle}`);
    const id = setTimeout(() => askNextQuestionRef.current?.([]), 1200);
    return () => {
      clearTimeout(id);
      stopListeningRef.current?.();
      window.speechSynthesis?.cancel();
    };
  }, []); // eslint-disable-line

  // â”€â”€ Status pill config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const statusConfig = useMemo(() => {
    switch (aiStatus) {
      case AI_VOICE_STATUS.SPEAKING:
        return { label: "AI Speakingâ€¦", color: "text-sky-400", dot: "bg-sky-400", icon: Volume2 };
      case AI_VOICE_STATUS.LISTENING:
        return { label: "Listeningâ€¦", color: "text-emerald-400", dot: "bg-emerald-400", icon: Mic };
      case AI_VOICE_STATUS.PROCESSING:
        return { label: "Processingâ€¦", color: "text-amber-400", dot: "bg-amber-400", icon: Loader2 };
      case AI_VOICE_STATUS.WRAPPING_UP:
        return { label: "Wrapping upâ€¦", color: "text-purple-400", dot: "bg-purple-400", icon: Clock };
      default:
        return { label: "Idle", color: "text-slate-500", dot: "bg-slate-600", icon: Circle };
    }
  }, [aiStatus]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">

      {/* â”€â”€ Top Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900/80 border-b border-slate-800/60 backdrop-blur-md z-20">
        <div className="flex items-center gap-2.5">
          <Shield className="text-emerald-400" size={20} />
          <span className="font-bold text-sm tracking-tight text-white">
            IntelliHire <span className="text-slate-400 font-normal">/ AI Interview</span>
          </span>
          <span className="ml-2 text-xs text-slate-500 border border-slate-700 rounded-full px-2 py-0.5">
            {jobTitle}
          </span>
        </div>

        <div className="flex items-center gap-5">
          {/* Status pill */}
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700/50 ${statusConfig.color}`}>
            {aiStatus === AI_VOICE_STATUS.PROCESSING || aiStatus === AI_VOICE_STATUS.WRAPPING_UP
              ? <Loader2 size={12} className="animate-spin" />
              : <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />}
            {statusConfig.label}
          </div>

          {/* Live running score */}
          {avgScore !== null && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700/50 rounded-full px-3 py-1.5">
              <TrendingUp size={12} className="text-emerald-400" />
              Avg {avgScore}/10
            </div>
          )}

          {/* Timer */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Radio size={12} className="text-slate-500" />
            {formattedTime}
          </div>

          {isRecording && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
              <RecDot />
              REC
            </div>
          )}
        </div>
      </header>

      {/* â”€â”€ Progress bar (time elapsed / 30 min) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="h-0.5 bg-slate-800">
        <div
          className="h-full bg-emerald-500 transition-all duration-1000"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* â”€â”€ 5-min warning banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {timeWarning && (
          <motion.div
            key="tw"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-amber-900/60 border-b border-amber-700/40 text-amber-300 text-xs font-medium px-6 py-2 flex items-center gap-2"
          >
            <Clock size={13} />
            5 minutes remaining â€” the interview will conclude soon.
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Main Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex-1 flex relative overflow-hidden">

        {/* Centre â€” question + live transcript */}
        <main className="flex-1 flex flex-col items-center justify-center px-10 py-12 lg:pr-[340px]">

          {/* Question counter */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6">
            Question {questionIndex}
            {questionIndex > 0 && (
              <span className="ml-3 text-slate-600 normal-case font-normal">
                Â· {evaluations.length} evaluated
              </span>
            )}
          </p>

          {/* Current question */}
          <AnimatePresence mode="wait">
            {currentQuestion ? (
              <motion.h1
                key={currentQuestion}
                variants={slideUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="text-3xl lg:text-4xl font-bold text-white text-center leading-snug max-w-3xl"
              >
                {currentQuestion}
              </motion.h1>
            ) : (
              <motion.div key="loading" variants={fadeIn} initial="hidden" animate="visible"
                className="flex flex-col items-center gap-3"
              >
                <Loader2 className="text-slate-500 animate-spin" size={36} />
                <p className="text-slate-500 text-sm">Generating your first questionâ€¦</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* â”€â”€ Real-time transcript panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <AnimatePresence>
            {(aiStatus === AI_VOICE_STATUS.LISTENING || liveTranscript || finalTranscript) && (
              <motion.div
                key="transcript-box"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-10 max-w-2xl w-full rounded-2xl overflow-hidden border border-slate-700/40"
              >
                {/* Header row */}
                <div className="flex items-center justify-between px-5 py-2.5 bg-slate-800/80 border-b border-slate-700/40">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    <MessageSquare size={12} />
                    Your Response
                  </div>
                  {aiStatus === AI_VOICE_STATUS.LISTENING && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/60 px-5 py-4 min-h-[64px]">
                  {aiStatus === AI_VOICE_STATUS.LISTENING && liveTranscript ? (
                    <p className="text-slate-200 text-sm leading-relaxed">
                      {liveTranscript}
                      <span className="inline-block w-0.5 h-4 bg-emerald-400 ml-0.5 animate-pulse align-text-bottom" />
                    </p>
                  ) : finalTranscript ? (
                    <p className="text-slate-300 text-sm leading-relaxed italic">
                      "{finalTranscript}"
                    </p>
                  ) : (
                    <p className="text-slate-600 text-sm italic">Waiting for your answerâ€¦</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* â”€â”€ Last evaluation badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <AnimatePresence>
            {evaluations.length > 0 && aiStatus !== AI_VOICE_STATUS.LISTENING && (
              <motion.div
                key={`eval-${evaluations.length}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 max-w-2xl w-full flex items-center gap-3 bg-slate-900/50 border border-slate-700/30 rounded-xl px-4 py-2.5"
              >
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 ${
                  evaluations[evaluations.length - 1].score >= 7
                    ? "text-emerald-400"
                    : evaluations[evaluations.length - 1].score >= 5
                    ? "text-amber-400"
                    : "text-red-400"
                }`}>
                  {evaluations[evaluations.length - 1].score ?? "â€“"}/10
                </div>
                <p className="text-xs text-slate-400 flex-1 leading-relaxed">
                  {evaluations[evaluations.length - 1].feedback}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress dots â€” colour-coded by score */}
          {questionIndex > 0 && (
            <div className="mt-12 flex items-center gap-2 flex-wrap justify-center max-w-lg">
              {Array.from({ length: questionIndex }).map((_, i) => {
                const ev = evaluations[i];
                const color = ev
                  ? ev.score >= 7
                    ? "bg-emerald-500"
                    : ev.score >= 5
                    ? "bg-amber-500"
                    : ev.unanswered
                    ? "bg-slate-600 opacity-40"
                    : "bg-red-500"
                  : "bg-slate-700";
                return (
                  <span
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === questionIndex - 1 ? "w-6" : "w-2"
                    } ${color}`}
                    title={ev ? `Q${i + 1}: ${ev.score}/10` : `Q${i + 1}`}
                  />
                );
              })}
            </div>
          )}
        </main>

        {/* â”€â”€ PiP camera + waveform sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <aside className="fixed bottom-6 right-6 w-80 z-30 select-none">
          <div className="rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-slate-900">
            <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
              <video ref={videoRef} autoPlay muted playsInline
                className="w-full h-full object-cover bg-slate-950"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-red-400 text-xs font-bold px-2.5 py-1 rounded-full">
                <RecDot />
                REC
              </div>
              <div className={`absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig.color}`}>
                {aiStatus === AI_VOICE_STATUS.LISTENING && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
                {statusConfig.label}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-slate-950/90 to-transparent" />
            </div>

            {/* Waveform */}
            <div className="bg-slate-950 relative -mt-0.5">
              {analyser ? (
                <WaveformVisualiser analyser={analyser} />
              ) : (
                <div className="h-12 flex items-center justify-center">
                  <p className="text-xs text-slate-600">Initialising audioâ€¦</p>
                </div>
              )}
            </div>

            {/* Footer info bar */}
            <div className="bg-slate-900 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1"><Camera size={11} />Live Camera</span>
              <span className="font-mono">{formattedTime}</span>
              <span className="flex items-center gap-1"><Mic size={11} />Mic Active</span>
            </div>

            {/* Compact running scores strip */}
            {evaluations.length > 0 && (
              <div className="bg-slate-900 border-t border-slate-800/60 px-4 py-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1"><TrendingUp size={10} />Running scores</span>
                  <span>{evaluations.length} graded</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {evaluations.map((ev, i) => (
                    <span key={i}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ev.score >= 7 ? "bg-emerald-900/60 text-emerald-400" :
                        ev.score >= 5 ? "bg-amber-900/60 text-amber-400" :
                        "bg-red-900/60 text-red-400"
                      }`}
                    >
                      {ev.score}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  PHASE 4 â€“ Summary Screen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SummaryScreen({ jobTitle, evaluations, conversationHistory }) {
  const avgScore = useMemo(() => {
    const scored = evaluations.filter((e) => e.score !== null);
    if (!scored.length) return null;
    return Math.round((scored.reduce((a, e) => a + e.score, 0) / scored.length) * 10) / 10;
  }, [evaluations]);

  const scoreColor = avgScore >= 7 ? "text-emerald-400" : avgScore >= 5 ? "text-amber-400" : "text-red-400";
  const verdict =
    avgScore >= 7 ? "Strong Performance" : avgScore >= 5 ? "Moderate Performance" : "Needs Improvement";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-7 py-5 border-b border-slate-700/60 bg-slate-800/60">
          <Award className="text-emerald-400 flex-shrink-0" size={26} />
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Interview Complete</h2>
            <p className="text-xs text-slate-400 mt-0.5">{jobTitle} â€” AI Interview Session</p>
          </div>
        </div>

        <div className="px-7 py-6 space-y-6">
          {/* Score summary card */}
          <div className="flex items-center gap-6 bg-slate-800/50 rounded-xl p-5">
            <div className="text-center">
              <p className={`text-5xl font-black ${scoreColor}`}>{avgScore ?? "â€“"}</p>
              <p className="text-xs text-slate-500 mt-1">/ 10  avg</p>
            </div>
            <div>
              <p className={`text-lg font-bold ${scoreColor}`}>{verdict}</p>
              <p className="text-sm text-slate-400 mt-1">
                {evaluations.length} questions answered Â· {Math.round(conversationHistory.length / 2)} total exchanges
              </p>
            </div>
          </div>

          {/* Per-question breakdown */}
          {evaluations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Question Breakdown
              </p>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                {evaluations.map((ev, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm text-slate-200 font-medium leading-snug flex-1">{ev.question}</p>
                      <span className={`text-sm font-bold flex-shrink-0 ${
                        ev.score >= 7 ? "text-emerald-400" : ev.score >= 5 ? "text-amber-400" : "text-red-400"
                      }`}>{ev.score}/10</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{ev.feedback}</p>
                    {ev.answer && !ev.answer.startsWith("(no response") && (
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed italic line-clamp-2">
                        "{ev.answer}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-slate-400 leading-relaxed">
              Your session data has been recorded and securely submitted. The hiring team will review your
              performance and be in touch soon.
            </p>
            <button
              onClick={() => { try { window.close(); } catch { } window.location.href = "/"; }}
              className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Close Session
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Error Screen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl"
      >
        <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="text-red-400" size={26} />
        </div>
        <h2 className="text-xl font-bold text-white mb-3">Permissions Denied</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors border border-slate-700/60"
        >
          Reload &amp; Try Again
        </button>
      </motion.div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Root Component â€“ State Machine
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function InterviewProctoring() {
  const { applicationId } = useParams();
  const location = useLocation();
  const jobTitle = location.state?.jobTitle || "Software Engineer";

  const [phase, setPhase] = useState(PHASE.TERMS);
  const [errorMessage, setErrorMessage] = useState("");
  const [streams, setStreams] = useState(null);
  const [sessionData, setSessionData] = useState({ history: [], evaluations: [] });

  const handleAcceptTerms = useCallback(() => setPhase(PHASE.PERMISSIONS), []);

  const handlePermissionsGranted = useCallback((grantedStreams) => {
    setStreams(grantedStreams);
    setPhase(PHASE.INTERVIEW);
  }, []);

  const handlePermissionsDenied = useCallback((msg) => {
    setErrorMessage(msg);
    setPhase(PHASE.ERROR);
  }, []);

  const handleInterviewComplete = useCallback((history, evaluations) => {
    setSessionData({ history, evaluations });
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
            <InterviewInterface
              streams={streams}
              jobTitle={jobTitle}
              applicationId={applicationId}
              onComplete={handleInterviewComplete}
            />
          </motion.div>
        )}

        {phase === PHASE.SUMMARY && (
          <motion.div key="summary" variants={fadeIn} initial="hidden" animate="visible" exit="hidden">
            <SummaryScreen
              jobTitle={jobTitle}
              evaluations={sessionData.evaluations}
              conversationHistory={sessionData.history}
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
