# IntelliHire

IntelliHire is a full-stack recruitment platform that combines candidate and employer workflows with AI-driven resume analysis and interview proctoring. The system is split into a React frontend, an Express/MongoDB backend, and two Python microservices for voice and face proctoring.

## System Overview

### Frontend (React + Vite)
- React app with routing for candidate and employer flows
- Clerk-based authentication with protected routes
- Redux Toolkit store slices for auth, jobs, candidates, employers, applications, notifications
- Candidate UI includes job browsing, applications, profile management, and interview proctoring
- Employer UI includes job management, application review, and dashboards

### Backend (Node.js + Express + MongoDB)
- Express API with Clerk webhooks, CORS, and security middleware
- MongoDB persistence via Mongoose models
- REST endpoints for auth, candidates, employers, jobs, applications, interviews, resume ranking, notifications
- Interview orchestration (LLM-driven Q and A, Whisper STT, and proctoring integration)

### Resume Module (Multi-Agent LLM Council)
The resume module runs a four-agent council that produces structured analysis and a final verdict for a job application.

Pipeline (LLM Council path):
1. Parse resume file into text and sections
2. Build a normalized job description text
3. Agent 1 and Agent 2 run in parallel
4. Agent 3 scores the match and explains reasoning
5. Agent 4 validates the outputs and produces the final verdict

Agents and outputs:
- Agent 1: JD Information Extractor
  - Extracts job_title, required_skills, preferred_skills, minimum_experience_years, education_requirements, job_responsibilities, keywords
- Agent 2: Resume Technical Analyzer
  - Extracts skills, years_of_experience, projects, education, certifications, tools_and_technologies
- Agent 3: Semantic Matching and Scoring
  - Produces skill_match_score, experience_match_score, project_relevance_score, education_score, overall_score
  - Returns matched_skills, missing_skills, and reasoning
- Agent 4: Supervisor and Quality Controller
  - Validates agent outputs and returns final_resume_score, verdict, strengths, weaknesses, confidence_level, explanation

Resume analysis data is stored in the ResumeAnalysis model:
- resumeText, jobDescriptionText
- jdExtraction, resumeTechnicalAnalysis, matchingScore, supervisorVerdict
- aiModelMetadata, performanceMetrics, processingStatus, processingError

API endpoints (backend):
- POST /api/resume-ranking/analyze/:applicationId
- GET  /api/resume-ranking/results/:applicationId
- GET  /api/resume-ranking/detailed/:applicationId
- GET  /api/resume-ranking/status/:applicationId
- GET  /api/resume-ranking/top-candidates/:jobId
- GET  /api/resume-ranking/statistics/:jobId
- POST /api/resume-ranking/reanalyze/:applicationId
- POST /api/resume-ranking/batch-analyze/:jobId

Frontend integration:
- resumeRankingApi service wraps the endpoints
- ResumeUpload and ResumeSection components handle PDF resume upload (max 5MB) in candidate profile

Local test script:
- backend/test-resume-ranking.js executes the LLM Council pipeline end-to-end with sample data

### Interview Orchestration and Proctoring
- Interview sessions are created and managed in the backend
- Groq LLM is used for question generation and evaluation
- Whisper STT (Groq) transcribes audio answers
- Voice and face proctoring are started and streamed during interviews
- Application submissions can include video; backend extracts audio for voice enrollment and frames for face enrollment

## Proctoring Services

### Voice Verification Service (Python FastAPI)
- Entry point: voice_verification_only/server.py
- Endpoints:
  - GET  /api/health
  - POST /api/enroll (multipart audio)
  - WS   /ws/verify/{session_id}?speaker_id=...
- Pipeline:
  - Silero VAD segments speech
  - ResNet34 (pyannote.audio) extracts embeddings
  - Cosine similarity with smoothing determines MATCH / MISMATCH / UNSURE

Backend integration:
- VOICE_SERVICE_URL controls the service base URL (default http://localhost:8000)
- Voice enrollment runs during application processing
- Real-time verification runs over WebSocket during interviews

### Face and Object Proctoring Service (Python FastAPI)
- Entry point: Face proctoring/app/main.py
- Endpoints:
  - POST /api/register (video frame batch for canonical embedding)
  - WS   /ws/analyze (streamed frames for verification + object detection)
- Pipeline:
  - InsightFace ArcFace embeddings for face verification
  - MiniFASNetV2 anti-spoofing plus MediaPipe blink/pose checks
  - YOLOv8 object detection with alert logic for suspicious objects

Backend integration:
- FACE_SERVICE_URL controls the service base URL (default http://localhost:8001)
- Face enrollment runs during application processing
- Real-time verification runs over WebSocket during interviews

## Project Structure

- backend: Express API, Mongoose models, resume ranking, interview orchestration
- frontend: React app, routes for candidate and employer experiences
- Face proctoring: unified face verification + object detection service
- voice_verification_only: speaker enrollment and verification service

## Local Development (Code-Defined Entrypoints)

Backend
- npm run dev (nodemon) or npm start

Frontend
- npm run dev (Vite)

Voice verification service
- python server.py (FastAPI app defined in voice_verification_only/server.py)

Face proctoring service
- FastAPI app defined in Face proctoring/app/main.py

## Configuration (from code)

Backend
- PORT, MONGODB_URI, CORS_ORIGIN
- CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, CLERK_WEBHOOK_SECRET

Resume module
- AI_API_PROVIDER, GROQ_API_KEY, GROQ_MODEL
- OPENROUTER_API_KEY, OPENROUTER_MODEL
- HUGGINGFACE_API_KEY, OPENAI_API_KEY, LOCAL_LLM_URL
- FORCE_DETERMINISTIC_SCORING

Proctoring services
- VOICE_SERVICE_URL
- FACE_SERVICE_URL
