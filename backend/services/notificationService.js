const Notification = require('../models/Notification');
const User = require('../models/User');
const JobApplication = require('../models/JobApplication');
const wsManager = require('../utils/wsManager');
const { sendEmail } = require('./emailProvider');
const { ForbiddenError, NotFoundError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Notification Service
 *
 * Central place for all notification logic. Controllers and other services
 * must go through this module — never write to Notification directly elsewhere.
 */

// ─── Email Templates ────────────────────────────────────────────────────────

function applicationReceivedEmail({ candidateName, jobTitle, applicationLink }) {
  return {
    subject: `New application received for "${jobTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e293b">New Application Received</h2>
        <p style="color:#475569">
          <strong>${candidateName}</strong> has applied for the position of
          <strong>${jobTitle}</strong>.
        </p>
        <a href="${applicationLink}"
           style="display:inline-block;margin-top:16px;padding:10px 20px;
                  background:#0f172a;color:#fff;border-radius:8px;text-decoration:none">
          View Application
        </a>
        <p style="margin-top:32px;color:#94a3b8;font-size:12px">IntelliHire</p>
      </div>`,
  };
}

function interviewCompletedEmail({ candidateName, jobTitle, applicationLink }) {
  return {
    subject: `Interview completed for "${jobTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e293b">Interview Completed</h2>
        <p style="color:#475569">
          <strong>${candidateName}</strong> has completed the interview for
          <strong>${jobTitle}</strong>.
        </p>
        <a href="${applicationLink}"
           style="display:inline-block;margin-top:16px;padding:10px 20px;
                  background:#0f172a;color:#fff;border-radius:8px;text-decoration:none">
          Review Candidate
        </a>
        <p style="margin-top:32px;color:#94a3b8;font-size:12px">IntelliHire</p>
      </div>`,
  };
}

function statusUpdatedEmail({ jobTitle, newStatus, applicationLink }) {
  const statusLabels = {
    'Under Review':        'is now under review',
    'Shortlisted':         'has been shortlisted',
    'Interview Scheduled': 'has been scheduled for an interview',
    'Interviewed':         'has been marked as interviewed',
    'Hired':               'has been accepted — Congratulations!',
    'Rejected':            'has not moved forward at this time',
    'Withdrawn':           'has been withdrawn',
  };
  const label = statusLabels[newStatus] || `has been updated to "${newStatus}"`;

  return {
    subject: `Your application for "${jobTitle}" ${label}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e293b">Application Status Update</h2>
        <p style="color:#475569">
          Your application for <strong>${jobTitle}</strong> ${label}.
        </p>
        <a href="${applicationLink}"
           style="display:inline-block;margin-top:16px;padding:10px 20px;
                  background:#0f172a;color:#fff;border-radius:8px;text-decoration:none">
          View Application
        </a>
        <p style="margin-top:32px;color:#94a3b8;font-size:12px">IntelliHire — Smart Hiring Platform</p>
      </div>`,
  };
}

// ─── Core helpers ────────────────────────────────────────────────────────────

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Create a notification, push it via WS, and optionally send an email.
 *
 * @param {string|import('mongoose').Types.ObjectId} recipientId - MongoDB User _id
 * @param {object} opts
 * @param {string} opts.type
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} opts.link          - Absolute frontend URL for redirection
 * @param {{ subject:string, html:string }|null} [opts.email] - Email payload (null = skip email)
 */
async function createAndSend(recipientId, { type, title, message, link, email }) {
  // 1. Persist
  const notification = await Notification.create({
    recipientId,
    type,
    title,
    message,
    link,
  });

  // 2. Real-time WS push
  wsManager.sendToUser(recipientId, {
    type: 'notification',
    notification: {
      _id:         notification._id,
      type:        notification.type,
      title:       notification.title,
      message:     notification.message,
      link:        notification.link,
      isRead:      notification.isRead,
      createdAt:   notification.createdAt,
    },
  });

  // 3. Email (non-fatal — failure must never break the main flow)
  if (email) {
    try {
      const recipient = await User.findById(recipientId).select('email notificationPreferences');
      const emailAllowed =
        recipient?.notificationPreferences?.emailUpdates !== false &&
        recipient?.notificationPreferences?.applicationStatus !== false;

      if (recipient?.email && emailAllowed) {
        await sendEmail({ to: recipient.email, ...email });
      }
    } catch (err) {
      logger.error(`[notificationService] Email step failed for recipientId=${recipientId}: ${err.message}`);
    }
  }

  logger.info(`[notificationService] Notification created — type=${type} recipientId=${recipientId}`);
  return notification;
}

// ─── Business event helpers (called from applicationService) ─────────────────

/**
 * Notify employer that a candidate applied.
 * @param {object} opts
 * @param {string} opts.employerUserId   - MongoDB User _id of the employer
 * @param {string} opts.employerEmail    - Employer's email (already available at call-site)
 * @param {string} opts.candidateName
 * @param {string} opts.jobTitle
 * @param {string} opts.jobId            - MongoDB Job _id (for routing)
 */
async function notifyEmployerApplicationReceived({ employerUserId, candidateName, jobTitle, jobId }) {
  const link = `${APP_URL}/employer/jobs/${jobId}/applications`;
  const email = applicationReceivedEmail({ candidateName, jobTitle, applicationLink: link });

  await createAndSend(employerUserId, {
    type: 'application_received',
    title: 'New Application Received',
    message: `${candidateName} applied for "${jobTitle}"`,
    link,
    email,
  });
}

/**
 * Notify employer when a candidate completes interview.
 * Safe to call repeatedly; sends once per completion cycle.
 */
async function notifyEmployerInterviewCompleted({ applicationId }) {
  if (!applicationId) return { sent: false, reason: 'missing_application_id' };

  const claimedAt = new Date();
  const app = await JobApplication.findOneAndUpdate(
    {
      applicationId,
      interviewCompletionNotificationSentAt: null,
    },
    {
      $set: {
        interviewCompletionNotificationSentAt: claimedAt,
      },
    },
    { new: true }
  )
    .populate('candidateId', 'fullName')
    .populate({
      path: 'jobId',
      select: 'title employer',
      populate: {
        path: 'employer',
        select: 'user',
      },
    })
    .lean();

  if (!app) {
    return { sent: false, reason: 'already_sent_or_missing_application' };
  }

  const employerUserId = app.jobId?.employer?.user;
  if (!employerUserId) {
    await JobApplication.updateOne(
      { _id: app._id, interviewCompletionNotificationSentAt: claimedAt },
      { $set: { interviewCompletionNotificationSentAt: null } }
    ).catch(() => {});
    return { sent: false, reason: 'missing_employer_user' };
  }

  const candidateName = app.candidateId?.fullName || 'A candidate';
  const jobTitle = app.jobId?.title || 'the job';
  const link = `${APP_URL}/employer/jobs/${app.jobId?._id}/applications`;
  const email = interviewCompletedEmail({ candidateName, jobTitle, applicationLink: link });

  try {
    await createAndSend(employerUserId, {
      type: 'interview_completed',
      title: 'Interview Completed',
      message: `${candidateName} completed the interview for "${jobTitle}".`,
      link,
      email,
    });
    return { sent: true };
  } catch (err) {
    await JobApplication.updateOne(
      { _id: app._id, interviewCompletionNotificationSentAt: claimedAt },
      { $set: { interviewCompletionNotificationSentAt: null } }
    ).catch(() => {});
    throw err;
  }
}

/**
 * Notify candidate that their application status changed.
 * @param {object} opts
 * @param {string} opts.candidateUserId  - MongoDB User _id of the candidate
 * @param {string} opts.jobTitle
 * @param {string} opts.newStatus
 * @param {string} opts.applicationId   - applicationId string (for routing)
 * @param {string} opts.notifType       - 'status_updated' | 'interview_scheduled'
 */
async function notifyCandidateStatusUpdate({ candidateUserId, jobTitle, newStatus, applicationId, notifType = 'status_updated' }) {
  const link = `${APP_URL}/candidate/applications/${applicationId}`;

  const statusMessages = {
    'Under Review':        `Your application for "${jobTitle}" is now under review.`,
    'Shortlisted':         `Great news! You've been shortlisted for "${jobTitle}".`,
    'Interview Scheduled': `An interview has been scheduled for your application to "${jobTitle}".`,
    'Interviewed':         `Your interview for "${jobTitle}" has been completed.`,
    'Hired':               `Congratulations! You've been hired for "${jobTitle}"! 🎉`,
    'Rejected':            `Your application for "${jobTitle}" has not moved forward.`,
  };

  const message = statusMessages[newStatus] || `Your application for "${jobTitle}" was updated to "${newStatus}".`;

  const statusTitles = {
    'Under Review':        'Application Under Review',
    'Shortlisted':         'You\'ve Been Shortlisted!',
    'Interview Scheduled': 'Interview Scheduled',
    'Interviewed':         'Interview Completed',
    'Hired':               'Application Accepted!',
    'Rejected':            'Application Update',
  };

  const title = statusTitles[newStatus] || 'Application Status Updated';
  const email = statusUpdatedEmail({ jobTitle, newStatus, applicationLink: link });

  await createAndSend(candidateUserId, {
    type: notifType,
    title,
    message,
    link,
    email,
  });
}

/**
 * Send interview scheduled notification only when both enrollments are completed.
 * This is safe to call repeatedly from multiple code paths.
 */
async function notifyInterviewScheduledWhenEnrollmentReady({ applicationId }) {
  if (!applicationId) return { sent: false, reason: 'missing_application_id' };

  const claimedAt = new Date();
  const app = await JobApplication.findOneAndUpdate(
    {
      applicationId,
      status: 'Interview Scheduled',
      'voiceEnrollment.status': 'enrolled',
      'faceEnrollment.status': 'enrolled',
      interviewNotificationSentAt: null,
    },
    {
      $set: {
        interviewNotificationSentAt: claimedAt,
      },
    },
    { new: true }
  )
    .populate('jobId', 'title')
    .lean();

  if (!app) {
    return { sent: false, reason: 'not_ready_or_already_sent' };
  }

  try {
    await notifyCandidateStatusUpdate({
      candidateUserId: app.candidateId,
      jobTitle: app.jobId?.title || 'the job',
      newStatus: 'Interview Scheduled',
      applicationId: app.applicationId,
      notifType: 'interview_scheduled',
    });
    return { sent: true };
  } catch (err) {
    await JobApplication.updateOne(
      { _id: app._id, interviewNotificationSentAt: claimedAt },
      { $set: { interviewNotificationSentAt: null } }
    ).catch(() => {});
    throw err;
  }
}

// ─── REST API helpers ────────────────────────────────────────────────────────

/**
 * Get paginated notifications for a user (newest first).
 */
async function getUserNotifications(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipientId: userId }),
  ]);

  return {
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Count unread notifications for a user.
 */
async function getUnreadCount(userId) {
  return Notification.countDocuments({ recipientId: userId, isRead: false });
}

/**
 * Mark a single notification as read.
 * Enforces ownership: only the recipient can mark their own notification.
 */
async function markAsRead(userId, notificationId) {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new NotFoundError('Notification not found');
  if (String(notification.recipientId) !== String(userId)) {
    throw new ForbiddenError('Access denied');
  }

  notification.isRead = true;
  await notification.save();
  return notification;
}

/**
 * Mark all notifications for a user as read.
 */
async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { $set: { isRead: true } }
  );
  return { updated: result.modifiedCount };
}

module.exports = {
  createAndSend,
  notifyEmployerApplicationReceived,
  notifyEmployerInterviewCompleted,
  notifyCandidateStatusUpdate,
  notifyInterviewScheduledWhenEnrollmentReady,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
};
