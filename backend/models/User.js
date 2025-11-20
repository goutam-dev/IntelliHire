const { Schema, model } = require('mongoose');

const USER_ROLES = ['employer', 'candidate', 'admin'];
const USER_STATUSES = ['pending', 'active', 'suspended', 'deleted'];

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

const UserSchema = new Schema(
  {
    clerkUserId: { type: String, index: true, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: USER_ROLES, required: true },
    status: { type: String, enum: USER_STATUSES, default: 'pending' },
    fullName: { type: String, trim: true },
    authProvider: { type: [String], enum: ['clerk', 'local', 'google', 'oauth'], default: ['clerk'] },
    emailVerifiedAt: { type: Date },
    lastLoginAt: { type: Date },
    profileCompletion: { type: ProfileCompletionSchema, default: () => ({}) },
    notificationPreferences: {
      emailUpdates: { type: Boolean, default: true },
      applicationStatus: { type: Boolean, default: true }
    },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

// Fast lookup by role/status in dashboards.
UserSchema.index({ role: 1, status: 1 });

module.exports = model('User', UserSchema);
