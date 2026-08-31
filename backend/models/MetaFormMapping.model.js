const mongoose = require('mongoose');

const metaFormMappingSchema = new mongoose.Schema({
  formId: { type: String, required: true, unique: true, trim: true },
  formName: { type: String, required: true, trim: true },
  pageId: { type: String, trim: true },
  pageName: { type: String, trim: true },
  status: { type: String, default: 'active', enum: ['active', 'paused', 'archived'] },
  
  // Custom field mappings
  fieldMappings: [{
    metaField: { type: String, required: true, trim: true }, // e.g., 'full_name', 'phone_number', 'email', 'budget', 'city'
    crmField: { type: String, required: true, trim: true },  // e.g., 'name', 'phone', 'email', 'budget.max', 'city', 'notes'
    defaultValue: { type: String, trim: true },
  }],

  // Defaults
  defaultProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  defaultLeadStatus: {
    type: String,
    enum: ['new', 'contacted', 'connected', 'qualified', 'follow_up'],
    default: 'new'
  },
  defaultLeadType: {
    type: String,
    enum: ['hot', 'warm', 'cold'],
    default: 'hot'
  },

  // Auto-Assignment Rule
  assignmentRule: {
    type: {
      type: String,
      enum: ['no_assignment', 'round_robin', 'specific_agent', 'project_based'],
      default: 'round_robin',
    },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },

  isActive: { type: Boolean, default: true },
  lastSyncedAt: { type: Date },
}, { timestamps: true });

metaFormMappingSchema.index({ pageId: 1 });

module.exports = mongoose.model('MetaFormMapping', metaFormMappingSchema);
