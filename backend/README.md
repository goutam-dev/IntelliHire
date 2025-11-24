# IntelliHire Backend

RESTful API backend for the IntelliHire job application platform, built with Node.js, Express, and MongoDB.

## Features

- 🔐 **Authentication**: Clerk-based authentication with OAuth support
- 👥 **User Management**: Separate candidate and employer profiles
- 💼 **Job Management**: Create, update, and manage job postings
- 📝 **Application System**: Full application lifecycle management
- 📁 **File Uploads**: Secure resume and profile photo handling
- 🔒 **Security**: Rate limiting, CORS, helmet headers, input validation
- 📊 **Statistics**: Real-time dashboard statistics with reconciliation
- 🔍 **Search**: Full-text search on jobs with weighted results

## Prerequisites

- Node.js >= 16.x
- MongoDB >= 5.x
- Clerk account (for authentication)

## Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your values:
   - `CLERK_SECRET_KEY`: Get from Clerk Dashboard
   - `CLERK_WEBHOOK_SECRET`: Set up webhook in Clerk Dashboard
   - `MONGODB_URI`: Your MongoDB connection string

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run reconcile-stats` - Reconcile application statistics

## API Documentation

### Authentication Routes (`/api/auth`)

- `POST /complete-signup` - Complete user registration
- `GET /user-role` - Get authenticated user's role
- `POST /check-email` - Check if email exists
- `POST /webhook` - Clerk webhook handler

### Candidate Routes (`/api/candidate`)

All routes require authentication.

- `GET /profile` - Get candidate profile
- `PUT /profile` - Update basic info
- `POST /resume` - Upload resume
- `DELETE /resume` - Delete resume
- `POST /photo` - Upload profile photo
- `DELETE /photo` - Delete profile photo
- `POST /education` - Add education entry
- `PUT /education/:id` - Update education entry
- `DELETE /education/:id` - Delete education entry
- `POST /experience` - Add work experience
- `PUT /experience/:id` - Update experience entry
- `DELETE /experience/:id` - Delete experience entry
- `PUT /skills` - Update skills
- `GET /completion` - Get profile completion status
- `GET /dashboard/stats` - Get dashboard statistics

### Job Routes (`/api/jobs`)

- `GET /` - List all active jobs (public)
- `GET /:jobId` - Get job details
- `POST /` - Create job (employer only)
- `PUT /:jobId` - Update job (employer only)
- `PATCH /:jobId/status` - Update job status (employer only)
- `DELETE /:jobId` - Delete job (employer only)

### Job Application Routes (`/api/job-applications`)

- `GET /check/:jobId` - Check application status
- `GET /profile-data` - Get profile data for application
- `POST /apply` - Submit job application
- `GET /my-applications` - Get candidate's applications
- `GET /:applicationId` - Get application details
- `PATCH /:applicationId/withdraw` - Withdraw application
- `GET /download-resume` - Download resume

### Employer Routes (`/api/employer`)

All routes require employer role.

- `GET /profile` - Get employer profile
- `PUT /profile` - Update employer profile
- `POST /profile/logo` - Upload company logo
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /jobs/:jobId/applications` - List applications for job
- `PATCH /applications/:id/status` - Update application status
- `PATCH /applications/bulk/status` - Bulk update application statuses
- `POST /applications/:id/interview` - Schedule interview

## Security Features

### Input Validation
- Email format validation
- Phone number validation
- URL validation
- String sanitization (removes HTML tags)
- File type and size validation
- Path traversal prevention

### Rate Limiting
- General API: 100 requests per 15 minutes (production)
- Auth endpoints: 10 requests per 15 minutes

### File Upload Security
- Cryptographically secure random filenames
- Extension whitelist enforcement
- MIME type validation
- File size limits (5MB)
- Path validation to prevent directory traversal

### Authentication
- JWT token verification via Clerk
- Role-based access control
- Webhook signature verification
- Session management

## Database Models

### User
Core user model with authentication details and role.

### CandidateProfile
Extended profile for job seekers with resume, education, experience, and skills.

### EmployerProfile
Extended profile for employers with company information.

### Job
Job postings with full details, requirements, and status tracking.

### JobApplication
Application submissions with attached data and status lifecycle.

## Error Handling

The API uses consistent error responses:

```json
{
  "error": "Error message here"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Data Reconciliation

If application statistics get out of sync, run:

```bash
npm run reconcile-stats
```

This will recalculate all statistics from the database.

## Environment Variables

See `.env.example` for all required and optional environment variables.

Critical for production:
- `CLERK_SECRET_KEY`
- `MONGODB_URI`
- `CLERK_WEBHOOK_SECRET`
- `NODE_ENV=production`

## Development

### Adding New Routes

1. Create controller in `controllers/`
2. Create service in `services/`
3. Add route in `routes/`
4. Register route in `app.js`

### Database Indexes

Indexes are defined in model files. After adding new indexes, they'll be created automatically on server start in development mode.

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure all required environment variables
3. Ensure MongoDB is secured and backed up
4. Set up proper CORS origins
5. Configure webhook secrets
6. Use process manager (PM2, systemd, etc.)
7. Set up reverse proxy (nginx, Apache)
8. Enable HTTPS
9. Configure monitoring and logging

## License

Private - All rights reserved
