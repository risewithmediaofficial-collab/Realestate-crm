const mongoose = require('mongoose');

const channelPartnerSchema = new mongoose.Schema({
  // Firm Details
  firmName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, lowercase: true },
  city: { type: String },
  address: { type: String },
  reraNumber: { type: String },
  gstNumber: { type: String },
  panNumber: { type: String },

  // Registration
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },

  // Login
  userAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Commission & Tier
  tier: { type: String, enum: ['platinum', 'gold', 'silver'], default: 'silver' },
  defaultCommissionRate: { type: Number, default: 2 }, // percentage
  commissionType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },

  // Documents
  documents: [{ name: String, url: String, type: String, verified: { type: Boolean, default: false } }],

  // Stats
  totalLeadsSubmitted: { type: Number, default: 0 },
  totalSiteVisits: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },
  totalCommissionEarned: { type: Number, default: 0 },
  totalCommissionPaid: { type: Number, default: 0 },
  totalCommissionPending: { type: Number, default: 0 },

  // Assigned projects access
  assignedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],

  notes: { type: String },
  // Organization & Multi-Tenancy Scoping
  organization: { type: String, trim: true, default: 'Rise With RealtyHub' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

channelPartnerSchema.index({ organization: 1 });

module.exports = mongoose.model('ChannelPartner', channelPartnerSchema);
