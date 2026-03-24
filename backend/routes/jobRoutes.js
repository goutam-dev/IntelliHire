const express = require('express');
const {
  listJobs,
  getJobById,
  incrementJobViews,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  getFilterOptions,
} = require('../controllers/jobController');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/clerkAuth');

const router = express.Router();

// Public or Authenticated (Candidates)
router.get('/', optionalAuth, listJobs);
router.get('/filters/options', getFilterOptions);
router.post('/:jobId/views', optionalAuth, incrementJobViews);
router.get('/:jobId', optionalAuth, getJobById);

// Employer only routes
router.post('/', requireAuth, requireRole('employer'), createJob);
router.put('/:jobId', requireAuth, requireRole('employer'), updateJob);
router.patch('/:jobId/status', requireAuth, requireRole('employer'), updateJobStatus);
router.delete('/:jobId', requireAuth, requireRole('employer'), deleteJob);

module.exports = router;
