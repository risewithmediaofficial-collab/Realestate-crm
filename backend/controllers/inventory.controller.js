const Unit = require('../models/Unit.model');

const getUnits = async (req, res, next) => {
  try {
    const { project, tower, floor, status, type, category, facing, sort } = req.query;
    const query = {};

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    if (!isSuperAdmin || req.query.organization) {
      query.organization = req.query.organization || userOrg || 'Rise With RealtyHub';
    }

    if (project) query.project = project;
    if (tower) query.tower = tower;
    if (floor) query.floor = Number(floor);
    if (status) query.status = status;
    if (type) query.type = type;
    if (category) query.category = category;
    if (facing) query.facing = new RegExp(facing, 'i');

    let sortOption = { unitNumber: 1 };
    if (sort === 'price_asc') sortOption = { 'pricing.totalPrice': 1 };
    else if (sort === 'price_desc') sortOption = { 'pricing.totalPrice': -1 };
    else if (sort === 'area_asc') sortOption = { 'area.superBuiltUp': 1 };
    else if (sort === 'area_desc') sortOption = { 'area.superBuiltUp': -1 };
    else if (sort === 'facing') sortOption = { facing: 1 };

    const units = await Unit.find(query)
      .populate('project', 'name code type')
      .populate('heldBy', 'name')
      .populate('blockedBy', 'name')
      .sort(sortOption);
    res.json({ success: true, count: units.length, data: units });
  } catch (err) { next(err); }
};

const getUnit = async (req, res, next) => {
  try {
    const unit = await Unit.findById(req.params.id)
      .populate('project', 'name code city')
      .populate('booking')
      .populate('heldBy', 'name email')
      .populate('blockedBy', 'name email');
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    res.json({ success: true, data: unit });
  } catch (err) { next(err); }
};

const createUnit = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    const userOrg = req.user?.organization || 'Rise With RealtyHub';
    if (!payload.organization) {
      payload.organization = userOrg;
    }
    if (!payload.createdBy && req.user?._id) {
      payload.createdBy = req.user._id;
    }

    if (payload.facing) {
      payload.facing = payload.facing.toLowerCase().trim();
      const validFacings = ['north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw'];
      if (!validFacings.includes(payload.facing)) payload.facing = 'east';
    }
    const unit = await Unit.create(payload);
    const populated = await unit.populate('project', 'name code city');
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};

const updateUnit = async (req, res, next) => {
  try {
    const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    res.json({ success: true, data: unit });
  } catch (err) { next(err); }
};

const updateUnitStatus = async (req, res, next) => {
  try {
    const { status, holdReason, holdExpiry, holdCustomer, bookingCustomer } = req.body;
    const update = { status };

    if (status === 'on_hold') {
      if (req.user?._id) update.heldBy = req.user._id;
      const duration = Number(holdCustomer?.durationHours || req.body.durationHours || 48);
      const expiresAt = holdExpiry ? new Date(holdExpiry) : new Date(Date.now() + duration * 3600 * 1000);
      update.holdExpiry = expiresAt;
      update.holdReason = holdReason || holdCustomer?.reason || 'Customer evaluation in progress';
      update.holdCustomer = {
        name: holdCustomer?.name || req.body.customerName || 'Prospective Buyer',
        phone: holdCustomer?.phone || req.body.customerPhone || '',
        email: holdCustomer?.email || req.body.customerEmail || '',
        durationHours: duration,
        reason: update.holdReason,
        heldAt: new Date(),
        expiresAt,
        agentName: holdCustomer?.agentName || req.user?.name || 'Sales Representative'
      };
    } else if (status === 'booked') {
      update.bookingCustomer = bookingCustomer || {
        name: req.body.customerName || 'Primary Applicant',
        phone: req.body.customerPhone || '',
        email: req.body.customerEmail || '',
        panNumber: req.body.panNumber || '',
        aadharNumber: req.body.aadharNumber || '',
        address: req.body.address || '',
        tokenAmount: Number(req.body.tokenAmount || req.body.bookingAmount || 100000),
        paymentMode: req.body.paymentMode || 'NEFT/Bank Transfer',
        transactionRef: req.body.transactionRef || `TXN-${Date.now().toString().slice(-6)}`,
        bookingDate: new Date(),
        coApplicantName: req.body.coApplicantName || '',
        coApplicantPhone: req.body.coApplicantPhone || '',
        coApplicantRelation: req.body.coApplicantRelation || ''
      };
    } else if (status === 'available') {
      update.heldBy = null;
      update.holdReason = null;
      update.holdExpiry = null;
      update.holdCustomer = null;
    } else if (status === 'blocked') {
      if (req.user?._id) update.blockedBy = req.user._id;
    }

    const unit = await Unit.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    res.json({ success: true, data: unit });
  } catch (err) { next(err); }
};

const getInventoryMatrix = async (req, res, next) => {
  try {
    const { project } = req.query;
    if (!project) return res.status(400).json({ success: false, message: 'Project is required' });
    const units = await Unit.find({ project }).sort('tower floor unitNumber').select('unitNumber tower floor status type area facing pricing');
    // Group by tower → floor
    const matrix = {};
    units.forEach(u => {
      if (!matrix[u.tower]) matrix[u.tower] = {};
      if (!matrix[u.tower][u.floor]) matrix[u.tower][u.floor] = [];
      matrix[u.tower][u.floor].push(u);
    });
    res.json({ success: true, data: matrix });
  } catch (err) { next(err); }
};

const deleteUnit = async (req, res, next) => {
  try {
    const unit = await Unit.findByIdAndDelete(req.params.id);
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    res.json({ success: true, message: 'Unit deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { getUnits, getUnit, createUnit, updateUnit, deleteUnit, updateUnitStatus, getInventoryMatrix };
