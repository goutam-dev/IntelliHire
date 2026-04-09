const { Schema, model } = require('mongoose');

/**
 * Notification model
 * Persisted notifications for both employers and candidates.
 */
const NotificationSchema = new Schema(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'application_received',   // employer: candidate applied
        'interview_completed',    // employer: candidate completed interview
        'status_updated',         // candidate: employer changed status
        'interview_scheduled',    // candidate: interview window set
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    // Frontend route the user should be taken to when clicking this notification
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Compound index for fast per-user unread queries and listing
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1 });

module.exports = model('Notification', NotificationSchema);
