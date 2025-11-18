# IntelliHire Data Model Blueprint

> Base blueprint to help the team align on entities, relationships, and upcoming schema work. Update freely as the project evolves.

## Core Concepts

| Entity | Purpose | Key Relationships |
| --- | --- | --- |
| User | Master record for anyone logging in. Stores Clerk id, role, status flags. | 1-1 with EmployerProfile or CandidateProfile, linked via `userId`. |
| EmployerProfile | Company-specific information for employer accounts. | Belongs to User, references Job postings created. |
| CandidateProfile | Professional info, resume details, education, experience, skills. | Belongs to User, referenced by JobApplications. |
| Job | Job postings created by employers. | References `employerId`. Has many JobApplications. |
| JobApplication | Individual application per candidate per job, tracks status history. | References Job, CandidateProfile, attachments. |
| VerificationToken | Stores email verification token + status. | References User. |
| PasswordResetToken | Stores password reset token lifecycle. | References User. |
| Notification (optional later) | Track async email/notification attempts. | References User or JobApplication based on context. |

## High-Level Relationships

```
User (role: employer/candidate)
  ├── EmployerProfile (employer details)
  │     └── Job (1:n)
  │           └── JobApplication (1:n)
  └── CandidateProfile (candidate details)
        └── JobApplication (1:n)

User ── VerificationToken (latest, optional)
User ── PasswordResetToken (latest, optional)
```

## Status Lifecycles

- **User.status:** `pending` → `active` → `suspended` (optional) → `deleted`
- **Job.status:** `draft` ↔ `active` → `closed` → `archived`
- **JobApplication.status:** `applied` → `shortlisted` → `interview` → `accepted` / `rejected`

## Validation + Indexing

- `User.email` unique.
- `EmployerProfile.companyName + userId` unique to prevent duplicates.
- `JobApplication` unique compound index `(jobId, candidateId)` to avoid duplicates.
- TTL indexes on verification/reset tokens to auto-expire.

## Next Steps

1. Implement base schemas (User, EmployerProfile, CandidateProfile, Job, JobApplication, VerificationToken, PasswordResetToken).
2. Wire service layer + controllers to enforce validation rules.
3. Integrate Clerk webhooks to sync `clerkUserId` and verification states.
