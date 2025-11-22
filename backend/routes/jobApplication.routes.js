const express = require('express');
const router = express.Router();
const jobApplicationController = require('../controllers/jobApplicationController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Candidate routes
router.get('/check/:jobId', auth, jobApplicationController.checkApplicationStatus);
router.get('/profile-data', auth, jobApplicationController.getProfileDataForApplication);
router.post('/apply', auth, upload.single('resume'), jobApplicationController.submitApplication);
router.get('/my-applications', auth, jobApplicationController.getMyApplications);
router.get('/download-resume', auth, jobApplicationController.downloadResume);
router.get('/:applicationId', auth, jobApplicationController.getApplicationById);
router.patch('/:applicationId/withdraw', auth, jobApplicationController.withdrawApplication);

module.exports = router;
