# IntelliHire Interview Engine - Complete Flow

This document explains the full interview lifecycle from session creation to final evaluation, including edge-case handling for clarification and speech-to-text (STT) corrections.

## 1) High-Level Lifecycle

1. Create session
2. Start interview and generate first question
3. Repeat per-turn loop:
   - Receive candidate answer
   - Classify answer type (normal, unanswered, clarification/correction)
   - Generate next question (normal or simplified re-ask)
4. End interview (token-based or rule-based)
5. Run final multi-pass evaluation
6. Save structured summary and scoring

Primary implementation: backend/services/interviewService.js
Primary data model: backend/models/InterviewSession.js

---

## 2) Session Creation

Function: createSession(applicationId, candidateId)

What happens:

- Prevents retakes if a prior attempt exists for this application/candidate.
- Loads job + application profile context.
- Validates voice and face enrollment readiness.
- Builds candidate context text (name, location, experience, education, summary).
- Stores initial interview session with:
  - context (job description, requirements, candidate info, skills)
  - empty conversation history
  - empty turns

Important notes:

- Session starts in status: created
- No question is generated yet at this stage

---

## 3) Interview Start and First Question

Function: startSession(sessionId)

What happens:

- If already started/in-progress, returns current pending/resume question.
- If fresh session:
  - status -> started
  - startedAt set
  - system prompt built from persona + role context + phase rules
  - first question generated via LLM
  - question stored as turn index 0
  - questionCount initialized to 1
  - status -> in_progress

Question generation rules include:

- one concise focused question
- role-specific probing
- cross-examination and anti-generic instructions
- end token policy ([END_INTERVIEW])

---

## 4) Per-Turn Loop (submitAnswer)

Function: submitAnswer(sessionId, { answerText, turnIndex, answerDurationMs })

### 4.1 Answer classification

The answer is classified into:

- Unanswered: empty or no-response marker
- Clarification request: candidate asks to repeat/rephrase/clarify
- Correction statement: candidate corrects STT/wording (example: "I meant MERN, not MEAN")
- Normal answer

Helpers:

- isClarificationRequest(text)
- isCorrectionStatement(text)
- isClarificationOrCorrection(text)

### 4.2 Counters and silent logic

- Unanswered answers increase:
  - consecutiveSilent
  - totalUnanswered
- Clarification/correction does not count as silence penalty.

### 4.3 Next question decision

- If clarification/correction and re-ask limit not reached:
  - generateClarificationReaskQuestion(...)
  - ask same intent in simpler wording
  - phase tagged as follow_up
  - does NOT increment questionCount
- Otherwise:
  - generateNextQuestion(...)
  - normal progression rules apply
  - increments questionCount

### 4.4 Re-ask cap

- Config constant: INTERVIEW_MAX_REASK_ATTEMPTS (default 2)
- Prevents infinite clarification loops
- After cap is reached, system proceeds to normal next-question generation

Helpers:

- getReaskDepthForTurn(session, turnIndex)
- canIssueReaskForTurn(session, turnIndex)

---

## 5) Interview End Conditions

Interview ends when any of these is true:

1. consecutiveSilent >= 3
2. elapsed duration reached maxDurationSec
3. hard question cap reached (12)
4. LLM emits [END_INTERVIEW] when minimum depth is satisfied

When ending:

- status -> completing
- frontend calls completeSession(...)

---

## 6) Final Evaluation Strategy (Multi-Pass)

Function: completeSession(...)

### 6.1 Why multi-pass

Single-pass final scoring can degrade on long transcripts due to context limits and format drift. The system now uses multi-pass evaluation.

### 6.2 Pass A: Batch evaluations

Function: generateBatchEvaluations(session)

- Splits turns into small batches (size 4).
- Evaluates each batch with role context and strict rules.
- Produces provisional per-turn evaluations.

Prompt helper:

- buildBatchEvaluationPrompt(session, batchTurns, offset)

Normalization helper:

- normalizeBatchEvaluations(parsed, batchTurns, offset)

### 6.3 Pass B: Global calibration over full context

Function: generateFinalEvaluationWithCalibration(session)

- Builds compact full-transcript prompt + provisional batch results.
- LLM recalibrates all turns globally to keep consistency.
- Requires exact turn coverage in output.

Prompt helper:

- buildFinalCalibrationPrompt(session, provisionalEvaluations)

### 6.4 JSON repair retry

If first calibration output is malformed JSON:

- second strict retry is executed (temperature 0)
- then normalized by backend guardrails

### 6.5 Final normalization guardrails

Function: normalizeFinalSummary(summary, turns)

Enforces:

- exact turn alignment by turnIndex
- score bounds (0-10)
- aggregate score bounds (1-10)
- fallback behavior for missing fields
- edge-case overrides for clarification/correction

---

## 7) Scoring and Edge Cases

### 7.1 Clarification/correction turns

Examples:

- "I do not understand, can you repeat?"
- "I meant MERN, not MEAN"
- "STT/transcription is wrong"

Behavior:

- score is set to null
- feedback states the turn is excluded from scoring impact
- weaknesses list is not penalized for that turn
- aggregate scoring is not dragged down by that turn

### 7.2 Unanswered turns (true no-response)

Behavior:

- score set to 0
- explicit no-response feedback
- can contribute to silent-end conditions

### 7.3 Normal technical answers

Behavior:

- scored using evidence-based rubric
- final per-turn score calibrated against complete interview context

---

## 8) Question Count Semantics

- questionCount increases only for normal progression questions.
- clarification re-asks (follow_up) do not increase questionCount.
- This prevents unfair inflation of question count due to STT/clarification retries.

---

## 9) Data Saved in Final Summary

Returned by formatSessionSummary(session):

- session metadata (status, duration, total questions)
- scoring block (average, technical, communication, problem solving, verdict)
- integrity/voice/face proctoring reports
- full turns with question, answer, evaluation, and flags

---

## 10) Operational Notes

1. New logic applies to newly completed interviews.
2. Past completed sessions are not automatically recomputed.
3. You can tune behavior with:
   - INTERVIEW_MAX_REASK_ATTEMPTS
   - session config min/max duration
   - minQuestionsBeforeEnd
4. For best quality, keep prompts and regex edge-case patterns updated from real interview logs.

---

## 11) Quick Validation Checklist

Use this after deployments:

1. Clarification turn does not receive negative score.
2. STT correction turn (MERN vs MEAN) does not reduce overall score.
3. Clarification triggers simplified re-ask of same intent.
4. Re-ask loop stops at configured cap.
5. Final output contains per-turn evaluations for all turnIndex values.
6. Long interviews still return valid JSON and stable scoring.
