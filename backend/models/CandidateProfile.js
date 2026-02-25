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
  { _id: true }
);

const ExperienceSchema = new Schema(
  {
    title: { type: String, required: true },
    companyName: { type: String, required: true },
    location: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    currentlyWorking: { type: Boolean, default: false },
    description: { type: String },
    experienceType: { type: String, enum: ['specific', 'years'], default: 'specific' },
    yearsOfExperience: { type: Number }
  },
  { _id: true }
);

const ResumeSchema = new Schema(
  {
    fileName: { type: String },
    fileUrl: { type: String },
    uploadedAt: { type: Date }
  },
  { _id: false }
);

const VideoSchema = new Schema(
  {
    fileName: { type: String },
    fileUrl: { type: String },
    uploadedAt: { type: Date },
    fileSize: { type: Number }
  },
  { _id: false }
);

const ProfileCompletionSchema = new Schema(
  {
    basicInfo: { type: Boolean, default: false },
    resume: { type: Boolean, default: false },
    education: { type: Boolean, default: false },
    experience: { type: Boolean, default: false },
    skills: { type: Boolean, default: false },
    percentage: { type: Number, default: 0 }
  },
  { _id: false }
);

const NotificationPreferencesSchema = new Schema(
  {
    applicationUpdates: { type: Boolean, default: true },
    jobRecommendations: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false }
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
    professionalHeadline: { type: String, trim: true }, // Alias for headline
    summary: { type: String, maxlength: 500 },
    linkedinUrl: { type: String, trim: true },
    portfolioUrl: { type: String, trim: true },
    resume: { type: ResumeSchema, default: () => ({}) },
    education: { type: [EducationSchema], default: [] },
    experience: { type: [ExperienceSchema], default: [] },
    skills: { type: [String], default: [] },
    profilePhotoUrl: { type: String },
    // Video Introduction (optional at profile stage)
    video: { type: VideoSchema, default: () => ({}) },
    
    // Notification Preferences
    notificationPreferences: {
      type: NotificationPreferencesSchema,
      default: () => ({
        applicationUpdates: true,
        jobRecommendations: true,
        marketingEmails: false
      })
    },
    
    // Profile Completion Tracking
    profileCompletion: { 
      type: ProfileCompletionSchema, 
      default: () => ({
        basicInfo: false,
        resume: false,
        education: false,
        experience: false,
        skills: false,
        percentage: 0
      })
    },
    
    stats: {
      totalApplications: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      shortlisted: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 }
    },
    lastProfileUpdateAt: { type: Date }
  },
  { timestamps: true }
);

// Calculate completion percentage method
CandidateProfileSchema.methods.calculateCompletion = function() {
  // Section 1: Basic info (auto 20% after registration)
  const basicInfoComplete = !!this.user;

  // Section 2: Resume upload
  const resumeComplete = Boolean(this.resume && this.resume.fileUrl);

  // Section 3: Education entries
  const educationComplete = Array.isArray(this.education) && this.education.length > 0;

  // Section 4: Work experience
  const experienceComplete = Array.isArray(this.experience) && this.experience.length > 0;

  // Section 5: Minimum of 3 skills
  const normalizedSkills = Array.isArray(this.skills)
    ? this.skills.filter(skill => typeof skill === 'string' && skill.trim().length > 0)
    : [];
  const skillsComplete = normalizedSkills.length >= 3;

  const sections = [
    basicInfoComplete,
    resumeComplete,
    educationComplete,
    experienceComplete,
    skillsComplete
  ];

  const completedSections = sections.filter(Boolean).length;
  const percentage = completedSections * 20; // Five sections, 20% each

  this.profileCompletion = {
    basicInfo: basicInfoComplete,
    resume: resumeComplete,
    education: educationComplete,
    experience: experienceComplete,
    skills: skillsComplete,
    percentage
  };

  this.lastProfileUpdateAt = new Date();
  
  return this.profileCompletion;
};

// Pre-save middleware to calculate completion
CandidateProfileSchema.pre('save', function(next) {
  this.calculateCompletion();
  next();
});

// Indexes for efficient queries
CandidateProfileSchema.index({ user: 1 }, { unique: true }); // One profile per user
CandidateProfileSchema.index({ skills: 1 }); // For skill-based search
CandidateProfileSchema.index({ location: 1 }); // For location-based search
CandidateProfileSchema.index({ 'profileCompletion.percentage': 1 }); // For completion tracking
CandidateProfileSchema.index({ lastProfileUpdateAt: -1 }); // For recent updates

module.exports = model('CandidateProfile', CandidateProfileSchema);
