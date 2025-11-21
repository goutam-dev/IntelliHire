const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/clerkAuth');

// All employer routes require authentication and employer role
router.use(requireAuth);
router.use(requireRole('employer'));

// Get employer profile
router.get('/profile', async (req, res) => {
  try {
    const User = require('../models/User');
    const EmployerProfile = require('../models/EmployerProfile');
    
    const user = await User.findOne({ clerkUserId: req.auth.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = await EmployerProfile.findOne({ user: user._id }).populate('user', 'fullName email role phoneNumber');
    
    if (!profile) {
      return res.status(404).json({ error: 'Employer profile not found' });
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Get employer profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update employer profile
router.put('/profile', async (req, res) => {
  try {
    const User = require('../models/User');
    const EmployerProfile = require('../models/EmployerProfile');
    
    const user = await User.findOne({ clerkUserId: req.auth.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user fields
    const { fullName, phoneNumber } = req.body;
    if (fullName) user.fullName = fullName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    await user.save();

    // Update employer profile
    const profileUpdate = {};
    const allowedFields = ['companyName', 'industry', 'companyWebsite', 'companySize', 'companyDescription', 'contactEmail', 'location', 'phoneNumber'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        profileUpdate[field] = req.body[field];
      }
    });

    const profile = await EmployerProfile.findOneAndUpdate(
      { user: user._id },
      { $set: profileUpdate },
      { new: true, upsert: true }
    ).populate('user', 'fullName email role phoneNumber');

    if (!profile) {
      return res.status(404).json({ error: 'Employer profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Update employer profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get employer dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const User = require('../models/User');
    const Job = require('../models/Job');
    const JobApplication = require('../models/JobApplication');
    
    const user = await User.findOne({ clerkUserId: req.auth.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalJobs = await Job.countDocuments({ employerId: user._id });
    const activeJobs = await Job.countDocuments({ employerId: user._id, status: 'active' });
    
    // Get all job IDs for this employer
    const jobs = await Job.find({ employerId: user._id }).select('_id');
    const jobIds = jobs.map(job => job._id);
    
    const totalApplications = await JobApplication.countDocuments({ jobId: { $in: jobIds } });
    const pendingApplications = await JobApplication.countDocuments({ 
      jobId: { $in: jobIds }, 
      status: 'applied' 
    });

    res.json({
      totalJobs,
      activeJobs,
      totalApplications,
      pendingReviews: pendingApplications,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Application Management Routes
const {
  listApplicationsByJob,
  updateApplicationStatus,
  bulkUpdateStatus,
  scheduleInterview,
} = require('../controllers/applicationController');

const {
  uploadLogoMiddleware,
  uploadLogo,
  changePassword,
} = require('../controllers/employerController');

router.get('/jobs/:jobId/applications', listApplicationsByJob);
router.patch('/applications/bulk/status', bulkUpdateStatus);
router.patch('/applications/:id/status', updateApplicationStatus);
router.post('/applications/:id/interview', scheduleInterview);

// Employer Profile Extras
router.post('/profile/logo', uploadLogoMiddleware, uploadLogo);
// router.put('/profile/password', changePassword); // Not needed for Clerk

module.exports = router;
