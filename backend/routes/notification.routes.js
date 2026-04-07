const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// All notification routes require a fully-resolved MongoDB user
router.use(auth);

// GET  /api/notifications              — paginated list
router.get('/', notificationController.getNotifications);

// GET  /api/notifications/unread-count — badge count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/notifications/read-all   — bulk mark read (must come before /:id)
router.patch('/read-all', notificationController.markAllRead);

// PATCH /api/notifications/:id/read   — mark single read
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
