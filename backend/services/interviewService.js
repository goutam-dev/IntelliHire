/**
 * interviewService.js
 * * Backend service orchestrating the entire AI interview lifecycle.
 * All LLM calls (Groq), Whisper STT, session management, and evaluation
 * happen here — the frontend is a thin presentation layer.
 * * Architecture:
 * Frontend  ──HTTP──▶  Controller  ──▶  Service  ──▶  Groq/Whisper APIs
 * │
 * InterviewSession (MongoDB)
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
const notificationService = require('./notificationService');

// ── Configuration ────────────────────────────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MAX_REASK_ATTEMPTS = Number(process.env.INTERVIEW_MAX_REASK_ATTEMPTS || 2);

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
    `You are rigorous, fair, and know exactly what separates great ${title}s from average ones. ` +
    `You have personally hired dozens of ${title}s and consistently evaluate evidence, depth, and role fit. ` +
    `Your interview style is conversational yet precise: you push deeper when you spot strong signals, ` +
    `change topics when an answer is weak, and always keep the overall picture of the candidate in mind. ` +
    `You NEVER break character. You do NOT explain that you are an AI. You stay professional throughout.`
  );
}

function getInterviewPhaseHint(questionCount) {
  if (questionCount <= 1) {
    return 'OPENING: Start with a brief welcome and one role-relevant opener.';
  }
  return 'ACTIVE INTERVIEW: Keep probing for concrete evidence, depth, and role fit.';
}

function buildSystemPrompt(session, lastEval = null) {
  const { jobTitle, context, interviewState } = session;
  const persona = buildInterviewerPersona(jobTitle);
  const qCount = interviewState.questionCount || 0;
  const phaseHint = getInterviewPhaseHint(qCount);
  const unanswered = interviewState.totalUnanswered || 0;
  const candidateName = context.candidateName?.trim() || 'the candidate';

  let prompt = `${persona}\n\n`;

  // ─────────────────────────────────────────────
  // CONTEXT
  // ─────────────────────────────────────────────
  if (context.jobDescription) {
    prompt += `## Job Description\n${context.jobDescription}\n\n`;
  }

  if (context.candidateInfo) {
    prompt += `## Candidate Background\n${context.candidateInfo}\n\n`;
  }

  if (context.skills?.length > 0) {
    prompt += `## Candidate Skills (Secondary Reference)\n${context.skills.join(', ')}\n\n`;
  }

  prompt += `## Interview Phase\n${phaseHint}\n\n`;

  // ─────────────────────────────────────────────
  // TOPIC EXTRACTION
  // ─────────────────────────────────────────────
  prompt +=
    `## Topic Extraction (MANDATORY)\n` +
    `From the job description, infer 4–6 key evaluation topics.\n` +
    `These can be skills, responsibilities, or capabilities.\n\n`;

  // ─────────────────────────────────────────────
  // INTERNAL TRACKING (CRITICAL)
  // ─────────────────────────────────────────────
  prompt +=
    `## Internal Tracking (MANDATORY)\n` +
    `You must internally track:\n` +
    `- Topics identified\n` +
    `- Topics already covered\n` +
    `- Topics not yet covered\n` +
    `- Topics that have been explored with depth\n\n` +
    `Before asking each question:\n` +
    `→ Decide which topic to focus on\n` +
    `→ Prefer uncovered OR shallow topics\n\n`;

  // ─────────────────────────────────────────────
  // PRIORITY CONTROL
  // ─────────────────────────────────────────────
  prompt +=
    `## Priority Rule (CRITICAL)\n` +
    `1. Job description topics are PRIMARY\n` +
    `2. Candidate background is SECONDARY\n` +
    `3. Do NOT let interesting projects override missing topic coverage\n\n`;

  // ─────────────────────────────────────────────
  // STRUCTURE
  // ─────────────────────────────────────────────
  prompt +=
    `## Interview Structure\n` +
    `PHASE 1: Coverage\n` +
    `- Cover all key topics\n` +
    `- Ask one main question per topic\n\n` +
    `PHASE 2: Depth\n` +
    `- Ask follow-ups for strong signals\n` +
    `- Validate real understanding\n\n`;

  // ─────────────────────────────────────────────
  // DEPTH CONTROL (CRITICAL FIX)
  // ─────────────────────────────────────────────
  prompt +=
    `## Depth Control Rule (CRITICAL)\n` +
    `For EACH topic:\n\n` +
    `Step 1: Ask a main question\n` +
    `Step 2: Evaluate the answer\n\n` +
    `IF answer is strong:\n` +
    `→ Ask ONE follow-up (example, trade-off, real scenario)\n\n` +
    `IF answer is weak:\n` +
    `→ Ask ONE clarification OR move on\n\n` +
    `You MUST NOT leave a topic without attempting depth validation.\n\n`;

  // ─────────────────────────────────────────────
  // COVERAGE STRATEGY (FIXED BFS)
  // ─────────────────────────────────────────────
  prompt +=
    `## Coverage Strategy\n` +
    `- Balance breadth AND depth\n` +
    `- Do NOT jump topics too quickly\n` +
    `- Validate understanding before moving on\n` +
    `- Maximum ~2 questions per topic\n\n`;

  // ─────────────────────────────────────────────
  // ANTI-CHECKLIST RULE (IMPORTANT)
  // ─────────────────────────────────────────────
  prompt +=
    `## Anti-Checklist Rule\n` +
    `Do NOT behave like a checklist interviewer.\n` +
    `Do NOT ask one question per topic and move on.\n\n` +
    `Your goal is to VERIFY understanding, not just ask.\n\n`;

  // ─────────────────────────────────────────────
  // DEFINITION OF "COVERED"
  // ─────────────────────────────────────────────
  prompt +=
    `## Coverage Definition (CRITICAL)\n` +
    `A topic is ONLY considered covered if:\n` +
    `- Candidate gave a meaningful answer\n` +
    `- AND at least one follow-up or validation was done\n\n` +
    `Superficial coverage does NOT count.\n\n`;

  // ─────────────────────────────────────────────
  // ADAPTIVE FOLLOW-UP LOGIC
  // ─────────────────────────────────────────────
  if (lastEval?.score != null) {
    if (lastEval.score >= 7) {
      prompt +=
        `Previous answer strong → ask ONE follow-up to validate real-world depth, then move topic.\n\n`;
    } else if (lastEval.score <= 4) {
      prompt +=
        `Previous answer weak → ask ONE clearer follow-up or simplify question.\n\n`;
    } else {
      prompt +=
        `Previous answer partial → ask ONE follow-up to deepen understanding.\n\n`;
    }
  }

  if (unanswered > 0) {
    prompt +=
      `Candidate has ${unanswered} unanswered responses → simplify next question.\n\n`;
  }

  // ─────────────────────────────────────────────
  // QUESTION RULES
  // ─────────────────────────────────────────────
  prompt +=
    `## Question Rules\n` +
    `- Ask exactly ONE question\n` +
    `- Max 35 words\n` +
    `- Focus on examples, decisions, or outcomes\n` +
    `- No explanation or feedback\n\n`;

  // ─────────────────────────────────────────────
  // ENDING CONTROL (FIXES EARLY STOP)
  // ─────────────────────────────────────────────
  if (qCount === 0) {
    prompt +=
      `This is the FIRST question. Welcome ${candidateName} and ask for one relevant experience.\n`;
  } else {
    prompt +=
      `## Strict Ending Rule (MANDATORY)\n` +
      `You MUST NOT end the interview early.\n\n` +
      `Minimum requirements before ending:\n` +
      `- At least 8–12 questions asked\n` +
      `- At least 4 topics covered\n` +
      `- At least 2 topics explored with follow-up depth\n\n` +
      `If these are NOT met:\n` +
      `→ DO NOT end\n` +
      `→ Continue asking\n\n` +
      `Only output: [END_INTERVIEW]\n\n`;
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
  const attemptedSession = await InterviewSession.findOne({
    applicationId,
    candidateId,
    $or: [
      { startedAt: { $ne: null } },
      { status: { $in: ['completed', 'terminated', 'abandoned', 'completing'] } },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  if (attemptedSession) {
    if (['created', 'started', 'in_progress'].includes(attemptedSession.status)) {
      await InterviewSession.findByIdAndUpdate(attemptedSession._id, {
        status: 'abandoned',
        completedAt: attemptedSession.completedAt || new Date(),
        'integrity.terminationReason': attemptedSession.integrity?.terminationReason || 'Interview session ended unexpectedly',
      }).catch(() => { });
    }

    await JobApplication.findOneAndUpdate(
      { applicationId, status: 'Interview Scheduled' },
      { status: 'Interviewed' }
    ).catch(() => { });

    throw new AppError('Interview has already been attempted for this application. Retakes are not allowed.', 409);
  }

  // Load application data for context  
  const application = await JobApplication.findOne({ applicationId })
    .populate('jobId')
    .lean();

  if (!application) throw new Error('Application not found');

  if (application.status !== 'Interview Scheduled') {
    throw new AppError('Interview is not available for this application yet.', 403);
  }

  // Time Window Enforcement added back here
  assertInterviewWindowOpen(application);

  const voiceReady = application.voiceEnrollment?.status === 'enrolled';
  const faceReady = application.faceEnrollment?.status === 'enrolled';
  if (!voiceReady || !faceReady) {
    throw new AppError(
      'Interview setup is still in progress. Please wait until audio and video verification are ready.',
      409
    );
  }

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

  // Enforce strict window boundaries before starting a not-yet-started session (added back here)
  if (session.status === 'created') {
    const application = await JobApplication.findOne(
      { applicationId: session.applicationId },
      'interviewWindowStart interviewWindowEnd'
    ).lean();

    if (!application) {
      throw new AppError('Application not found for this interview session.', 404);
    }

    assertInterviewWindowOpen(application);
  }

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

  // Lock retakes as soon as an interview has started.
  try {
    await JobApplication.findOneAndUpdate(
      { applicationId: session.applicationId, status: 'Interview Scheduled' },
      { status: 'Interviewed' }
    );
  } catch (err) {
    logger.warn(`[Interview] Failed to mark application as Interviewed at start: ${err.message}`);
  }

  return { sessionId: session._id, question, turnIndex: 0, phase: 'opening' };
}

/**
 * Submit an answer (text) and get the next question.
 * During the interview we only collect transcript; full LLM evaluation happens at completion.
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
  const answerClassification = isUnanswered
    ? {
      label: 'unanswered',
      isMeta: false,
      source: 'fallback',
      reason: 'Empty answer or explicit no-response marker.',
    }
    : await classifyAnswerWithLLM({
      answerText: answerText || '',
      questionText: turn.question || '',
      jobTitle: session.jobTitle || '',
    });
  const isNonScoringMetaTurn = !!answerClassification.isMeta;
  const shouldReask = isNonScoringMetaTurn && canIssueReaskForTurn(session, turnIndex);

  // Update turn with answer
  turn.answer = answerText || '(no response)';
  turn.answerDurationMs = answerDurationMs;
  turn.isUnanswered = isUnanswered;
  turn.answerClassification = answerClassification.label;
  turn.isClarificationOrCorrection = isNonScoringMetaTurn;
  turn.answerClassificationSource = answerClassification.source;
  turn.answerClassificationReason = answerClassification.reason;
  turn.answeredAt = new Date();

  // Update conversation history
  session.conversationHistory.push({ role: 'user', content: answerText || '(no response)' });

  // Track unanswered
  if (isUnanswered) {
    session.interviewState.consecutiveSilent += 1;
    session.interviewState.totalUnanswered += 1;
  } else if (isNonScoringMetaTurn) {
    // Clarification/correction turns should not count as silence penalties.
    session.interviewState.consecutiveSilent = 0;
  } else {
    session.interviewState.consecutiveSilent = 0;
  }

  // Keep per-turn evaluation empty until interview completion.
  turn.evaluation = {
    score: null,
    feedback: '',
    topics: [],
    strengths: [],
    weaknesses: [],
  };

  const nextQuestionResult = await Promise.allSettled([
    shouldReask
      ? generateClarificationReaskQuestion(session, turn.question, answerText || '')
      : generateNextQuestion(session),
  ]).then((results) => results[0]);

  // Process next question
  let nextQuestion = null;
  let shouldEnd = false;
  let endReasonCode = '';
  let endReasonSource = '';
  let endReasonDetail = '';

  // Auto-end conditions
  if (session.interviewState.consecutiveSilent >= 3) {
    shouldEnd = true;
    endReasonCode = 'consecutive_silence_threshold';
    endReasonSource = 'engine';
    endReasonDetail = 'Interview ended after 3 consecutive unanswered turns.';
  } else if (nextQuestionResult.status === 'fulfilled') {
    const q = nextQuestionResult.value;
    if (q.endInterview) {
      shouldEnd = true;
      endReasonCode = 'llm_end_token';
      endReasonSource = 'llm';
      endReasonDetail = 'LLM emitted [END_INTERVIEW] token.';
    } else {
      nextQuestion = q.question;

      // Add to conversation history and turns
      session.conversationHistory.push({ role: 'assistant', content: nextQuestion });
      const newPhase = q.reask
        ? 'follow_up'
        : getPhaseForProgress(session.interviewState.questionCount);
      session.turns.push({
        index: session.turns.length,
        phase: newPhase,
        question: nextQuestion,
        askedAt: new Date(),
      });
      // Re-asked clarification prompts should not advance progression counters.
      if (!q.reask) {
        session.interviewState.questionCount += 1;
        session.interviewState.currentPhase = newPhase;
      }
    }
  }

  if (shouldEnd) {
    session.status = 'completing';
    setInterviewEndMeta(session, {
      endReasonCode,
      endReasonSource,
      endReasonDetail,
      endInitiator: 'backend_engine',
      endTrigger: 'auto_end_condition',
      endedAtStage: 'submit_answer',
    });
  }

  await session.save();

  const deferredEvaluation = {
    score: null,
    feedback: 'Evaluation will be generated after interview completion using full transcript context.',
    topics: [],
    strengths: [],
    weaknesses: [],
  };

  return {
    evaluation: deferredEvaluation,
    nextQuestion,
    shouldEnd,
    endSignal: shouldEnd
      ? {
        endReasonCode,
        endReasonSource,
        endReasonDetail,
        endedAtStage: 'submit_answer',
      }
      : null,
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
async function completeSession(
  sessionId,
  { cheatingEvents = [], totalCheatingScore = 0, terminationReason = '', completionContext = {} } = {}
) {
  let session = await InterviewSession.findById(sessionId)
    .select('+interviewEndMeta.endReasonCode +interviewEndMeta.endReasonSource +interviewEndMeta.endReasonDetail +interviewEndMeta.endInitiator +interviewEndMeta.endTrigger +interviewEndMeta.endedAtStage +interviewEndMeta.recordedAt');
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

  session = await InterviewSession.findById(sessionId)
    .select('+interviewEndMeta.endReasonCode +interviewEndMeta.endReasonSource +interviewEndMeta.endReasonDetail +interviewEndMeta.endInitiator +interviewEndMeta.endTrigger +interviewEndMeta.endedAtStage +interviewEndMeta.recordedAt');
  if (!session) throw new Error('Session not found');

  const completionInitiator = String(completionContext?.completionInitiator || '').trim();
  const completionTrigger = String(completionContext?.completionTrigger || '').trim();
  const completionDetail = String(completionContext?.completionDetail || '').trim();

  session.completedAt = new Date();

  // Store integrity data
  session.integrity.cheatingEvents = cheatingEvents;
  session.integrity.totalCheatingScore = totalCheatingScore;
  if (terminationReason) {
    session.integrity.terminationReason = terminationReason;
    session.status = 'terminated';
    setInterviewEndMeta(session, {
      endReasonCode: 'terminated_by_integrity',
      endReasonSource: 'integrity',
      endReasonDetail: terminationReason,
      endInitiator: completionInitiator || 'frontend_engine',
      endTrigger: completionTrigger || 'integrity_terminate',
      endedAtStage: 'complete_session',
    });
  } else {
    session.status = 'completed';
    setInterviewEndMeta(session, {
      endReasonCode: session.interviewEndMeta?.endReasonCode || 'completed_via_complete_session',
      endReasonSource: session.interviewEndMeta?.endReasonSource || 'manual_or_frontend',
      endReasonDetail: session.interviewEndMeta?.endReasonDetail || completionDetail || 'Session finalized through completeSession endpoint.',
      endInitiator: session.interviewEndMeta?.endInitiator || completionInitiator || 'frontend_engine',
      endTrigger: session.interviewEndMeta?.endTrigger || completionTrigger || 'complete_session_called',
      endedAtStage: 'complete_session',
    });
  }

  session.computeIntegrityVerdict();

  // Calculate total duration
  if (session.startedAt) {
    session.totalDurationSec = Math.floor((session.completedAt - session.startedAt) / 1000);
  }

  // ── Generate Final Evaluation via LLM with full transcript context ─────
  try {
    const summary = await generateFinalEvaluationWithCalibration(session);
    if (summary) {
      const perAnswer = Array.isArray(summary.perAnswerEvaluations)
        ? summary.perAnswerEvaluations
        : [];

      session.turns.forEach((turn, idx) => {
        const byIndex = perAnswer.find((item) => Number(item?.turnIndex) === idx);
        const byOrder = perAnswer[idx];
        const source = byIndex || byOrder;
        const nonScoringMetaTurn = isTurnNonScoringMeta(turn);

        if (source) {
          turn.evaluation = {
            score: nonScoringMetaTurn
              ? null
              : (typeof source.score === 'number' ? source.score : null),
            feedback: nonScoringMetaTurn
              ? 'Candidate requested clarification or corrected speech-to-text interpretation. This turn is excluded from scoring impact.'
              : (source.feedback || ''),
            topics: Array.isArray(source.topics) ? source.topics : [],
            strengths: Array.isArray(source.strengths) ? source.strengths : [],
            weaknesses: Array.isArray(source.weaknesses) ? source.weaknesses : [],
          };
        } else if (turn.isUnanswered) {
          turn.evaluation = {
            score: nonScoringMetaTurn ? null : 0,
            feedback: nonScoringMetaTurn
              ? 'Candidate requested clarification or corrected speech-to-text interpretation. This turn is excluded from scoring impact.'
              : 'No response given.',
            topics: [],
            strengths: [],
            weaknesses: nonScoringMetaTurn ? [] : ['No response'],
          };
        }
      });

      const topics = new Set();
      session.turns.forEach((turn) => {
        (turn.evaluation?.topics || []).forEach((topic) => topics.add(topic));
      });
      session.interviewState.topicsCovered = Array.from(topics);

      session.computeScoring();

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

  // Auto-update application status to 'Interviewed' so employer can see the candidate finished
  try {
    await JobApplication.findOneAndUpdate(
      { applicationId: session.applicationId, status: 'Interview Scheduled' },
      { status: 'Interviewed' }
    );
    logger.info(`[Interview] Application ${session.applicationId} status updated to 'Interviewed'`);
  } catch (err) {
    logger.warn(`[Interview] Failed to update application status: ${err.message}`);
  }

  // Notify employer that candidate has completed the interview.
  setImmediate(async () => {
    try {
      await notificationService.notifyEmployerInterviewCompleted({
        applicationId: session.applicationId,
      });
    } catch (notifErr) {
      logger.error(`[Interview] Employer interview completion notification failed: ${notifErr.message}`);
    }
  });

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

  return { endInterview: false, question: normalizeQuestionOutput(question) };
}

async function generateClarificationReaskQuestion(session, previousQuestion, candidateReply) {
  const requirements = Array.isArray(session.context?.requirements)
    ? session.context.requirements.filter(Boolean)
    : [];

  const prompt =
    `You are conducting a live interview for a ${session.jobTitle} role.\n\n` +
    `The candidate just asked for clarification or corrected transcription. ` +
    `Re-ask the SAME intent as the previous question, but make it clearer and simpler.\n\n` +
    `Rules:\n` +
    `- Keep the intent/topic identical to the previous question.\n` +
    `- Use plain language and shorter wording (max 28 words).\n` +
    `- Ask exactly ONE question.\n` +
    `- Do not introduce a new topic.\n` +
    `- Do not include preamble, apology, or explanation. Output only the question.\n\n` +
    `Job requirements context: ${requirements.length ? requirements.join('; ') : 'Not provided'}\n` +
    `Previous question: ${previousQuestion || 'Not available'}\n` +
    `Candidate reply: ${candidateReply || 'Not available'}\n`;

  try {
    const text = await callGroqChat([
      { role: 'system', content: prompt },
    ], { maxTokens: 120, temperature: 0.2 });

    const question = normalizeQuestionOutput(text);
    if (question) return { endInterview: false, question, reask: true };
  } catch (err) {
    logger.warn(`[Interview] Clarification re-ask generation failed: ${err.message}`);
  }

  return {
    endInterview: false,
    reask: true,
    question: normalizeQuestionOutput(previousQuestion) || 'Could you answer this in your own words with one concrete example?',
  };
}

function normalizeQuestionOutput(rawText) {
  const text = (rawText || '').trim();
  if (!text) {
    return 'Can you walk me through a recent project where you made a key technical decision and explain the trade-offs you considered?';
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const cleaned = lines.length > 0 ? lines[0] : text;
  const withoutPrefix = cleaned
    .replace(/^\d+[\).:-]\s*/, '')
    .replace(/^(question\s*[:.-]?\s*)/i, '')
    .replace(/^[-*]\s*/, '')
    .trim();

  if (!withoutPrefix) {
    return 'Can you describe how you would approach solving a high-impact technical problem in your current stack?';
  }

  return withoutPrefix;
}

async function classifyAnswerWithLLM({ answerText, questionText = '', jobTitle = '' } = {}) {
  const value = String(answerText || '').trim();
  const question = String(questionText || '').trim();
  const role = String(jobTitle || '').trim();
  if (!value) {
    return {
      label: 'unanswered',
      isMeta: false,
      source: 'fallback',
      reason: 'Empty answer text.',
    };
  }

  const prompt =
    `You are classifying a candidate's interview reply into one of four labels:\n` +
    `- normal: substantive attempt to answer the interview question\n` +
    `- clarification: asks to repeat/rephrase/clarify the question\n` +
    `- correction: explicitly corrects transcription/wording (for example: \"I meant X, not Y\")\n` +
    `- unanswered: no meaningful answer\n\n` +
    `Important decision rule:\n` +
    `Use the interview question context to judge whether the reply is a substantive attempt at answering.\n` +
    `If the reply addresses the asked topic with technical detail, classify as normal.\n` +
    `Do NOT mark a substantive technical answer as correction just because it contains words like \"not\".\n` +
    `If the reply includes concrete technical content, classify it as normal unless it is clearly meta-only.\n\n` +
    `Return only valid JSON with this exact schema:\n` +
    `{\"label\":\"normal|clarification|correction|unanswered\",\"reason\":\"short reason\"}\n\n` +
    `Role: ${role || 'Not provided'}\n` +
    `Interview question:\n${question || 'Not available'}\n\n` +
    `Candidate reply:\n${value}`;

  try {
    const text = await callGroqChat([
      { role: 'system', content: prompt },
    ], { maxTokens: 120, temperature: 0.0 });

    const parsed = parseJsonObject(text);
    const label = normalizeAnswerClassificationLabel(parsed?.label);
    const reason = typeof parsed?.reason === 'string' ? parsed.reason.trim().slice(0, 220) : '';

    return {
      label,
      isMeta: label === 'clarification' || label === 'correction',
      source: 'llm',
      reason: reason || 'LLM classification.',
    };
  } catch (err) {
    logger.warn(`[Interview] LLM answer classification failed, using fallback: ${err.message}`);
    const fallbackMeta = isClarificationOrCorrection(value);
    return {
      label: fallbackMeta ? 'clarification' : 'normal',
      isMeta: fallbackMeta,
      source: 'fallback',
      reason: fallbackMeta
        ? 'Regex fallback detected clarification/correction signal.'
        : 'Fallback defaulted to normal answer.',
    };
  }
}

function normalizeAnswerClassificationLabel(value) {
  const label = String(value || '').trim().toLowerCase();
  if (label === 'clarification') return 'clarification';
  if (label === 'correction') return 'correction';
  if (label === 'unanswered') return 'unanswered';
  return 'normal';
}

function isTurnNonScoringMeta(turn) {
  if (!turn || typeof turn !== 'object') return false;

  if (typeof turn.isClarificationOrCorrection === 'boolean') {
    return turn.isClarificationOrCorrection;
  }

  const label = normalizeAnswerClassificationLabel(turn.answerClassification);
  if (label === 'clarification' || label === 'correction') return true;

  return isClarificationOrCorrection(turn.answer || '');
}

function parseJsonObject(text) {
  const value = String(text || '').trim();
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function isClarificationRequest(text) {
  const value = String(text || '').trim();
  if (!value) return false;

  const patterns = [
    /\bi\s*(do not|don't)\s*understand\b/i,
    /\b(can you|could you|would you)\s+(please\s+)?(repeat|rephrase|clarify|explain)\b/i,
    /\b(i\s*(did not|didn't)\s*(get|catch)\s*(the\s*)?(question|that))\b/i,
    /\b(question\s+is\s+not\s+clear|not\s+clear\s+to\s+me|confusing\s+question)\b/i,
  ];

  return patterns.some((pattern) => pattern.test(value));
}

function isCorrectionStatement(text) {
  const value = String(text || '').trim();
  if (!value) return false;

  const patterns = [
    /\b(i\s*(mean|meant))\b/i,
    /\b(to\s+clarify|let\s+me\s+clarify|correction)\b/i,
    /\b(stt|speech\s*to\s*text|transcription)\s*(is|was)?\s*(wrong|incorrect|mistaken|misheard)\b/i,
    /\b(mern|mean|react|angular|node|mongo(db)?)\b.*\b(not|instead|actually)\b.*\b(mern|mean|react|angular|node|mongo(db)?)\b/i,
  ];

  return patterns.some((pattern) => pattern.test(value));
}

function isClarificationOrCorrection(text) {
  return isClarificationRequest(text) || isCorrectionStatement(text);
}

function getReaskDepthForTurn(session, turnIndex) {
  const turns = Array.isArray(session?.turns) ? session.turns : [];
  if (!turns[turnIndex] || turns[turnIndex].phase !== 'follow_up') return 0;

  let depth = 0;
  for (let i = turnIndex; i >= 0; i -= 1) {
    if (turns[i]?.phase !== 'follow_up') break;
    depth += 1;
  }

  return depth;
}

function canIssueReaskForTurn(session, turnIndex) {
  const maxAttempts = Number.isFinite(MAX_REASK_ATTEMPTS) && MAX_REASK_ATTEMPTS > 0
    ? MAX_REASK_ATTEMPTS
    : 2;

  const currentDepth = getReaskDepthForTurn(session, turnIndex);

  // Base question (non follow_up) can always have first re-ask.
  if (currentDepth === 0) return true;

  // follow_up depth 1 means first re-ask already asked, etc.
  return currentDepth < maxAttempts;
}

function getPhaseForProgress(questionCount = 0) {
  if (questionCount <= 1) return 'opening';
  return 'main';
}

function assertInterviewWindowOpen(application) {
  const now = new Date();

  const start = application?.interviewWindowStart ? new Date(application.interviewWindowStart) : null;
  const end = application?.interviewWindowEnd ? new Date(application.interviewWindowEnd) : null;

  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
    throw new AppError('Interview window is not configured properly. Please contact the employer.', 409);
  }

  if (now < start) {
    throw new AppError(
      `Interview has not started yet. You can begin after ${start.toLocaleString()}.`,
      403
    );
  }

  if (now > end) {
    throw new AppError('Interview deadline has passed for this application.', 403);
  }
}

async function generateFinalEvaluationWithCalibration(session) {
  const provisionalEvaluations = await generateBatchEvaluations(session);
  const calibrationPrompt = buildFinalCalibrationPrompt(session, provisionalEvaluations);

  const primaryText = await callGroqChat([
    { role: 'system', content: calibrationPrompt },
  ], { maxTokens: 1000, temperature: 0.2 });

  let parsed = parseFinalSummary(primaryText);
  if (!parsed) {
    logger.error("❌ FINAL EVAL PARSE FAILED:", primaryText);
    const retryPrompt = `${calibrationPrompt}\n\nIMPORTANT: Return strictly valid JSON only. Do not include markdown, comments, or extra text.`;
    const retryText = await callGroqChat([
      { role: 'system', content: retryPrompt },
    ], { maxTokens: 1000, temperature: 0.0 });
    parsed = parseFinalSummary(retryText);
  }

  return normalizeFinalSummary(parsed, session.turns);
}

async function generateBatchEvaluations(session) {
  const turns = Array.isArray(session.turns) ? session.turns : [];
  const batchSize = 4;
  const evaluations = [];

  for (let start = 0; start < turns.length; start += batchSize) {
    const batchTurns = turns.slice(start, start + batchSize);
    const prompt = buildBatchEvaluationPrompt(session, batchTurns, start);

    let parsed = null;
    try {
      const text = await callGroqChat([
        { role: 'system', content: prompt },
      ], { maxTokens: 650, temperature: 0.15 });
      parsed = parseFinalSummary(text);
    } catch (err) {
      logger.warn(`[Interview] Batch evaluation failed for turns ${start}-${start + batchTurns.length - 1}: ${err.message}`);
    }

    evaluations.push(...normalizeBatchEvaluations(parsed, batchTurns, start));
  }

  return evaluations.sort((a, b) => a.turnIndex - b.turnIndex);
}

function buildBatchEvaluationPrompt(session, batchTurns, offset) {
  const jobDescription = session.context?.jobDescription || '';

  const turnsText = batchTurns.map((t, idx) => {
    const turnIndex = offset + idx;
    return (
      `TurnIndex: ${turnIndex}
Question: ${smartTruncate(t.question || '', 260)}
Answer: ${smartTruncate(t.answer || '(no response)', 420)}
Flags: unanswered=${t.isUnanswered ? 'true' : 'false'}, meta=${isTurnNonScoringMeta(t) ? 'true' : 'false'}`
    );
  }).join('\n\n');

  return `
You are evaluating interview answers for a ${session.jobTitle} role.

## Job Description
${jobDescription}

## Task
For EACH turn:
- assign ONE topic
- assign a score

## STRICT RULES
- meta=true → score = null
- unanswered=true → score = 0
- otherwise → MUST be 1–10 (never null)

## Output format (STRICT JSON ONLY):
{
  "batchEvaluations": [
    {
      "turnIndex": 0,
      "topic": "API Design",
      "score": 7,
      "feedback": "Good explanation but lacked real example"
    }
  ]
}
`;
}
function normalizeBatchEvaluations(parsed, batchTurns, offset) {
  const raw = Array.isArray(parsed?.batchEvaluations)
    ? parsed.batchEvaluations
    : [];

  return batchTurns.map((turn, idx) => {
    const turnIndex = offset + idx;
    const fromIndex = raw.find((item) => Number(item?.turnIndex) === turnIndex);
    const fromOrder = raw[idx];
    const source = fromIndex || fromOrder || {};

    const metaTurn = isTurnNonScoringMeta(turn);
    const unanswered = !!turn.isUnanswered;

    let score;

    if (metaTurn) {
      score = null;
    } else if (unanswered) {
      score = 0;
    } else {
      const parsedScore = Number(source.score);
      score = Number.isFinite(parsedScore)
        ? Math.max(0, Math.min(10, parsedScore))
        : 5; // 🔥 fallback instead of null
    }

    return {
      turnIndex,
      score,
      feedback: metaTurn
        ? 'Clarification/correction turn (not scored)'
        : (typeof source.feedback === 'string' && source.feedback.trim()
          ? source.feedback.trim()
          : (unanswered ? 'No response given.' : 'Answer lacked clear evidence.')),
      topics: source.topic
        ? [source.topic]
        : (Array.isArray(source.topics) ? source.topics.slice(0, 3) : []),
      strengths: Array.isArray(source.strengths) ? source.strengths.slice(0, 3) : [],
      weaknesses: metaTurn ? [] : (Array.isArray(source.weaknesses) ? source.weaknesses.slice(0, 3) : []),
    };
  });
}
function buildFinalCalibrationPrompt(session, provisionalEvaluations) {
  const jobDescription = session.context?.jobDescription || '';

  const transcript = session.turns.map((t, i) => (
    `TurnIndex: ${i}
Question: ${smartTruncate(t.question || '', 200)}
Answer: ${smartTruncate(t.answer || '(no response)', 350)}`
  )).join('\n\n');

  const provisional = provisionalEvaluations.map(e => (
    `TurnIndex: ${e.turnIndex}, Score: ${e.score}, Feedback: ${e.feedback}`
  )).join('\n');

  return `
You are performing a FINAL evaluation for a ${session.jobTitle} interview.

## Job Description
${jobDescription}

## Instructions
- You MUST evaluate EVERY turn
- You MUST return perAnswerEvaluations
- Use provisional scores but refine them

## Rules
- meta turns → score = null
- unanswered → score = 0
- others → MUST be 1–10

## Evidence Rule
- Listing concepts only → max 6
- Real example/trade-off → 7+

## Transcript
${transcript}

## Provisional Scores
${provisional}

## OUTPUT (STRICT JSON ONLY)
{
  "perAnswerEvaluations": [
    {
      "turnIndex": 0,
      "score": 7,
      "feedback": "Clear but lacked real example",
      "topics": ["API Design"],
      "strengths": ["Structured thinking"],
      "weaknesses": ["No real scenario"]
    }
  ],
  "technicalScore": 1-10,
  "communicationScore": 1-10,
  "problemSolvingScore": 1-10,
  "overallVerdict": "Strong|Moderate|Weak",
  "strengths": [],
  "weaknesses": [],
  "recommendations": []
}

CRITICAL:
- Do NOT skip perAnswerEvaluations
- Return ONLY JSON
`;
} function smartTruncate(text, maxLen = 300) {
  const value = String(text || '').trim();
  if (value.length <= maxLen) return value;
  const head = Math.max(80, Math.floor(maxLen * 0.7));
  const tail = Math.max(40, maxLen - head - 5);
  return `${value.slice(0, head)} ... ${value.slice(-tail)}`;
}

function parseFinalSummary(text) {
  if (!text) return null;

  // 1. Direct parse
  try {
    return JSON.parse(text);
  } catch { }

  // 2. ```json block
  const block = text.match(/```json\s*([\s\S]*?)```/i);
  if (block) {
    try {
      return JSON.parse(block[1]);
    } catch { }
  }

  // 3. Fallback extraction
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch { }
  }

  return null;
}
function normalizeFinalSummary(summary, turns = []) {
  if (!summary || typeof summary !== 'object') return null;

  const turnCount = Array.isArray(turns) ? turns.length : 0;
  const inputEvaluations = Array.isArray(summary.perAnswerEvaluations)
    ? summary.perAnswerEvaluations
    : [];

  const normalizedPerAnswer = Array.from({ length: turnCount }, (_, idx) => {
    const byIndex = inputEvaluations.find((item) => Number(item?.turnIndex) === idx);
    const byOrder = inputEvaluations[idx];
    const source = byIndex || byOrder || {};

    const isUnanswered = turns[idx]?.isUnanswered;
    const nonScoringMetaTurn = isTurnNonScoringMeta(turns[idx]);
    const parsedScore = Number(source.score);
    const boundedScore = nonScoringMetaTurn
      ? null
      : (Number.isFinite(parsedScore)
        ? Math.max(0, Math.min(10, parsedScore))
        : (isUnanswered ? 0 : null));

    return {
      turnIndex: idx,
      score: boundedScore,
      feedback: nonScoringMetaTurn
        ? 'Candidate requested clarification or corrected speech-to-text interpretation. This turn is excluded from scoring impact.'
        : (typeof source.feedback === 'string' && source.feedback.trim()
          ? source.feedback.trim()
          : (isUnanswered ? 'No response given.' : '')),
      topics: Array.isArray(source.topics) ? source.topics.filter(Boolean).slice(0, 5) : [],
      strengths: Array.isArray(source.strengths) ? source.strengths.filter(Boolean).slice(0, 5) : [],
      weaknesses: nonScoringMetaTurn
        ? []
        : (Array.isArray(source.weaknesses) ? source.weaknesses.filter(Boolean).slice(0, 5) : []),
    };
  });

  return {
    perAnswerEvaluations: normalizedPerAnswer,
    technicalScore: normalizeAggregateScore(summary.technicalScore),
    communicationScore: normalizeAggregateScore(summary.communicationScore),
    problemSolvingScore: normalizeAggregateScore(summary.problemSolvingScore),
    overallVerdict: typeof summary.overallVerdict === 'string' ? summary.overallVerdict.trim() : '',
    strengths: Array.isArray(summary.strengths) ? summary.strengths.filter(Boolean).slice(0, 8) : [],
    weaknesses: Array.isArray(summary.weaknesses) ? summary.weaknesses.filter(Boolean).slice(0, 8) : [],
    recommendations: Array.isArray(summary.recommendations) ? summary.recommendations.filter(Boolean).slice(0, 8) : [],
  };
}

function normalizeAggregateScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(10, n));
}

function setInterviewEndMeta(session, {
  endReasonCode = '',
  endReasonSource = '',
  endReasonDetail = '',
  endInitiator = '',
  endTrigger = '',
  endedAtStage = '',
} = {}) {
  if (!session) return;

  const existing = session.interviewEndMeta || {};
  session.interviewEndMeta = {
    endReasonCode: String(endReasonCode || existing.endReasonCode || '').trim(),
    endReasonSource: String(endReasonSource || existing.endReasonSource || '').trim(),
    endReasonDetail: String(endReasonDetail || existing.endReasonDetail || '').trim().slice(0, 500),
    endInitiator: String(endInitiator || existing.endInitiator || '').trim(),
    endTrigger: String(endTrigger || existing.endTrigger || '').trim(),
    endedAtStage: String(endedAtStage || existing.endedAtStage || '').trim(),
    recordedAt: new Date(),
  };
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