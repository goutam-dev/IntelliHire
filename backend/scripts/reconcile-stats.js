/**
 * Script to reconcile application statistics
 * Run this periodically or after data imports to ensure stats are accurate
 */

require('dotenv').config();
const mongoose = require('mongoose');
const CandidateProfile = require('../models/CandidateProfile');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const EmployerProfile = require('../models/EmployerProfile');

async function reconcileStats() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihire');
    console.log('✅ Connected to MongoDB');

    // Reconcile candidate stats
    console.log('📊 Reconciling candidate application statistics...');
    const candidates = await CandidateProfile.find({}).select('user');
    
    for (const candidate of candidates) {
      const totalApplications = await JobApplication.countDocuments({
        candidateId: candidate.user,
        status: { $ne: 'Withdrawn' }
      });
      
      const pending = await JobApplication.countDocuments({
        candidateId: candidate.user,
        status: 'Applied'
      });
      
      const shortlisted = await JobApplication.countDocuments({
        candidateId: candidate.user,
        status: { $in: ['Shortlisted', 'Interview Scheduled'] }
      });
      
      const rejected = await JobApplication.countDocuments({
        candidateId: candidate.user,
        status: 'Rejected'
      });

      await CandidateProfile.findByIdAndUpdate(candidate._id, {
        'stats.totalApplications': totalApplications,
        'stats.pending': pending,
        'stats.shortlisted': shortlisted,
        'stats.rejected': rejected
      });
    }
    
    console.log(`✅ Updated ${candidates.length} candidate profiles`);

    // Reconcile employer stats
    console.log('📊 Reconciling employer job statistics...');
    const employers = await EmployerProfile.find({}).select('_id');
    
    for (const employer of employers) {
      const totalJobs = await Job.countDocuments({ employer: employer._id });
      const activeJobs = await Job.countDocuments({ employer: employer._id, status: 'active' });
      
      // Get all job IDs for this employer
      const jobs = await Job.find({ employer: employer._id }).select('_id');
      const jobIds = jobs.map(job => job._id);
      
      const totalApplications = await JobApplication.countDocuments({
        jobId: { $in: jobIds }
      });
      
      const pendingReviews = await JobApplication.countDocuments({
        jobId: { $in: jobIds },
        status: 'Applied'
      });

      await EmployerProfile.findByIdAndUpdate(employer._id, {
        'stats.totalJobs': totalJobs,
        'stats.activeJobs': activeJobs,
        'stats.totalApplications': totalApplications,
        'stats.pendingReviews': pendingReviews
      });
    }
    
    console.log(`✅ Updated ${employers.length} employer profiles`);

    // Reconcile job application counts
    console.log('📊 Reconciling job application counts...');
    const jobs = await Job.find({}).select('_id');
    
    for (const job of jobs) {
      const count = await JobApplication.countDocuments({
        jobId: job._id,
        status: { $ne: 'Withdrawn' }
      });
      
      await Job.findByIdAndUpdate(job._id, {
        applicationsCount: count
      });
    }
    
    console.log(`✅ Updated ${jobs.length} job application counts`);

    console.log('🎉 Statistics reconciliation completed successfully!');
  } catch (error) {
    console.error('❌ Error reconciling statistics:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
reconcileStats();
