const express = require('express');
const router = express.Router();
const { completeSignup, getUserRole, handleWebhook, checkEmailExists } = require('../controllers/auth.controller');

// Complete signup after email verification
router.post('/complete-signup', completeSignup);

// Get user role
router.get('/user-role', getUserRole);

// Webhook endpoint for Clerk events
router.post('/webhook', handleWebhook);

// Check if email exists (for password reset)
router.post('/check-email', checkEmailExists);

module.exports = router;
