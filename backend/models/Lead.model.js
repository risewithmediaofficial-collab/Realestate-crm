const mongoose = require('mongoose');

// ── Call Log Entry (per-call notes with re-follow date)
const callLogSchema = new mongoose.Schema({
  note:           { type: String, required: true },
  outcome: {
    type: String,
    enum: ['connected', 'not_connected', 'callback', 'voicemail', 'interested', 'not_interested', 'meeting_fixed', 'site_visit_fixed', 'other'],
    default: 'connected'
  },
  callDate:       { type: Date, default: Date.now },
  duration:       { type: Number },                     // seconds
  nextFollowUp:   { type: Date },                       // re-follow date
  nextFollowUpTime: { type: String },                   // e.g. "10:30"
  addedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notified:       { type: Boolean, default: false },    // notification sent?
}, { _id: true, timestamps: true });

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['call', 'note', 'email', 'sms', 'whatsapp', 'task', 'meeting', 'site_visit', 'stage_change', 'system'],
    required: true,
  },
  title: { type: String, required: true },
  description: { type: String },
  outcome: { type: String, enum: ['connected', 'not_connected', 'callback', 'not_interested', 'interested', 'other'] },
  duration: { type: Number }, // seconds for calls
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { _id: true });

const leadSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  alternatePhone: { type: String },
  city: { type: String },
  locality: { type: String },
  budget: {
    min: { type: Number },
    max: { type: Number },
  },

  // Source & Campaign
  source: {
    type: String,
    enum: ['meta_ads', 'google_ads', 'property_portal', 'portal', 'website', 'walk_in', 'channel_partner',
      'phone_call', 'referral', 'whatsapp', 'organic', 'email_campaign', 'other'],
    default: 'other',
  },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  utmSource: { type: String },
  utmMedium: { type: String },
  utmCampaign: { type: String },

  // Stage & Score
  stage: {
    type: String,
    enum: ['new', 'contacted', 'connected', 'qualified', 'site_visit_scheduled',
      'site_visit_done', 'negotiation', 'booking_in_progress', 'booked',
      'not_connected', 'follow_up', 'nurturing', 'not_interested', 'lost', 'duplicate'],
    default: 'new',
  },
  leadScore: { type: Number, default: 0, min: 0, max: 100 },
  leadType: { type: String, enum: ['hot', 'warm', 'cold'], default: 'cold' },

  // Assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: { type: Date },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },

  // Project Interest
  interestedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  interestedUnitType: { type: String },
  interestedArea: { type: String },

  // Flags
  isDuplicate: { type: Boolean, default: false },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  isQualified: { type: Boolean, default: false },

  // Channel Partner
  channelPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'ChannelPartner' },

  // SLA
  slaStartedAt: { type: Date },
  slaDeadline: { type: Date },
  slaBreached: { type: Boolean, default: false },

  // Activities (embedded timeline)
  activities: [activitySchema],

  // Call Logs (multi-entry notes per call with re-follow dates)
  callLogs: [callLogSchema],

  // Follow-up
  nextFollowUp: { type: Date },
  nextFollowUpTime: { type: String },
  lastCallOutcome: { type: String },
  followUpNotes: { type: String },
  lastActivityAt: { type: Date },

  // Tags
  tags: [String],

  // Source Metadata (Meta Ads / Portals / Webhooks)
  sourceMetadata: {
    platform: { type: String }, // 'facebook' | 'instagram' | 'meta' | 'google' | 'website'
    metaLeadId: { type: String },
    pageId: { type: String },
    pageName: { type: String },
    formId: { type: String },
    formName: { type: String },
    campaignId: { type: String },
    campaignName: { type: String },
    adSetId: { type: String },
    adSetName: { type: String },
    adId: { type: String },
    adName: { type: String },
    rawMetaFields: { type: mongoose.Schema.Types.Mixed },
    receivedAt: { type: Date },
  },

  // Organization & Multi-Tenancy Scoping
  organization: { type: String, trim: true, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Lost reason
  lostReason: { type: String },
}, { timestamps: true });

leadSchema.index({ organization: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ stage: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ 'sourceMetadata.metaLeadId': 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ nextFollowUp: 1 });         // for follow-up notification queries
leadSchema.index({ 'callLogs.nextFollowUp': 1 }); // for per-log follow-up queries

module.exports = mongoose.model('Lead', leadSchema);
