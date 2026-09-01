const mongoose = require('mongoose');

const coApplicantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  relation: { type: String },
  panNumber: { type: String },
  aadharNumber: { type: String },
});

const bookingSchema = new mongoose.Schema({
  bookingNumber: { type: String, unique: true },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  siteVisit: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteVisit' },

  // Customer
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  customerEmail: { type: String },
  coApplicants: [coApplicantSchema],

  // KYC
  panNumber: { type: String },
  aadharNumber: { type: String },
  kycDocuments: [{ name: String, url: String, type: String }],
  kycVerified: { type: Boolean, default: false },

  // Pricing & Cost Sheet
  basePrice: { type: Number },
  plc: { type: Number, default: 0 },
  floorRise: { type: Number, default: 0 },
  parkingCharges: { type: Number, default: 0 },
  amenityCharges: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  gst: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  totalAmount: { type: Number },

  // Payment Plan
  paymentPlan: { type: String, enum: ['construction_linked', 'down_payment', 'flexi', 'custom'] },

  // Booking Amount
  bookingAmount: { type: Number },
  bookingAmountPaid: { type: Boolean, default: false },
  bookingAmountDate: { type: Date },
  bookingAmountMode: { type: String, enum: ['cheque', 'neft', 'rtgs', 'upi', 'cash', 'dd'] },

  // Status & Approval
  status: {
    type: String,
    enum: ['application_submitted', 'pending_approval', 'approved', 'agreement_sent',
      'agreement_signed', 'registered', 'registration_closed', 'closed', 'cancelled', 'refund_initiated', 'refunded'],
    default: 'application_submitted',
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  cancellationReason: { type: String },

  // Channel Partner
  channelPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'ChannelPartner' },
  commissionRate: { type: Number },
  commissionAmount: { type: Number },

  // Documents
  agreementDocument: { type: String },
  documents: [{ name: String, url: String }],

  // Staff
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Organization & Multi-Tenancy Scoping
  organization: { type: String, trim: true, required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
}, { timestamps: true });

bookingSchema.pre('save', async function (next) {
  if (!this.bookingNumber) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingNumber = `BK${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
