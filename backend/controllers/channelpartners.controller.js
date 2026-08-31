const ChannelPartner = require('../models/ChannelPartner.model');
const User = require('../models/User.model');

const getChannelPartners = async (req, res, next) => {
  try {
    const { status, city, search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    if (!isSuperAdmin || req.query.organization) {
      query.organization = req.query.organization || userOrg || 'Rise With RealtyHub';
    }

    if (status) query.status = status;
    if (city) query.city = { $regex: city, $options: 'i' };
    if (search) query.$or = [
      { firmName: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const [partners, total] = await Promise.all([
      ChannelPartner.find(query).sort('-createdAt').skip(skip).limit(Number(limit))
        .populate('approvedBy', 'name').populate('userAccount', 'name email'),
      ChannelPartner.countDocuments(query),
    ]);
    res.json({ success: true, data: partners, total });
  } catch (err) { next(err); }
};

const getChannelPartner = async (req, res, next) => {
  try {
    const cp = await ChannelPartner.findById(req.params.id)
      .populate('approvedBy', 'name email').populate('userAccount', 'name email phone');
    if (!cp) return res.status(404).json({ success: false, message: 'Channel partner not found' });
    res.json({ success: true, data: cp });
  } catch (err) { next(err); }
};

const createChannelPartner = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    const userOrg = req.user?.organization || 'Rise With RealtyHub';
    if (!payload.organization) {
      payload.organization = userOrg;
    }
    if (!payload.createdBy && req.user?._id) {
      payload.createdBy = req.user._id;
    }

    if (!payload.email || payload.email.trim() === '') {
      payload.email = `cp_${Date.now().toString().slice(-4)}@broker.partner`;
    }
    const cp = await ChannelPartner.create(payload);
    res.status(201).json({ success: true, data: cp });
  } catch (err) { next(err); }
};

const updateChannelPartner = async (req, res, next) => {
  try {
    const cp = await ChannelPartner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!cp) return res.status(404).json({ success: false, message: 'Channel partner not found' });
    res.json({ success: true, data: cp });
  } catch (err) { next(err); }
};

const approveChannelPartner = async (req, res, next) => {
  try {
    const cp = await ChannelPartner.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    if (!cp) return res.status(404).json({ success: false, message: 'Channel partner not found' });
    res.json({ success: true, data: cp });
  } catch (err) { next(err); }
};

const rejectChannelPartner = async (req, res, next) => {
  try {
    const cp = await ChannelPartner.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: req.body.reason },
      { new: true }
    );
    if (!cp) return res.status(404).json({ success: false, message: 'Channel partner not found' });
    res.json({ success: true, data: cp });
  } catch (err) { next(err); }
};

const deleteChannelPartner = async (req, res, next) => {
  try {
    const cp = await ChannelPartner.findByIdAndDelete(req.params.id);
    if (!cp) return res.status(404).json({ success: false, message: 'Channel partner not found' });
    res.json({ success: true, message: 'Channel partner deleted successfully' });
  } catch (err) { next(err); }
};

const getCPStats = async (req, res, next) => {
  try {
    const [total, approved, pending, totalBookings] = await Promise.all([
      ChannelPartner.countDocuments({ isActive: true }),
      ChannelPartner.countDocuments({ status: 'approved' }),
      ChannelPartner.countDocuments({ status: 'pending' }),
      ChannelPartner.aggregate([{ $group: { _id: null, bookings: { $sum: '$totalBookings' }, commission: { $sum: '$totalCommissionEarned' } } }]),
    ]);
    res.json({ success: true, data: { total, approved, pending, totalBookings: totalBookings[0]?.bookings || 0, totalCommission: totalBookings[0]?.commission || 0 } });
  } catch (err) { next(err); }
};

module.exports = { getChannelPartners, getChannelPartner, createChannelPartner, updateChannelPartner, approveChannelPartner, rejectChannelPartner, deleteChannelPartner, getCPStats };
