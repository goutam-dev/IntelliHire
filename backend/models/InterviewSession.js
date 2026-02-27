const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

/**
 * InterviewSession Model
 * 
 * Persists the complete lifecycle of an AI interview:
 *   CREATED → STARTED → IN_PROGRESS → COMPLETING → COMPLETED | TERMINATED
 * 
 * Each session tracks:
 *  - Conversation turns (question + answer + evaluation)
 *  - Cumulative scoring and topic coverage
 *  - Proctoring / integrity events
 *  - Final evaluation summary
 */

const turnSchema = new mongoose.Schema({
  index: { type: Number, required: true },
  phase: {
    type: String,
    enum: ['opening', 'main', 'closing', 'follow_up'],
    default: 'main',
  },
  question: { type: String, required: true },
  answer: { type: String, default: '' },
  answerDurationMs: { type: Number, default: 0 },
  isUnanswered: { type: Boolean, default: false },
  evaluation: {
    score: { type: Number, min: 0, max: 10, default: null },
    feedback: { type: String, default: '' },
    topics: [String],
    strengths: [String],
    weaknesses: [String],
  },
  askedAt: { type: Date, default: Date.now },
  answeredAt: { type: Date, default: null },
}, { _id: false });

const cheatingEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  label: { type: String },
  message: { type: String },
  count: { type: Number, default: 1 },
  points: { type: Number, default: 1 },
  totalPoints: { type: Number, default: 1 },
  firstAt: { type: Date },
  lastAt: { type: Date },
}, { _id: false });

const interviewSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    default: () => randomUUID(),
    unique: true,
    index: true,
  },
  applicationId: {
    type: String,
    required: true,
    index: true,
  },
  candidateId: {
    type: String,
    required: true,
    index: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  jobTitle: { type: String, default: 'Software Engineer' },

  // ── Session State ────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['created', 'started', 'in_progress', 'completing', 'completed', 'terminated', 'abandoned'],
    default: 'created',
    index: true,
  },

  // ── Interview Configuration ──────────────────────────────────────────────
  config: {
    minDurationSec: { type: Number, default: 20 * 60 },
    maxDurationSec: { type: Number, default: 30 * 60 },
    cheatingThreshold: { type: Number, default: 10 },
    minQuestionsBeforeEnd: { type: Number, default: 8 },
    llmModel: { type: String, default: 'llama-3.3-70b-versatile' },
  },

  // ── Timing ───────────────────────────────────────────────────────────────
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  totalDurationSec: { type: Number, default: 0 },
  totalPauseDurationSec: { type: Number, default: 0 },

  // ── Context (loaded at session start from application data) ──────────────
  context: {
    jobDescription: { type: String, default: '' },
    requirements: [String],
    candidateInfo: { type: String, default: '' },
    candidateName: { type: String, default: '' },
    resumeSummary: { type: String, default: '' },
    skills: [String],
  },

  // ── Conversation ─────────────────────────────────────────────────────────
  // Full message history in OpenAI format for LLM continuity
  conversationHistory: [{
    role: { type: String, enum: ['system', 'assistant', 'user'] },
    content: String,
  }],

  // Structured per-turn data
  turns: [turnSchema],

  // ── Interview Intelligence State ─────────────────────────────────────────
  interviewState: {
    currentPhase: {
      type: String,
      enum: ['opening', 'main', 'closing', 'wrap_up'],
      default: 'opening',
    },
    topicsCovered: [String],
    skillsProbed: [String],
    consecutiveSilent: { type: Number, default: 0 },
    totalUnanswered: { type: Number, default: 0 },
    difficultyLevel: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    lastEvalScore: { type: Number, default: null },
    lastEvalFeedback: { type: String, default: '' },
    questionCount: { type: Number, default: 0 },
  },

  // ── Scoring ──────────────────────────────────────────────────────────────
  scoring: {
    averageScore: { type: Number, default: null },
    technicalScore: { type: Number, default: null },
    communicationScore: { type: Number, default: null },
    problemSolvingScore: { type: Number, default: null },
    overallVerdict: { type: String, default: '' },
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
  },

  // ── Integrity / Anti-Cheating (Screen Events) ───────────────────────────────
  // Tracks tab switches, fullscreen exits, window blur etc.
  // Voice mismatch events are stored separately in voiceProctoring below.
  integrity: {
    cheatingEvents: [cheatingEventSchema],
    totalCheatingScore: { type: Number, default: 0 },
    integrityVerdict: {
      type: String,
      enum: ['clean', 'minor_flags', 'moderate_flags', 'high_flags', 'terminated'],
      default: 'clean',
    },
    terminationReason: { type: String, default: '' },
  },

  // ── Voice Proctoring (Speaker Verification) ──────────────────────────────────
  // Completely separate from integrity above.
  // Voice mismatches NEVER terminate or pause the interview — they are only logged.
  voiceProctoring: {
    speakerId:             { type: String, default: null },
    enrollmentStatus:      { type: String, enum: ['not_enrolled', 'enrolled', 'failed'], default: 'not_enrolled' },
    mismatches: [{
      timestamp:           { type: Number },  // seconds since interview start
      wallClockTime:       { type: Date },
      rawScore:            { type: Number },
      smoothedScore:       { type: Number },
      segmentDuration:     { type: Number },
      clipPath:            { type: String },  // relative path to saved WAV clip
      _id: false,
    }],
    totalMismatches:        { type: Number, default: 0 },
    totalSegmentsAnalyzed:  { type: Number, default: 0 },
    matchCount:             { type: Number, default: 0 },
    unsureCount:            { type: Number, default: 0 },
    sessionStats:           { type: mongoose.Schema.Types.Mixed, default: null },
    wsSessionId:            { type: String, default: null },
    startedAt:              { type: Date, default: null },
    stoppedAt:              { type: Date, default: null },
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ── Indexes ──────────────────────────────────────────────────────────────────
interviewSessionSchema.index({ applicationId: 1, status: 1 });
interviewSessionSchema.index({ candidateId: 1, createdAt: -1 });

// ── Virtual: isActive ────────────────────────────────────────────────────────
interviewSessionSchema.virtual('isActive').get(function () {
  return ['created', 'started', 'in_progress'].includes(this.status);
});

// ── Methods ──────────────────────────────────────────────────────────────────
interviewSessionSchema.methods.computeScoring = function () {
  const scored = this.turns.filter(t => t.evaluation?.score != null);
  if (!scored.length) return;

  const avg = scored.reduce((sum, t) => sum + t.evaluation.score, 0) / scored.length;
  this.scoring.averageScore = Math.round(avg * 10) / 10;

  // Determine verdict
  if (avg >= 7) this.scoring.overallVerdict = 'Strong Performance';
  else if (avg >= 5) this.scoring.overallVerdict = 'Moderate Performance';
  else this.scoring.overallVerdict = 'Needs Improvement';
};

interviewSessionSchema.methods.computeIntegrityVerdict = function () {
  const score = this.integrity.totalCheatingScore;
  const threshold = this.config.cheatingThreshold;

  if (score === 0) this.integrity.integrityVerdict = 'clean';
  else if (score < threshold * 0.4) this.integrity.integrityVerdict = 'minor_flags';
  else if (score < threshold * 0.7) this.integrity.integrityVerdict = 'moderate_flags';
  else if (score >= threshold) this.integrity.integrityVerdict = 'terminated';
  else this.integrity.integrityVerdict = 'high_flags';
};

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
