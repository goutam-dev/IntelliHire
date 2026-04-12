const { Schema, model } = require('mongoose');

const EXPERIENCE_LEVELS = ['no-experience', 'entry', 'mid', 'senior', 'expert'];
const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'remote'];
const JOB_STATUSES = ['draft', 'active', 'closed', 'archived'];

const SalaryRangeSchema = new Schema(
  {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: 'USD' }
  },
  { _id: false }
);

const JobSchema = new Schema(
  {
    employer: { type: Schema.Types.ObjectId, ref: 'EmployerProfile', required: true },
    title: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
    description: { type: String, required: true },
    requiredSkills: { type: [String], required: true },
    experienceLevel: { type: String, enum: EXPERIENCE_LEVELS, required: true },
    educationRequirements: { type: String },
    location: { type: String, required: true },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, required: true },
    salaryRange: { type: SalaryRangeSchema },
    applicationDeadline: { type: Date },
    status: { type: String, enum: JOB_STATUSES, default: 'draft' },
    metadata: {
      views: { type: Number, default: 0 },
      bookmarks: { type: Number, default: 0 }
    },
    publishedAt: { type: Date },
    lastStatusChangeAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Compound indexes for common queries
JobSchema.index({ employer: 1, status: 1 });
JobSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
JobSchema.index({ status: 1, createdAt: -1 }); // For listing active/published jobs
JobSchema.index({ status: 1, publishedAt: -1 }); // For sorting by publish date
JobSchema.index({ experienceLevel: 1, employmentType: 1, status: 1 }); // For filtering

// Text index for search
JobSchema.index({ title: 'text', description: 'text', requiredSkills: 'text' }, { 
  weights: { title: 10, requiredSkills: 5, description: 1 }  // Prioritize title matches
});

module.exports = model('Job', JobSchema);
