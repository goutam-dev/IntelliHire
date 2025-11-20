const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/clerkAuth');

// All candidate routes require authentication and candidate role
router.use(requireAuth);
router.use(requireRole('candidate'));

// Get candidate profile
router.get('/profile', async (req, res) => {
  try {
    const User = require('../models/User');
    const CandidateProfile = require('../models/CandidateProfile');
    
    const user = await User.findOne({ clerkUserId: req.auth.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = await CandidateProfile.findOne({ userId: user._id });
    
    res.json({
      ...user.toObject(),
      candidateProfile: profile,
      profileCompletion: user.profileCompletion,
    });
  } catch (error) {
    console.error('Get candidate profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update candidate profile
router.put('/profile', async (req, res) => {
  try {
    const User = require('../models/User');
    const CandidateProfile = require('../models/CandidateProfile');
    
    const user = await User.findOne({ clerkUserId: req.auth.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user fields
    const { fullName, phoneNumber, location } = req.body;
    if (fullName) user.fullName = fullName;
    
    // Update candidate profile
    const profileUpdate = {};
    const allowedFields = [
      'professionalHeadline',
      'phoneNumber',
      'currentLocation',
      'linkedInProfile',
      'portfolioWebsite',
      'resumeUrl',
      'education',
      'workExperience',
      'skills',
      'professionalSummary'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        profileUpdate[field] = req.body[field];
      }
    });

    const profile = await CandidateProfile.findOneAndUpdate(
      { userId: user._id },
      { $set: profileUpdate },
      { new: true, upsert: true }
    );

    // Recalculate profile completion
    const completion = {
      basicInfo: true, // Already complete after signup
      resume: !!profile.resumeUrl,
      education: profile.education && profile.education.length > 0,
      experience: profile.workExperience && profile.workExperience.length > 0,
      skills: profile.skills && profile.skills.length >= 3,
    };

    const completionCount = Object.values(completion).filter(Boolean).length;
    const percentage = (completionCount / 5) * 100;

    user.profileCompletion = {
      ...completion,
      percentage,
    };
    
    await user.save();

    res.json({
      ...user.toObject(),
      candidateProfile: profile,
      profileCompletion: user.profileCompletion,
    });
  } catch (error) {
    console.error('Update candidate profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get candidate dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const User = require('../models/User');
    const JobApplication = require('../models/JobApplication');
    
    const user = await User.findOne({ clerkUserId: req.auth.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalApplications = await JobApplication.countDocuments({ candidateId: user._id });
    const pendingApplications = await JobApplication.countDocuments({ 
      candidateId: user._id, 
      status: 'applied' 
    });
    const shortlistedApplications = await JobApplication.countDocuments({ 
      candidateId: user._id, 
      status: 'shortlisted' 
    });
    const rejectedApplications = await JobApplication.countDocuments({ 
      candidateId: user._id, 
      status: 'rejected' 
    });

    res.json({
      totalApplications,
      pending: pendingApplications,
      shortlisted: shortlistedApplications,
      rejected: rejectedApplications,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
