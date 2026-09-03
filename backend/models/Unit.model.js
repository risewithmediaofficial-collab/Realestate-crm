const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
  baseRate: { type: Number, default: 0 },
  rateType: {
    type: String,
    enum: ['per_sqft', 'per_sqyard', 'per_cent', 'per_guntha', 'per_ground', 'per_acre', 'per_bigha', 'fixed'],
    default: 'per_sqft'
  },
  basePrice: { type: Number, default: 0 },
  developmentCharges: { type: Number, default: 0 },
  registrationCharges: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  totalPackagePrice: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  plc: { type: Number, default: 0 },         // Preferential Location Charges
  floorRise: { type: Number, default: 0 },
  parkingCharges: { type: Number, default: 0 },
  amenityCharges: { type: Number, default: 0 },
  gst: { type: Number, default: 0 },          // percentage
  discount: { type: Number, default: 0 },
});

const unitSchema = new mongoose.Schema({
  // Identity
  unitNumber: { type: String, required: true, trim: true },  // e.g. "Plot 105", "A-502", "Farm Lot 12"
  unitName: { type: String },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  tower: { type: String, default: 'Main' },                  // Tower / Block / Sector code e.g. "A"
  block: { type: String, trim: true },                       // Sector / Zone / Block Name e.g. "Sector A", "Zone 1"
  towerName: { type: String },
  floor: { type: Number, default: 1 },
  floorName: { type: String },

  // Property Type & Land Category
  propertyType: {
    type: String,
    enum: [
      'agricultural_land', 'farmland', 'plots', 'layouts', 'resort_plots',
      'residential_apartment', 'villa', 'commercial_office', 'retail_shop',
      'industrial_warehouse', 'mixed_use', 'other', 'custom'
    ],
    default: 'plots'
  },
  type: { type: String, required: true },                    // e.g. "Agricultural Land", "Farm Land", "3BHK", "Residential Plot"
  landType: { type: String },                                // e.g. "Agricultural Land", "Farm Land", "Plantation Land", "Residential Plot", "Commercial Plot", "Other"
  category: { type: String, default: 'plots' },
  facing: {
    type: String,
    enum: ['north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw', 'corner', 'road_facing', 'park_facing', 'custom', 'other'],
    default: 'east'
  },
  customFacing: { type: String },

  // Area Structure (Canonical sq.ft + User Extent + Unit)
  area: {
    extent: { type: Number },                                // User entered extent e.g. 0.5
    unit: { type: String, default: 'sqft' },                 // 'sqft', 'sqyard', 'acre', 'guntha', 'cent', 'ground', 'bigha', 'custom'
    sqft: { type: Number },                                  // Canonical Total Sq.Ft
    customSqFtPerUnit: { type: Number },
    carpet: { type: Number },
    builtUp: { type: Number },
    superBuiltUp: { type: Number },
    plotArea: { type: Number },                              // in sq.ft for plots
    carpetArea: { type: Number },
  },
  bedrooms: { type: Number },
  bathrooms: { type: Number },
  balconies: { type: Number, default: 0 },
  parking: { type: Number, default: 0 },

  // Physical Features
  physicalDetails: {
    facing: { type: String },
    roadWidth: { type: Number },                             // in ft e.g. 30, 40, 60
    isCorner: { type: Boolean, default: false },
    electricity: {
      type: String,
      enum: ['available', 'nearby', 'not_available', 'none', ''],
      default: 'available'
    },
    waterSource: {
      type: String,
      enum: ['borewell', 'open_well', 'canal', 'lake', 'rainwater', 'other', 'none', ''],
      default: 'borewell'
    },
    customWaterSource: { type: String },
    frontage: { type: Number },                              // in ft
    ceilingHeight: { type: Number },
    suitableFor: { type: String },
    fitoutStatus: { type: String, default: 'unspecified' },
  },

  // Agricultural Specifications
  agriculturalDetails: {
    plantation: { type: String },                            // e.g. "Alphonso Mango, Sandalwood, Teak"
    treesType: { type: String },                             // e.g. "Teakwood, Sandalwood, Coconut, Mango"
    treesCount: { type: Number, default: 0 },                // e.g. 150
    treesAge: { type: String },                              // e.g. "3-5 years"
    soilType: { type: String },                              // e.g. "Red Soil", "Black Cotton Soil", "Alluvial Loam"
    irrigation: {
      type: String,
      enum: ['borewell', 'drip', 'sprinkler', 'canal', 'automated_drip', 'rain_fed', 'other', 'none', ''],
      default: 'drip'
    },
    customIrrigation: { type: String },
    fencing: {
      type: String,
      enum: ['none', 'chain_link', 'stone_fencing', 'compound_wall', 'live_fencing', 'other', ''],
      default: 'none'
    },
    customFencing: { type: String },
  },

  // Legacy compatibility structures
  dimensions: {
    length: { type: Number },
    width: { type: Number },
    unit: { type: String, default: 'ft' }
  },
  plotDetails: {
    dimensionStr: { type: String },
    roadWidth: { type: Number },
    isCornerPlot: { type: Boolean, default: false },
    boundaryWall: { type: Boolean, default: false },
    approvalAuthority: { type: String },
  },
  villaDetails: {
    levels: { type: String },
    gardenArea: { type: Number },
    coveredCarParks: { type: Number, default: 1 },
    privateTerrace: { type: Boolean, default: false },
  },
  commercialDetails: {
    frontage: { type: Number },
    ceilingHeight: { type: Number },
    fitoutStatus: { type: String, default: 'unspecified' },
    powerBackupKva: { type: Number },
    suitableFor: { type: String },
  },
  farmlandDetails: {
    extentAcres: { type: Number },
    plantationType: { type: String },
    waterSource: { type: String },
  },

  // Status & Holds (standardized across CRM)
  status: {
    type: String,
    enum: ['available', 'reserved', 'on_hold', 'blocked', 'booked', 'registered', 'sold', 'cancelled', 'not_for_sale'],
    default: 'available',
  },
  holdExpiry: { type: Date },
  holdReason: { type: String },

  // Customer Details when on Hold
  holdCustomer: {
    name: { type: String },
    phone: { type: String },
    email: { type: String },
    durationHours: { type: Number, default: 48 },
    reason: { type: String },
    heldAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    agentName: { type: String },
  },

  // Customer Details when Booked
  bookingCustomer: {
    name: { type: String },
    phone: { type: String },
    email: { type: String },
    panNumber: { type: String },
    aadharNumber: { type: String },
    address: { type: String },
    tokenAmount: { type: Number },
    paidAmount: { type: Number },
    balanceAmount: { type: Number },
    totalPaid: { type: Number },
    balanceDue: { type: Number },
    paymentMode: { type: String },
    transactionRef: { type: String },
    bookingDate: { type: Date, default: Date.now },
    bookingStatus: { type: String, default: 'approved' },
    coApplicantName: { type: String },
    coApplicantPhone: { type: String },
    coApplicantRelation: { type: String },
  },

  // Pricing
  pricing: pricingSchema,

  // Booking reference
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  heldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Features
  isCorner: { type: Boolean, default: false },
  isPenthouse: { type: Boolean, default: false },
  floorPlan: { type: String },
  // Organization & Multi-Tenancy Scoping
  organization: { type: String, trim: true, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

unitSchema.index({ organization: 1 });
unitSchema.index({ project: 1, status: 1 });
unitSchema.index({ project: 1, tower: 1, floor: 1 });
unitSchema.index({ project: 1, block: 1, unitNumber: 1 });

module.exports = mongoose.model('Unit', unitSchema);
