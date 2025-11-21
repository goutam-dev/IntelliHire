const mongoose = require('mongoose');
const Job = require('../models/Job');

const DEFAULT_EMPLOYER_ID =
  process.env.DEFAULT_EMPLOYER_ID || '000000000000000000000000';

const resolveEmployerId = (value) => {
  const candidate = value || DEFAULT_EMPLOYER_ID;
  if (!candidate || !mongoose.Types.ObjectId.isValid(candidate)) {
    return null;
  }
  return candidate;
};

const buildFilters = ({ status, search, employerId }) => {
  const filters = {};

  if (status && status !== 'all') {
    filters.status = status;
  }

  const resolvedEmployerId = resolveEmployerId(employerId);
  if (resolvedEmployerId) {
    filters.employer = resolvedEmployerId;
  }

  if (search) {
    filters.$or = [
      { title: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
    ];
  }

  return filters;
};

exports.listJobs = async (req, res, next) => {
  try {
    let filters = buildFilters(req.query);

    // If authenticated as employer, filter by their profile ID
    if (req.auth?.userId) {
      const User = require('../models/User');
      const EmployerProfile = require('../models/EmployerProfile');
      
      const user = await User.findOne({ clerkUserId: req.auth.userId });
      if (user && user.role === 'employer') {
        const employerProfile = await EmployerProfile.findOne({ user: user._id });
        if (employerProfile) {
          // Override any employerId from query params with authenticated employer
          filters.employer = employerProfile._id;
        }
      }
    }

    // Ensure aggregation matches by ObjectId for employer
    if (filters.employer && typeof filters.employer === 'string') {
      filters.employer = new mongoose.Types.ObjectId(filters.employer);
    }

    const jobs = await Job.aggregate([
      { $match: filters },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'jobapplications',
          let: { jobId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$job', '$$jobId'] } } },
            { $count: 'count' },
          ],
          as: 'appCounts',
        },
      },
      {
        $addFields: {
          applicationsCount: {
            $ifNull: [{ $arrayElemAt: ['$appCounts.count', 0] }, 0],
          },
        },
      },
      { $project: { appCounts: 0 } },
    ]);

    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

exports.getJobById = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    next(error);
  }
};

exports.createJob = async (req, res, next) => {
  try {
    const {
      title,
      department,
      description,
      requiredSkills,
      experienceLevel,
      educationRequirements,
      location,
      employmentType,
      salaryRange,
      applicationDeadline,
      status = 'draft',
    } = req.body;

    if (!title || !description || !requiredSkills || !experienceLevel || !location || !employmentType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get employer profile ID from authenticated user
    const User = require('../models/User');
    const EmployerProfile = require('../models/EmployerProfile');
    
    const user = await User.findOne({ clerkUserId: req.auth.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const employerProfile = await EmployerProfile.findOne({ user: user._id });
    if (!employerProfile) {
      return res.status(404).json({ message: 'Employer profile not found' });
    }

    const job = await Job.create({
      employer: employerProfile._id,
      title,
      department,
      description,
      requiredSkills,
      experienceLevel,
      educationRequirements,
      location,
      employmentType,
      salaryRange,
      applicationDeadline,
      status,
      publishedAt: status === 'active' ? new Date() : undefined,
      lastStatusChangeAt: new Date(),
    });

    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
};

exports.updateJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.jobId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    next(error);
  }
};

exports.updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    job.status = status;
    job.lastStatusChangeAt = new Date();
    if (status === 'active' && !job.publishedAt) {
      job.publishedAt = new Date();
    }

    await job.save();
    res.json(job);
  } catch (error) {
    next(error);
  }
};

exports.deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
