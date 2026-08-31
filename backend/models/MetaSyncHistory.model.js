const mongoose = require('mongoose');

const metaSyncHistorySchema = new mongoose.Schema({
  syncType: {
    type: String,
    enum: ['manual', 'webhook', 'scheduled'],
    default: 'manual',
  },
  status: {
    type: String,
    enum: ['started', 'completed', 'failed'],
    default: 'started',
    index: true,
  },
  totalLeadsFound: { type: Number, default: 0 },
  newLeadsCreated: { type: Number, default: 0 },
  duplicatesFound: { type: Number, default: 0 },
  errorsCount: { type: Number, default: 0 },
  errorDetails: [{ type: String }],
  startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  durationMs: { type: Number },
}, { timestamps: true });

metaSyncHistorySchema.index({ startedAt: -1 });

module.exports = mongoose.model('MetaSyncHistory', metaSyncHistorySchema);
