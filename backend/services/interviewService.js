/**
 * interviewService.js
 * 
 * Backend service orchestrating the entire AI interview lifecycle.
 * All LLM calls (Groq), Whisper STT, session management, and evaluation
 * happen here — the frontend is a thin presentation layer.
 * 
 * Architecture:
 *   Frontend  ──HTTP──▶  Controller  ──▶  Service  ──▶  Groq/Whisper APIs
 *                                           │
 *                                      InterviewSession (MongoDB)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const InterviewSession = require('../models/InterviewSession');
const JobApplication = require('../models/JobApplication');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');
const voiceProctoringService = require('./voiceProctoringService');
const faceProctoringService = require('./faceProctoringService');

// ── Configuration ────────────────────────────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ═════════════════════════════════════════════════════════════════════════════
//  PERSONA & PROMPT ENGINEERING
// ═════════════════════════════════════════════════════════════════════════════

function buildInterviewerPersona(jobTitle = '') {
  const title = jobTitle.trim() || 'Software Engineer';
  const seniorityKeywords = /senior|lead|principal|staff|head|chief|director/i;
  const hasSeniority = seniorityKeywords.test(title);
  const baseLine = hasSeniority
    ? `You are a ${title} with 15+ years of hands-on industry experience`
    : `You are a Senior ${title} with 12+ years of hands-on industry experience`;

  return (
    `${baseLine}, now serving as the lead technical interviewer at a top-tier tech company. ` +
    `You are rigorous, insightful, and know exactly what separates great ${title}s from average ones. ` +
    `You have personally hired dozens of ${title}s and understand every trick candidates use to bluff. ` +
    `Your interview style is conversational yet precise — you push deeper when you spot interesting signals, ` +
    `change topics when an answer is weak, and always keep the overall picture of the candidate in mind. ` +
    `You NEVER break character. You do NOT explain that you are an AI. You stay professional throughout.`
  );
}

function getInterviewPhaseHint(elapsedSeconds, config) {
  const minSec = config?.minDurationSec || 20 * 60;
  const maxSec = config?.maxDurationSec || 30 * 60;

  if (elapsedSeconds < 5 * 60) {
    return 'OPENING: You have just started. Warm up the candidate with a brief welcome and an introduction question.';
  }
  if (elapsedSeconds < minSec) {
    const remaining = Math.round((minSec - elapsedSeconds) / 60);
    return `MAIN BODY: ${remaining} minutes remain in the core session. Probe deeply and vary topics — technical, behavioural, situational.`;
  }
  if (elapsedSeconds < maxSec) {
    return 'CLOSING: Interview is in the final window. Ask 1-2 high-level, motivational, or culture-fit questions before wrapping up.';
  }
  return 'WRAP_UP: Time is up. Give a brief warm closing statement and end the session.';
}

function buildSystemPrompt(session, lastEval = null) {
  const { jobTitle, context, interviewState, config } = session;
  const elapsedSeconds = session.totalDurationSec || 0;
  const persona = buildInterviewerPersona(jobTitle);
  const phaseHint = getInterviewPhaseHint(elapsedSeconds, config);

  let prompt = `${persona}\n\n`;

  if (context.jobDescription) prompt += `## Job Description\n${context.jobDescription}\n\n`;
  if (context.requirements?.length > 0) {
    prompt += `## Key Requirements\n${context.requirements.map(r => `- ${r}`).join('\n')}\n\n`;
  }
  if (context.candidateInfo) prompt += `## Candidate Background\n${context.candidateInfo}\n\n`;
  if (context.skills?.length > 0) {
    prompt += `## Candidate Skills\n${context.skills.join(', ')}\n\n`;
  }

  prompt += `## Interview Phase\n${phaseHint}\n\n`;

  // Adaptive difficulty based on last evaluation
  if (lastEval?.score != null) {
    if (lastEval.score >= 7) {
      prompt += `The candidate's last answer was strong (score ${lastEval.score}/10: "${lastEval.feedback}"). ` +
        `Consider going DEEPER on the same topic or exploring an advanced edge case.\n\n`;
    } else if (lastEval.score <= 4) {
      prompt += `The candidate's last answer was weak (score ${lastEval.score}/10: "${lastEval.feedback}"). ` +
        `PIVOT to a completely different topic to give them a fresh chance.\n\n`;
    } else {
      prompt += `The last answer was average (score ${lastEval.score}/10). Continue naturally to the next relevant topic.\n\n`;
    }
  }

  // Topic awareness — avoid repetition
  if (interviewState.topicsCovered?.length > 0) {
    prompt += `## Topics Already Covered\n${interviewState.topicsCovered.join(', ')}\n` +
      `Avoid repeating these topics unless you need a deeper follow-up.\n\n`;
  }

  const qCount = interviewState.questionCount || 0;
  const unanswered = interviewState.totalUnanswered || 0;

  if (qCount === 0) {
    prompt += `This is the FIRST question. Welcome the candidate briefly (one sentence), address them by name if known, ` +
      `and ask them to introduce themselves and describe their most relevant experience for this ${jobTitle} role.`;
  } else {
    prompt +=
      `## Cross-Examination Strategy\n` +
      `You MUST actively reference specifics from the candidate's resume (projects, technologies, past roles, achievements) ` +
      `when formulating questions. Cross-examine their claims — if they mentioned a project or technology in their resume ` +
      `or an earlier answer, dig deeper: ask HOW they implemented it, what technical challenges they faced, ` +
      `what tradeoffs they made, and what they would do differently now. If an earlier answer was vague or unconvincing, ` +
      `challenge it directly with a targeted follow-up.\n\n` +
      `## When to End the Interview\n` +
      `You have asked ${qCount} question(s) so far. The candidate has left ${unanswered} question(s) unanswered. ` +
      `You MAY decide to end the interview when BOTH conditions are true: ` +
      `(a) you have asked at least 8 questions, AND ` +
      `(b) you feel confident in your overall assessment — ` +
      `whether positive (thoroughly impressed) or negative (consistently poor or evasive answers). ` +
      `To signal that the interview should end, output ONLY this exact token on its own: [END_INTERVIEW]\n\n` +
      `Otherwise, ask the NEXT interview question. Output ONLY the question — ` +
      `no preamble, no "Great answer", no pleasantries, no numbering. One concise, focused question.`;
  }

  return prompt;
}

// ═════════════════════════════════════════════════════════════════════════════
//  GROQ LLM API
// ═════════════════════════════════════════════════════════════════════════════

async function callGroqChat(messages, { maxTokens = 250, temperature = 0.75 } = {}) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured on server');

  const sanitizedMessages = (Array.isArray(messages) ? messages : [])
    .map((msg) => {
      if (!msg || !msg.role) return null;
      const content = typeof msg.content === 'string'
        ? msg.content
        : (msg.content == null ? '' : String(msg.content));

      return {
        role: msg.role,
        content,
        ...(msg.name ? { name: msg.name } : {}),
      };
    })
    .filter(Boolean);

  try {
    const res = await axios.post(GROQ_API_URL, {
      model: GROQ_MODEL,
      messages: sanitizedMessages,
      max_tokens: maxTokens,
      temperature,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      timeout: 30000,
    });

    return res.data?.choices?.[0]?.message?.content?.trim() || '';
  } catch (err) {
    const data = err.response?.data;
    const status = err.response?.status;
    logger.error(`[Groq LLM] ${status} — ${JSON.stringify(data)}`);
    throw new Error(`Groq API error ${status}: ${data?.error?.message || JSON.stringify(data) || err.message}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  WHISPER STT (via Groq)
// ═════════════════════════════════════════════════════════════════════════════

async function transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured on server');

  // Determine file extension from mime type
  const extMap = {
    'audio/webm': 'webm',
    'audio/wav': 'wav',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
  };
  const ext = extMap[mimeType] || 'webm';

  const form = new FormData();
  form.append('file', audioBuffer, { filename: `audio.${ext}`, contentType: mimeType });
  form.append('model', 'whisper-large-v3');
  form.append('language', 'en');
  form.append('response_format', 'verbose_json');

  const res = await axios.post(GROQ_WHISPER_URL, form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    timeout: 30000,
    maxContentLength: 25 * 1024 * 1024,
    maxBodyLength: 25 * 1024 * 1024,
  });

  return {
    text: res.data?.text?.trim() || '',
    segments: res.data?.segments || [],
    duration: res.data?.duration || 0,
    language: res.data?.language || 'en',
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  SESSION MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Create a new interview session and load context from the job application.
 */
async function createSession(applicationId, candidateId) {
  const latestSession = await InterviewSession.findOne({ applicationId, candidateId })
    .sort({ createdAt: -1 })
    .lean();

  if (latestSession && ['completed', 'terminated', 'abandoned', 'completing'].includes(latestSession.status)) {
    throw new AppError('Interview already completed for this application. Retakes are not allowed.', 409);
  }

  // Load application data for context  
  const application = await JobApplication.findOne({ applicationId })
    .populate('jobId')
    .lean();

  if (!application) throw new Error('Application not found');

  const job = application.jobId;
  const profile = application.applicationProfile;
  const resumeSummary = profile?.summary || '';

  let candidateInfo = '';
  if (profile?.personalInfo?.name) candidateInfo += `Name: ${profile.personalInfo.name}\n`;
  if (profile?.personalInfo?.location) candidateInfo += `Location: ${profile.personalInfo.location}\n`;
  if (profile?.experience?.length > 0) {
    candidateInfo += 'Experience:\n';
    profile.experience.forEach(exp => {
      candidateInfo += `  - ${exp.title} at ${exp.companyName}${exp.isCurrentRole ? ' (current)' : ''}\n`;
      if (exp.description) candidateInfo += `    ${exp.description.slice(0, 200)}\n`;
    });
  }
  if (profile?.education?.length > 0) {
    candidateInfo += 'Education:\n';
    profile.education.forEach(edu => {
      candidateInfo += `  - ${edu.degree} in ${edu.fieldOfStudy} at ${edu.institution}\n`;
    });
  }
  if (resumeSummary) candidateInfo += `\nResume Summary: ${resumeSummary.slice(0, 2000)}`;

  const session = new InterviewSession({
    applicationId,
    candidateId,
    jobId: job._id,
    jobTitle: job.title || 'Software Engineer',
    status: 'created',
    context: {
      jobDescription: job.description || '',
      requirements: job.requirements || job.skills || [],
      candidateInfo,
      candidateName: profile?.personalInfo?.name || '',
      resumeSummary: resumeSummary.slice(0, 2000),
      skills: profile?.skills || [],
    },
    conversationHistory: [],
    turns: [],
  });

  await session.save();
  logger.info(`[Interview] Session created: ${session._id} for application ${applicationId}`);

  return session;
}

/**
 * Start the interview — generates the first question.
 */
async function startSession(sessionId) {
  const session = await InterviewSession.findById(sessionId);
  if (!session) throw new Error('Session not found');

  if (session.status === 'in_progress' || session.status === 'started') {
    logger.info(`[Interview] Active session resumed via start endpoint: ${sessionId}.`);

    const lastTurn = session.turns?.length ? session.turns[session.turns.length - 1] : null;
    const pendingTurn = (session.turns || []).slice().reverse().find((turn) => !turn.answeredAt);
    const resumeTurn = pendingTurn || lastTurn;

    return {
      sessionId: session._id,
      resumed: true,
      status: session.status,
      question: resumeTurn?.question || '',
      turnIndex: resumeTurn?.index ?? Math.max((session.turns?.length || 1) - 1, 0),
      phase: resumeTurn?.phase || session.interviewState?.currentPhase || 'main',
    };
  }

  if (session.status !== 'created') {
    return {
      sessionId: session._id,
      ended: true,
      status: session.status,
      reason: `Session is already ${session.status}`,
      summary: formatSessionSummary(session),
    };
  }

  session.status = 'started';
  session.startedAt = new Date();

  // Build system prompt and generate opening question
  const systemPrompt = buildSystemPrompt(session);
  session.conversationHistory = [{ role: 'system', content: systemPrompt }];

  const question = await callGroqChat(session.conversationHistory, { maxTokens: 250, temperature: 0.75 });

  session.conversationHistory.push({ role: 'assistant', content: question });
  session.turns.push({
    index: 0,
    phase: 'opening',
    question,
    askedAt: new Date(),
  });
  session.interviewState.questionCount = 1;
  session.interviewState.currentPhase = 'opening';
  session.status = 'in_progress';

  await session.save();
  logger.info(`[Interview] Session started: ${sessionId} — First question generated`);

  return { sessionId: session._id, question, turnIndex: 0, phase: 'opening' };
}

/**
 * Submit an answer (text) and get the next question + evaluation of the current answer.
 * This is the core turn-by-turn loop.
 */
async function submitAnswer(sessionId, { answerText, turnIndex, answerDurationMs = 0 }) {
  const session = await InterviewSession.findById(sessionId);
  if (!session) throw new Error('Session not found');
  if (!['in_progress', 'started'].includes(session.status)) {
    throw new Error(`Cannot submit answer in status: ${session.status}`);
  }

  const turn = session.turns[turnIndex];
  if (!turn) throw new Error(`Turn ${turnIndex} not found`);

  const isUnanswered = !answerText || answerText.startsWith('(no response');

  // Update turn with answer
  turn.answer = answerText || '(no response)';
  turn.answerDurationMs = answerDurationMs;
  turn.isUnanswered = isUnanswered;
  turn.answeredAt = new Date();

  // Update conversation history
  session.conversationHistory.push({ role: 'user', content: answerText || '(no response)' });

  // Track unanswered
  if (isUnanswered) {
    session.interviewState.consecutiveSilent += 1;
    session.interviewState.totalUnanswered += 1;
  } else {
    session.interviewState.consecutiveSilent = 0;
  }

  // ── Parallel: Evaluate answer + Generate next question ──────────────────
  const [evalResult, nextQuestionResult] = await Promise.allSettled([
    isUnanswered
      ? Promise.resolve({ score: 0, feedback: 'No response given — question skipped.', topics: [], strengths: [], weaknesses: ['No response'] })
      : evaluateAnswer(turn.question, answerText, session.jobTitle),
    generateNextQuestion(session),
  ]);

  // Process evaluation
  const evaluation = evalResult.status === 'fulfilled' ? evalResult.value : { score: null, feedback: '', topics: [] };
  turn.evaluation = {
    score: evaluation.score,
    feedback: evaluation.feedback,
    topics: evaluation.topics || [],
    strengths: evaluation.strengths || [],
    weaknesses: evaluation.weaknesses || [],
  };

  // Update interview intelligence state
  if (evaluation.score != null) {
    session.interviewState.lastEvalScore = evaluation.score;
    session.interviewState.lastEvalFeedback = evaluation.feedback || '';
  }
  if (evaluation.topics?.length > 0) {
    const existing = new Set(session.interviewState.topicsCovered || []);
    evaluation.topics.forEach(t => existing.add(t));
    session.interviewState.topicsCovered = Array.from(existing);
  }

  // Adjust difficulty dynamically
  const recentScores = session.turns.slice(-3).map(t => t.evaluation?.score).filter(s => s != null);
  if (recentScores.length >= 2) {
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    if (recentAvg >= 7.5) session.interviewState.difficultyLevel = 'hard';
    else if (recentAvg <= 4) session.interviewState.difficultyLevel = 'easy';
    else session.interviewState.difficultyLevel = 'medium';
  }

  // Process next question
  let nextQuestion = null;
  let shouldEnd = false;
  const maxDurationSec = session.config?.maxDurationSec || 30 * 60;
  const hardQuestionCap = 12;
  const reachedMaxDuration = session.totalDurationSec >= maxDurationSec;
  const reachedHardQuestionCap = (session.interviewState.questionCount || 0) >= hardQuestionCap;

  // Auto-end conditions
  if (session.interviewState.consecutiveSilent >= 3 || reachedMaxDuration || reachedHardQuestionCap) {
    shouldEnd = true;
  } else if (nextQuestionResult.status === 'fulfilled') {
    const q = nextQuestionResult.value;
    if (q.endInterview) {
      shouldEnd = true;
    } else {
      nextQuestion = q.question;

      // Add to conversation history and turns
      session.conversationHistory.push({ role: 'assistant', content: nextQuestion });
      const newPhase = getPhaseForElapsed(session.totalDurationSec, session.config);
      session.turns.push({
        index: session.turns.length,
        phase: newPhase,
        question: nextQuestion,
        askedAt: new Date(),
      });
      session.interviewState.questionCount += 1;
      session.interviewState.currentPhase = newPhase;
    }
  }

  // Recompute averages
  session.computeScoring();

  if (shouldEnd) {
    session.status = 'completing';
  }

  await session.save();

  return {
    evaluation: turn.evaluation,
    nextQuestion,
    shouldEnd,
    turnIndex: nextQuestion ? session.turns.length - 1 : turnIndex,
    interviewState: {
      phase: session.interviewState.currentPhase,
      questionCount: session.interviewState.questionCount,
      averageScore: session.scoring.averageScore,
      difficulty: session.interviewState.difficultyLevel,
      topicsCovered: session.interviewState.topicsCovered,
    },
  };
}

/**
 * Finalize the interview — generate closing summary and detailed evaluation.
 */
async function completeSession(sessionId, { cheatingEvents = [], totalCheatingScore = 0, terminationReason = '' } = {}) {
  let session = await InterviewSession.findById(sessionId);
  if (!session) throw new Error('Session not found');

  // Flush voice proctoring before finalizing so mismatch/session stats are up to date.
  try {
    await voiceProctoringService.stopVerificationWS(sessionId, String(session.candidateId));
  } catch (err) {
    logger.warn(`[Interview] Voice proctoring stop failed during completeSession: ${err.message}`);
  }

  try {
    await faceProctoringService.stopVerificationWS(sessionId, String(session.candidateId));
  } catch (err) {
    logger.warn(`[Interview] Face proctoring stop failed during completeSession: ${err.message}`);
  }

  session = await InterviewSession.findById(sessionId);
  if (!session) throw new Error('Session not found');

  session.completedAt = new Date();

  // Store integrity data
  session.integrity.cheatingEvents = cheatingEvents;
  session.integrity.totalCheatingScore = totalCheatingScore;
  if (terminationReason) {
    session.integrity.terminationReason = terminationReason;
    session.status = 'terminated';
  } else {
    session.status = 'completed';
  }

  session.computeScoring();
  session.computeIntegrityVerdict();

  // Calculate total duration
  if (session.startedAt) {
    session.totalDurationSec = Math.floor((session.completedAt - session.startedAt) / 1000);
  }

  // ── Generate Final Summary via LLM ──────────────────────────────────────
  try {
    const summaryPrompt = buildFinalSummaryPrompt(session);
    const summaryText = await callGroqChat([
      { role: 'system', content: summaryPrompt },
    ], { maxTokens: 600, temperature: 0.3 });

    const summary = parseFinalSummary(summaryText);
    if (summary) {
      session.scoring.technicalScore = summary.technicalScore ?? session.scoring.averageScore;
      session.scoring.communicationScore = summary.communicationScore ?? null;
      session.scoring.problemSolvingScore = summary.problemSolvingScore ?? null;
      session.scoring.strengths = summary.strengths || [];
      session.scoring.weaknesses = summary.weaknesses || [];
      session.scoring.recommendations = summary.recommendations || [];
      if (summary.overallVerdict) session.scoring.overallVerdict = summary.overallVerdict;
    }
  } catch (err) {
    logger.warn('[Interview] Final summary generation failed:', err.message);
  }

  await session.save();
  logger.info(`[Interview] Session completed: ${sessionId} — Status: ${session.status}`);

  return formatSessionSummary(session);
}

/**
 * Update session elapsed time (called periodically from frontend).
 */
async function updateSessionTime(sessionId, elapsedSeconds) {
  await InterviewSession.findByIdAndUpdate(sessionId, {
    totalDurationSec: elapsedSeconds,
  });
}

/**
 * Get session state (for reconnection / status checks).
 */
async function getSession(sessionId, candidateId) {
  const session = await InterviewSession.findById(sessionId).lean();
  if (!session) throw new Error('Session not found');
  if (session.candidateId.toString() !== candidateId) {
    throw new Error('Unauthorized access to session');
  }
  return session;
}

/**
 * Get an existing active session for an application, if any.
 */
async function getActiveSession(applicationId, candidateId) {
  return InterviewSession.findOne({
    applicationId,
    candidateId,
    status: { $in: ['created', 'started', 'in_progress'] },
  }).lean();
}

// ═════════════════════════════════════════════════════════════════════════════
//  INTERNAL HELPERS
// ═════════════════════════════════════════════════════════════════════════════

async function evaluateAnswer(question, answer, jobTitle = '') {
  try {
    const raw = await callGroqChat([
      {
        role: 'system',
        content:
          `You are a strict technical interviewer evaluating a candidate for a ${jobTitle} role. ` +
          `Evaluate the answer thoroughly. Respond ONLY with a JSON object — no markdown, no extra text:\n` +
          `{ "score": <1-10>, "feedback": "<one sentence>", "topics": ["<topic covered>"], ` +
          `"strengths": ["<strength>"], "weaknesses": ["<weakness>"] }`,
      },
      { role: 'user', content: `Question: ${question}\n\nAnswer: ${answer}` },
    ], { maxTokens: 200, temperature: 0.2 });

    const parsed = JSON.parse(raw);
    return {
      score: parsed.score ?? null,
      feedback: parsed.feedback ?? '',
      topics: parsed.topics ?? [],
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
    };
  } catch (err) {
    logger.warn('[Interview] Evaluation parsing failed:', err.message);
    return { score: null, feedback: '', topics: [], strengths: [], weaknesses: [] };
  }
}

async function generateNextQuestion(session) {
  // Rebuild system prompt with updated state
  const lastEval = {
    score: session.interviewState.lastEvalScore,
    feedback: session.interviewState.lastEvalFeedback,
  };
  const systemPrompt = buildSystemPrompt(session, lastEval);

  // Replace the system message in conversation history
  const messages = [
    { role: 'system', content: systemPrompt },
    ...session.conversationHistory.filter(m => m.role !== 'system'),
  ];

  const question = await callGroqChat(messages, { maxTokens: 250, temperature: 0.75 });

  if (question.includes('[END_INTERVIEW]')) {
    return { endInterview: true, question: null };
  }

  return { endInterview: false, question };
}

function getPhaseForElapsed(elapsedSec, config) {
  const minSec = config?.minDurationSec || 20 * 60;
  const maxSec = config?.maxDurationSec || 30 * 60;

  if (elapsedSec < 5 * 60) return 'opening';
  if (elapsedSec < minSec) return 'main';
  if (elapsedSec < maxSec) return 'closing';
  return 'wrap_up';
}

function buildFinalSummaryPrompt(session) {
  const turns = session.turns.map((t, i) => {
    const scoreStr = t.evaluation?.score != null ? `${t.evaluation.score}/10` : 'N/A';
    return `Q${i + 1}: ${t.question}\nA: ${t.answer}\nEval: ${scoreStr} — ${t.evaluation?.feedback || 'N/A'}`;
  }).join('\n\n');

  return (
    `You are a senior hiring evaluator. Below is the complete transcript of an interview ` +
    `for a ${session.jobTitle} position.\n\n` +
    `## Interview Transcript\n${turns}\n\n` +
    `## Current Average Score: ${session.scoring.averageScore ?? 'N/A'}/10\n\n` +
    `Provide a final evaluation. Respond ONLY with JSON — no markdown:\n` +
    `{ "technicalScore": <1-10>, "communicationScore": <1-10>, "problemSolvingScore": <1-10>, ` +
    `"overallVerdict": "<Strong/Moderate/Needs Improvement>", ` +
    `"strengths": ["..."], "weaknesses": ["..."], "recommendations": ["..."] }`
  );
}

function parseFinalSummary(text) {
  try {
    // Try to extract JSON from the response  
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return null;
  } catch {
    return null;
  }
}

function formatSessionSummary(session) {
  return {
    sessionId: session._id,
    status: session.status,
    jobTitle: session.jobTitle,
    totalDurationSec: session.totalDurationSec,
    totalQuestions: session.turns.length,
    totalAnswered: session.turns.filter(t => !t.isUnanswered).length,
    scoring: session.scoring,
    // Screen-proctoring events (tab switch, fullscreen exit, etc.)
    integrity: {
      verdict: session.integrity.integrityVerdict,
      totalScore: session.integrity.totalCheatingScore,
      threshold: session.config.cheatingThreshold,
      events: session.integrity.cheatingEvents,
      terminationReason: session.integrity.terminationReason,
    },
    // Voice-proctoring events (speaker mismatch during interview)
    // Completely separate from integrity above — mismatches never terminate the session.
    voiceProctoring: voiceProctoringService.formatVoiceProctoringReport(session),
    // Face/Object proctoring events (formal face alerts + object alerts with snapshots)
    // Separate from integrity above — does not alter screen-violation scoring logic.
    faceProctoring: faceProctoringService.formatFaceProctoringReport(session),
    turns: session.turns.map(t => ({
      index: t.index,
      phase: t.phase,
      question: t.question,
      answer: t.answer,
      evaluation: t.evaluation,
      isUnanswered: t.isUnanswered,
    })),
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  createSession,
  startSession,
  submitAnswer,
  completeSession,
  updateSessionTime,
  getSession,
  getActiveSession,
  transcribeAudio,
};
