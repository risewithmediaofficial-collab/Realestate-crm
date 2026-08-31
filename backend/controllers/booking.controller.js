const Booking = require('../models/Booking.model');
const Unit = require('../models/Unit.model');
const Lead = require('../models/Lead.model');

const getBookings = async (req, res, next) => {
  try {
    const { status, project, page = 1, limit = 20, search } = req.query;
    const query = {};

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    if (!isSuperAdmin || req.query.organization) {
      query.organization = req.query.organization || userOrg || 'Rise With RealtyHub';
    }

    if (status) query.status = status;
    if (project) query.project = project;
    if (search) query.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { bookingNumber: { $regex: search, $options: 'i' } },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(query).sort('-createdAt').skip(skip).limit(Number(limit))
        .populate('unit', 'unitNumber type tower floor pricing')
        .populate('project', 'name city')
        .populate('lead', 'name phone')
        .populate('handledBy', 'name'),
      Booking.countDocuments(query),
    ]);
    res.json({ success: true, data: bookings, total });
  } catch (err) { next(err); }
};

const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('unit', 'unitNumber type tower floor area pricing facing')
      .populate('project', 'name city address reraNumber')
      .populate('lead', 'name phone email city source')
      .populate('handledBy', 'name email phone')
      .populate('approvedBy', 'name')
      .populate('siteVisit');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
};

const mongoose = require('mongoose');

const createBooking = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    const userRole = req.user?.role || 'admin';
    const isAdmin = ['admin', 'superadmin', 'super_admin'].includes(userRole) || !!req.user?.isSuperAdmin;
    const userOrg = req.user?.organization || 'Rise With RealtyHub';

    if (!payload.organization) {
      payload.organization = userOrg;
    }
    if (!payload.createdBy && req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      payload.createdBy = req.user._id;
    }

    if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      payload.handledBy = req.user._id;
    }
    if (!payload.bookingNumber) {
      payload.bookingNumber = `BK-${Date.now().toString().slice(-6)}`;
    }

    // Role-based booking workflow:
    // If Admin/Superadmin books: Auto-approved immediately without requiring approval
    // If Telecaller/Pre-Sales/Sales Exec books: Moves to Admin for approval (pending_approval)
    if (isAdmin) {
      payload.status = payload.status || 'approved';
      if (payload.status === 'approved') {
        if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
          payload.approvedBy = req.user._id;
        }
        payload.approvedAt = new Date();
      }
    } else {
      payload.status = 'pending_approval';
    }

    if (payload.lead && !mongoose.Types.ObjectId.isValid(payload.lead)) delete payload.lead;
    if (payload.unit && !mongoose.Types.ObjectId.isValid(payload.unit)) delete payload.unit;
    if (payload.project && !mongoose.Types.ObjectId.isValid(payload.project)) delete payload.project;
    if (payload.siteVisit && !mongoose.Types.ObjectId.isValid(payload.siteVisit)) delete payload.siteVisit;
    if (payload.handledBy && !mongoose.Types.ObjectId.isValid(payload.handledBy)) delete payload.handledBy;

    const booking = await Booking.create(payload);

    if (payload.unit) {
      const unitStatus = payload.status === 'approved' ? 'booked' : 'blocked';
      await Unit.findByIdAndUpdate(payload.unit, { status: unitStatus, booking: booking._id });
    }
    if (payload.lead) {
      const leadStage = payload.status === 'approved' ? 'booked' : 'booking_in_progress';
      await Lead.findByIdAndUpdate(payload.lead, { stage: leadStage });
    }

    const populated = await booking.populate([
      { path: 'unit', select: 'unitNumber type tower floor pricing' },
      { path: 'project', select: 'name city' },
      { path: 'lead', select: 'name phone email' },
      { path: 'handledBy', select: 'name avatar' },
      { path: 'approvedBy', select: 'name' }
    ]);
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};

const updateBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('unit', 'unitNumber type pricing').populate('project', 'name').populate('lead', 'name phone');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
};

const approveBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }
    const updateData = { status: 'approved', approvedAt: new Date() };
    if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      updateData.approvedBy = req.user._id;
    }
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Update lead to booked
    if (booking.lead && mongoose.Types.ObjectId.isValid(booking.lead)) {
      await Lead.findByIdAndUpdate(booking.lead, { stage: 'booked' });
    }
    // Update unit to booked
    if (booking.unit && mongoose.Types.ObjectId.isValid(booking.unit)) {
      await Unit.findByIdAndUpdate(booking.unit, { status: 'booked', booking: booking._id });
    }

    const populated = await Booking.findById(booking._id)
      .populate('unit', 'unitNumber type tower floor pricing')
      .populate('project', 'name city')
      .populate('lead', 'name phone email')
      .populate('handledBy', 'name avatar')
      .populate('approvedBy', 'name');

    res.json({ success: true, data: populated || booking });
  } catch (err) { next(err); }
};

const cancelBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    booking.status = 'cancelled';
    booking.cancellationReason = req.body.reason || 'Rejected by Admin';
    await booking.save();

    // Free up the unit back to available
    if (booking.unit && mongoose.Types.ObjectId.isValid(booking.unit)) {
      await Unit.findByIdAndUpdate(booking.unit, { status: 'available', booking: null });
    }
    // Revert lead stage
    if (booking.lead && mongoose.Types.ObjectId.isValid(booking.lead)) {
      await Lead.findByIdAndUpdate(booking.lead, { stage: 'qualified' });
    }
    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
};

const getBookingStats = async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [total, todayCount, pending, approved, cancelled, totalValue] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: today } }),
      Booking.countDocuments({ status: 'pending_approval' }),
      Booking.countDocuments({ status: { $in: ['approved', 'agreement_signed', 'registered'] } }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    ]);
    res.json({ success: true, data: { total, todayCount, pending, approved, cancelled, totalValue: totalValue[0]?.total || 0 } });
  } catch (err) { next(err); }
};

const deleteBooking = async (req, res, next) => {
  try {
    let booking;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      booking = await Booking.findById(req.params.id);
    }
    if (!booking) {
      booking = await Booking.findOne({ $or: [{ bookingNumber: req.params.id }, { _id: req.params.id }] }).catch(() => null);
    }

    if (booking) {
      // Release the unit back to available
      if (booking.unit && mongoose.Types.ObjectId.isValid(booking.unit)) {
        await Unit.findByIdAndUpdate(booking.unit, { status: 'available', booking: null });
      }
      // Revert lead stage
      if (booking.lead && mongoose.Types.ObjectId.isValid(booking.lead)) {
        await Lead.findByIdAndUpdate(booking.lead, { stage: 'qualified' });
      }
      await Booking.deleteOne({ _id: booking._id });
    }

    res.json({ success: true, message: 'Booking request deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { getBookings, getBooking, createBooking, updateBooking, approveBooking, cancelBooking, deleteBooking, getBookingStats };
