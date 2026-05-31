# IntelliHire Backend

Express API for IntelliHire. This service owns core business logic, persistence, interview orchestration, resume ranking, and proctoring integration.

## Responsibilities
- Auth and role enforcement via Clerk JWT validation and webhooks
- Candidate and employer profile management
- Job posting, application workflow, and status updates
- AI resume ranking orchestration
- AI interview session lifecycle, question generation, evaluation, and transcription
- Voice and face proctoring integration with Python microservices
- Notification delivery over email and WebSocket

## Architecture
- MVC-style structure: Mongoose models, controllers, and service layer
- Centralized configuration and env validation in config/index.js
- WebSocket hub for notifications and proctoring streams
- Local file storage under uploads/

## API surface (route groups)
- /api/auth
- /api/candidate
- /api/employer
- /api/jobs
- /api/job-applications
- /api/interview
- /api/resume-ranking
- /api/notifications

## Proctoring integration
- Voice service: POST /api/enroll and WS /ws/verify/{session_id}
- Face service: POST /api/register and WS /ws/analyze
- Enrollment is triggered from application submission; verification streams during interviews
- Voice and face alerts are persisted in InterviewSession records


## Configuration (from code)
Core
- PORT, NODE_ENV, MONGODB_URI, CORS_ORIGIN, APP_URL

Auth
- CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, CLERK_WEBHOOK_SECRET
- CLERK_USER_CACHE_TTL_MS, AUTH_DEBUG_CACHE

AI and interviews
- GROQ_API_KEY, GROQ_MODEL, INTERVIEW_MAX_REASK_ATTEMPTS
- AI_API_PROVIDER, OPENROUTER_API_KEY, OPENROUTER_MODEL
- HUGGINGFACE_API_KEY, OPENAI_API_KEY, LOCAL_LLM_URL
- USE_HYBRID_RANKING, FORCE_DETERMINISTIC_SCORING

Proctoring
- VOICE_SERVICE_URL, FACE_SERVICE_URL
- ENROLLMENT_RECOVERY_COOLDOWN_MS, INTERVIEW_START_GRACE_MS

Email and notifications
- EMAIL_ENABLED, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM

## Local entry point
- npm run dev (nodemon)
