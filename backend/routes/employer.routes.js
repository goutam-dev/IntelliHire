const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/clerkAuth');
const employerController = require('../controllers/employerController');
const applicationController = require('../controllers/applicationController');

// All employer routes require authentication and employer role
router.use(requireAuth);
router.use(requireRole('employer'));

// ==========================================
// Employer Profile Routes
// ==========================================
router.get('/profile', employerController.getEmployerProfile);
router.put('/profile', employerController.updateEmployerProfile);
router.post(
  '/profile/logo',
  employerController.uploadLogoMiddleware,
  employerController.uploadLogo
);

// ==========================================
// Dashboard Routes
// ==========================================
router.get('/dashboard/stats', employerController.getDashboardStats);

// ==========================================
// Application Management Routes
// ==========================================
router.get('/jobs/:jobId/applications', applicationController.listApplicationsByJob);
router.patch('/applications/bulk/status', applicationController.bulkUpdateStatus);
router.patch('/applications/:id/status', applicationController.updateApplicationStatus);
router.post('/applications/:id/interview', applicationController.scheduleInterview);

module.exports = router;
