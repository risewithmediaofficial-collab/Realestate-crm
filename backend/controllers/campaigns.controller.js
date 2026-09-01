const Campaign = require('../models/Campaign.model');

const getCampaigns = async (req, res, next) => {
  try {
    const { status, type, project } = req.query;
    const query = {};

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    if (isSuperAdmin) {
      if (req.query.organization) query.organization = req.query.organization;
    } else {
      if (!userOrg) return res.json({ success: true, data: [] });
      query.organization = userOrg;
    }

    if (status) query.status = status;
    if (type) query.type = type;
    if (project) query.project = project;
    const campaigns = await Campaign.find(query)
      .sort('-createdAt')
      .populate('project', 'name city location code')
      .populate('createdBy', 'name email');
    res.json({ success: true, data: campaigns });
  } catch (err) { next(err); }
};

const getCampaign = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const campaign = await Campaign.findOne(query)
      .populate('project', 'name city location code')
      .populate('createdBy', 'name email');
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data: campaign });
  } catch (err) { next(err); }
};

const createCampaign = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const data = { ...req.body };
    const userOrg = req.user?.organization;
    if (!isSuperAdmin || !data.organization) {
      data.organization = userOrg;
    }
    if (!data.organization) {
      return res.status(400).json({ success: false, message: 'User organization is required to create a campaign' });
    }
    if (req.user) data.createdBy = req.user._id;
    if (!data.project || data.project === '' || data.project === 'none') {
      delete data.project;
    }
    const campaign = await Campaign.create(data);
    const populated = await Campaign.findById(campaign._id)
      .populate('project', 'name city location code')
      .populate('createdBy', 'name email');
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};

const updateCampaign = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const data = { ...req.body };
    if (!data.project || data.project === '' || data.project === 'none') {
      data.project = null;
    }
    const campaign = await Campaign.findOneAndUpdate(query, data, { new: true, runValidators: true })
      .populate('project', 'name city location code')
      .populate('createdBy', 'name email');
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data: campaign });
  } catch (err) { next(err); }
};

const deleteCampaign = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const campaign = await Campaign.findOneAndDelete(query);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (err) { next(err); }
};

const getCampaignROI = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const query = { status: { $in: ['active', 'completed'] } };
    if (isSuperAdmin) {
      if (req.query.organization) query.organization = req.query.organization;
    } else {
      if (!userOrg) return res.json({ success: true, data: [] });
      query.organization = userOrg;
    }

    const campaigns = await Campaign.find(query);
    const roi = campaigns.map(c => ({
      name: c.name, type: c.type, budget: c.budget, spent: c.spent,
      leads: c.leads, cpl: c.leads ? Math.round(c.spent / c.leads) : 0,
      conversions: c.conversions, revenue: c.revenue,
      roi: c.spent ? Math.round(((c.revenue - c.spent) / c.spent) * 100) : 0,
    }));
    res.json({ success: true, data: roi });
  } catch (err) { next(err); }
};

module.exports = { getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign, getCampaignROI };
