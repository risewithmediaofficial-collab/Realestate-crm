const User = require('../models/User.model');
const bcrypt = require('bcryptjs');

const getUsers = async (req, res, next) => {
  try {
    const { role, isActive, approvalStatus, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { organization: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      User.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit))
        .select('-password')
        .populate('approvedBy', 'name email'),
      User.countDocuments(query),
      User.countDocuments({ approvalStatus: 'pending', role: { $ne: 'super_admin' } }),
      User.countDocuments({ approvalStatus: 'approved', role: { $ne: 'super_admin' } }),
      User.countDocuments({ approvalStatus: 'rejected', role: { $ne: 'super_admin' } }),
    ]);
    res.json({
      success: true,
      data: users,
      total,
      stats: { pendingCount, approvedCount, rejectedCount }
    });
  } catch (err) { next(err); }
};

const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password').populate('approvedBy', 'name email');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, organization, city, isApproved, approvalStatus } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });
    const user = await User.create({
      name,
      email,
      password: password || 'Password@123',
      role,
      phone,
      organization: organization || 'RealtyHub Organization',
      city,
      approvalStatus: approvalStatus || (isApproved ? 'approved' : 'pending'),
      isApproved: isApproved !== undefined ? isApproved : true,
      isActive: true,
      approvedAt: isApproved ? new Date() : undefined,
      approvedBy: req.user?._id
    });
    res.status(201).json({ success: true, data: user.toJSON() });
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const { password, ...updateData } = req.body;
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// Approve user registration
const approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.approvalStatus = 'approved';
    user.isApproved = true;
    user.isActive = true;
    user.approvedAt = new Date();
    user.approvedBy = req.user?._id;
    user.rejectionReason = undefined;

    await user.save({ validateBeforeSave: false });
    res.json({
      success: true,
      message: `Account for "${user.name}" (${user.organization || 'Organization'}) has been approved successfully!`,
      data: user.toJSON()
    });
  } catch (err) { next(err); }
};

// Reject user registration
const rejectUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.approvalStatus = 'rejected';
    user.isApproved = false;
    user.isActive = false;
    user.rejectionReason = reason || 'Registration not approved by Super Admin.';

    await user.save({ validateBeforeSave: false });
    res.json({
      success: true,
      message: `Registration for "${user.name}" has been rejected.`,
      data: user.toJSON()
    });
  } catch (err) { next(err); }
};

// Revoke or move user back to pending
const revokeApproval = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.approvalStatus = 'pending';
    user.isApproved = false;
    user.isActive = false;

    await user.save({ validateBeforeSave: false });
    res.json({
      success: true,
      message: `Approval revoked for "${user.name}". Account moved back to Pending Review.`,
      data: user.toJSON()
    });
  } catch (err) { next(err); }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, data: user.toJSON(), message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  approveUser,
  rejectUser,
  revokeApproval,
  toggleUserStatus,
  deleteUser
};
