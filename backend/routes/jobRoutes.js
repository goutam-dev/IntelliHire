const express = require('express');
const {
  listJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
} = require('../controllers/jobController');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/clerkAuth');

const router = express.Router();

// Public or Authenticated (Candidates)
router.get('/', optionalAuth, listJobs);
router.get('/:jobId', getJobById);

// Employer only routes
router.post('/', requireAuth, requireRole('employer'), createJob);
router.put('/:jobId', requireAuth, requireRole('employer'), updateJob);
router.patch('/:jobId/status', requireAuth, requireRole('employer'), updateJobStatus);
router.delete('/:jobId', requireAuth, requireRole('employer'), deleteJob);

module.exports = router;
