const { Schema, model } = require('mongoose');

const TOKEN_STATUS = ['pending', 'sent', 'used', 'expired'];

const VerificationTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: TOKEN_STATUS, default: 'pending' },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    lastEmailAttemptAt: { type: Date },
    resendCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

VerificationTokenSchema.index({ user: 1, status: 1 });
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('VerificationToken', VerificationTokenSchema);
