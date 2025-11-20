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

    const profile = await EmployerProfile.findOne({ userId: user._id });
    
    res.json({
      ...user.toObject(),
      employerProfile: profile,
    });
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
    const { fullName, phoneNumber, location } = req.body;
    if (fullName) user.fullName = fullName;
    await user.save();

    // Update employer profile
    const profileUpdate = {};
    const allowedFields = ['companyName', 'industry', 'companyWebsite', 'companySize', 'companyDescription', 'contactEmail', 'phoneNumber'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        profileUpdate[field] = req.body[field];
      }
    });

    const profile = await EmployerProfile.findOneAndUpdate(
      { userId: user._id },
      { $set: profileUpdate },
      { new: true, upsert: true }
    );

    res.json({
      ...user.toObject(),
      employerProfile: profile,
    });
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

module.exports = router;
