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
    phoneNumber: { type: String, required: true, trim: true },
    role: { type: String, enum: USER_ROLES, required: true },
    status: { type: String, enum: USER_STATUSES, default: 'pending' },
    fullName: { type: String, trim: true },
    // Auth providers: 'clerk' for password, or actual OAuth provider names (google, github, oauth_google, etc.)
    authProvider: { type: [String], default: ['clerk'] },
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

// Fast lookup by role/status in dashboards
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ email: 1 }, { unique: true }); // Ensure unique email and fast lookup
UserSchema.index({ clerkUserId: 1 }, { unique: true, sparse: true }); // Already defined but ensure it's there
UserSchema.index({ lastLoginAt: -1 }); // For tracking recent logins

module.exports = model('User', UserSchema);
