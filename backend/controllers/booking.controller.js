const mongoose = require('mongoose');
const Booking = require('../models/Booking.model');
const Unit = require('../models/Unit.model');
const Lead = require('../models/Lead.model');
const { createNotification, calculateLeadStage } = require('../services/notificationService');

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

    // Update unit status
    if (payload.unit) {
      const unitStatus = payload.status === 'approved' ? 'booked' : 'blocked';
      await Unit.findByIdAndUpdate(payload.unit, { status: unitStatus, booking: booking._id });
    }

    // Handle lead - add to activeBookings array instead of overwriting stage
    if (payload.lead && mongoose.Types.ObjectId.isValid(payload.lead)) {
      const lead = await Lead.findById(payload.lead);
      if (lead) {
        // Add booking to activeBookings array
        lead.activeBookings.push({
          booking: booking._id,
          unit: payload.unit,
          status: booking.status,
        });

        // Add unit to interestedUnits if not already there
        if (payload.unit && !lead.interestedUnits.some(u => u.unit?.toString() === payload.unit.toString())) {
          lead.interestedUnits.push({
            unit: payload.unit,
            addedAt: new Date(),
          });
        }

        // Calculate lead stage based on ALL active bookings
        const calculatedStage = calculateLeadStage(lead.activeBookings);
        lead.stage = calculatedStage;

        await lead.save();
      }

      // Send notification to assigned user
      if (lead?.assignedTo) {
        await createNotification(
          lead.assignedTo.toString(),
          'booking_created',
          {
            title: 'New Booking Created',
            message: `A new booking has been created for lead ${lead.name}`,
            description: `Booking #${booking.bookingNumber} for unit`,
            organization: payload.organization,
            relatedEntity: {
              type: 'booking',
              id: booking._id,
              name: booking.bookingNumber,
            },
            actionUrl: `/booking/${booking._id}`,
            actionLabel: 'View Booking',
            metadata: {
              bookingId: booking._id,
              leadId: payload.lead,
              customerName: booking.customerName,
            },
          }
        );
      }
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

    // Handle unit status synchronization when booking status changes
    if (req.body.status === 'cancelled') {
      if (booking.unit?._id || booking.unit) {
        await Unit.findByIdAndUpdate(booking.unit?._id || booking.unit, { status: 'available', booking: null });
      }
    } else if (['approved', 'agreement_signed', 'registered', 'registration_closed', 'closed'].includes(req.body.status)) {
      if (booking.unit?._id || booking.unit) {
        await Unit.findByIdAndUpdate(booking.unit?._id || booking.unit, { status: 'booked', booking: booking._id });
      }
    }

    // Update lead's activeBookings array - update the specific booking entry
    if (booking.lead && mongoose.Types.ObjectId.isValid(booking.lead)) {
      const lead = await Lead.findById(booking.lead);
      if (lead) {
        // Find and update the booking in activeBookings
        const bookingIndex = lead.activeBookings.findIndex(b => b.booking?.toString() === booking._id.toString());
        if (bookingIndex !== -1) {
          lead.activeBookings[bookingIndex].status = booking.status;
        }

        // Calculate lead stage based on ALL active bookings (excluding cancelled)
        const activeStatuses = lead.activeBookings
          .filter(b => b.status !== 'cancelled')
          .map(b => b.status);
        
        const calculatedStage = calculateLeadStage(lead.activeBookings);
        lead.stage = calculatedStage;

        await lead.save();
      }

      // Send notification about status change
      if (lead?.assignedTo && req.body.status) {
        const statusLabels = {
          'approved': 'Approved',
          'cancelled': 'Cancelled',
          'agreement_sent': 'Agreement Sent',
          'agreement_signed': 'Agreement Signed',
          'registered': 'Registered',
        };

        await createNotification(
          lead.assignedTo.toString(),
          'booking_status_changed',
          {
            title: 'Booking Status Updated',
            message: `Booking ${booking.bookingNumber} status changed to ${statusLabels[req.body.status] || req.body.status}`,
            organization: booking.organization,
            severity: req.body.status === 'cancelled' ? 'high' : 'medium',
            relatedEntity: {
              type: 'booking',
              id: booking._id,
              name: booking.bookingNumber,
            },
            actionUrl: `/booking/${booking._id}`,
            actionLabel: 'View Booking',
            metadata: {
              bookingId: booking._id,
              leadId: booking.lead,
              newStatus: req.body.status,
              customerName: booking.customerName,
            },
          }
        );
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

    // Update unit to booked
    if (booking.unit && mongoose.Types.ObjectId.isValid(booking.unit)) {
      await Unit.findByIdAndUpdate(booking.unit, { status: 'booked', booking: booking._id });
    }

    // Update lead's activeBookings
    if (booking.lead && mongoose.Types.ObjectId.isValid(booking.lead)) {
      const lead = await Lead.findById(booking.lead);
      if (lead) {
        const bookingIndex = lead.activeBookings.findIndex(b => b.booking?.toString() === booking._id.toString());
        if (bookingIndex !== -1) {
          lead.activeBookings[bookingIndex].status = 'approved';
        }
        lead.stage = calculateLeadStage(lead.activeBookings);
        await lead.save();
      }

      // Send approval notification
      if (lead?.assignedTo) {
        await createNotification(
          lead.assignedTo.toString(),
          'booking_approved',
          {
            title: 'Booking Approved',
            message: `Booking ${booking.bookingNumber} for ${booking.customerName} has been approved`,
            organization: booking.organization,
            severity: 'high',
            relatedEntity: {
              type: 'booking',
              id: booking._id,
              name: booking.bookingNumber,
            },
            actionUrl: `/booking/${booking._id}`,
            actionLabel: 'View Booking',
            metadata: {
              bookingId: booking._id,
              leadId: booking.lead,
              customerName: booking.customerName,
            },
          }
        );
      }
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

    // Update lead's activeBookings - mark this booking as cancelled
    if (booking.lead && mongoose.Types.ObjectId.isValid(booking.lead)) {
      const lead = await Lead.findById(booking.lead);
      if (lead) {
        const bookingIndex = lead.activeBookings.findIndex(b => b.booking?.toString() === booking._id.toString());
        if (bookingIndex !== -1) {
          lead.activeBookings[bookingIndex].status = 'cancelled';
        }

        // Calculate lead stage based on remaining active bookings
        lead.stage = calculateLeadStage(lead.activeBookings);

        // Only reset to 'qualified' if there are NO active bookings left
        if (lead.activeBookings.filter(b => b.status !== 'cancelled').length === 0) {
          lead.stage = 'qualified';
        }

        await lead.save();
      }

      // Send cancellation notification
      if (lead?.assignedTo) {
        await createNotification(
          lead.assignedTo.toString(),
          'booking_cancelled',
          {
            title: 'Booking Cancelled',
            message: `Booking ${booking.bookingNumber} for ${booking.customerName} has been cancelled`,
            description: `Reason: ${booking.cancellationReason}`,
            organization: booking.organization,
            severity: 'high',
            relatedEntity: {
              type: 'booking',
              id: booking._id,
              name: booking.bookingNumber,
            },
            actionUrl: `/booking/${booking._id}`,
            actionLabel: 'View Booking',
            metadata: {
              bookingId: booking._id,
              leadId: booking.lead,
              customerName: booking.customerName,
              reason: booking.cancellationReason,
            },
          }
        );
      }
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
