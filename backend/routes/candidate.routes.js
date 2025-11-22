const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(auth);

// ==========================================
// Profile Routes
// ==========================================
router.get('/profile', candidateController.getCandidateProfile);
router.put('/profile', candidateController.updateBasicInfo);

// ==========================================
// Resume Routes
// ==========================================
router.post('/resume', upload.single('resume'), candidateController.uploadResume);
router.delete('/resume', candidateController.deleteResume);

// ==========================================
// Photo Routes
// ==========================================
router.post('/photo', upload.single('profilePhoto'), candidateController.uploadPhoto);
router.delete('/photo', candidateController.deletePhoto);

// ==========================================
// Education Routes
// ==========================================
router.post('/education', candidateController.addEducation);
router.put('/education/:educationId', candidateController.updateEducation);
router.delete('/education/:educationId', candidateController.deleteEducation);

// ==========================================
// Experience Routes
// ==========================================
router.post('/experience', candidateController.addExperience);
router.put('/experience/:experienceId', candidateController.updateExperience);
router.delete('/experience/:experienceId', candidateController.deleteExperience);

// ==========================================
// Skills Routes
// ==========================================
router.put('/skills', candidateController.updateSkills);

// ==========================================
// Settings & Stats Routes
// ==========================================
router.put('/preferences', candidateController.updateNotificationPreferences);
router.get('/completion', candidateController.getProfileCompletion);
router.get('/dashboard/stats', candidateController.getDashboardStats);

module.exports = router;
