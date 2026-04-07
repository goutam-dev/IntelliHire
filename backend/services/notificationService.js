const Notification = require('../models/Notification');
const User = require('../models/User');
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
        <p style="margin-top:32px;color:#94a3b8;font-size:12px">IntelliHire — Smart Hiring Platform</p>
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
  notifyCandidateStatusUpdate,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
};
