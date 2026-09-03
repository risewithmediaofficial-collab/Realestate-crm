const mongoose = require('mongoose');

const buyerRequirementSchema = new mongoose.Schema({
  // Customer Identity
  customerName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  city: { type: String, trim: true },
  
  // Property Category & Specific Purpose
  category: {
    type: String,
    enum: [
      'agricultural_land', 'farmland', 'residential_plot', 'commercial_land',
      'villa_farmhouse', 'industrial_warehouse', 'resort_plot', 'other'
    ],
    default: 'farmland'
  },
  customCategory: { type: String },
  purpose: {
    type: String,
    enum: [
      'weekend_farmhouse', 'long_term_investment', 'organic_farming',
      'commercial_development', 'self_construction', 'wealth_preservation', 'other'
    ],
    default: 'weekend_farmhouse'
  },
  
  // Location & Land Characteristics
  preferredLocations: [{ type: String, trim: true }],
  locationNotes: { type: String },
  preferredSoil: {
    type: String,
    enum: ['red_soil', 'black_cotton', 'alluvial_loam', 'sandy_loam', 'any'],
    default: 'red_soil'
  },
  waterSourceRequired: {
    type: String,
    enum: ['borewell', 'open_well', 'canal', 'lake_proximity', 'any'],
    default: 'borewell'
  },
  minRoadWidth: { type: Number, default: 30 }, // in feet
  facingPreference: {
    type: String,
    enum: ['east', 'north', 'ne', 'corner', 'any'],
    default: 'any'
  },

  // Dimensions & Extent
  minExtent: { type: Number, default: 0 },
  maxExtent: { type: Number, default: 0 },
  extentUnit: {
    type: String,
    enum: ['Acres', 'Gunthas', 'Cents', 'Sq.Yards', 'Sq.Ft', 'Bighas'],
    default: 'Acres'
  },

  // Budget & Financial Capability
  budgetMin: { type: Number, default: 0 },
  budgetMax: { type: Number, default: 0 },
  fundingSource: {
    type: String,
    enum: ['self_funded_cash', 'bank_loan', 'part_payment', 'flexible'],
    default: 'self_funded_cash'
  },
  purchaseTimeline: {
    type: String,
    enum: ['immediate_15_days', 'within_1_month', 'within_3_months', 'exploring'],
    default: 'within_1_month'
  },

  // Sourcing Status & Workflow
  status: {
    type: String,
    enum: [
      'new_inquiry', 'sourcing_in_progress', 'properties_shortlisted',
      'site_visit_arranged', 'in_negotiation', 'deal_closed', 'dropped'
    ],
    default: 'new_inquiry'
  },
  priority: {
    type: String,
    enum: ['hot', 'warm', 'cold'],
    default: 'hot'
  },

  // Matched Units & Property Shortlist
  matchedUnits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }],
  shortlistedPropertiesNotes: { type: String },

  // Assignment & Org Multi-Tenancy
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organization: { type: String, required: true, index: true },

  // Discussion notes & activity log
  notes: { type: String },
  activities: [{
    type: { type: String, default: 'note' },
    title: { type: String },
    description: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

buyerRequirementSchema.index({ organization: 1, status: 1 });
buyerRequirementSchema.index({ phone: 1, organization: 1 });

module.exports = mongoose.model('BuyerRequirement', buyerRequirementSchema);
