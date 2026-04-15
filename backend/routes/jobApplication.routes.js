const express = require('express');
const router = express.Router();
const jobApplicationController = require('../controllers/jobApplicationController');
const auth = require('../middleware/auth');
const { applicationUpload } = require('../middleware/upload');

// Accept both resume (PDF) and applicationVideo in a single multipart request
// applicationUpload allows two files in a single request
const applyFields = applicationUpload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'applicationVideo', maxCount: 1 }
]);

// Candidate routes
router.get('/check/:jobId', auth, jobApplicationController.checkApplicationStatus);
router.get('/profile-data', auth, jobApplicationController.getProfileDataForApplication);
router.post('/apply', auth, applyFields, jobApplicationController.submitApplication);
router.get('/my-applications', auth, jobApplicationController.getMyApplications);
router.get('/download-resume', auth, jobApplicationController.downloadResume);
router.get('/:applicationId', auth, jobApplicationController.getApplicationById);
router.patch('/:applicationId/withdraw', auth, jobApplicationController.withdrawApplication);
router.post('/:applicationId/request-reinterview', auth, jobApplicationController.requestReInterview);

module.exports = router;
