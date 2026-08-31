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
    const orgQuery = (isSuperAdmin && !req.query.organization)
      ? {}
      : { organization: req.query.organization || userOrg || 'Rise With RealtyHub' };

    const [
      totalLeads, todayLeads, newLeads,
      pendingTasks, todaySiteVisits, todayBookings,
      inventoryStats, stageStats, sourceStats, leadTypeStats,
      bookingValueAgg, paymentAgg, paymentModeStats, overdueDemandsCount
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
            totalBookingValue: { $sum: '$totalAmount' },
            totalTokenCollected: { $sum: '$tokenAmount' }
          }
        }
      ]),
      Payment.aggregate([
        ...(Object.keys(orgQuery).length > 0 ? [{ $match: orgQuery }] : []),
        {
          $group: {
            _id: null,
            totalDemandRaised: { $sum: '$demandAmount' },
            totalPaidCollected: { $sum: '$paidAmount' },
            totalOutstanding: { $sum: '$balanceAmount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Payment.aggregate([
        ...(Object.keys(orgQuery).length > 0 ? [{ $match: orgQuery }] : []),
        {
          $group: {
            _id: '$paymentMode',
            count: { $sum: 1 },
            collected: { $sum: '$paidAmount' }
          }
        }
      ]),
      Payment.countDocuments({ ...orgQuery, status: 'overdue' })
    ]);

    // Lead funnel (ordered stages)
    const funnelStages = ['new', 'contacted', 'connected', 'qualified', 'site_visit_scheduled',
      'site_visit_done', 'negotiation', 'booking_in_progress', 'booked'];
    const stageMap = {};
    stageStats.forEach(s => { stageMap[s._id] = s.count; });
    const funnel = funnelStages.map(stage => ({ stage, count: stageMap[stage] || 0 }));

    const totalDemand = paymentAgg[0]?.totalDemandRaised || 0;
    const totalCollected = paymentAgg[0]?.totalPaidCollected || 0;
    const totalOutstanding = paymentAgg[0]?.totalOutstanding || 0;
    const realizationRate = totalDemand > 0 ? Number(((totalCollected / totalDemand) * 100).toFixed(1)) : 0;

    const finance = {
      grossBookingValue: bookingValueAgg[0]?.totalBookingValue || 0,
      totalBookingsCount: bookingValueAgg[0]?.totalBookingsCount || 0,
      totalTokenCollected: bookingValueAgg[0]?.totalTokenCollected || 0,
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
