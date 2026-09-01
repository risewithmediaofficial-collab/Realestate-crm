const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  phone: { type: String, trim: true },
  organization: { type: String, trim: true },
  city: { type: String, trim: true },
  avatar: { type: String },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'marketing_head', 'sales_head', 'sales_manager',
      'sales_executive', 'pre_sales_manager', 'telecaller', 'finance_manager',
      'post_sales_manager', 'cp_manager', 'channel_partner', 'developer', 'customer'],
    default: 'admin',
  },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isApproved: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  permissions: [String],
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
