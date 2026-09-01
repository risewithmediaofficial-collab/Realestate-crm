const mongoose = require('mongoose');
const Booking = require('../models/Booking.model');
const Unit = require('../models/Unit.model');
const Lead = require('../models/Lead.model');

const getBookings = async (req, res, next) => {
  try {
    const { status, project, page = 1, limit = 20, search } = req.query;
    const query = {};

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    if (isSuperAdmin) {
      if (req.query.organization) query.organization = new RegExp(`^${req.query.organization}$`, 'i');
    } else {
      if (!userOrg) return res.json({ success: true, data: [], total: 0 });
      query.organization = new RegExp(`^${userOrg}$`, 'i');
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
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const booking = await Booking.findOne(query)
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

const createBooking = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    const userRole = req.user?.role || 'admin';
    const isAdmin = ['admin', 'superadmin', 'super_admin'].includes(userRole) || !!req.user?.isSuperAdmin;
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;

    if (!isSuperAdmin || !payload.organization) {
      payload.organization = userOrg;
    }
    if (!payload.organization) {
      return res.status(400).json({ success: false, message: 'User organization is required to create a booking' });
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
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const booking = await Booking.findOneAndUpdate(query, req.body, { new: true, runValidators: true })
      .populate('unit', 'unitNumber type pricing').populate('project', 'name').populate('lead', 'name phone');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Handle unit & lead synchronization when status changes
    if (req.body.status === 'cancelled') {
      if (booking.unit?._id || booking.unit) {
        await Unit.findByIdAndUpdate(booking.unit?._id || booking.unit, { status: 'available', booking: null });
      }
      if (booking.lead?._id || booking.lead) {
        await Lead.findByIdAndUpdate(booking.lead?._id || booking.lead, { stage: 'follow_up' });
      }
    } else if (['approved', 'agreement_signed', 'registered', 'registration_closed', 'closed'].includes(req.body.status)) {
      if (booking.unit?._id || booking.unit) {
        await Unit.findByIdAndUpdate(booking.unit?._id || booking.unit, { status: 'booked', booking: booking._id });
      }
      if (booking.lead?._id || booking.lead) {
        await Lead.findByIdAndUpdate(booking.lead?._id || booking.lead, { stage: 'booked' });
      }
    }

    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
};

const approveBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const updateData = { status: 'approved', approvedAt: new Date() };
    if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      updateData.approvedBy = req.user._id;
    }
    const booking = await Booking.findOneAndUpdate(
      query,
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
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const booking = await Booking.findOne(query);
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
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const match = isSuperAdmin
      ? (req.query.organization ? { organization: new RegExp(`^${req.query.organization}$`, 'i') } : {})
      : { organization: userOrg ? new RegExp(`^${userOrg}$`, 'i') : '__NO_ORG__' };

    const [total, todayCount, pending, approved, cancelled, bookingAgg, unitAgg] = await Promise.all([
      Booking.countDocuments(match),
      Booking.countDocuments({ ...match, createdAt: { $gte: today } }),
      Booking.countDocuments({ ...match, status: 'pending_approval' }),
      Booking.countDocuments({ ...match, status: { $in: ['approved', 'agreement_signed', 'registered'] } }),
      Booking.countDocuments({ ...match, status: 'cancelled' }),
      Booking.aggregate([
        ...(Object.keys(match).length ? [{ $match: match }] : []),
        {
          $group: {
            _id: null,
            totalValue: { $sum: '$totalAmount' },
            tokenCollected: { $sum: '$tokenAmount' }
          }
        }
      ]),
      Unit.aggregate([
        ...(Object.keys(match).length ? [{ $match: { ...match, status: { $in: ['booked', 'registered', 'sold'] } } }] : [{ $match: { status: { $in: ['booked', 'registered', 'sold'] } } }]),
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalValue: { $sum: '$pricing.totalPrice' },
            tokenCollected: { $sum: '$bookingCustomer.tokenAmount' }
          }
        }
      ])
    ]);

    const bookingTotal = bookingAgg[0]?.totalValue || 0;
    const bookingToken = bookingAgg[0]?.tokenCollected || 0;
    const unitTotal = unitAgg[0]?.totalValue || 0;
    const unitToken = unitAgg[0]?.tokenCollected || 0;

    // Use whichever has the highest tracked booking volume or combine
    const grossBookedRevenue = Math.max(bookingTotal, unitTotal) || (bookingTotal + unitTotal);
    const tokenAdvanceCollected = Math.max(bookingToken, unitToken) || (bookingToken + unitToken);
    const remainingBalance = Math.max(0, grossBookedRevenue - tokenAdvanceCollected);

    res.json({
      success: true,
      data: {
        total: Math.max(total, unitAgg[0]?.count || 0),
        todayCount,
        pending,
        approved: Math.max(approved, unitAgg[0]?.count || 0),
        cancelled,
        totalValue: grossBookedRevenue,
        totalBookedRevenue: grossBookedRevenue,
        tokenAdvanceCollected,
        remainingBalance
      }
    });
  } catch (err) { next(err); }
};

const deleteBooking = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    let query = {};
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      query._id = req.params.id;
    } else {
      query.bookingNumber = req.params.id;
    }
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const booking = await Booking.findOne(query);

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
