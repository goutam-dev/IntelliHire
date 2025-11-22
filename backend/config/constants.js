/**
 * Application-wide constants
 */

const USER_ROLES = {
  EMPLOYER: 'employer',
  CANDIDATE: 'candidate',
};

const JOB_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
};

const APPLICATION_STATUS = {
  APPLIED: 'applied',
  REVIEWING: 'reviewing',
  SHORTLISTED: 'shortlisted',
  INTERVIEW: 'interview',
  OFFERED: 'offered',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
};

const AUTH_PROVIDERS = {
  LOCAL: 'local',
  GOOGLE: 'google',
  GITHUB: 'github',
};

const EMPLOYMENT_TYPES = {
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACT: 'contract',
  INTERNSHIP: 'internship',
};

const EXPERIENCE_LEVELS = {
  ENTRY: 'entry',
  INTERMEDIATE: 'intermediate',
  SENIOR: 'senior',
  LEAD: 'lead',
  EXECUTIVE: 'executive',
};

module.exports = {
  USER_ROLES,
  JOB_STATUS,
  APPLICATION_STATUS,
  AUTH_PROVIDERS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
};
