const User = require('../models/User.model');
const bcrypt = require('bcryptjs');

const getUsers = async (req, res, next) => {
  try {
    const { role, isActive, approvalStatus, search, page = 1, limit = 50 } = req.query;
    const query = {};

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    if (isSuperAdmin) {
      if (req.query.organization) query.organization = req.query.organization;
    } else {
      query.organization = userOrg || '__NO_ORG__';
    }

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
      User.countDocuments({ ...query, approvalStatus: 'pending', role: { $ne: 'super_admin' } }),
      User.countDocuments({ ...query, approvalStatus: 'approved', role: { $ne: 'super_admin' } }),
      User.countDocuments({ ...query, approvalStatus: 'rejected', role: { $ne: 'super_admin' } }),
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
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const user = await User.findOne(query).select('-password').populate('approvedBy', 'name email');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, username, password, role, phone, organization, city, isApproved, approvalStatus } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedUsername = (username || (email ? email.split('@')[0] : '')).trim().toLowerCase();
    const isSuperAdmin = req.user?.role === 'super_admin';

    if (!name || !normalizedEmail || !password || !String(password).trim()) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required to create an employee account.' });
    }

    // Role sanitization: ensure clean string
    let sanitizedRole = 'telecaller';
    if (typeof role === 'string' && role.trim()) {
      sanitizedRole = role.trim();
    } else if (typeof role === 'object' && role !== null) {
      sanitizedRole = role.value || role.target?.value || 'telecaller';
    }

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        ...(normalizedUsername ? [{ username: normalizedUsername }] : [])
      ]
    });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email or username already exists' });

    // Target organization inheritance
    const targetOrg = isSuperAdmin
      ? (organization && organization !== 'RealtyHub Organization' ? organization.trim() : (req.user?.organization || 'MRP REAL ESTATE'))
      : (req.user?.organization || (organization && organization !== 'RealtyHub Organization' ? organization.trim() : 'MRP REAL ESTATE'));

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      username: normalizedUsername,
      password,
      role: sanitizedRole,
      phone: phone ? phone.trim() : '',
      organization: targetOrg,
      city: city ? city.trim() : '',
      approvalStatus: 'approved',
      isApproved: true,
      isActive: true,
      approvedAt: new Date(),
      approvedBy: req.user?._id
    });
    res.status(201).json({ success: true, data: user.toJSON() });
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const { password, username, ...updateData } = req.body;
    if (username) {
      updateData.username = username.trim().toLowerCase();
    }
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

// Purge all default seeded demo accounts (leaves only Super Admin and newly registered accounts)
const cleanupSeededUsers = async (req, res, next) => {
  try {
    const demoEmails = [
      'admin@crm.com',
      'sales.head@crm.com',
      'sales1@crm.com',
      'sales2@crm.com',
      'telecaller1@crm.com',
      'marketing@crm.com',
      'finance@crm.com'
    ];

    const result = await User.deleteMany({
      role: { $ne: 'super_admin' },
      $or: [
        { email: { $in: demoEmails } },
        { organization: 'Rise With RealtyHub' }
      ]
    });

    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} seeded demo accounts successfully. Only newly registered accounts and Super Admin remain.`,
      deletedCount: result.deletedCount
    });
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
  deleteUser,
  cleanupSeededUsers
};
