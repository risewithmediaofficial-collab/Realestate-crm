const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  paymentMode: { type: String, default: 'bank_transfer' },
  transactionReference: { type: String },
  bankName: { type: String },
  paymentDate: { type: Date, default: Date.now },
  notes: { type: String },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiptNumber: { type: String },
}, { timestamps: true, _id: true });

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },

  // Snapshot details for offline / direct manual demands
  customerName: { type: String },
  customerPhone: { type: String },
  customerEmail: { type: String },
  unitNumber: { type: String },
  projectName: { type: String },

  // Demand Details
  demandNumber: { type: String, unique: true },
  demandDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  milestoneName: { type: String },
  milestoneDescription: { type: String },

  // Amounts Breakdown
  baseAmount: { type: Number },
  gstAmount: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  demandAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number },

  // Latest payment info
  paymentDate: { type: Date },
  paymentMode: {
    type: String,
    enum: ['cash', 'bank_transfer', 'neft', 'rtgs', 'imps', 'upi', 'cheque', 'dd', 'card', 'loan_disbursement', 'other'],
    default: 'bank_transfer'
  },
  transactionReference: { type: String },
  bankName: { type: String },
  chequeNumber: { type: String },

  // History of partial/installment payments
  transactions: [paymentTransactionSchema],

  // Status
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue', 'waived'],
    default: 'pending',
  },

  // Documents
  invoiceUrl: { type: String },
  receiptUrl: { type: String },
  demandLetterUrl: { type: String },

  // Late payment
  isDelayed: { type: Boolean, default: false },
  delayedDays: { type: Number, default: 0 },
  penaltyAmount: { type: Number, default: 0 },

  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Organization & Multi-Tenancy Scoping
  organization: { type: String, trim: true, required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
}, { timestamps: true });

paymentSchema.pre('save', async function (next) {
  if (!this.demandNumber) {
    const count = await mongoose.model('Payment').countDocuments();
    this.demandNumber = `DEM${String(count + 1).padStart(6, '0')}`;
  }
  this.balanceAmount = this.demandAmount - this.paidAmount;
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
