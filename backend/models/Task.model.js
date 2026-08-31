const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['call', 'follow_up', 'email', 'whatsapp', 'meeting', 'site_visit', 'task', 'reminder'],
    required: true,
  },
  title: { type: String, required: true },
  description: { type: String },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date, required: true },
  dueTime: { type: String },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'], default: 'pending' },
  outcome: { type: String },
  completedAt: { type: Date },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reminderAt: { type: Date },
  isReminderSent: { type: Boolean, default: false },
  // Organization & Multi-Tenancy Scoping
  organization: { type: String, trim: true, default: 'Rise With RealtyHub' },
  tags: [String],
}, { timestamps: true });

taskSchema.index({ organization: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
