const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    required: true,
    default: () => 'APP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase()
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Interviewed', 'Rejected', 'Hired', 'Withdrawn', 'Job Closed', 'Job Deleted'],
    default: 'Applied'
  },
  // Application-specific profile data (can be different from main profile)
  applicationProfile: {
    personalInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
      location: { type: String }
    },
    experience: [{
      title: String,
      companyName: String,
      location: String,
      startDate: Date,
      endDate: Date,
      isCurrentRole: Boolean,
      description: String
    }],
    education: [{
      degree: String,
      institution: String,
      fieldOfStudy: String,
      startDate: Date,
      endDate: Date,
      gpa: String,
      description: String
    }],
    skills: [String],
    summary: String
  },
  // Resume information
  resume: {
    filename: { type: String, required: true },
    originalName: String,
    uploadDate: { type: Date, default: Date.now },
    fileSize: Number,
    filePath: String,
    isFromProfile: { type: Boolean, default: false } // true if using existing resume from profile
  },
  // Video introduction – required at application time (validated in service layer)
  video: {
    filename: { type: String },
    originalName: String,
    uploadDate: { type: Date, default: Date.now },
    fileSize: Number,
    filePath: String,
    isFromProfile: { type: Boolean, default: false }
  },
  // Derived files generated server-side from the application video
  audioFile: {
    // WAV audio extracted for voice-verification during interview
    filename: { type: String },
    filePath: { type: String },  // relative: /uploads/application-audio/<name>.wav
    createdAt: { type: Date }
  },
  silentVideoFile: {
    // Audio-stripped MP4 for facial-verification during interview
    filename: { type: String },
    filePath: { type: String },  // relative: /uploads/application-videos-silent/<name>-silent.mp4
    createdAt: { type: Date }
  },
  // Voice verification enrollment — generated from audioFile by the Python voice service
  voiceEnrollment: {
    speakerId: { type: String, default: null },    // applicationId echoed back from Python /api/enroll
    embeddingPath: { type: String, default: null },    // embeddings/<speaker_id>.pt on the Python service
    enrolledAt: { type: Date, default: null },
    status: { type: String, enum: ['pending', 'enrolled', 'failed'], default: 'pending' },
    errorMessage: { type: String, default: null },
  },
  // Face verification enrollment — generated from application video by unified face service
  faceEnrollment: {
    candidateId: { type: String, default: null },
    registrationType: { type: String, default: null },
    canonicalEmbedding: { type: [Number], default: [] },
    framesUsed: { type: Number, default: 0 },
    totalFrames: { type: Number, default: 0 },
    usableFrames: { type: Number, default: 0 },
    qualityScore: { type: Number, default: null },
    embeddingConsistency: { type: Number, default: null },
    qualityBreakdown: { type: mongoose.Schema.Types.Mixed, default: null },
    referenceImagePath: { type: String, default: null },
    enrolledAt: { type: Date, default: null },
    status: { type: String, enum: ['pending', 'enrolled', 'failed'], default: 'pending' },
    errorMessage: { type: String, default: null },
  },
  coverLetter: {
    type: String,
    maxlength: 500
  },
  profileAccuracyConfirmed: {
    type: Boolean,
    required: true,
    default: false
  },
  // Interview window set by employer
  interviewWindowStart: {
    type: Date,
    default: null
  },
  interviewWindowEnd: {
    type: Date,
    default: null
  },
  interviewNotificationSentAt: {
    type: Date,
    default: null
  },
  interviewCompletionNotificationSentAt: {
    type: Date,
    default: null
  },
  // Employer actions
  employerNotes: String,
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Application metadata
  appliedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    default: 'web'
  }
}, {
  timestamps: true
});

// Unique index to prevent duplicate applications (unless withdrawn)
jobApplicationSchema.index(
  { jobId: 1, candidateId: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'Withdrawn' } } }
);

// Indexes for efficient queries
jobApplicationSchema.index({ candidateId: 1, appliedAt: -1 });
jobApplicationSchema.index({ candidateId: 1, status: 1 }); // For filtering by candidate and status
jobApplicationSchema.index({ jobId: 1, appliedAt: -1 });
jobApplicationSchema.index({ jobId: 1, status: 1 }); // For filtering by job and status
jobApplicationSchema.index({ status: 1, appliedAt: -1 }); // For status-based listings
jobApplicationSchema.index({ applicationId: 1 }, { unique: true }); // Unique application ID lookup
jobApplicationSchema.index({ 'applicationProfile.personalInfo.email': 1 }); // For email search

// Virtual for application age
jobApplicationSchema.virtual('appliedAgo').get(function () {
  const now = new Date();
  const diffTime = Math.abs(now - this.appliedAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  return `${Math.ceil(diffDays / 30)} months ago`;
});

// Ensure virtual fields are serialized
jobApplicationSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to update lastUpdated
jobApplicationSchema.pre('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
