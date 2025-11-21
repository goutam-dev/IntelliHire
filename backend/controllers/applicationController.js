const mongoose = require('mongoose');
const JobApplication = require('../models/JobApplication');

const buildSearchFilter = (search) => {
  if (!search) return {};
  const regex = new RegExp(search, 'i');
  // Search across candidate's user fullName/email, candidate phone, and notes
  return {
    $or: [
      { feedback: { $regex: regex } },
      { 'candidate.phoneNumber': { $regex: regex } },
      { 'candidate.professionalTitle': { $regex: regex } },
      { 'candidate.location': { $regex: regex } },
      { 'candidate.skills': { $regex: regex } },
      { 'candidate.user.fullName': { $regex: regex } },
      { 'candidate.user.email': { $regex: regex } },
    ],
  };
};

exports.listApplicationsByJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { status = 'all', search = '', sort = 'newest' } = req.query;

    console.log(`[listApplicationsByJob] jobId=${jobId} status=${status} sort=${sort} search=${search}`);

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid jobId' });
    }

    // 1. Build base query (direct fields only)
    const query = { job: jobId };
    if (status && status !== 'all') {
      query.status = status;
    }

    // 2. Fetch all matching applications with full population
    // Use .lean() to get plain JavaScript objects for better performance and easier sorting
    let applications = await JobApplication.find(query)
      .populate({
        path: 'candidate',
        populate: { path: 'user', select: 'fullName email phoneNumber' },
        select: 'phoneNumber location professionalTitle skills resume education experience',
      })
      .populate({ path: 'employer', select: 'companyName' })
      .populate({ path: 'job', select: 'title department' })
      .lean();

    console.log(`[listApplicationsByJob] Found ${applications.length} applications before processing`);

    // 3. In-memory Filtering (Search)
    if (search) {
      const searchLower = search.toLowerCase();
      applications = applications.filter((app) => {
        const candidateName = app.candidate?.user?.fullName?.toLowerCase() || '';
        const candidateEmail = app.candidate?.user?.email?.toLowerCase() || '';
        const candidatePhone = app.candidate?.user?.phoneNumber?.toLowerCase() || '';
        const professionalTitle = app.candidate?.professionalTitle?.toLowerCase() || '';
        const feedback = app.feedback?.toLowerCase() || '';
        
        return (
          candidateName.includes(searchLower) ||
          candidateEmail.includes(searchLower) ||
          candidatePhone.includes(searchLower) ||
          professionalTitle.includes(searchLower) ||
          feedback.includes(searchLower)
        );
      });
    }

    // 4. In-memory Sorting
    applications.sort((a, b) => {
      // Helper to get date or epoch if missing
      const getTimestamp = (doc) => {
        if (doc.createdAt) return new Date(doc.createdAt).getTime();
        // Fallback to _id timestamp if createdAt is missing
        if (doc._id) {
          const idStr = doc._id.toString();
          return parseInt(idStr.substring(0, 8), 16) * 1000;
        }
        return 0;
      };

      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);
      
      if (sort === 'newest') {
        return timeB - timeA;
      } else if (sort === 'oldest') {
        return timeA - timeB;
      } else if (sort === 'name') {
        const nameA = a.candidate?.user?.fullName?.toLowerCase() || '';
        const nameB = b.candidate?.user?.fullName?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    // Debug log for first item to verify sort and keys
    if (applications.length > 0) {
      const first = applications[0];
      console.log(`[listApplicationsByJob] First app keys: ${Object.keys(first).join(', ')}`);
      console.log(`[listApplicationsByJob] First app after sort: ${first.candidate?.user?.fullName} (Created: ${first.createdAt}, ID: ${first._id})`);
    }

    res.json(applications);
  } catch (error) {
    console.error('[listApplicationsByJob] Error:', error);
    next(error);
  }
};

exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, feedback } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid applicationId' });
    }
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const application = await JobApplication.findById(id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    application.status = status;
    if (feedback) application.feedback = feedback;
    application.statusHistory.push({ status, notes, actorType: 'employer' });
    await application.save();

    const populated = await application.populate([
      { path: 'candidate', populate: { path: 'user', select: 'fullName email phoneNumber' } },
      { path: 'employer', select: 'companyName' },
      { path: 'job', select: 'title department' },
    ]);

    res.json(populated);
  } catch (error) {
    next(error);
  }
};

exports.bulkUpdateStatus = async (req, res, next) => {
  try {
    const { ids = [], status, notes, feedback } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array is required' });
    }
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    const applications = await JobApplication.find({ _id: { $in: objectIds } });

    for (const app of applications) {
      app.status = status;
      if (feedback) app.feedback = feedback;
      app.statusHistory.push({ status, notes, actorType: 'employer' });
      await app.save();
    }

    res.json({ updated: applications.length });
  } catch (error) {
    next(error);
  }
};

exports.scheduleInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scheduledAt, instructions } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid applicationId' });
    }

    const application = await JobApplication.findById(id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    application.interview = { scheduledAt, instructions };
    application.status = 'interview';
    application.statusHistory.push({
      status: 'interview',
      notes: `Interview scheduled for ${scheduledAt}`,
      actorType: 'employer',
      interviewDetails: { date: scheduledAt, instructions },
    });
    await application.save();

    const populated = await application.populate([
      { path: 'candidate', populate: { path: 'user', select: 'fullName email phoneNumber' } },
      { path: 'employer', select: 'companyName' },
      { path: 'job', select: 'title department' },
    ]);

    res.json(populated);
  } catch (error) {
    next(error);
  }
};
