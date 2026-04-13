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
const notificationService = require('./notificationService');

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
    `You are rigorous, fair, and know exactly what separates great ${title}s from average ones. ` +
    `You have personally hired dozens of ${title}s and consistently evaluate evidence, depth, and role fit. ` +
    `Your interview style is conversational yet precise: you push deeper when you spot strong signals, ` +
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
  const qCount = interviewState.questionCount || 0;
  const unanswered = interviewState.totalUnanswered || 0;
  const minQuestionsBeforeEnd = Math.max(6, config?.minQuestionsBeforeEnd || 8);
  const candidateName = context.candidateName?.trim() || 'the candidate';

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
  prompt +=
    `## Interview Objective\n` +
    `Assess technical depth, practical execution ability, communication clarity, and ownership for this ${jobTitle} role. ` +
    `Every question must produce high-signal evidence that helps hiring decisions.\n\n`;

  prompt +=
    `## Question Design Rules\n` +
    `- Ask exactly ONE question per turn.\n` +
    `- Keep questions concise (max 35 words), specific, and role-relevant.\n` +
    `- Prefer evidence-seeking prompts: ask for concrete examples, decisions, trade-offs, metrics, and outcomes.\n` +
    `- Avoid generic fillers (e.g., "Tell me about yourself" after opening, "Any final thoughts").\n` +
    `- Avoid repeating covered topics unless a deeper follow-up is clearly justified.\n` +
    `- Do not include commentary, praise, scoring, or explanations in output.\n\n`;

  prompt +=
    `## Progression Strategy\n` +
    `- Questions 1-2: establish role context and recent hands-on work.\n` +
    `- Questions 3-6: deep technical and execution probing with realistic scenarios.\n` +
    `- Questions 7+: challenge edge cases, trade-offs, failure handling, and prioritization under constraints.\n\n`;

  // Adaptive difficulty based on last evaluation
  if (lastEval?.score != null) {
    if (lastEval.score >= 7) {
      prompt += `The candidate's last answer was strong (score ${lastEval.score}/10: "${lastEval.feedback}"). ` +
        `Escalate difficulty with a deeper follow-up, architectural trade-off, or edge-case stress test.\n\n`;
    } else if (lastEval.score <= 4) {
      prompt += `The candidate's last answer was weak (score ${lastEval.score}/10: "${lastEval.feedback}"). ` +
        `Pivot to another key requirement and ask a clearer but still rigorous question.\n\n`;
    } else {
      prompt += `The last answer was average (score ${lastEval.score}/10). Continue with a targeted follow-up or adjacent topic.\n\n`;
    }
  }

  if (unanswered > 0) {
    prompt +=
      `The candidate has ${unanswered} unanswered question(s). If they were recently silent, ` +
      `use a simpler, direct prompt that is easier to answer while still evaluating a core requirement.\n\n`;
  }

  // Topic awareness — avoid repetition
  if (interviewState.topicsCovered?.length > 0) {
    prompt += `## Topics Already Covered\n${interviewState.topicsCovered.join(', ')}\n` +
      `Avoid repeating these topics unless you need a deeper follow-up.\n\n`;
  }

  if (qCount === 0) {
    prompt +=
      `This is the FIRST question. Begin with one short welcome sentence, mention ${candidateName}, and ask for ` +
      `their most relevant recent experience for this ${jobTitle} role with one concrete project example.`;
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
      `(a) you have asked at least ${minQuestionsBeforeEnd} questions, AND ` +
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
      }).catch(() => {});
    }

    await JobApplication.findOneAndUpdate(
      { applicationId, status: 'Interview Scheduled' },
      { status: 'Interviewed' }
    ).catch(() => {});

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

  // Keep per-turn evaluation empty until interview completion.
  turn.evaluation = {
    score: null,
    feedback: '',
    topics: [],
    strengths: [],
    weaknesses: [],
  };

  const nextQuestionResult = await Promise.allSettled([
    generateNextQuestion(session),
  ]).then((results) => results[0]);

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

  if (shouldEnd) {
    session.status = 'completing';
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

  session.computeIntegrityVerdict();

  // Calculate total duration
  if (session.startedAt) {
    session.totalDurationSec = Math.floor((session.completedAt - session.startedAt) / 1000);
  }

  // ── Generate Final Evaluation via LLM with full transcript context ─────
  try {
    const summaryPrompt = buildFinalSummaryPrompt(session);
    const summaryText = await callGroqChat([
      { role: 'system', content: summaryPrompt },
    ], { maxTokens: 900, temperature: 0.2 });

    const summary = normalizeFinalSummary(parseFinalSummary(summaryText), session.turns);
    if (summary) {
      const perAnswer = Array.isArray(summary.perAnswerEvaluations)
        ? summary.perAnswerEvaluations
        : [];

      session.turns.forEach((turn, idx) => {
        const byIndex = perAnswer.find((item) => Number(item?.turnIndex) === idx);
        const byOrder = perAnswer[idx];
        const source = byIndex || byOrder;

        if (source) {
          turn.evaluation = {
            score: typeof source.score === 'number' ? source.score : null,
            feedback: source.feedback || '',
            topics: Array.isArray(source.topics) ? source.topics : [],
            strengths: Array.isArray(source.strengths) ? source.strengths : [],
            weaknesses: Array.isArray(source.weaknesses) ? source.weaknesses : [],
          };
        } else if (turn.isUnanswered) {
          turn.evaluation = {
            score: 0,
            feedback: 'No response given.',
            topics: [],
            strengths: [],
            weaknesses: ['No response'],
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

function getPhaseForElapsed(elapsedSec, config) {
  const minSec = config?.minDurationSec || 20 * 60;
  const maxSec = config?.maxDurationSec || 30 * 60;

  if (elapsedSec < 5 * 60) return 'opening';
  if (elapsedSec < minSec) return 'main';
  if (elapsedSec < maxSec) return 'closing';
  return 'wrap_up';
}

function buildFinalSummaryPrompt(session) {
  const turns = session.turns.map((t, i) => (
    `TurnIndex: ${i}\n` +
    `Phase: ${t.phase || 'main'}\n` +
    `Question: ${t.question}\n` +
    `Answer: ${t.answer || '(no response)'}\n` +
    `Answered: ${t.isUnanswered ? 'NO' : 'YES'}`
  )).join('\n\n');

  const messageHistory = (session.conversationHistory || [])
    .filter((m) => m?.role && m.role !== 'system')
    .map((m, idx) => `${idx + 1}. ${m.role.toUpperCase()}: ${String(m.content || '').slice(0, 1000)}`)
    .join('\n');

  const requirements = Array.isArray(session.context?.requirements)
    ? session.context.requirements.filter(Boolean)
    : [];
  const skills = Array.isArray(session.context?.skills)
    ? session.context.skills.filter(Boolean)
    : [];

  return (
    `You are a principal hiring evaluator conducting a final assessment for a ${session.jobTitle} interview.\n\n` +
    `## Evaluation Goal\n` +
    `Score each answer only AFTER reviewing the complete interview context. ` +
    `Use later answers to calibrate earlier ambiguous answers (and vice versa), while still assigning a distinct score per turn.\n\n` +
    `## Role Context\n` +
    `Job Title: ${session.jobTitle}\n` +
    `Key Requirements: ${requirements.length ? requirements.join('; ') : 'Not provided'}\n` +
    `Candidate Skills: ${skills.length ? skills.join(', ') : 'Not provided'}\n\n` +
    `## Structured Interview Turns\n${turns}\n\n` +
    `## Complete Conversation History\n${messageHistory || 'Not available'}\n\n` +
    `## Scoring Rubric (0-10 per turn)\n` +
    `- 9-10: exceptional depth, precise reasoning, clear ownership, strong trade-off analysis.\n` +
    `- 7-8: solid and mostly complete, minor gaps but technically credible.\n` +
    `- 5-6: partially correct, moderate gaps in detail, weak evidence.\n` +
    `- 3-4: shallow or inconsistent understanding, major missing reasoning.\n` +
    `- 0-2: incorrect, evasive, or no meaningful response.\n\n` +
    `## Evaluation Rules\n` +
    `- Evaluate ALL turns from TurnIndex 0 to TurnIndex ${Math.max(session.turns.length - 1, 0)}.\n` +
    `- Return EXACTLY ${session.turns.length} objects in perAnswerEvaluations.\n` +
    `- For unanswered turns, set score to 0 and explain briefly.\n` +
    `- feedback must be 1-2 concise sentences and reference concrete evidence from the interview context.\n` +
    `- topics, strengths, weaknesses should be specific and non-generic.\n` +
    `- Keep overall scores consistent with per-turn evidence.\n\n` +
    `Respond ONLY with valid JSON (no markdown, no prose) in this schema:\n` +
    `{\n` +
    `  "perAnswerEvaluations": [\n` +
    `    {\n` +
    `      "turnIndex": <number>,\n` +
    `      "score": <0-10>,\n` +
    `      "feedback": "<1-2 sentence rationale with evidence>",\n` +
    `      "topics": ["<topic>"],\n` +
    `      "strengths": ["<strength>"],\n` +
    `      "weaknesses": ["<weakness>"]\n` +
    `    }\n` +
    `  ],\n` +
    `  "technicalScore": <1-10>,\n` +
    `  "communicationScore": <1-10>,\n` +
    `  "problemSolvingScore": <1-10>,\n` +
    `  "overallVerdict": "<Strong Performance|Moderate Performance|Needs Improvement>",\n` +
    `  "strengths": ["..."],\n` +
    `  "weaknesses": ["..."],\n` +
    `  "recommendations": ["..."]\n` +
    `}`
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
    const parsedScore = Number(source.score);
    const boundedScore = Number.isFinite(parsedScore)
      ? Math.max(0, Math.min(10, parsedScore))
      : (isUnanswered ? 0 : null);

    return {
      turnIndex: idx,
      score: boundedScore,
      feedback: typeof source.feedback === 'string' && source.feedback.trim()
        ? source.feedback.trim()
        : (isUnanswered ? 'No response given.' : ''),
      topics: Array.isArray(source.topics) ? source.topics.filter(Boolean).slice(0, 5) : [],
      strengths: Array.isArray(source.strengths) ? source.strengths.filter(Boolean).slice(0, 5) : [],
      weaknesses: Array.isArray(source.weaknesses) ? source.weaknesses.filter(Boolean).slice(0, 5) : [],
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
