const mongoose = require('mongoose');

const siteVisitSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String },
  assignedExecutive: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Channel partner
  channelPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'ChannelPartner' },

  // Confirmation
  confirmationSent: { type: Boolean, default: false },
  confirmedByCustomer: { type: Boolean, default: false },
  confirmationMethod: { type: String, enum: ['sms', 'whatsapp', 'email', 'call'] },

  // Check-in/out
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  checkInLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  otpVerified: { type: Boolean, default: false },

  // Outcome
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
    default: 'scheduled',
  },
  outcome: {
    type: String,
    enum: ['interested', 'not_interested', 'needs_follow_up', 'negotiation', 'booking', 'rescheduled'],
  },
  feedback: { type: String },
  rating: { type: Number, min: 1, max: 5 },

  // Interested units shown
  unitsShown: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }],
  shortlistedUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },

  notes: { type: String },
  cancelReason: { type: String },
  rescheduleReason: { type: String },
  // Organization & Multi-Tenancy Scoping
  organization: { type: String, trim: true, default: 'Rise With RealtyHub' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

siteVisitSchema.index({ organization: 1 });

module.exports = mongoose.model('SiteVisit', siteVisitSchema);
