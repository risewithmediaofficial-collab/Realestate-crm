const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['meta_ads', 'google_ads', 'email', 'sms', 'whatsapp', 'event', 'portal', 'website', 'property_portal', 'email_campaign', 'sms_campaign', 'hoarding', 'newspaper', 'other'], required: true },
  status: { type: String, enum: ['draft', 'active', 'paused', 'completed', 'cancelled'], default: 'draft' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  startDate: { type: Date },
  endDate: { type: Date },

  // Budget & ROI
  budget: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  leads: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },

  // External IDs
  externalCampaignId: { type: String },
  platform: { type: String },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Organization & Multi-Tenancy Scoping
  organization: { type: String, trim: true, default: 'Rise With RealtyHub' },
  description: { type: String },
  tags: [String],
}, { timestamps: true });

campaignSchema.index({ organization: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
