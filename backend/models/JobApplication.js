const { Schema, model } = require('mongoose');

const APPLICATION_STATUSES = [
  'applied',
  'shortlisted',
  'interview',
  'accepted',
  'rejected',
  'withdrawn'
];

const StatusHistorySchema = new Schema(
  {
    status: { type: String, enum: APPLICATION_STATUSES, required: true },
    notes: { type: String },
    actorId: { type: Schema.Types.ObjectId },
    actorType: { type: String, enum: ['employer', 'candidate', 'system'], default: 'system' },
    interviewDetails: {
      date: { type: Date },
      location: { type: String },
      instructions: { type: String }
    },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const AttachmentSchema = new Schema(
  {
    fileName: { type: String },
    fileUrl: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const JobApplicationSchema = new Schema(
  {
    job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    employer: { type: Schema.Types.ObjectId, ref: 'EmployerProfile', required: true },
    candidate: { type: Schema.Types.ObjectId, ref: 'CandidateProfile', required: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'applied' },
    resume: { type: AttachmentSchema },
    coverLetter: { type: String, maxlength: 500 },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    feedback: { type: String },
    interview: {
      scheduledAt: { type: Date },
      instructions: { type: String }
    },
    lastUpdatedBy: { type: Schema.Types.ObjectId, refPath: 'lastUpdatedByModel' },
    lastUpdatedByModel: { type: String, enum: ['EmployerProfile', 'CandidateProfile', 'User'] }
  },
  { timestamps: true }
);

JobApplicationSchema.index({ job: 1, candidate: 1 }, { unique: true });
JobApplicationSchema.index({ employer: 1 });
JobApplicationSchema.index({ status: 1 });

module.exports = model('JobApplication', JobApplicationSchema);
