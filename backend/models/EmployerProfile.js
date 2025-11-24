const { Schema, model } = require('mongoose');

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const EmployerProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyName: { type: String, required: true, trim: true },
    industry: { type: String, trim: true },
    companyDescription: { type: String },
    companyWebsite: { type: String, trim: true },
    companySize: { type: String, enum: COMPANY_SIZES },
    contactEmail: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    location: { type: String, trim: true },
    logoUrl: { type: String },
    socialLinks: {
      linkedin: { type: String },
      twitter: { type: String }
    },
    stats: {
      totalJobs: { type: Number, default: 0 },
      activeJobs: { type: Number, default: 0 },
      totalApplications: { type: Number, default: 0 },
      pendingReviews: { type: Number, default: 0 }
    },
    notificationSettings: {
      applicationEmails: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

EmployerProfileSchema.index({ user: 1 }, { unique: true }); // One profile per user
EmployerProfileSchema.index({ companyName: 1 }); // For company name search
EmployerProfileSchema.index({ industry: 1 }); // For filtering by industry

module.exports = model('EmployerProfile', EmployerProfileSchema);
