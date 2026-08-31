const mongoose = require('mongoose');

const metaIntegrationLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'webhook_verification',
      'webhook_received',
      'lead_fetch',
      'field_mapping',
      'lead_creation',
      'duplicate_detected',
      'sync',
      'auth_error',
      'general_error',
    ],
    required: true,
    index: true,
  },
  message: { type: String, required: true },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error'],
    default: 'info',
    index: true,
  },
  details: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

metaIntegrationLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MetaIntegrationLog', metaIntegrationLogSchema);
