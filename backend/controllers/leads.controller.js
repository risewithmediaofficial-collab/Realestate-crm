const mongoose = require('mongoose');
const Lead = require('../models/Lead.model');
const User = require('../models/User.model');

// GET /api/leads
const getLeads = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20, stage, source, assignedTo, search,
      project, leadType, campaign, sortBy = 'createdAt', sortOrder = 'desc',
    } = req.query;

    const query = {};
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;

    if (isSuperAdmin) {
      if (req.query.organization) query.organization = req.query.organization;
    } else {
      if (!userOrg) {
        return res.json({ success: true, data: [], total: 0, page: Number(page), pages: 0 });
      }
      query.organization = userOrg;
    }

    if (stage) query.stage = stage;
    if (source) query.source = source;
    if (assignedTo) query.assignedTo = assignedTo;
    if (project) query.interestedProject = project;
    if (leadType) query.leadType = leadType;
    if (campaign) query.campaign = campaign;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // My leads only
    if (req.query.myLeads === 'true') {
      query.assignedTo = req.user._id;
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .sort(sort).skip(skip).limit(Number(limit))
      .populate('assignedTo', 'name email avatar')
      .populate('interestedProject', 'name city')
      .populate('channelPartner', 'firmName contactPerson');

    res.json({ success: true, data: leads, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// GET /api/leads/:id
const getLead = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const lead = await Lead.findOne(query)
      .populate('assignedTo', 'name email avatar role phone')
      .populate('interestedProject', 'name city code')
      .populate('channelPartner', 'firmName contactPerson phone')
      .populate('campaign', 'name type');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) { next(err); }
};

// POST /api/leads
const createLead = async (req, res, next) => {
  try {
    const leadData = { ...req.body };
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;

    if (!isSuperAdmin || !leadData.organization) {
      leadData.organization = userOrg;
    }
    if (!leadData.organization) {
      return res.status(400).json({ success: false, message: 'User organization is required to create a lead' });
    }

    if (!leadData.createdBy && req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      leadData.createdBy = req.user._id;
    }

    if (leadData.interestedProject && !mongoose.Types.ObjectId.isValid(leadData.interestedProject)) {
      delete leadData.interestedProject;
    }
    if (!leadData.assignedTo && req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      leadData.assignedTo = req.user._id;
    }
    if (leadData.assignedTo && !mongoose.Types.ObjectId.isValid(leadData.assignedTo)) {
      delete leadData.assignedTo;
    }
    if (leadData.campaign && !mongoose.Types.ObjectId.isValid(leadData.campaign)) {
      delete leadData.campaign;
    }
    if (leadData.channelPartner && !mongoose.Types.ObjectId.isValid(leadData.channelPartner)) {
      delete leadData.channelPartner;
    }

    // Duplicate check by phone within same organization
    if (leadData.phone) {
      const existingLead = await Lead.findOne({ phone: leadData.phone, organization: leadData.organization });
      if (existingLead) {
        leadData.isDuplicate = true;
        leadData.duplicateOf = existingLead._id;
      }
    }
    const lead = await Lead.create({ ...leadData, slaStartedAt: new Date() });
    const populatedLead = await lead.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'interestedProject', select: 'name city code' }
    ]);
    res.status(201).json({ success: true, data: populatedLead });
  } catch (err) { next(err); }
};

// PUT /api/leads/:id
const updateLead = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const lead = await Lead.findOneAndUpdate(query, req.body, { new: true, runValidators: true })
      .populate('assignedTo', 'name email avatar')
      .populate('interestedProject', 'name city code');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) { next(err); }
};

// DELETE /api/leads/:id
const deleteLead = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const lead = await Lead.findOneAndDelete(query);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) { next(err); }
};

// POST /api/leads/:id/activity
const addActivity = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const lead = await Lead.findOne(query);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    const act = { ...req.body };
    if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      act.performedBy = req.user._id;
    } else {
      delete act.performedBy;
    }
    lead.activities.push(act);
    lead.lastActivityAt = new Date();
    await lead.save();
    res.json({ success: true, data: lead });
  } catch (err) { next(err); }
};

// PUT /api/leads/:id/assign
const assignLead = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const { assignedTo } = req.body;
    const lead = await Lead.findOneAndUpdate(
      query,
      { assignedTo, assignedAt: new Date() },
      { new: true }
    ).populate('assignedTo', 'name email avatar');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) { next(err); }
};

// PUT /api/leads/:id/stage
const updateStage = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const { stage } = req.body;
    const lead = await Lead.findOne(query);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    const prevStage = lead.stage;
    lead.stage = stage;
    lead.activities.push({
      type: 'stage_change',
      title: `Stage changed from ${prevStage} to ${stage}`,
      performedBy: req.user._id,
    });
    await lead.save();
    res.json({ success: true, data: lead });
  } catch (err) { next(err); }
};

// GET /api/leads/stats
const getLeadStats = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const match = isSuperAdmin
      ? (req.query.organization ? { organization: req.query.organization } : {})
      : { organization: userOrg || '__NO_ORG__' };

    const stageStats = await Lead.aggregate([
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]);
    const sourceStats = await Lead.aggregate([
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);
    const totalLeads = await Lead.countDocuments(match);
    res.json({
      success: true,
      data: {
        totalLeads,
        stageStats,
        sourceStats
      }
    });
  } catch (err) { next(err); }
};

// DELETE /api/leads/delete-all
const deleteAllLeads = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = {};
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    } else if (req.query.organization) {
      query.organization = req.query.organization;
    }
    await Lead.deleteMany(query);
    res.json({ success: true, message: 'Leads deleted successfully' });
  } catch (err) { next(err); }
};


// POST /api/leads/:id/call-log  — add a call note entry
const addCallLog = async (req, res, next) => {
  try {
    const { note, outcome, nextFollowUp, nextFollowUpTime, duration, callDate } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ success: false, message: 'Note is required' });

    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) query.organization = req.user?.organization || '__UNAUTHORIZED__';

    const lead = await Lead.findOne(query);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const entry = {
      note: note.trim(),
      outcome: outcome || 'connected',
      callDate: callDate ? new Date(callDate) : new Date(),
      duration: duration ? Number(duration) : undefined,
      nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : undefined,
      nextFollowUpTime: nextFollowUpTime || undefined,
      addedBy: req.user?._id,
      notified: false,
    };

    lead.callLogs.push(entry);
    // Sync top-level nextFollowUp to latest entry's followUp date
    if (entry.nextFollowUp) {
      lead.nextFollowUp = entry.nextFollowUp;
      lead.nextFollowUpTime = entry.nextFollowUpTime;
    }
    lead.lastActivityAt = new Date();
    lead.lastCallOutcome = entry.outcome;
    await lead.save();

    const populated = await Lead.findById(lead._id)
      .populate('callLogs.addedBy', 'name email role')
      .select('callLogs nextFollowUp nextFollowUpTime lastCallOutcome');

    res.status(201).json({ success: true, data: populated.callLogs, lead: populated });
  } catch (err) { next(err); }
};

// GET /api/leads/follow-ups/today  — leads due for follow-up today (for bell notification)
const getFollowUpsToday = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const orgQuery = isSuperAdmin
      ? (req.query.organization ? { organization: req.query.organization } : {})
      : { organization: userOrg || '__NO_ORG__' };

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    // Leads where the top-level nextFollowUp is today or overdue
    const leads = await Lead.find({
      ...orgQuery,
      nextFollowUp: { $lte: todayEnd },
      stage: { $nin: ['booked', 'lost', 'not_interested', 'duplicate'] }
    })
      .select('name phone nextFollowUp nextFollowUpTime stage leadType lastCallOutcome assignedTo')
      .populate('assignedTo', 'name')
      .sort({ nextFollowUp: 1 })
      .limit(50);

    const overdue  = leads.filter(l => new Date(l.nextFollowUp) < todayStart);
    const dueToday = leads.filter(l => new Date(l.nextFollowUp) >= todayStart);

    res.json({
      success: true,
      data: leads,
      count: leads.length,
      overdueCount: overdue.length,
      todayCount: dueToday.length,
    });
  } catch (err) { next(err); }
};

// GET /api/leads/stats/by-user  — telecaller & staff performance stats
const getStatsByUser = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const query = isSuperAdmin
      ? (req.query.organization ? { organization: req.query.organization } : {})
      : (userOrg ? { organization: userOrg } : {});

    const Booking = require('../models/Booking.model');
    const Unit    = require('../models/Unit.model');

    const [leads, bookings, units] = await Promise.all([
      Lead.find(query).select('assignedTo budget stage leadType callLogs').lean().catch(() => []),
      Booking.find(query).select('totalAmount tokenAmount status handledBy bookedBy agent assignedAgent lead').lean().catch(() => []),
      Unit.find(query).select('status bookingCustomer pricing totalPrice').lean().catch(() => []),
    ]);

    const map = {};

    leads.forEach(l => {
      const assignedId = l.assignedTo ? String(l.assignedTo._id || l.assignedTo) : null;
      if (!assignedId) return;

      if (!map[assignedId]) {
        map[assignedId] = {
          _id: assignedId,
          leadsCount: 0,
          pipelineValue: 0,
          hotLeads: 0,
          warmLeads: 0,
          bookedLeads: 0,
          callsMade: 0,
          convertedRevenue: 0,
          bookingsWon: 0,
        };
      }

      map[assignedId].leadsCount += 1;
      const budgetVal = typeof l.budget === 'object' ? (l.budget?.max || l.budget?.min || 0) : (Number(l.budget) || 0);
      map[assignedId].pipelineValue += budgetVal;

      if (l.leadType === 'hot') map[assignedId].hotLeads += 1;
      if (l.leadType === 'warm') map[assignedId].warmLeads += 1;
      if (l.stage === 'booked') map[assignedId].bookedLeads += 1;

      if (l.callLogs && Array.isArray(l.callLogs)) {
        l.callLogs.forEach(entry => {
          const addedById = entry.addedBy ? String(entry.addedBy._id || entry.addedBy) : assignedId;
          if (addedById) {
            if (!map[addedById]) {
              map[addedById] = { _id: addedById, leadsCount: 0, pipelineValue: 0, hotLeads: 0, warmLeads: 0, bookedLeads: 0, callsMade: 0, convertedRevenue: 0, bookingsWon: 0 };
            }
            map[addedById].callsMade += 1;
          }
        });
      }
    });

    bookings.forEach(b => {
      if (['approved', 'agreement_signed', 'registered', 'registration_closed', 'closed'].includes(b.status)) {
        const agentId = b.handledBy || b.bookedBy || b.agent || b.assignedAgent;
        const aKey = agentId ? String(agentId._id || agentId) : null;
        if (aKey) {
          if (!map[aKey]) {
            map[aKey] = { _id: aKey, leadsCount: 0, pipelineValue: 0, hotLeads: 0, warmLeads: 0, bookedLeads: 0, callsMade: 0, convertedRevenue: 0, bookingsWon: 0 };
          }
          map[aKey].convertedRevenue += (b.totalAmount || 0);
          map[aKey].bookingsWon += 1;
        }
      }
    });

    let tokenCollected = 0;
    let totalRevenue = 0;
    units.forEach(u => {
      if (['booked', 'registered', 'sold'].includes(u.status)) {
        tokenCollected += (u.bookingCustomer?.tokenAmount || 0);
        totalRevenue += (u.pricing?.totalPrice || u.totalPrice || 0);
      }
    });

    return res.json({
      success: true,
      data: map,
      orgTotals: { tokenCollected, totalRevenue }
    });
  } catch (err) {
    console.error('Error in getStatsByUser:', err);
    return res.json({
      success: true,
      data: {},
      orgTotals: { tokenCollected: 0, totalRevenue: 0 }
    });
  }
};

module.exports = { getLeads, getLead, createLead, updateLead, deleteLead, deleteAllLeads, addActivity, assignLead, updateStage, getLeadStats, addCallLog, getFollowUpsToday, getStatsByUser };
