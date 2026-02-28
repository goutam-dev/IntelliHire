# IntelliHire: Technical Documentation

## 1. Executive Overview

### What the system does
IntelliHire is an intelligent recruitment and interview automation system. It bridges the gap between employers and candidates by automating job postings, candidate applications, resume screening, and conducting AI-driven technical interviews with voice proctoring and browser-based anti-cheating measures.

### Core features
- **Employer Portal**: Post jobs, manage applications, view candidate profiles, and review auto-generated interview summaries and cheating reports.
- **Candidate Portal**: Browse jobs, apply with resumes, and participate in automated AI-led interviews.
- **AI Resume Ranking**: A hybrid pipeline (or LLM multi-agent pipeline) that extracts Job Description (JD) details, analyzes resumes technically, performs semantic matching, and assigns an overall score.
- **AI-Led Technical Interviews**: A dynamic, context-aware interview utilizing Groq's LLMs to ask tailored questions and evaluate candidate responses via voice in real-time.
- **Voice Proctoring & Integrity**: Real-time voice verification ensures the speaker matches the originally enrolled candidate. Browser-based anti-cheating tracks tab switches, fullscreen exits, and window blurs.

### Target users
- **Employers/Recruiters**: Seeking to automate the initial screening and interviewing phases to save time and enforce baseline technical quality.
- **Candidates**: Applying for jobs and undertaking asynchronous technical interviews.

### High-level workflow
1. **Employer** posts a Job.
2. **Candidate** creates a profile and applies for the Job, uploading a resume.
3. **System** asynchronously ranks the resume against the JD using semantic ranking.
4. **Candidate** enters the proctored interview arena. They agree to terms, grant camera/mic/screen permissions, and begin.
5. **Interview Flow**: System asks AI-generated questions via TTS. Candidate answers via voice. Audio is captured, transcribed (via Whisper), and evaluated.
6. **Integrity Flow**: Concurrently, a Voice Verification Service runs via WebSockets, verifying the candidate's voice against a baseline enrollment embedding. Browser events trigger cheating score accumulations if the candidate switches tabs or exits the application.
7. **System** concludes the interview and generates a summary/score.
8. **Employer** reviews the final score, transcript, and proctoring integrity report.


## 2. System Architecture

### Overall Architecture
IntelliHire employs a decoupled client-server architecture:
- **Frontend**: React-based SPA using Vite, Redux and TailwindCSS. Authentication is managed by Clerk.
- **Backend Core API**: Node.js/Express service handling business logic, MongoDB for persistence, and routing to AI utilities and external services.
- **Voice Verification Service**: A standalone Python FastAPI/WebSockets microservice dedicated exclusively to creating speaker embeddings (using `pyannote/embedding`) and performing real-time Cosine Similarity verification on incoming audio streams.

### Service Breakdown
1. **Core Backend (Node.js)**:
   - **Auth/Users**: Handles Clerk webhooks/token verification and manages User schemas.
   - **Jobs/Applications**: CRUD for job postings and tracking candidate applications.
   - **AI Resume Ranking**: System interacting with LLMs to score resumes.
   - **Interview Engine**: Orchestrates the interview logic, interacts with Groq for question generation/evaluation, and manages session state.
   
2. **Voice Verification Module (Python)**:
   - Built with FastAPI. Provides REST (`/api/enroll`) and WebSocket (`/ws/verify/{speaker_id}`) endpoints.
   - Uses `silero-vad` for Voice Activity Detection and `speechbrain/spkrec-ecapa-voxceleb` (via Pyannote) for extracting speaker embeddings.

3. **Frontend Proctoring**:
   - Uses browser APIs (`visibilitychange`, `blur`, `fullscreenchange`) to detect unauthorized actions and computes a "Cheating Score".

## 3. Database Schema Document (MongoDB/Mongoose)

### Key Collections & Relationships
- **User**: The base entity. Stores `clerkUserId`, `email`, `role` (candidate/employer).
- **CandidateProfile** / **EmployerProfile**: Linked 1:1 with User. Stores resume details, skills, or company information.
- **Job**: Created by Employer. Defines the role, requirements, skills.
- **JobApplication**: Links a Candidate to a Job. Tracks status.
- **ResumeAnalysis**: Stores the output of the resume AI ranking pipeline.
- **InterviewSession**: The central document for the interview module.
  - `status`: initializing, in-progress, completed, terminated.
  - `evaluations`: Array of `{ question, answer, score, feedback, timestamp }`.
  - `scoring`: Aggregated final scores.
  - `integrity`: Proctoring details (cheating events array and voice mismatch logs).

## 4. Deep Dive: Interview Module Implementation

The Interview Module is the most complex component of the IntelliHire platform. It is currently fully implemented as a dynamic, voice-driven, LLM-powered state machine that actively evaluates the candidate in real-time.

### A. Frontend Architecture (React Hooks)
The frontend interview arena (`InterviewProctoring.jsx`) relies on a robust set of custom hooks to manage hardware and state:
1. **`useInterviewEngine.js`**: The core state machine. It handles transitions between states (`INITIALIZING` → `ASKING` → `LISTENING` → `PROCESSING` → `COMPLETING` → `DONE`). It tracks elapsed time, drives the Browser SpeechSynthesis (TTS) to ask questions, and coordinates the VAD and Audio Recorder.
2. **`useVAD.js` (Voice Activity Detection)**: Analyzes the candidate's mic stream using a continuous AudioContext interval. If energy levels drop below a threshold for a set duration, it fires an `onSilenceTimeout` callback, signaling the candidate has finished answering.
3. **`useAudioRecorder.js`**: Records the raw MediaStream into WebM blobs securely. When `useVAD` detects silence, `useInterviewEngine` stops this recorder and sends the WebM blob to the backend for transcription.
4. **`useVoiceProctoring.js`**: In the background (during the `LISTENING` phase), this hook converts the 16kHz audio stream into Float32 pcm chunks and pushes them over HTTP POST to the backend continuously for real-time speaker verification.

### B. Backend Interview Controller & LLM Integration
The backend (`interviewService.js`) orchestrates the AI logic using Groq's high-speed LLM APIs (`llama-3.3-70b-versatile`) and OpenAI-compatible endpoints.

**1. The "Turn" Lifecycle**:
- When the Frontend sends the WebM blob, the backend first proxies it to **Groq Whisper** for speech-to-text (STT).
- The text answer is injected into the conversation history.
- The service performs **two LLM calls simultaneously** to eliminate idle/waiting time for the candidate:
   - **Evaluation**: The LLM acts as a strict technical interviewer, scoring the answer (1-10), providing feedback, and identifying topics. This is saved to MongoDB.
   - **Generation**: The LLM looks at the conversation history and previous score to generate the *next* question dynamically.

**2. Dynamic Prompt Engineering & Adaptive Difficulty**:
- The prompt is injected with a "Persona" dynamically generated based on the Job Title (e.g., *a Senior React Developer with 15+ years of experience*).
- **Time-Aware Phasing**: The system knows the elapsed seconds of the session. It injects a "Phase Hint" into the system prompt:
  - `< 5 mins`: Tell the LLM to ask introductory/warm-up questions.
  - `Middle`: Tell the LLM to probe deeply on technical topics, referencing the candidate's resume directly.
  - `Late`: Tell the LLM to ask concluding/culture-fit questions before finalizing.
- **Adaptive Cross-Examination**: If the previous answer scored high (`≥7`), the LLM is prompted to dig deeper into edge cases on that specific topic. If the score was low (`≤4`), the LLM pivots completely to a new topic to give the candidate a fresh chance.

**3. Session Completion**:
Once the interview hits the time limit or the LLM decides they have enough data, the `COMPLETE` phase is triggered. The backend generates an overall performance summary, a final verdict (`Excellent`, `Good`, `Average`, `Poor`), highlights strengths and weaknesses, and locks the Mongoose document.

### C. Frontend Integrity System (Anti-Cheating)
While the frontend interview runs, the system enforces strict browser rules.
- **Violations**: The `visibilitychange` (tab switch), `blur` (window focus lost), and `fullscreenchange` events are tracked.
- **Scoring System**: Violations carry weights (e.g., tab switch = 2 points, exit fullscreen = 3 points, copy/paste attempt = 4 points).
- **Enforcement**: If the candidate accrues 10 points (e.g., switching tabs 5 times), the system immediately terminates the interview automatically and logs a "Terminated due to Integrity violation" event.

### D. Real-Time Voice Verification (Proctoring)
- **Audio Routing**: The continuous flow of `Float32` arrays sent to the Node backend are instantly piped to the Python FastAPI WebSocket endpoint.
- **VAD & Embedding**: The Python service uses `silero-vad` on the buffer. Once speech is isolated, it extracts an embedding utilizing `speechbrain`.
- **Cosine Verification**: It compares the live embedding against the `.pt` file generated during application. If similarity drops below `0.3`, it logs a "Mismatch". Because voice models can have momentary false rejections, the backend uses EMA (Exponential Moving Average) smoothing before confirming a mismatch. Mismatches are logged to the MongoDB session but do *not* automatically terminate the interview (to prevent false-positive interruptions).

## 5. Security & Environment Configuration

### Security Measures
- **Authentication**: JWT-based session management managed securely by Clerk (`@clerk/clerk-sdk-node`).
- **Role-based Access Control (RBAC)**: Enforced at the middleware level (e.g., `requireRole('employer')`).
- **Interview Integrity Check**: The backend verifies `jobApplication` ownership and ensures interviews cannot be re-taken once completed.

### Deployment & Environment
- Expected environment variables: `GROQ_API_KEY` (for LLM/Whisper operations) and `CLERK_SECRET_KEY` (Auth).
- File uploads currently utilize local disk storage via `multer` in `/uploads/`. (Note for horizontal scaling: transition to cloud S3 buckets).

## 6. Code Quality Review & Tech Debt

**Identified Technical Debt**:
1. **File Uploads/State Persistence**: `multer` stores files on local disk. Transitioning to cloud object storage (S3) is required for production scaling.
2. **Voice Streaming Intermediary**: The frontend sends PCM stream HTTP POSTs continuously, which the Node backend then pipes over identical WebSocket connections. It would be significantly more efficient to establish a single secure WebSocket directly from the Frontend to the Node backend (or Python service via secure proxy), drastically reducing Node.js HTTP overhead.
3. **Controller/Service Coupling**: The Interview controller handles both standard REST lifecycle operations and continuous streaming proxy operations. Extracting the streaming proxies into dedicated handler files would clean up controller logic.
