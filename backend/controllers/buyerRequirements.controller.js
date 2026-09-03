const mongoose = require('mongoose');
const BuyerRequirement = require('../models/BuyerRequirement.model');
const Unit = require('../models/Unit.model');

// GET /api/buyer-requirements
const getRequirements = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 50, status, priority, category,
      search, assignedTo, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;

    const query = {};
    if (isSuperAdmin) {
      if (req.query.organization) query.organization = new RegExp(`^${req.query.organization.trim()}$`, 'i');
    } else {
      if (!userOrg) return res.json({ success: true, data: [], total: 0 });
      query.organization = new RegExp(`^${userOrg.trim()}$`, 'i');
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { preferredLocations: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    const skip = (Number(page) - 1) * Number(limit);
    const total = await BuyerRequirement.countDocuments(query);
    const items = await BuyerRequirement.find(query)
      .sort(sort).skip(skip).limit(Number(limit))
      .populate('assignedTo', 'name email avatar role')
      .populate('createdBy', 'name')
      .populate('matchedUnits', 'unitNumber tower type pricing area status');

    res.json({ success: true, data: items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// GET /api/buyer-requirements/:id
const getRequirement = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = new RegExp(`^${req.user?.organization || '__UNAUTHORIZED__'}$, 'i'`);
    }

    const item = await BuyerRequirement.findOne(query)
      .populate('assignedTo', 'name email avatar role phone')
      .populate('createdBy', 'name')
      .populate({
        path: 'matchedUnits',
        populate: { path: 'project', select: 'name city address' }
      });
    if (!item) return res.status(404).json({ success: false, message: 'Requirement not found' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
};

// POST /api/buyer-requirements
const createRequirement = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;

    if (!isSuperAdmin || !payload.organization) {
      payload.organization = userOrg;
    }
    if (!payload.organization) {
      return res.status(400).json({ success: false, message: 'Organization is required' });
    }

    if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      payload.createdBy = req.user._id;
      if (!payload.assignedTo) payload.assignedTo = req.user._id;
    }

    if (payload.assignedTo && !mongoose.Types.ObjectId.isValid(payload.assignedTo)) {
      delete payload.assignedTo;
    }

    // Auto-create initial activity log
    payload.activities = [{
      type: 'creation',
      title: 'Custom Buyer Requirement Recorded',
      description: `Inquiry recorded for ${payload.customerName} (${payload.category})`,
      performedBy: req.user?._id,
      performedAt: new Date()
    }];

    const item = await BuyerRequirement.create(payload);
    const populated = await item.populate([
      { path: 'assignedTo', select: 'name email avatar role' },
      { path: 'createdBy', select: 'name' }
    ]);

    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};

// PUT /api/buyer-requirements/:id
const updateRequirement = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = new RegExp(`^${req.user?.organization || '__UNAUTHORIZED__'}$, 'i'`);
    }

    const item = await BuyerRequirement.findOneAndUpdate(query, req.body, { new: true, runValidators: true })
      .populate('assignedTo', 'name email avatar role')
      .populate('createdBy', 'name')
      .populate('matchedUnits', 'unitNumber tower type pricing area status');

    if (!item) return res.status(404).json({ success: false, message: 'Requirement not found' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
};

// DELETE /api/buyer-requirements/:id
const deleteRequirement = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = new RegExp(`^${req.user?.organization || '__UNAUTHORIZED__'}$, 'i'`);
    }

    const item = await BuyerRequirement.findOneAndDelete(query);
    if (!item) return res.status(404).json({ success: false, message: 'Requirement not found' });
    res.json({ success: true, message: 'Requirement deleted successfully' });
  } catch (err) { next(err); }
};

// GET /api/buyer-requirements/:id/match-inventory
const matchInventory = async (req, res, next) => {
  try {
    const reqItem = await BuyerRequirement.findById(req.params.id);
    if (!reqItem) return res.status(404).json({ success: false, message: 'Requirement not found' });

    const isSuperAdmin = req.user?.role === 'super_admin';
    const orgQuery = isSuperAdmin ? {} : { organization: new RegExp(`^${req.user?.organization || '__UNAUTHORIZED__'}$, 'i'`) };

    // Query inventory matching budget, extent, or status
    const unitQuery = {
      ...orgQuery,
      status: { $in: ['available', 'blocked'] }
    };

    if (reqItem.budgetMax && reqItem.budgetMax > 0) {
      unitQuery['pricing.totalPrice'] = { $lte: reqItem.budgetMax * 1.15 }; // allow 15% negotiation headroom
    }

    const matchingUnits = await Unit.find(unitQuery)
      .limit(20)
      .populate('project', 'name city address type')
      .select('unitNumber tower block status type area pricing physicalDetails agriculturalDetails');

    res.json({ success: true, count: matchingUnits.length, data: matchingUnits });
  } catch (err) { next(err); }
};

// GET /api/buyer-requirements/stats
const getRequirementStats = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const match = isSuperAdmin
      ? (req.query.organization ? { organization: new RegExp(`^${req.query.organization.trim()}$`, 'i') } : {})
      : { organization: userOrg ? new RegExp(`^${userOrg.trim()}$`, 'i') : '__NO_ORG__' };

    const [total, hot, sourcing, shortlisted, closed, budgetAgg] = await Promise.all([
      BuyerRequirement.countDocuments(match),
      BuyerRequirement.countDocuments({ ...match, priority: 'hot' }),
      BuyerRequirement.countDocuments({ ...match, status: 'sourcing_in_progress' }),
      BuyerRequirement.countDocuments({ ...match, status: { $in: ['properties_shortlisted', 'site_visit_arranged', 'in_negotiation'] } }),
      BuyerRequirement.countDocuments({ ...match, status: 'deal_closed' }),
      BuyerRequirement.aggregate([
        ...(Object.keys(match).length ? [{ $match: match }] : []),
        {
          $group: {
            _id: null,
            totalBudgetPool: { $sum: '$budgetMax' },
            avgBudget: { $avg: '$budgetMax' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalRequirements: total,
        hotBuyers: hot,
        sourcingInProgress: sourcing,
        activeNegotiations: shortlisted,
        dealsClosed: closed,
        totalBudgetPool: budgetAgg[0]?.totalBudgetPool || 0,
        avgBudget: Math.round(budgetAgg[0]?.avgBudget || 0)
      }
    });
  } catch (err) { next(err); }
};

module.exports = {
  getRequirements,
  getRequirement,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  matchInventory,
  getRequirementStats
};
