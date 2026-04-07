const notificationService = require('../services/notificationService');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Notification Controller — thin layer delegating to notificationService.
 */

/**
 * GET /api/notifications
 * List the authenticated user's notifications (paginated, newest first).
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page  = parseInt(req.query.page,  10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const result = await notificationService.getUserNotifications(userId, { page, limit });

  res.json({ success: true, data: result });
});

/**
 * GET /api/notifications/unread-count
 * Returns { count: N } for the badge on the bell icon.
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  res.json({ success: true, data: { count } });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark one notification as read and return the updated document.
 */
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user._id, req.params.id);
  res.json({ success: true, data: notification });
});

/**
 * PATCH /api/notifications/read-all
 * Mark every unread notification for the current user as read.
 */
exports.markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.user._id);
  res.json({ success: true, data: result });
});
