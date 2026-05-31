# IntelliHire Frontend

React application for IntelliHire. This UI covers candidate and employer experiences, interview proctoring, and real-time notifications.

## Responsibilities
- Candidate portal: profile completion, job browsing, application submission, interview participation
- Employer portal: job management, application review, interview scheduling, analytics
- Proctoring interface: camera and microphone capture, integrity alerts, interview progress
- Real-time notifications via WebSocket

## Tech stack
- React 19, Vite 7
- Tailwind CSS 4, Radix UI primitives
- Redux Toolkit, React Router
- Clerk authentication
- React Hook Form and Zod for validation
- Axios API client with Clerk token interceptors

## Structure
- src/pages: candidate and employer routes
- src/components: shared UI, forms, dashboards, proctoring widgets
- src/hooks: interview engine, audio recorder, VAD, notifications
- src/services/api: REST clients for backend endpoints
- src/store: Redux slices for auth, jobs, applications, profiles, notifications

## Configuration (from code)
- VITE_API_BASE_URL (defaults to http://localhost:4000/api)
- VITE_CLERK_PUBLISHABLE_KEY

## Local entry points
- npm run dev
- npm run build
- npm run preview