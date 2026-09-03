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
  if (isSuperAdmin) {
    return req.query.organization ? { organization: req.query.organization } : {};
  }
  return { organization: userOrg || '__NO_ORG__' };
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

    const [allUsers, allLeads, allBookings, allVisits, allUnits] = await Promise.all([
      User.find({ ...orgMatch, role: { $ne: 'super_admin' } }).select('name email role organization').lean(),
      Lead.find(match).select('name phone assignedTo stage budget interestedProject').lean(),
      Booking.find({ ...match, status: { $in: ['approved', 'agreement_signed', 'registered', 'booked', 'pending_approval'] } }).lean(),
      SiteVisit.find(match).select('assignedTo assignedExecutive status').lean(),
      Unit.find({ ...orgMatch, status: { $in: ['booked', 'registered', 'sold'] } }).lean()
    ]);

    const perf = allUsers.map(u => {
      const uId = u._id.toString();
      const uName = (u.name || '').trim().toLowerCase();

      // 1. Leads assigned to this user
      const userLeads = allLeads.filter(l => {
        const aId = l.assignedTo?._id?.toString() || l.assignedTo?.toString();
        if (aId && aId === uId) return true;
        const lName = (l.assignedTo?.name || '').trim().toLowerCase();
        return lName && uName && (lName === uName || lName.includes(uName) || uName.includes(lName));
      });

      // 2. Visits conducted by this user
      const userVisits = allVisits.filter(v => {
        const aId = v.assignedTo?._id?.toString() || v.assignedTo?.toString() || v.assignedExecutive?._id?.toString() || v.assignedExecutive?.toString();
        return aId === uId;
      });

      // 3. Deals closed by this user
      // A: Direct booking records
      const directBookings = allBookings.filter(b => {
        const hId = b.handledBy?._id?.toString() || b.handledBy?.toString() || b.assignedAgent?.toString() || b.bookedBy?.toString();
        if (hId && hId === uId) return true;
        const bName = (b.handledBy?.name || b.agentName || '').trim().toLowerCase();
        if (bName && uName && (bName === uName || bName.includes(uName) || uName.includes(bName))) return true;
        // Or if booking customer matches assigned lead
        if (b.customerPhone && userLeads.some(ul => ul.phone === b.customerPhone)) return true;
        if (b.customerName && userLeads.some(ul => ul.name?.toLowerCase() === b.customerName?.toLowerCase())) return true;
        return false;
      });

      // B: Registered/Booked Units matching lead
      let unitDealsValue = 0;
      let unitDealsCount = 0;
      allUnits.forEach(un => {
        if (un.bookingCustomer) {
          const cPhone = un.bookingCustomer.phone;
          const cName = (un.bookingCustomer.name || '').toLowerCase();
          const agName = (un.bookingCustomer.agentName || '').toLowerCase();
          const matchesLead = userLeads.some(ul => (cPhone && ul.phone === cPhone) || (cName && ul.name?.toLowerCase() === cName));
          const matchesAgent = agName && (agName === uName || agName.includes(uName) || uName.includes(agName));

          if (matchesLead || matchesAgent) {
            // Only count if not already in directBookings
            const alreadyCounted = directBookings.some(b => b.unit?._id?.toString() === un._id.toString() || b.unit?.toString() === un._id.toString());
            if (!alreadyCounted) {
              unitDealsCount += 1;
              unitDealsValue += (un.pricing?.totalPrice || un.totalPrice || 0);
            }
          }
        }
      });

      // C: Leads in 'booked' stage
      let bookedLeadsValue = 0;
      let bookedLeadsCount = 0;
      userLeads.forEach(ul => {
        if (ul.stage === 'booked') {
          const alreadyInDirect = directBookings.some(b => b.customerPhone === ul.phone || b.customerName?.toLowerCase() === ul.name?.toLowerCase());
          if (!alreadyInDirect && unitDealsCount === 0) {
            bookedLeadsCount += 1;
            const bgVal = (typeof ul.budget === 'object' ? (ul.budget?.max || ul.budget?.min) : Number(ul.budget)) || 2220000;
            bookedLeadsValue += bgVal;
          }
        }
      });

      const totalDeals = directBookings.length + unitDealsCount + bookedLeadsCount;
      const totalSalesValue = directBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) + unitDealsValue + bookedLeadsValue;
      const conversion = userLeads.length > 0
        ? `${((totalDeals / userLeads.length) * 100).toFixed(0)}%`
        : (totalDeals > 0 ? '100%' : '0%');

      return {
        _id: u._id,
        name: u.name,
        role: u.role || 'telecaller',
        leads: userLeads.length,
        visits: userVisits.length,
        bookings: totalDeals,
        value: totalSalesValue,
        achievement: conversion
      };
    });

    res.json({ success: true, data: perf });
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

    const [summaryAgg, byStatus, byPaymentMode, monthlyTrend, byMilestone, bookedUnits, paymentsInMatch] = await Promise.all([
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
      ]),
      Unit.find({ ...orgMatch, status: { $in: ['booked', 'registered', 'sold'] } })
        .populate('booking', 'paidAmount balanceAmount totalAmount status')
        .lean(),
      Payment.find(match, 'unit booking').lean()
    ]);

    const summary = summaryAgg[0] || {
      totalDemanded: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalGst: 0,
      totalTds: 0,
      count: 0
    };

    const paymentUnitIds = new Set();
    (paymentsInMatch || []).forEach(p => {
      if (p.unit) paymentUnitIds.add(p.unit.toString());
      if (p.booking) paymentUnitIds.add((p.booking?._id || p.booking).toString());
    });

    (bookedUnits || []).forEach(u => {
      const uId = u._id?.toString();
      const bId = (u.booking?._id || u.booking)?.toString();
      const alreadyHas = paymentUnitIds.has(uId) || (bId && paymentUnitIds.has(bId));
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
        summary.totalDemanded += totalDeal;
        summary.totalCollected += actualPaid;
        summary.totalOutstanding += bal;
        summary.count += 1;
      }
    });

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
