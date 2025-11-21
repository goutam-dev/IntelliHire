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
    const mongoose = require('mongoose');
    const User = require('../models/User');
    const Job = require('../models/Job');
    const JobApplication = require('../models/JobApplication');
    const EmployerProfile = require('../models/EmployerProfile');
    
    const user = await User.findOne({ clerkUserId: req.auth.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const employerProfile = await EmployerProfile.findOne({ user: user._id });
    if (!employerProfile) {
      return res.status(404).json({ error: 'Employer profile not found' });
    }

    const totalJobs = await Job.countDocuments({ employer: employerProfile._id });
    const activeJobs = await Job.countDocuments({ employer: employerProfile._id, status: 'active' });
    
    const draftJobs = await Job.countDocuments({ employer: employerProfile._id, status: 'draft' });
    const closedJobs = await Job.countDocuments({ employer: employerProfile._id, status: 'closed' });
    const archivedJobs = await Job.countDocuments({ employer: employerProfile._id, status: 'archived' });
    
    // Get all job IDs for this employer
    const jobs = await Job.find({ employer: employerProfile._id }).select('_id');
    const jobIds = jobs.map(job => job._id);
    
    const totalApplications = await JobApplication.countDocuments({ job: { $in: jobIds } });
    const pendingApplications = await JobApplication.countDocuments({ 
      job: { $in: jobIds }, 
      status: 'applied' 
    });

    // New applications (last 24 hours)
    // Use _id for timestamp check as it's more reliable if createdAt is missing
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const hexSeconds = Math.floor(oneDayAgo.getTime() / 1000).toString(16).padStart(8, '0');
    const minId = new mongoose.Types.ObjectId(hexSeconds + "0000000000000000");

    const newApplications = await JobApplication.countDocuments({
      job: { $in: jobIds },
      _id: { $gte: minId }
    });

    // Recent applications (top 5)
    const recentApplications = await JobApplication.find({ job: { $in: jobIds } })
      .sort({ _id: -1 }) // Sort by _id (creation time)
      .limit(5)
      .populate({
        path: 'candidate',
        populate: { path: 'user', select: 'fullName email' }
      })
      .populate('job', 'title');

    res.json({
      totalJobs,
      activeJobs,
      draftJobs,
      closedJobs,
      archivedJobs,
      totalApplications,
      pendingReviews: pendingApplications,
      newApplications,
      recentApplications
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
