const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String },
  category: { type: String, enum: ['recreational', 'safety', 'convenience', 'green', 'sports'], default: 'recreational' },
});

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String },
  type: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

const unitTypeSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "2BHK", "3BHK"
  area: { type: Number }, // sq.ft
  bedrooms: { type: Number },
  bathrooms: { type: Number },
  basePrice: { type: Number },
  floorPlan: { type: String }, // image URL
});

const floorSchema = new mongoose.Schema({
  floorNumber: { type: Number, required: true },
  floorName: { type: String }, // e.g. "Ground", "Podium"
  totalUnits: { type: Number, default: 0 },
  unitPrefix: { type: String }, // e.g. "A" for A-101, A-102
});

const towerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true }, // "A", "B", etc.
  totalFloors: { type: Number, default: 1 },
  totalUnits: { type: Number, default: 0 },
  floors: [floorSchema],
  status: { type: String, enum: ['upcoming', 'under_construction', 'ready', 'launched'], default: 'upcoming' },
  possessionDate: { type: Date },
});

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String },
  logo: { type: String },
  images: [String],
  brochure: { type: String },

  // Location
  address: { type: String },
  city: { type: String, required: true },
  state: { type: String },
  pincode: { type: String },
  landmark: { type: String },
  googleMapsUrl: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },

  // Project Details
  type: {
    type: String,
    default: 'residential'
  },
  categoryDetails: {
    approvalBody: { type: String },       // e.g. DTCP, HMDA, BDA, RERA, PMRDA, MIDC
    approvals: [String],                  // e.g. ['RERA Approved', 'DTCP Approved', 'Bank Approved']
    roadWidths: [Number],                 // e.g. [30, 40, 60] ft for plots
    totalAcres: { type: Number },
    extentUnit: { type: String, default: 'Acres' },
    zoneType: { type: String },           // Residential, Commercial, Industrial, Agro
  },
  totalArea: { type: Number }, // in acres
  totalUnits: { type: Number, default: 0 },
  reraNumber: { type: String },
  reraExpiry: { type: Date },
  launchDate: { type: Date },
  possessionDate: { type: Date },

  status: {
    type: String,
    enum: ['upcoming', 'pre_launch', 'launched', 'under_construction', 'ready_to_move', 'sold_out', 'on_hold'],
    default: 'launched',
  },

  // Pricing
  priceRange: {
    min: { type: Number },
    max: { type: Number },
  },
  currency: { type: String, default: 'INR' },

  // Structure
  towers: [towerSchema],
  unitTypes: [unitTypeSchema],
  amenities: [amenitySchema],
  documents: [documentSchema],

  // Organization & Multi-Tenancy Scoping
  organization: { type: String, trim: true, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

projectSchema.index({ organization: 1 });

module.exports = mongoose.model('Project', projectSchema);
