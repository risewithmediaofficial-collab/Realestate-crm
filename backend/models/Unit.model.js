const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
  basePrice: { type: Number, default: 0 },
  plc: { type: Number, default: 0 },         // Preferential Location Charges
  floorRise: { type: Number, default: 0 },
  parkingCharges: { type: Number, default: 0 },
  amenityCharges: { type: Number, default: 0 },
  gst: { type: Number, default: 0 },          // percentage
  otherCharges: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
});

const unitSchema = new mongoose.Schema({
  // Identity
  unitNumber: { type: String, required: true },  // e.g. "A-502"
  unitName: { type: String },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  tower: { type: String, required: true },       // Tower code e.g. "A"
  towerName: { type: String },
  floor: { type: Number, required: true },
  floorName: { type: String },

  // Unit Details
  type: { type: String, required: true },        // e.g. "3BHK", "30x40 Plot", "Office Suite", "Retail Shop"
  category: {
    type: String,
    enum: [
      'residential', 'residential_apartment',
      'villa',
      'plots', 'plotted_development',
      'commercial', 'commercial_office',
      'retail', 'retail_shop',
      'industrial', 'industrial_warehouse',
      'farmland',
      'mixed', 'mixed_use',
      'other'
    ],
    default: 'residential'
  },
  facing: {
    type: String,
    enum: ['north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw', 'corner', 'road_facing', 'park_facing', 'other'],
    default: 'east'
  },
  area: {
    carpet: { type: Number },
    builtUp: { type: Number },
    superBuiltUp: { type: Number },
    plotArea: { type: Number },          // in sq.ft / sq.yards for plots & villas
    carpetArea: { type: Number },
  },
  bedrooms: { type: Number },
  bathrooms: { type: Number },
  balconies: { type: Number, default: 0 },
  parking: { type: Number, default: 0 },

  // Category-Specific Specs
  dimensions: {
    length: { type: Number },            // e.g. 40 ft
    width: { type: Number },             // e.g. 30 ft
    unit: { type: String, default: 'ft' }
  },
  plotDetails: {
    dimensionStr: { type: String },      // e.g. "30 x 40 ft"
    roadWidth: { type: Number },         // e.g. 40 ft road
    isCornerPlot: { type: Boolean, default: false },
    boundaryWall: { type: Boolean, default: false },
    approvalAuthority: { type: String }, // e.g. "DTCP Approved"
  },
  villaDetails: {
    levels: { type: String },            // e.g. "G+1", "G+2"
    gardenArea: { type: Number },        // in sq.ft
    coveredCarParks: { type: Number, default: 1 },
    privateTerrace: { type: Boolean, default: false },
  },
  commercialDetails: {
    frontage: { type: Number },          // in ft (for retail shops)
    ceilingHeight: { type: Number },     // in ft
    fitoutStatus: { type: String, enum: ['bare_shell', 'warm_shell', 'fully_furnished', 'plug_and_play', 'unspecified'], default: 'unspecified' },
    powerBackupKva: { type: Number },
    suitableFor: { type: String },       // e.g. "IT Office, Clinic, Bank, Restaurant"
  },
  industrialDetails: {
    clearHeight: { type: Number },       // in ft (e.g. 32ft)
    loadingDocks: { type: Number },
    flooringCapacityMt: { type: Number },
  },
  farmlandDetails: {
    extentAcres: { type: Number },
    plantationType: { type: String },    // e.g. "Teak / Mango / Organic"
    waterSource: { type: String },       // e.g. "Borewell + Drip Irrigation"
  },

  // Status & Holds
  status: {
    type: String,
    enum: ['available', 'on_hold', 'blocked', 'booked', 'sold', 'not_for_sale'],
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
    paymentMode: { type: String },
    transactionRef: { type: String },
    bookingDate: { type: Date, default: Date.now },
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
  organization: { type: String, trim: true, default: 'Rise With RealtyHub' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

unitSchema.index({ organization: 1 });
unitSchema.index({ project: 1, status: 1 });
unitSchema.index({ project: 1, tower: 1, floor: 1 });

module.exports = mongoose.model('Unit', unitSchema);
