const express = require('express');
const router = express.Router();
const { completeSignup, getUserRole, checkEmailExists } = require('../controllers/auth.controller');

// Complete signup after email verification
router.post('/complete-signup', completeSignup);

// Get user role
router.get('/user-role', getUserRole);

// Check if email exists (for password reset)
router.post('/check-email', checkEmailExists);

module.exports = router;
