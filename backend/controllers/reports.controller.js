const Lead = require('../models/Lead.model');
const Booking = require('../models/Booking.model');
const SiteVisit = require('../models/SiteVisit.model');
const Unit = require('../models/Unit.model');
const Payment = require('../models/Payment.model');
const Campaign = require('../models/Campaign.model');
const User = require('../models/User.model');

const getOrgMatch = (req) => {
  const isSuperAdmin = req.user?.role === 'super_admin';
  const userOrg = req.user?.organization;
  if (!isSuperAdmin || req.query.organization) {
    return { organization: req.query.organization || userOrg || 'Rise With RealtyHub' };
  }
  return {};
};

const getLeadReport = async (req, res, next) => {
  try {
    const { from, to, groupBy = 'source' } = req.query;
    const orgMatch = getOrgMatch(req);
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const match = { ...orgMatch, ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) };

    const [bySource, byStage, byType, daily, byAssignee] = await Promise.all([
      Lead.aggregate([{ $match: match }, { $group: { _id: '$source', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Lead.aggregate([{ $match: match }, { $group: { _id: '$stage', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $match: match }, { $group: { _id: '$leadType', count: { $sum: 1 } } }]),
      Lead.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
      Lead.aggregate([
        { $match: { ...match, assignedTo: { $exists: true, $ne: null } } },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$user.name', 'Unassigned'] }, count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({ success: true, data: { bySource, byStage, byType, daily, byAssignee } });
  } catch (err) { next(err); }
};

const getSalesReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const orgMatch = getOrgMatch(req);
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const match = { ...orgMatch, ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) };

    const [bookingsByStatus, bookingsByProject, monthlyBookings, revenueByProject] = await Promise.all([
      Booking.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$totalAmount' } } }]),
      Booking.aggregate([
        { $match: match },
        { $group: { _id: '$project', count: { $sum: 1 }, value: { $sum: '$totalAmount' } } },
        { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'proj' } },
        { $unwind: { path: '$proj', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$proj.name', 'General Booking'] }, count: 1, value: 1 } },
      ]),
      Booking.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 }, value: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } }, { $limit: 12 },
      ]),
      Booking.aggregate([
        { $match: match },
        { $group: { _id: '$project', revenue: { $sum: '$totalAmount' } } },
        { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'proj' } },
        { $unwind: { path: '$proj', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$proj.name', 'General Booking'] }, revenue: 1 } },
        { $sort: { revenue: -1 } },
      ]),
    ]);

    res.json({ success: true, data: { bookingsByStatus, bookingsByProject, monthlyBookings, revenueByProject } });
  } catch (err) { next(err); }
};

const getInventoryReport = async (req, res, next) => {
  try {
    const orgMatch = getOrgMatch(req);
    const byStatus = await Unit.aggregate([
      ...(Object.keys(orgMatch).length ? [{ $match: orgMatch }] : []),
      { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 }, value: { $sum: '$pricing.totalPrice' } } },
      { $lookup: { from: 'projects', localField: '_id.project', foreignField: '_id', as: 'proj' } },
      { $unwind: { path: '$proj', preserveNullAndEmptyArrays: true } },
      { $project: { status: '$_id.status', project: { $ifNull: ['$proj.name', 'Standard Tower'] }, count: 1, value: 1 } },
    ]);
    const byType = await Unit.aggregate([
      ...(Object.keys(orgMatch).length ? [{ $match: orgMatch }] : []),
      { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 } } },
      { $project: { type: '$_id.type', status: '$_id.status', count: 1 } },
    ]);
    res.json({ success: true, data: { byStatus, byType } });
  } catch (err) { next(err); }
};

const getTeamPerformance = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const orgMatch = getOrgMatch(req);
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const match = { ...orgMatch, ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) };

    const [leadsByExec, bookingsByExec, visitsByExec] = await Promise.all([
      Lead.aggregate([
        { $match: { ...match, assignedTo: { $exists: true, $ne: null } } },
        { $group: { _id: '$assignedTo', leads: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$user.name', 'Staff'] }, role: { $ifNull: ['$user.role', 'sales_executive'] }, leads: 1 } },
      ]),
      Booking.aggregate([
        { $match: { ...match, handledBy: { $exists: true, $ne: null } } },
        { $group: { _id: '$handledBy', bookings: { $sum: 1 }, value: { $sum: '$totalAmount' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$user.name', 'Staff'] }, bookings: 1, value: 1 } },
      ]),
      SiteVisit.aggregate([
        { $match: { ...match, assignedExecutive: { $exists: true, $ne: null } } },
        { $group: { _id: '$assignedExecutive', visits: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ['$user.name', 'Staff'] }, visits: 1 } },
      ]),
    ]);

    // Merge by ID
    const perf = {};
    leadsByExec.forEach(u => { if (u._id) perf[u._id] = { ...u }; });
    bookingsByExec.forEach(u => {
      if (!u._id) return;
      if (perf[u._id]) { perf[u._id].bookings = u.bookings; perf[u._id].value = u.value; }
      else perf[u._id] = { ...u };
    });
    visitsByExec.forEach(u => {
      if (!u._id) return;
      if (perf[u._id]) perf[u._id].visits = u.visits;
      else perf[u._id] = { ...u };
    });

    res.json({ success: true, data: Object.values(perf) });
  } catch (err) { next(err); }
};

const getFinanceReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const orgMatch = getOrgMatch(req);
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const match = { ...orgMatch, ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) };

    const [summaryAgg, byStatus, byPaymentMode, monthlyTrend, byMilestone] = await Promise.all([
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalDemanded: { $sum: '$demandAmount' },
            totalCollected: { $sum: '$paidAmount' },
            totalOutstanding: { $sum: '$balanceAmount' },
            totalGst: { $sum: '$gstAmount' },
            totalTds: { $sum: '$tdsAmount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Payment.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 }, demanded: { $sum: '$demandAmount' }, collected: { $sum: '$paidAmount' } } }
      ]),
      Payment.aggregate([
        { $match: match },
        { $group: { _id: '$paymentMode', count: { $sum: 1 }, collected: { $sum: '$paidAmount' } } },
        { $sort: { collected: -1 } }
      ]),
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            demanded: { $sum: '$demandAmount' },
            collected: { $sum: '$paidAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 12 }
      ]),
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$milestoneName',
            demanded: { $sum: '$demandAmount' },
            collected: { $sum: '$paidAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { demanded: -1 } },
        { $limit: 8 }
      ])
    ]);

    const summary = summaryAgg[0] || {
      totalDemanded: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalGst: 0,
      totalTds: 0,
      count: 0
    };
    summary.realizationRate = summary.totalDemanded > 0
      ? Number(((summary.totalCollected / summary.totalDemanded) * 100).toFixed(1))
      : 0;

    res.json({
      success: true,
      data: {
        summary,
        byStatus,
        byPaymentMode,
        monthlyTrend,
        byMilestone
      }
    });
  } catch (err) { next(err); }
};

module.exports = { getLeadReport, getSalesReport, getInventoryReport, getTeamPerformance, getFinanceReport };
