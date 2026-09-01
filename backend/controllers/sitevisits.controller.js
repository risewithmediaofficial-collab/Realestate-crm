const mongoose = require('mongoose');
const SiteVisit = require('../models/SiteVisit.model');
const Lead = require('../models/Lead.model');

const getSiteVisits = async (req, res, next) => {
  try {
    const { status, project, assignedExecutive, date, page = 1, limit = 20 } = req.query;
    const query = {};

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    if (isSuperAdmin) {
      if (req.query.organization) query.organization = req.query.organization;
    } else {
      if (!userOrg) return res.json({ success: true, data: [], total: 0 });
      query.organization = userOrg;
    }

    if (status) query.status = status;
    if (project) query.project = project;
    if (assignedExecutive) query.assignedExecutive = assignedExecutive;
    if (date) {
      const d = new Date(date); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      query.scheduledDate = { $gte: d, $lt: next };
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [visits, total] = await Promise.all([
      SiteVisit.find(query).sort({ scheduledDate: 1 }).skip(skip).limit(Number(limit))
        .populate('lead', 'name phone email stage leadType')
        .populate('project', 'name city')
        .populate('assignedExecutive', 'name phone avatar')
        .populate('scheduledBy', 'name'),
      SiteVisit.countDocuments(query),
    ]);
    res.json({ success: true, data: visits, total });
  } catch (err) { next(err); }
};

const getSiteVisit = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const visit = await SiteVisit.findOne(query)
      .populate('lead', 'name phone email city budget interestedUnitType stage')
      .populate('project', 'name city address')
      .populate('assignedExecutive', 'name phone email avatar')
      .populate('unitsShown', 'unitNumber type area pricing status');
    if (!visit) return res.status(404).json({ success: false, message: 'Site visit not found' });
    res.json({ success: true, data: visit });
  } catch (err) { next(err); }
};

const createSiteVisit = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const payload = { ...req.body };
    const userOrg = req.user?.organization;
    if (!isSuperAdmin || !payload.organization) {
      payload.organization = userOrg;
    }
    if (!payload.organization) {
      return res.status(400).json({ success: false, message: 'User organization is required to create a site visit' });
    }
    if (!payload.createdBy && req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      payload.createdBy = req.user._id;
    }

    if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      payload.scheduledBy = req.user._id;
    }
    if (payload.lead && !mongoose.Types.ObjectId.isValid(payload.lead)) delete payload.lead;
    if (payload.project && !mongoose.Types.ObjectId.isValid(payload.project)) delete payload.project;
    if (payload.assignedExecutive && !mongoose.Types.ObjectId.isValid(payload.assignedExecutive)) delete payload.assignedExecutive;
    if (payload.scheduledBy && !mongoose.Types.ObjectId.isValid(payload.scheduledBy)) delete payload.scheduledBy;

    const visit = await SiteVisit.create(payload);
    if (payload.lead) {
      await Lead.findByIdAndUpdate(payload.lead, { stage: 'site_visit_scheduled' });
    }
    const populated = await visit.populate([
      { path: 'lead', select: 'name phone email' },
      { path: 'project', select: 'name city' },
      { path: 'assignedExecutive', select: 'name phone avatar' }
    ]);
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};

const updateSiteVisit = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const visit = await SiteVisit.findOneAndUpdate(query, req.body, { new: true, runValidators: true })
      .populate('lead', 'name phone').populate('project', 'name').populate('assignedExecutive', 'name');
    if (!visit) return res.status(404).json({ success: false, message: 'Site visit not found' });
    res.json({ success: true, data: visit });
  } catch (err) { next(err); }
};

const checkIn = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const visit = await SiteVisit.findOneAndUpdate(
      query,
      { status: 'in_progress', checkInTime: new Date(), checkInLocation: req.body.location, otpVerified: req.body.otpVerified || false },
      { new: true }
    );
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
    res.json({ success: true, data: visit });
  } catch (err) { next(err); }
};

const checkOut = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const { outcome, feedback, rating, unitsShown, shortlistedUnit } = req.body;
    const visit = await SiteVisit.findOneAndUpdate(
      query,
      { status: 'completed', checkOutTime: new Date(), outcome, feedback, rating, unitsShown, shortlistedUnit },
      { new: true }
    ).populate('lead');

    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

    // Update lead stage based on outcome
    const stageMap = { interested: 'site_visit_done', negotiation: 'negotiation', booking: 'booking_in_progress', not_interested: 'not_interested' };
    if (stageMap[outcome] && visit.lead) {
      await Lead.findByIdAndUpdate(visit.lead._id, { stage: stageMap[outcome] });
    }
    res.json({ success: true, data: visit });
  } catch (err) { next(err); }
};

const deleteSiteVisit = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const visit = await SiteVisit.findOneAndDelete(query);
    if (!visit) return res.status(404).json({ success: false, message: 'Site visit not found' });
    res.json({ success: true, message: 'Site visit deleted successfully' });
  } catch (err) { next(err); }
};

const getSiteVisitStats = async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const match = isSuperAdmin
      ? (req.query.organization ? { organization: req.query.organization } : {})
      : { organization: userOrg || '__NO_ORG__' };

    const [total, todayVisits, completed, scheduled, cancelled] = await Promise.all([
      SiteVisit.countDocuments(match),
      SiteVisit.countDocuments({ ...match, scheduledDate: { $gte: today, $lt: tomorrow } }),
      SiteVisit.countDocuments({ ...match, status: 'completed' }),
      SiteVisit.countDocuments({ ...match, status: { $in: ['scheduled', 'confirmed'] } }),
      SiteVisit.countDocuments({ ...match, status: 'cancelled' }),
    ]);
    const outcomeStats = await SiteVisit.aggregate([
      { $match: { ...match, status: 'completed', outcome: { $exists: true } } },
      { $group: { _id: '$outcome', count: { $sum: 1 } } },
    ]);
    res.json({ success: true, data: { total, todayVisits, completed, scheduled, cancelled, outcomeStats } });
  } catch (err) { next(err); }
};

module.exports = { getSiteVisits, getSiteVisit, createSiteVisit, updateSiteVisit, checkIn, checkOut, deleteSiteVisit, getSiteVisitStats };
