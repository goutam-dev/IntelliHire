const { Schema, model } = require('mongoose');

const EducationSchema = new Schema(
  {
    degree: { type: String, required: true },
    fieldOfStudy: { type: String, required: true },
    institution: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    currentlyEnrolled: { type: Boolean, default: false },
    grade: { type: String },
    description: { type: String }
  },
  { _id: false }
);

const ExperienceSchema = new Schema(
  {
    title: { type: String, required: true },
    companyName: { type: String, required: true },
    location: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    currentlyWorking: { type: Boolean, default: false },
    description: { type: String }
  },
  { _id: false }
);

const ResumeSchema = new Schema(
  {
    fileName: { type: String },
    fileUrl: { type: String },
    uploadedAt: { type: Date }
  },
  { _id: false }
);

const CandidateProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    phoneNumber: { type: String, trim: true },
    location: { type: String, trim: true },
    professionalTitle: { type: String, trim: true },
    headline: { type: String, trim: true },
    summary: { type: String, maxlength: 500 },
    linkedinUrl: { type: String, trim: true },
    portfolioUrl: { type: String, trim: true },
    resume: { type: ResumeSchema, default: () => ({}) },
    education: { type: [EducationSchema], default: [] },
    experience: { type: [ExperienceSchema], default: [] },
    skills: { type: [String], default: [] },
    profilePhotoUrl: { type: String },
    stats: {
      totalApplications: { type: Number, default: 0 },
      shortlisted: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 }
    },
    lastProfileUpdateAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = model('CandidateProfile', CandidateProfileSchema);
