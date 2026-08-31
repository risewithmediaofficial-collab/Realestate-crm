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
    if (!isSuperAdmin || req.query.organization) {
      query.organization = req.query.organization || userOrg || 'Rise With RealtyHub';
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
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email avatar role phone')
      .populate('interestedProject', 'name city code')
      .populate('channelPartner', 'firmName contactPerson phone')
      .populate('campaign', 'name type');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) { next(err); }
};

// POST /api/leads
const mongoose = require('mongoose');
const createLead = async (req, res, next) => {
  try {
    const leadData = { ...req.body };
    const userOrg = req.user?.organization || 'Rise With RealtyHub';
    if (!leadData.organization) {
      leadData.organization = userOrg;
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
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedTo', 'name email avatar')
      .populate('interestedProject', 'name city code');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) { next(err); }
};

// DELETE /api/leads/:id
const deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) { next(err); }
};

// POST /api/leads/:id/activity
const addActivity = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
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
    const { assignedTo } = req.body;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
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
    const { stage } = req.body;
    const lead = await Lead.findById(req.params.id);
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
    const stageStats = await Lead.aggregate([
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]);
    const sourceStats = await Lead.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);
    const totalLeads = await Lead.countDocuments();
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
    await Lead.deleteMany({});
    res.json({ success: true, message: 'All leads deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { getLeads, getLead, createLead, updateLead, deleteLead, deleteAllLeads, addActivity, assignLead, updateStage, getLeadStats };
