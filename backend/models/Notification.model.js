const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Notification Type & Content
  type: {
    type: String,
    enum: ['booking_created', 'booking_approved', 'booking_cancelled', 'booking_status_changed', 
           'payment_received', 'agreement_signed', 'registration_completed', 'site_visit_scheduled',
           'lead_assigned', 'lead_updated', 'negotiation_required', 'sla_breach', 'general'],
    default: 'general',
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  description: { type: String },
  
  // Context References
  relatedEntity: {
    type: { type: String, enum: ['booking', 'lead', 'payment', 'sitevisit', 'negotiation', 'user'] },
    id: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String },
  },
  
  // Status
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  isArchived: { type: Boolean, default: false },
  
  // Severity Level
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  
  // Action URL
  actionUrl: { type: String },
  actionLabel: { type: String },
  
  // Data Snapshot (for context display without population)
  metadata: { type: mongoose.Schema.Types.Mixed },
  
  // Organization & Multi-Tenancy Scoping
  organization: { type: String, trim: true, required: true, index: true },
  
}, { timestamps: true });

// Index for finding unread notifications quickly
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ organization: 1, userId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
