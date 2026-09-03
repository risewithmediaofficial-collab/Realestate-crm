const Lead = require('../models/Lead.model');
const Unit = require('../models/Unit.model');
const Task = require('../models/Task.model');
const Booking = require('../models/Booking.model');
const SiteVisit = require('../models/SiteVisit.model');
const Payment = require('../models/Payment.model');

const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const orgQuery = isSuperAdmin
      ? (req.query.organization ? { organization: new RegExp(`^${req.query.organization}$`, 'i') } : {})
      : { organization: userOrg ? new RegExp(`^${userOrg}$`, 'i') : '__NO_ORG__' };

    const [
      totalLeads, todayLeads, newLeads,
      pendingTasks, todaySiteVisits, todayBookings,
      inventoryStats, stageStats, sourceStats, leadTypeStats,
      bookingValueAgg, unitBookedAgg, paymentsList, bookedUnitsList
    ] = await Promise.all([
      Lead.countDocuments({ ...orgQuery }),
      Lead.countDocuments({ ...orgQuery, createdAt: { $gte: today } }),
      Lead.countDocuments({ ...orgQuery, stage: 'new' }),
      Task.countDocuments({ ...orgQuery, status: 'pending', dueDate: { $lte: new Date() } }),
      SiteVisit.countDocuments({ ...orgQuery, scheduledDate: { $gte: today, $lt: tomorrow } }),
      Booking.countDocuments({ ...orgQuery, createdAt: { $gte: today } }),
      Unit.aggregate([
        ...(Object.keys(orgQuery).length > 0 ? [{ $match: orgQuery }] : []),
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$pricing.totalPrice' } } }
      ]),
      Lead.aggregate([
        ...(Object.keys(orgQuery).length > 0 ? [{ $match: orgQuery }] : []),
        { $group: { _id: '$stage', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        ...(Object.keys(orgQuery).length > 0 ? [{ $match: orgQuery }] : []),
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        ...(Object.keys(orgQuery).length > 0 ? [{ $match: orgQuery }] : []),
        { $group: { _id: '$leadType', count: { $sum: 1 } } }
      ]),
      Booking.aggregate([
        ...(Object.keys(orgQuery).length > 0 ? [{ $match: orgQuery }] : []),
        {
          $group: {
            _id: null,
            totalBookingsCount: { $sum: 1 },
            totalBookingValue: { $sum: { $ifNull: ['$totalAmount', 0] } },
            totalTokenCollected: { $sum: { $ifNull: ['$tokenAmount', { $ifNull: ['$bookingAmount', 0] }] } }
          }
        }
      ]),
      Unit.aggregate([
        ...(Object.keys(orgQuery).length > 0 ? [{ $match: { ...orgQuery, status: { $in: ['booked', 'registered', 'sold'] } } }] : [{ $match: { status: { $in: ['booked', 'registered', 'sold'] } } }]),
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalValue: { $sum: { $ifNull: ['$pricing.totalPrice', { $ifNull: ['$totalPrice', 0] }] } },
            tokenCollected: { $sum: { $ifNull: ['$bookingCustomer.tokenAmount', { $ifNull: ['$bookingCustomer.bookingAmount', 0] }] } }
          }
        }
      ]),
      Payment.find({ ...orgQuery }).populate('booking', 'paidAmount balanceAmount totalAmount status').lean(),
      Unit.find({ ...orgQuery, status: { $in: ['booked', 'registered', 'sold'] } })
        .populate('booking', 'paidAmount balanceAmount totalAmount status')
        .lean()
    ]);

    // Lead funnel (ordered stages)
    const funnelStages = ['new', 'contacted', 'connected', 'qualified', 'site_visit_scheduled',
      'site_visit_done', 'negotiation', 'booking_in_progress', 'booked'];
    const stageMap = {};
    stageStats.forEach(s => { stageMap[s._id] = s.count; });
    const funnel = funnelStages.map(stage => ({ stage, count: stageMap[stage] || 0 }));

    const bookingVal = bookingValueAgg[0]?.totalBookingValue || 0;
    const unitVal = unitBookedAgg[0]?.totalValue || 0;
    const grossBookingsVal = Math.max(bookingVal, unitVal) || (bookingVal + unitVal);

    const bookingToken = bookingValueAgg[0]?.totalTokenCollected || 0;
    const unitToken = unitBookedAgg[0]?.tokenCollected || 0;
    const totalTokensCollected = Math.max(bookingToken, unitToken) || (bookingToken + unitToken);

    const totalBookingsCount = Math.max(bookingValueAgg[0]?.totalBookingsCount || 0, unitBookedAgg[0]?.count || 0);

    let totalDemand = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueDemandsCount = 0;
    const paymentModeMap = {};

    const paymentUnitIds = new Set();
    const paymentBookingIds = new Set();

    (paymentsList || []).forEach(p => {
      const dem = p.demandAmount || 0;
      const paid = p.paidAmount || 0;
      const bal = p.balanceAmount != null ? p.balanceAmount : Math.max(0, dem - paid);
      totalDemand += dem;
      totalCollected += paid;
      totalOutstanding += bal;
      if (p.status === 'overdue' || (p.status !== 'paid' && p.dueDate && new Date(p.dueDate) < today)) {
        overdueDemandsCount++;
      }
      if (p.paymentMode) {
        if (!paymentModeMap[p.paymentMode]) paymentModeMap[p.paymentMode] = { count: 0, collected: 0 };
        paymentModeMap[p.paymentMode].count++;
        paymentModeMap[p.paymentMode].collected += paid;
      }
      if (p.unit) paymentUnitIds.add(p.unit.toString());
      if (p.booking) paymentBookingIds.add((p.booking?._id || p.booking).toString());
    });

    (bookedUnitsList || []).forEach(u => {
      const uId = u._id?.toString();
      const bId = (u.booking?._id || u.booking)?.toString();
      const alreadyHas = paymentUnitIds.has(uId) || (bId && paymentBookingIds.has(bId));
      if (!alreadyHas && (u.bookingCustomer?.name || u.booking)) {
        const bk = u.booking && typeof u.booking === 'object' ? u.booking : null;
        const cust = u.bookingCustomer || {};
        const totalDeal = bk?.totalAmount || u.pricing?.totalPrice || u.totalPrice || 0;

        // Detect if fully paid/cleared
        const isCleared = (bk?.balanceAmount === 0 && (bk?.paidAmount || 0) > 0) ||
                          ['ready_for_registration', 'registered', 'registration_closed', 'closed'].includes(bk?.status) ||
                          cust.bookingStatus === 'cleared' ||
                          cust.balanceDue === 0 ||
                          (cust.totalPaid != null && cust.totalPaid >= totalDeal && totalDeal > 0);

        const actualPaid = isCleared
          ? totalDeal
          : (bk?.paidAmount != null && bk.paidAmount > 0
              ? bk.paidAmount
              : (cust.totalPaid != null
                  ? cust.totalPaid
                  : (cust.paidAmount != null
                      ? cust.paidAmount
                      : (cust.tokenAmount || cust.bookingAmount || 0))));

        const bal = isCleared ? 0 : (bk?.balanceAmount != null ? bk.balanceAmount : Math.max(0, totalDeal - actualPaid));
        totalDemand += totalDeal;
        totalCollected += actualPaid;
        totalOutstanding += bal;
        const mode = cust.paymentMode || 'neft';
        if (!paymentModeMap[mode]) paymentModeMap[mode] = { count: 0, collected: 0 };
        paymentModeMap[mode].count++;
        paymentModeMap[mode].collected += actualPaid;
      }
    });

    const paymentModeStats = Object.entries(paymentModeMap).map(([mode, data]) => ({
      _id: mode,
      count: data.count,
      collected: data.collected
    }));

    const realizationRate = totalDemand > 0 ? Number(((totalCollected / totalDemand) * 100).toFixed(1)) : 0;

    const finance = {
      grossBookingValue: grossBookingsVal,
      totalBookingsCount: totalBookingsCount,
      totalTokenCollected: totalTokensCollected,
      totalDemandRaised: totalDemand,
      totalPaidCollected: totalCollected,
      totalOutstanding: totalOutstanding,
      overdueDemandsCount,
      realizationRate,
      paymentModeStats
    };

    res.json({
      success: true,
      data: {
        kpis: { totalLeads, todayLeads, newLeads, pendingTasks, todaySiteVisits, todayBookings },
        finance,
        funnel,
        sourceStats,
        leadTypeStats,
        inventoryStats,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getDashboardStats };
