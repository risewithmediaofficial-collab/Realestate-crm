const mongoose = require('mongoose');

const metaWebhookEventSchema = new mongoose.Schema({
  eventId: { type: String, trim: true },
  platform: { type: String, default: 'facebook', enum: ['facebook', 'instagram', 'meta'] },
  objectType: { type: String, default: 'page' },
  pageId: { type: String, trim: true },
  leadgenId: { type: String, required: true, trim: true, index: true },
  formId: { type: String, trim: true },
  adId: { type: String, trim: true },
  adGroupId: { type: String, trim: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: {
    type: String,
    enum: ['received', 'processing', 'processed', 'failed', 'duplicate'],
    default: 'received',
    index: true,
  },
  errorMessage: { type: String },
  receivedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  retryCount: { type: Number, default: 0 },
  createdLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
}, { timestamps: true });

metaWebhookEventSchema.index({ leadgenId: 1, formId: 1 });
metaWebhookEventSchema.index({ receivedAt: -1 });

module.exports = mongoose.model('MetaWebhookEvent', metaWebhookEventSchema);
