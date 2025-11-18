const { Schema, model } = require('mongoose');

const PasswordResetTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    requestIp: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('PasswordResetToken', PasswordResetTokenSchema);
