const mongoose = require('mongoose');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const CandidateProfile = require('../models/CandidateProfile');
const User = require('../models/User');
const EmployerProfile = require('../models/EmployerProfile');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const InterviewSession = require('../models/InterviewSession');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const { extractAudio, createSilentVideo } = require('../utils/videoProcessor');
const voiceProctoringService = require('./voiceProctoringService');
const faceProctoringService = require('./faceProctoringService');
const notificationService = require('./notificationService');

/**
 * Application service - handles all application-related business logic
 */

/**
 * Build search filter for applications
 */
const buildSearchFilter = (search) => {
  if (!search) return {};
  const regex = new RegExp(search, 'i');
  return {
    $or: [
      { feedback: { $regex: regex } },
      { 'candidate.phoneNumber': { $regex: regex } },
      { 'candidate.professionalTitle': { $regex: regex } },
      { 'candidate.location': { $regex: regex } },
      { 'candidate.skills': { $regex: regex } },
      { 'candidate.user.fullName': { $regex: regex } },
      { 'candidate.user.email': { $regex: regex } },
    ],
  };
};

/**
 * Get timestamp from document (using either createdAt or _id)
 */
const getTimestamp = (doc) => {
  if (doc.createdAt) return new Date(doc.createdAt).getTime();
  // Fallback to _id timestamp if createdAt is missing
  if (doc._id) {
    const idStr = doc._id.toString();
    return parseInt(idStr.substring(0, 8), 16) * 1000;
  }
  return 0;
};

/**
 * Sort applications by specified criteria
 */
const sortApplications = (applications, sort) => {
  applications.sort((a, b) => {
    const timeA = getTimestamp(a);
    const timeB = getTimestamp(b);

    if (sort === 'newest') {
      return timeB - timeA;
    } else if (sort === 'oldest') {
      return timeA - timeB;
    } else if (sort === 'name') {
      const nameA = a.candidate?.user?.fullName?.toLowerCase() || '';
      const nameB = b.candidate?.user?.fullName?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    }
    return 0;
  });
};

/**
 * Filter applications by search term
 */
const filterBySearch = (applications, search) => {
  if (!search) return applications;

  const searchLower = search.toLowerCase();
  return applications.filter((app) => {
    const candidateName = app.candidate?.user?.fullName?.toLowerCase() || '';
    const candidateEmail = app.candidate?.user?.email?.toLowerCase() || '';
    const candidatePhone =
      app.candidate?.user?.phoneNumber?.toLowerCase() || '';
    const professionalTitle =
      app.candidate?.professionalTitle?.toLowerCase() || '';
    const feedback = app.feedback?.toLowerCase() || '';

    return (
      candidateName.includes(searchLower) ||
      candidateEmail.includes(searchLower) ||
      candidatePhone.includes(searchLower) ||
      professionalTitle.includes(searchLower) ||
      feedback.includes(searchLower)
    );
  });
};

const TERMINAL_INTERVIEW_STATUSES = ['completed', 'terminated', 'abandoned', 'completing'];
const ALLOWED_APPLICATION_STATUSES = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview Scheduled',
  'Interviewed',
  'Rejected',
  'Hired',
  'Withdrawn',
  'Job Closed',
  'Job Deleted',
];
const TERMINAL_APPLICATION_STATUSES = ['Rejected', 'Hired', 'Withdrawn', 'Job Closed', 'Job Deleted'];
const EXPERIENCE_LEVEL_RANK = {
  'no-experience': 0,
  entry: 1,
  mid: 2,
  senior: 3,
  expert: 4,
};

const EXPERIENCE_LABELS = {
  'no-experience': 'No Experience',
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior',
  expert: 'Expert',
};

const EDUCATION_LEVEL_RANK = {
  none: 0,
  'high-school': 1,
  associate: 2,
  bachelor: 3,
  master: 4,
  phd: 5,
};
const APPLICATION_TRANSITIONS = {
  Applied: ['Under Review', 'Shortlisted', 'Rejected'],
  'Under Review': ['Shortlisted', 'Rejected'],
  Shortlisted: ['Interview Scheduled', 'Rejected'],
  'Interview Scheduled': ['Interviewed', 'Rejected'],
  Interviewed: ['Hired', 'Rejected'],
  Rejected: [],
  Hired: [],
  Withdrawn: [],
  'Job Closed': [],
  'Job Deleted': [],
};

const assertValidApplicationStatus = (status) => {
  if (!ALLOWED_APPLICATION_STATUSES.includes(status)) {
    throw new ValidationError(`Invalid status. Allowed: ${ALLOWED_APPLICATION_STATUSES.join(', ')}`);
  }
};

const assertStatusTransitionAllowed = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) return;

  const allowedNext = APPLICATION_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(nextStatus)) {
    throw new ValidationError(`Invalid status transition from ${currentStatus} to ${nextStatus}`);
  }
};

const assertApplicationMutableForEmployer = (application) => {
  const job = application.jobId;
  if (!job || job.isDeleted) {
    throw new ValidationError('This job has been deleted. Application status can no longer be changed.');
  }

  if (TERMINAL_APPLICATION_STATUSES.includes(application.status)) {
    throw new ValidationError(`Application is already terminal (${application.status}) and cannot be updated.`);
  }
};

const normalizeStatusForDeletedJob = (application) => {
  if (!application) return application;

  const isDeletedJob = Boolean(application.jobId?.isDeleted);
  if (!isDeletedJob) return application;

  if (['Rejected', 'Hired', 'Withdrawn', 'Job Deleted'].includes(application.status)) {
    return application;
  }

  return {
    ...application,
    status: 'Job Deleted',
  };
};

const monthsBetweenDates = (start, end) => {
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const totalMonths = yearDiff * 12 + monthDiff;
  return totalMonths > 0 ? totalMonths : 0;
};

const inferEducationRank = (value) => {
  if (!value || typeof value !== 'string') return 0;

  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'none' || normalized === 'no specific requirement') return EDUCATION_LEVEL_RANK.none;

  if (normalized.includes('phd') || normalized.includes('doctor')) return EDUCATION_LEVEL_RANK.phd;
  if (normalized.includes('master')) return EDUCATION_LEVEL_RANK.master;
  if (normalized.includes('bachelor')) return EDUCATION_LEVEL_RANK.bachelor;
  if (normalized.includes('associate')) return EDUCATION_LEVEL_RANK.associate;
  if (normalized.includes('high school') || normalized.includes('secondary')) return EDUCATION_LEVEL_RANK['high-school'];

  if (Object.prototype.hasOwnProperty.call(EDUCATION_LEVEL_RANK, normalized)) {
    return EDUCATION_LEVEL_RANK[normalized];
  }

  return 0;
};

const inferExperienceRankFromYears = (years = 0) => {
  if (years >= 8) return EXPERIENCE_LEVEL_RANK.expert;
  if (years >= 5) return EXPERIENCE_LEVEL_RANK.senior;
  if (years >= 2) return EXPERIENCE_LEVEL_RANK.mid;
  if (years > 0) return EXPERIENCE_LEVEL_RANK.entry;
  return EXPERIENCE_LEVEL_RANK['no-experience'];
};

const estimateCandidateExperienceYears = (profile) => {
  if (!profile || profile.noWorkExperience) return 0;

  const now = new Date();
  const experiences = Array.isArray(profile.experience) ? profile.experience : [];

  let totalYears = 0;

  for (const exp of experiences) {
    if (!exp) continue;

    if (exp.experienceType === 'years' && Number.isFinite(Number(exp.yearsOfExperience))) {
      const years = Number(exp.yearsOfExperience);
      if (years > 0) totalYears += years;
      continue;
    }

    const startDate = exp.startDate ? new Date(exp.startDate) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) continue;

    const endDate = exp.currentlyWorking ? now : (exp.endDate ? new Date(exp.endDate) : now);
    if (!endDate || Number.isNaN(endDate.getTime()) || endDate <= startDate) continue;

    totalYears += monthsBetweenDates(startDate, endDate) / 12;
  }

  return totalYears;
};

const assertCandidateEligibilityForJob = async (candidateId, job) => {
  const profile = await CandidateProfile.findOne({ user: candidateId }).lean();

  if (!profile) {
    throw new ValidationError('Please complete your candidate profile before applying to this job.');
  }

  const requiredExperienceRank = EXPERIENCE_LEVEL_RANK[job.experienceLevel] ?? EXPERIENCE_LEVEL_RANK['no-experience'];
  const candidateExperienceYears = estimateCandidateExperienceYears(profile);
  const candidateExperienceRank = inferExperienceRankFromYears(candidateExperienceYears);

  if (candidateExperienceRank < requiredExperienceRank) {
    throw new ValidationError(
      `This role requires at least ${EXPERIENCE_LABELS[job.experienceLevel] || job.experienceLevel} experience.`
    );
  }

  const requiredEducationRank = inferEducationRank(job.educationRequirements);
  if (requiredEducationRank <= EDUCATION_LEVEL_RANK.none) return;

  const candidateEducationRank = (profile.education || []).reduce((bestRank, edu) => {
    const rank = inferEducationRank(edu?.degree);
    return Math.max(bestRank, rank);
  }, 0);

  if (candidateEducationRank < requiredEducationRank) {
    throw new ValidationError(
      `This role requires minimum ${job.educationRequirements} education qualification.`
    );
  }
};

const toAbsoluteUploadPath = (relativePath = '') => {
  const cleaned = String(relativePath || '').replace(/^[/\\]+/, '');
  return path.join(__dirname, '..', cleaned);
};

const processInterviewEnrollmentArtifacts = async (jobApplicationId) => {
  const application = await JobApplication.findById(jobApplicationId);
  if (!application) return;

  const relativeVideoPath = application.video?.filePath;
  if (!relativeVideoPath) {
    await JobApplication.findByIdAndUpdate(jobApplicationId, {
      $set: {
        'voiceEnrollment.status': 'failed',
        'voiceEnrollment.errorMessage': 'Application video not found for enrollment',
        'faceEnrollment.status': 'failed',
        'faceEnrollment.errorMessage': 'Application video not found for enrollment',
      },
    }).catch(() => {});
    return;
  }

  const absoluteVideoPath = toAbsoluteUploadPath(relativeVideoPath);
  if (!fs.existsSync(absoluteVideoPath)) {
    await JobApplication.findByIdAndUpdate(jobApplicationId, {
      $set: {
        'voiceEnrollment.status': 'failed',
        'voiceEnrollment.errorMessage': 'Application video file not found on server',
        'faceEnrollment.status': 'failed',
        'faceEnrollment.errorMessage': 'Application video file not found on server',
      },
    }).catch(() => {});
    return;
  }

  const fileName = application.video?.filename || path.basename(relativeVideoPath);
  const baseName = path.basename(fileName, path.extname(fileName));
  const audioOutDir = path.join(__dirname, '..', 'uploads', 'application-audio');
  const silentOutDir = path.join(__dirname, '..', 'uploads', 'application-videos-silent');
  const audioPath = path.join(audioOutDir, `${baseName}.wav`);
  const silentVideoPath = path.join(silentOutDir, `${baseName}-silent.mp4`);

  try {
    await extractAudio(absoluteVideoPath, audioPath);

    await JobApplication.findByIdAndUpdate(jobApplicationId, {
      $set: {
        audioFile: {
          filename: path.basename(audioPath),
          filePath: `/uploads/application-audio/${path.basename(audioPath)}`,
          createdAt: new Date(),
        },
      },
    });

    await createSilentVideo(absoluteVideoPath, silentVideoPath);

    await JobApplication.findByIdAndUpdate(jobApplicationId, {
      $set: {
        silentVideoFile: {
          filename: path.basename(silentVideoPath),
          filePath: `/uploads/application-videos-silent/${path.basename(silentVideoPath)}`,
          createdAt: new Date(),
        },
      },
    });
  } catch (processingError) {
    logger.error(
      `[scheduleInterview] Video/audio preparation failed for application ${jobApplicationId}: ${processingError.message}`
    );

    await JobApplication.findByIdAndUpdate(jobApplicationId, {
      $set: {
        'voiceEnrollment.status': 'failed',
        'voiceEnrollment.errorMessage': processingError.message,
        'faceEnrollment.status': 'failed',
        'faceEnrollment.errorMessage': processingError.message,
      },
    }).catch(() => {});
    return;
  }

  try {
    await voiceProctoringService.enrollSpeaker(application.applicationId, audioPath);
  } catch (enrollError) {
    logger.warn(`[scheduleInterview] Voice enrollment threw unexpectedly: ${enrollError.message}`);
  }

  try {
    await faceProctoringService.enrollFaceFromVideo(application.applicationId, absoluteVideoPath);
  } catch (faceEnrollError) {
    logger.warn(`[scheduleInterview] Face enrollment threw unexpectedly: ${faceEnrollError.message}`);
  }
};

const enrichApplicationsWithInterviewState = async (applications = []) => {
  if (!applications.length) return applications;

  const applicationIds = applications.map((app) => app.applicationId).filter(Boolean);
  if (!applicationIds.length) return applications;

  const sessions = await InterviewSession.find({
    applicationId: { $in: applicationIds },
  })
    .sort({ createdAt: -1 })
    .select('applicationId status startedAt completedAt updatedAt createdAt')
    .lean();

  const latestByApplicationId = new Map();
  for (const session of sessions) {
    if (!latestByApplicationId.has(session.applicationId)) {
      latestByApplicationId.set(session.applicationId, session);
    }
  }

  return applications.map((application) => {
    const latestInterviewSession = latestByApplicationId.get(application.applicationId) || null;
    const interviewSessionStatus = latestInterviewSession?.status || null;
    const interviewLocked = Boolean(latestInterviewSession?.startedAt) || TERMINAL_INTERVIEW_STATUSES.includes(interviewSessionStatus);

    return {
      ...application,
      interviewSessionStatus,
      interviewLocked,
      interviewCompletedAt: latestInterviewSession?.completedAt || null,
      interviewLastUpdatedAt: latestInterviewSession?.updatedAt || latestInterviewSession?.createdAt || null,
    };
  });
};

/**
 * Get applications by job ID with optional filters
 */
const getApplicationsByJob = async (jobId, filters = {}, userId) => {
  const { status = 'all', search = '', sort = 'newest', resumeGrade = 'all' } = filters;

  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw new ValidationError('Invalid jobId');
  }

  // Verify ownership
  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new ForbiddenError('User not found');

  const employerProfile = await EmployerProfile.findOne({ user: user._id });
  if (!employerProfile) throw new ForbiddenError('Employer profile not found');

  const job = await Job.findById(jobId);
  if (!job) throw new NotFoundError('Job not found');

  if (job.employer.toString() !== employerProfile._id.toString()) {
    throw new ForbiddenError('You do not have permission to view applications for this job');
  }

  // Build base query
  const query = { jobId: jobId };
  if (status && status !== 'all') {
    query.status = status;
  }

  // Fetch all matching applications with full population
  let applications = await JobApplication.find(query)
    .populate({
      path: 'candidateId',
      select: 'fullName email phoneNumber'
    })
    .populate({ path: 'jobId', select: 'title department' })
    .lean();

  // Map to expected structure
  applications = applications.map(app => {
    return {
      ...app,
      candidate: {
        user: app.candidateId,
        ...app.applicationProfile
      },
      job: app.jobId
    };
  });

  // Enrich with AI scores
  const applicationIds = applications.map(app => app._id);
  const resumeAnalyses = await ResumeAnalysis.find({
    applicationId: { $in: applicationIds }
  }).select('applicationId supervisorVerdict matchingScore').lean();

  // Create a map for quick lookup
  const scoreMap = {};
  resumeAnalyses.forEach(analysis => {
    scoreMap[analysis.applicationId.toString()] = {
      aiScore: analysis.supervisorVerdict?.final_resume_score,
      aiVerdict: analysis.supervisorVerdict?.verdict,
      matchingScore: analysis.matchingScore?.overall_score
    };
  });

  // Add AI scores to applications
  applications = applications.map(app => ({
    ...app,
    aiScore: scoreMap[app._id.toString()]?.aiScore,
    aiVerdict: scoreMap[app._id.toString()]?.aiVerdict,
    matchingScore: scoreMap[app._id.toString()]?.matchingScore
  }));

  // Enrich with interview session scores
  const appIds = applications.map(a => a.applicationId).filter(Boolean);
  if (appIds.length > 0) {
    const interviewSessions = await InterviewSession.find({
      applicationId: { $in: appIds },
      status: { $in: ['completed', 'terminated'] },
    })
      .sort({ createdAt: -1 })
      .select('applicationId scoring status')
      .lean();

    const interviewMap = {};
    for (const session of interviewSessions) {
      if (!interviewMap[session.applicationId]) {
        interviewMap[session.applicationId] = {
          interviewScore: session.scoring?.averageScore ?? null,
          interviewVerdict: session.scoring?.overallVerdict || null,
        };
      }
    }

    applications = applications.map(app => ({
      ...app,
      interviewScore: interviewMap[app.applicationId]?.interviewScore ?? null,
      interviewVerdict: interviewMap[app.applicationId]?.interviewVerdict ?? null,
    }));
  }

  // Filter by resume grade (AI verdict)
  if (resumeGrade && resumeGrade !== 'all') {
    if (resumeGrade === 'not_analyzed') {
      applications = applications.filter(app => app.aiScore == null);
    } else {
      applications = applications.filter(app => app.aiVerdict === resumeGrade);
    }
  }

  // In-memory filtering (search)
  applications = filterBySearch(applications, search);

  // In-memory sorting
  sortApplications(applications, sort);

  return applications;
};

/**
 * Update application status
 */
const updateApplicationStatus = async (applicationId, statusData, userId) => {
  const { status, notes, feedback } = statusData;

  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new ValidationError('Invalid applicationId');
  }
  if (!status) {
    throw new ValidationError('Status is required');
  }
  assertValidApplicationStatus(status);

  const application = await JobApplication.findById(applicationId).populate('jobId');
  if (!application) {
    throw new NotFoundError('Application not found');
  }

  // Verify ownership
  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new ForbiddenError('User not found');

  const employerProfile = await EmployerProfile.findOne({ user: user._id });
  if (!employerProfile) throw new ForbiddenError('Employer profile not found');

  if (!application.jobId || application.jobId.employer.toString() !== employerProfile._id.toString()) {
    throw new ForbiddenError('You do not have permission to update this application');
  }

  // Track old status for stats update
  const oldStatus = application.status;
  assertApplicationMutableForEmployer(application);
  assertStatusTransitionAllowed(oldStatus, status);

  if (status === 'Interview Scheduled' && application.jobId.status !== 'active') {
    throw new ValidationError('Interviews can only be scheduled while the job is active.');
  }

  if (application.jobId.status === 'closed' && !['Rejected', 'Hired'].includes(status)) {
    throw new ValidationError('For closed jobs, only final decisions (Rejected or Hired) are allowed.');
  }

  if (status === 'Withdrawn' || status === 'Job Closed' || status === 'Job Deleted') {
    throw new ValidationError('This status is system-managed and cannot be set manually.');
  }

  application.status = status;
  if (status === 'Interview Scheduled' && oldStatus !== status) {
    application.interviewNotificationSentAt = null;
  }
  if (feedback) application.employerNotes = feedback;
  else if (notes) application.employerNotes = notes;

  await application.save();

  // --- Notification: candidate receives alert that their status changed ---
  if (oldStatus !== status && status !== 'Interview Scheduled') {
    setImmediate(async () => {
      try {
        await notificationService.notifyCandidateStatusUpdate({
          candidateUserId: application.candidateId,
          jobTitle: application.jobId?.title || 'the job',
          newStatus: status,
          applicationId: application.applicationId,
          notifType: 'status_updated',
        });
      } catch (notifErr) {
        logger.error(`[applicationService] Candidate status notification failed: ${notifErr.message}`);
      }
    });
  }

  if (oldStatus !== status && status === 'Interview Scheduled') {
    setImmediate(async () => {
      try {
        await notificationService.notifyInterviewScheduledWhenEnrollmentReady({
          applicationId: application.applicationId,
        });
      } catch (notifErr) {
        logger.error(`[applicationService] Deferred interview notification failed: ${notifErr.message}`);
      }
    });
  }

  // Update candidate profile stats if status changed
  if (oldStatus !== status) {
    const statUpdates = {};

    // Decrement old status count
    if (oldStatus === 'Applied') {
      statUpdates['stats.pending'] = -1;
    } else if (['Shortlisted', 'Interview Scheduled'].includes(oldStatus)) {
      statUpdates['stats.shortlisted'] = -1;
    } else if (oldStatus === 'Rejected') {
      statUpdates['stats.rejected'] = -1;
    }

    // Increment new status count
    if (status === 'Applied') {
      statUpdates['stats.pending'] = (statUpdates['stats.pending'] || 0) + 1;
    } else if (['Shortlisted', 'Interview Scheduled'].includes(status)) {
      statUpdates['stats.shortlisted'] = (statUpdates['stats.shortlisted'] || 0) + 1;
    } else if (status === 'Rejected') {
      statUpdates['stats.rejected'] = (statUpdates['stats.rejected'] || 0) + 1;
    }

    if (Object.keys(statUpdates).length > 0) {
      await CandidateProfile.findOneAndUpdate(
        { user: application.candidateId },
        { $inc: statUpdates },
        { upsert: false }
      );
    }
  }

  const populated = await application.populate([
    { path: 'candidateId', select: 'fullName email phoneNumber' },
    { path: 'jobId', select: 'title department' },
  ]);

  return populated;
};

/**
 * Bulk update application statuses
 */
const bulkUpdateApplications = async (ids, statusData, userId) => {
  const { status, notes, feedback } = statusData;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('ids array is required');
  }
  if (!status) {
    throw new ValidationError('Status is required');
  }
  assertValidApplicationStatus(status);

  if (status === 'Withdrawn' || status === 'Job Closed' || status === 'Job Deleted') {
    throw new ValidationError('This status is system-managed and cannot be set manually.');
  }

  // Verify ownership for ALL applications
  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new ForbiddenError('User not found');

  const employerProfile = await EmployerProfile.findOne({ user: user._id });
  if (!employerProfile) throw new ForbiddenError('Employer profile not found');

  const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const applications = await JobApplication.find({ _id: { $in: objectIds } }).populate('jobId');

  for (const app of applications) {
    if (!app.jobId || app.jobId.employer.toString() !== employerProfile._id.toString()) {
      // Skip or throw? Let's skip to avoid breaking bulk op if one is bad, or throw to be strict.
      // Strict is safer.
      throw new ForbiddenError(`You do not have permission to update application ${app._id}`);
    }

    assertApplicationMutableForEmployer(app);
    assertStatusTransitionAllowed(app.status, status);
    if (status === 'Interview Scheduled' && app.jobId.status !== 'active') {
      throw new ValidationError('Interviews can only be scheduled while the job is active.');
    }
    if (app.jobId.status === 'closed' && !['Rejected', 'Hired'].includes(status)) {
      throw new ValidationError('For closed jobs, only final decisions (Rejected or Hired) are allowed.');
    }
  }

  for (const app of applications) {
    app.status = status;
    if (status === 'Interview Scheduled') {
      app.interviewNotificationSentAt = null;
    }
    if (feedback) app.employerNotes = feedback;
    else if (notes) app.employerNotes = notes;
    await app.save();

    // --- Notification per candidate (non-blocking) ---
    const capturedApp = app;
    setImmediate(async () => {
      try {
        if (status === 'Interview Scheduled') {
          await notificationService.notifyInterviewScheduledWhenEnrollmentReady({
            applicationId: capturedApp.applicationId,
          });
          return;
        }

        await notificationService.notifyCandidateStatusUpdate({
          candidateUserId: capturedApp.candidateId,
          jobTitle: capturedApp.jobId?.title || 'the job',
          newStatus: status,
          applicationId: capturedApp.applicationId,
          notifType: 'status_updated',
        });
      } catch (notifErr) {
        logger.error(`[applicationService] Bulk candidate notification failed: ${notifErr.message}`);
      }
    });
  }

  return { updated: applications.length };
};

/**
 * Schedule interview for application
 */
const scheduleInterview = async (applicationId, interviewData, userId) => {
  const { interviewWindowStart, interviewWindowEnd, instructions } = interviewData;

  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new ValidationError('Invalid applicationId');
  }

  if (!interviewWindowStart || !interviewWindowEnd) {
    throw new ValidationError('Interview window start and end dates are required');
  }

  const startDate = new Date(interviewWindowStart);
  const endDate = new Date(interviewWindowEnd);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new ValidationError('Invalid interview window dates');
  }

  if (endDate <= startDate) {
    throw new ValidationError('Interview window end date must be after start date');
  }

  const application = await JobApplication.findById(applicationId).populate('jobId');
  if (!application) {
    throw new NotFoundError('Application not found');
  }

  // Verify ownership
  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new ForbiddenError('User not found');

  const employerProfile = await EmployerProfile.findOne({ user: user._id });
  if (!employerProfile) throw new ForbiddenError('Employer profile not found');

  if (!application.jobId || application.jobId.employer.toString() !== employerProfile._id.toString()) {
    throw new ForbiddenError('You do not have permission to schedule interview for this application');
  }

  if (application.jobId.isDeleted || application.jobId.status !== 'active') {
    throw new ValidationError('This job is not accepting interview scheduling.');
  }

  if (application.status !== 'Shortlisted') {
    throw new ValidationError('Only shortlisted applications can be moved to interview scheduling.');
  }

  application.status = 'Interview Scheduled';
  application.interviewNotificationSentAt = null;
  application.interviewWindowStart = startDate;
  application.interviewWindowEnd = endDate;
  application.employerNotes = `Interview window: ${startDate.toDateString()} – ${endDate.toDateString()}. ${instructions || ''}`.trim();

  const enrollmentsReady =
    application.voiceEnrollment?.status === 'enrolled' &&
    application.faceEnrollment?.status === 'enrolled';

  if (!enrollmentsReady) {
    application.voiceEnrollment.speakerId = null;
    application.voiceEnrollment.embeddingPath = null;
    application.voiceEnrollment.enrolledAt = null;
    application.voiceEnrollment.status = 'pending';
    application.voiceEnrollment.errorMessage = null;

    application.faceEnrollment.candidateId = null;
    application.faceEnrollment.registrationType = null;
    application.faceEnrollment.canonicalEmbedding = [];
    application.faceEnrollment.framesUsed = 0;
    application.faceEnrollment.totalFrames = 0;
    application.faceEnrollment.usableFrames = 0;
    application.faceEnrollment.qualityScore = null;
    application.faceEnrollment.embeddingConsistency = null;
    application.faceEnrollment.qualityBreakdown = null;
    application.faceEnrollment.referenceImagePath = null;
    application.faceEnrollment.enrolledAt = null;
    application.faceEnrollment.status = 'pending';
    application.faceEnrollment.errorMessage = null;
  }

  await application.save();

  // Attempt deferred notification immediately in case enrollments are already done.
  setImmediate(async () => {
    try {
      await notificationService.notifyInterviewScheduledWhenEnrollmentReady({
        applicationId: application.applicationId,
      });
    } catch (notifErr) {
      logger.error(`[applicationService] Deferred interview scheduled notification failed: ${notifErr.message}`);
    }
  });

  if (!enrollmentsReady) {
    setImmediate(() => {
      processInterviewEnrollmentArtifacts(application._id).catch((err) => {
        logger.error(
          `[scheduleInterview] Enrollment pipeline failed for application ${application._id}: ${err.message}`
        );
      });
    });
  }

  const populated = await application.populate([
    { path: 'candidateId', select: 'fullName email phoneNumber' },
    { path: 'jobId', select: 'title department' },
  ]);

  return populated;
};

// --- Candidate Actions ---

/**
 * Check if candidate has already applied to a job
 */
const checkApplicationStatus = async (candidateId, jobId) => {
  let existingApplication = await JobApplication.findOne({
    jobId,
    candidateId,
    status: { $ne: 'Withdrawn' }
  })
    .sort({ appliedAt: -1 })
    .populate({
      path: 'jobId',
      select: 'title employer',
      populate: {
        path: 'employer',
        select: 'companyName'
      }
    });

  if (existingApplication) {
    existingApplication = normalizeStatusForDeletedJob(existingApplication);
  }

  if (existingApplication && existingApplication.jobId && existingApplication.jobId.employer) {
    existingApplication.jobId.company = existingApplication.jobId.employer.companyName;
    delete existingApplication.jobId.employer;
  }

  if (existingApplication) {
    return {
      hasApplied: true,
      application: {
        applicationId: existingApplication.applicationId,
        status: existingApplication.status,
        appliedAt: existingApplication.appliedAt,
        // appliedAgo calculated in controller or frontend
      }
    };
  }

  return { hasApplied: false };
};

/**
 * Get candidate's profile data for application
 */
const getProfileDataForApplication = async (candidateId) => {
  const profile = await CandidateProfile.findOne({ user: candidateId }).populate('user');

  if (!profile) {
    throw new NotFoundError('Profile not found');
  }

  return {
    personalInfo: {
      name: profile.user?.fullName || '',
      email: profile.user?.email || '',
      phone: profile.user?.phoneNumber || profile.phoneNumber || '',
      location: profile.location || ''
    },
    experience: profile.experience || [],
    education: profile.education || [],
    skills: profile.skills || [],
    summary: profile.summary || '',
    resume: profile.resume && profile.resume.fileUrl ? {
      filename: profile.resume.fileName,
      originalName: profile.resume.fileName,
      uploadedAt: profile.resume.uploadedAt,
      path: profile.resume.fileUrl,
      size: null
    } : null,
    video: profile.video && profile.video.fileUrl ? {
      filename: profile.video.fileName,
      originalName: profile.video.fileName,
      uploadedAt: profile.video.uploadedAt,
      fileUrl: profile.video.fileUrl,
      fileSize: profile.video.fileSize
    } : null
  };
};

/**
 * Submit job application
 */
const submitApplication = async (candidateId, applicationData, files) => {
  // files is the result of upload.fields() – { resume: [fileObj], applicationVideo: [fileObj] }
  const file = files && files.resume ? files.resume[0] : null;
  const videoFile = files && files.applicationVideo ? files.applicationVideo[0] : null;

  const {
    jobId,
    applicationProfile,
    coverLetter,
    profileAccuracyConfirmed,
    useExistingResume,
    useExistingVideo
  } = applicationData;

  // Parse applicationProfile if it's a string
  let parsedApplicationProfile = typeof applicationProfile === 'string'
    ? JSON.parse(applicationProfile)
    : applicationProfile;

  // Check if job exists and is active
  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError('Job not found');
  }

  if (job.isDeleted || job.status !== 'active') {
    throw new ValidationError('This job is no longer accepting applications');
  }

  // Check if already applied
  const existingApplication = await JobApplication.findOne({
    jobId,
    candidateId,
    status: { $ne: 'Withdrawn' }
  });

  if (existingApplication) {
    throw new ValidationError('You have already applied to this job');
  }

  await assertCandidateEligibilityForJob(candidateId, job);

  // Handle resume
  let resumeData;

  if (useExistingResume === 'true' || useExistingResume === true) {
    const profile = await CandidateProfile.findOne({ user: candidateId });
    if (!profile || !profile.resume || !profile.resume.fileUrl) {
      throw new ValidationError('No existing resume found in profile');
    }

    // Copy the resume file to application-specific folder to ensure it persists
    // even if candidate deletes their profile resume
    const sourceFilePath = path.join(__dirname, '..', profile.resume.fileUrl);
    const timestamp = Date.now();
    const fileExtension = path.extname(profile.resume.fileName || 'resume.pdf');
    const newFilename = `app-${candidateId}-${timestamp}${fileExtension}`;
    const destPath = path.join(__dirname, '..', 'uploads', 'applications', newFilename);

    // Ensure applications directory exists
    const appDir = path.join(__dirname, '..', 'uploads', 'applications');
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    // Copy file if source exists
    if (fs.existsSync(sourceFilePath)) {
      fs.copyFileSync(sourceFilePath, destPath);
    } else {
      throw new ValidationError('Resume file not found in profile');
    }

    resumeData = {
      filename: newFilename,
      originalName: profile.resume.fileName || 'resume.pdf',
      uploadDate: new Date(),
      filePath: `/uploads/applications/${newFilename}`,
      isFromProfile: true
    };
  } else {
    if (!file) {
      throw new ValidationError('Resume file is required');
    }

    // Move uploaded file to application-specific folder for consistency
    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const newFilename = `app-${candidateId}-${timestamp}${fileExtension}`;
    const sourcePath = file.path;
    const destPath = path.join(__dirname, '..', 'uploads', 'applications', newFilename);

    // Ensure applications directory exists
    const appDir = path.join(__dirname, '..', 'uploads', 'applications');
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    // Move file from temp location to applications folder
    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destPath);
    }

    resumeData = {
      filename: newFilename,
      originalName: file.originalname,
      uploadDate: new Date(),
      fileSize: file.size,
      filePath: `/uploads/applications/${newFilename}`,
      isFromProfile: false
    };
  }

  // Handle video – mandatory at application time
  let videoData;
  const appVideosDir = path.join(__dirname, '..', 'uploads', 'application-videos');
  if (!fs.existsSync(appVideosDir)) {
    fs.mkdirSync(appVideosDir, { recursive: true });
  }

  if (useExistingVideo === 'true' || useExistingVideo === true) {
    const profile = await CandidateProfile.findOne({ user: candidateId });
    if (!profile || !profile.video || !profile.video.fileUrl) {
      throw new ValidationError('No existing video introduction found in profile. Please upload a video.');
    }

    const sourceFilePath = path.join(__dirname, '..', profile.video.fileUrl);
    const timestamp = Date.now();
    const fileExtension = path.extname(profile.video.fileName || 'video.mp4');
    const newFilename = `appvid-${candidateId}-${timestamp}${fileExtension}`;
    const destPath = path.join(appVideosDir, newFilename);

    if (fs.existsSync(sourceFilePath)) {
      fs.copyFileSync(sourceFilePath, destPath);
    } else {
      throw new ValidationError('Profile video file not found. Please re-upload your video.');
    }

    videoData = {
      filename: newFilename,
      originalName: profile.video.fileName || 'video.mp4',
      uploadDate: new Date(),
      fileSize: profile.video.fileSize,
      filePath: `/uploads/application-videos/${newFilename}`,
      isFromProfile: true
    };
  } else {
    if (!videoFile) {
      throw new ValidationError('Video introduction is required for job applications');
    }

    const timestamp = Date.now();
    const fileExtension = path.extname(videoFile.originalname);
    const newFilename = `appvid-${candidateId}-${timestamp}${fileExtension}`;
    const sourcePath = videoFile.path;
    const destPath = path.join(appVideosDir, newFilename);

    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destPath);
    }

    videoData = {
      filename: newFilename,
      originalName: videoFile.originalname,
      uploadDate: new Date(),
      fileSize: videoFile.size,
      filePath: `/uploads/application-videos/${newFilename}`,
      isFromProfile: false
    };
  }

  try {
    const jobApplication = new JobApplication({
      jobId,
      candidateId,
      applicationProfile: parsedApplicationProfile,
      resume: resumeData,
      video: videoData,
      coverLetter: coverLetter || '',
      profileAccuracyConfirmed: profileAccuracyConfirmed === 'true'
    });

    await jobApplication.save();

    // Update job applications count
    await Job.findByIdAndUpdate(jobId, {
      $inc: { applicationsCount: 1 }
    });

    // Update candidate profile stats
    await CandidateProfile.findOneAndUpdate(
      { user: candidateId },
      {
        $inc: { 'stats.totalApplications': 1, 'stats.pending': 1 },
        $set: { lastProfileUpdateAt: new Date() }
      },
      { upsert: true }
    );

    await jobApplication.populate({
      path: 'jobId',
      select: 'title location employer',
      populate: {
        path: 'employer',
        select: 'companyName user'
      }
    });

    if (jobApplication.jobId && jobApplication.jobId.employer) {
      jobApplication.jobId.company = jobApplication.jobId.employer.companyName;
    }

    // --- Notification: employer receives alert that a candidate applied ---
    setImmediate(async () => {
      try {
        const employerProfile = jobApplication.jobId?.employer;
        if (employerProfile?.user) {
          const candidateName =
            parsedApplicationProfile?.personalInfo?.name ||
            (await User.findById(candidateId).select('fullName').lean())?.fullName ||
            'A candidate';
          await notificationService.notifyEmployerApplicationReceived({
            employerUserId: employerProfile.user,
            candidateName,
            jobTitle: jobApplication.jobId.title,
            jobId: jobApplication.jobId._id,
          });
        }
      } catch (notifErr) {
        logger.error(`[applicationService] Employer notification failed: ${notifErr.message}`);
      }
    });

    if (jobApplication.jobId?.employer) {
      delete jobApplication.jobId.employer;
    }

    return jobApplication;
  } catch (error) {
    // Delete uploaded/copied files if application submission failed
    if (resumeData && resumeData.filePath) {
      const filePath = path.join(__dirname, '..', resumeData.filePath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          logger.info(`Deleted application resume after failed submission: ${filePath}`);
        } catch (unlinkError) {
          logger.error('Error deleting application resume after failed submission:', unlinkError);
        }
      }
    }
    if (videoData && videoData.filePath) {
      const filePath = path.join(__dirname, '..', videoData.filePath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          logger.info(`Deleted application video after failed submission: ${filePath}`);
        } catch (unlinkError) {
          logger.error('Error deleting application video after failed submission:', unlinkError);
        }
      }
    }
    throw error;
  }
};

/**
 * Get candidate's applications
 */
const getCandidateApplications = async (candidateId, filters = {}) => {
  const { page = 1, limit = 10, status } = filters;

  const filter = { candidateId };
  if (status && status !== 'all') {
    filter.status = status;
  } else if (status === 'all') {
    // Exclude withdrawn applications from "all" view
    filter.status = { $ne: 'Withdrawn' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  let applications = await JobApplication.find(filter)
    .populate({
      path: 'jobId',
      select: 'title location salaryRange employmentType employer status isDeleted',
      populate: {
        path: 'employer',
        select: 'companyName'
      }
    })
    .sort({ appliedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Map employer.companyName to company for frontend compatibility
  applications.forEach(app => {
    if (app.jobId && app.jobId.employer) {
      app.jobId.company = app.jobId.employer.companyName;
      delete app.jobId.employer;
    }
  });

  applications = applications.map(normalizeStatusForDeletedJob);

  const enrichedApplications = await enrichApplicationsWithInterviewState(applications);

  const totalApplications = await JobApplication.countDocuments(filter);
  const totalPages = Math.ceil(totalApplications / parseInt(limit));

  return {
    applications: enrichedApplications,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalApplications,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1
    }
  };
};

/**
 * Get single application details by applicationId
 */
const getApplicationById = async (candidateId, applicationId) => {
  const application = await JobApplication.findOne({
    applicationId,
    candidateId
  })
    .populate({
      path: 'jobId',
      select: 'title location salaryRange employmentType description requirements benefits employer status isDeleted',
      populate: {
        path: 'employer',
        select: 'companyName'
      }
    })
    .populate('candidateId', 'fullName email phoneNumber')
    .lean();

  if (application && application.jobId && application.jobId.employer) {
    application.jobId.company = application.jobId.employer.companyName;
    delete application.jobId.employer;
  }

  if (!application) {
    throw new NotFoundError('Application not found');
  }

  const normalizedApplication = normalizeStatusForDeletedJob(application);

  // Format the response to match expected structure
  const [enrichedApplication] = await enrichApplicationsWithInterviewState([normalizedApplication]);

  return {
    ...enrichedApplication,
    candidate: {
      user: normalizedApplication.candidateId,
      ...normalizedApplication.applicationProfile
    },
    job: normalizedApplication.jobId
  };
};

/**
 * Withdraw application
 */
const withdrawApplication = async (candidateId, applicationId) => {
  try {
    const application = await JobApplication.findOne({ applicationId, candidateId }).populate({
      path: 'jobId',
      select: 'title employer',
      populate: {
        path: 'employer',
        select: 'companyName'
      }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    const oldStatus = application.status;
    if (TERMINAL_APPLICATION_STATUSES.includes(oldStatus)) {
      throw new ValidationError(`Application is already ${oldStatus} and cannot be withdrawn.`);
    }

    application.status = 'Withdrawn';
    await application.save();

    if (application.jobId && application.jobId.employer) {
      application.jobId.company = application.jobId.employer.companyName;
      delete application.jobId.employer;
    }

    // Decrease job applications count
    await Job.findByIdAndUpdate(application.jobId._id, {
      $inc: { applicationsCount: -1 }
    });

    // Update candidate profile stats based on previous status
    const statUpdates = { 'stats.totalApplications': -1 };
    if (oldStatus === 'Applied') {
      statUpdates['stats.pending'] = -1;
    } else if (['Shortlisted', 'Interview Scheduled'].includes(oldStatus)) {
      statUpdates['stats.shortlisted'] = -1;
    } else if (oldStatus === 'Rejected') {
      statUpdates['stats.rejected'] = -1;
    }

    await CandidateProfile.findOneAndUpdate(
      { user: candidateId },
      {
        $inc: statUpdates,
        $set: { lastProfileUpdateAt: new Date() }
      }
    );

    return application;
  } catch (error) {
    throw error;
  }
};

/**
 * Get interview report for an application (employer only)
 */
const getInterviewReport = async (applicationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new ValidationError('Invalid applicationId');
  }

  // Verify employer ownership
  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new ForbiddenError('User not found');

  const employerProfile = await EmployerProfile.findOne({ user: user._id });
  if (!employerProfile) throw new ForbiddenError('Employer profile not found');

  const application = await JobApplication.findById(applicationId).populate('jobId');
  if (!application) throw new NotFoundError('Application not found');

  if (!application.jobId || application.jobId.employer.toString() !== employerProfile._id.toString()) {
    throw new ForbiddenError('You do not have permission to view this report');
  }

  // Find the latest completed/terminated interview session
  const session = await InterviewSession.findOne({
    applicationId: application.applicationId,
    status: { $in: ['completed', 'terminated'] },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!session) {
    throw new NotFoundError('No completed interview found for this application');
  }

  // Format the report (mirrors formatSessionSummary in interviewService)
  return {
    sessionId: session._id,
    status: session.status,
    jobTitle: session.jobTitle,
    totalDurationSec: session.totalDurationSec,
    totalQuestions: session.turns?.length || 0,
    totalAnswered: (session.turns || []).filter(t => !t.isUnanswered).length,
    scoring: session.scoring || {},
    integrity: {
      verdict: session.integrity?.integrityVerdict || 'clean',
      totalScore: session.integrity?.totalCheatingScore || 0,
      threshold: session.config?.cheatingThreshold || 10,
      events: session.integrity?.cheatingEvents || [],
      terminationReason: session.integrity?.terminationReason || '',
    },
    voiceProctoring: voiceProctoringService.formatVoiceProctoringReport(session),
    faceProctoring: faceProctoringService.formatFaceProctoringReport(session),
    turns: (session.turns || []).map(t => ({
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
};

module.exports = {
  getApplicationsByJob,
  updateApplicationStatus,
  bulkUpdateApplications,
  scheduleInterview,
  checkApplicationStatus,
  getProfileDataForApplication,
  submitApplication,
  getCandidateApplications,
  getApplicationById,
  withdrawApplication,
  getInterviewReport
};
