const Unit = require('../models/Unit.model');

// Area unit factors to canonical Sq.Ft
const AREA_FACTORS = {
  sqft: 1,
  sqyard: 9,
  acre: 43560,
  guntha: 1089,
  cent: 435.6,
  ground: 2400,
  bigha: 27225
};

const calculateCanonicalSqFt = (extent, unit, customFactor = 1) => {
  const num = parseFloat(extent) || 0;
  if (num <= 0) return 0;
  if (unit === 'custom') return Math.round(num * (parseFloat(customFactor) || 1));
  const factor = AREA_FACTORS[unit?.toLowerCase()] || 1;
  return Math.round(num * factor * 100) / 100;
};

const calculateTotalPrice = (baseRate, rateType, extent, unit, totalSqFt, dev = 0, reg = 0, other = 0) => {
  const rate = parseFloat(baseRate) || 0;
  const devCharges = parseFloat(dev) || 0;
  const regCharges = parseFloat(reg) || 0;
  const otherCharges = parseFloat(other) || 0;
  const numExtent = parseFloat(extent) || 0;
  const numSqFt = parseFloat(totalSqFt) || 0;

  let baseAmount = 0;
  if (rateType === 'fixed') {
    baseAmount = rate;
  } else if (rateType === 'per_acre') {
    const acres = unit === 'acre' ? numExtent : (numSqFt / 43560);
    baseAmount = rate * acres;
  } else if (rateType === 'per_guntha') {
    const gunthas = unit === 'guntha' ? numExtent : (numSqFt / 1089);
    baseAmount = rate * gunthas;
  } else if (rateType === 'per_cent') {
    const cents = unit === 'cent' ? numExtent : (numSqFt / 435.6);
    baseAmount = rate * cents;
  } else if (rateType === 'per_sqyard') {
    const sqyards = unit === 'sqyard' ? numExtent : (numSqFt / 9);
    baseAmount = rate * sqyards;
  } else if (rateType === 'per_ground') {
    const grounds = unit === 'ground' ? numExtent : (numSqFt / 2400);
    baseAmount = rate * grounds;
  } else if (rateType === 'per_bigha') {
    const bighas = unit === 'bigha' ? numExtent : (numSqFt / 27225);
    baseAmount = rate * bighas;
  } else {
    // default per_sqft
    baseAmount = rate * numSqFt;
  }

  return Math.round(baseAmount + devCharges + regCharges + otherCharges);
};

const getUnits = async (req, res, next) => {
  try {
    const { project, tower, block, floor, status, type, category, propertyType, facing, search, sort } = req.query;
    const query = {};

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    if (isSuperAdmin) {
      if (req.query.organization) query.organization = { $regex: new RegExp(`^${req.query.organization.trim()}$`, 'i') };
    } else {
      if (!userOrg) return res.json({ success: true, count: 0, data: [] });
      query.organization = { $regex: new RegExp(`^${userOrg.trim()}$`, 'i') };
    }

    if (project) query.project = project;
    if (tower) query.tower = tower;
    if (block) query.block = { $regex: block, $options: 'i' };
    if (floor) query.floor = Number(floor);
    if (status) query.status = status;
    if (type) query.type = type;
    if (category) query.category = category;
    if (propertyType) query.propertyType = propertyType;
    if (facing) query.facing = new RegExp(facing, 'i');
    if (search) {
      query.$or = [
        { unitNumber: { $regex: search, $options: 'i' } },
        { block: { $regex: search, $options: 'i' } },
        { tower: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { 'agriculturalDetails.plantation': { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = { unitNumber: 1 };
    if (sort === 'price_asc') sortOption = { 'pricing.totalPrice': 1 };
    else if (sort === 'price_desc') sortOption = { 'pricing.totalPrice': -1 };
    else if (sort === 'area_asc') sortOption = { 'area.sqft': 1, 'area.superBuiltUp': 1 };
    else if (sort === 'area_desc') sortOption = { 'area.sqft': -1, 'area.superBuiltUp': -1 };
    else if (sort === 'facing') sortOption = { facing: 1 };
    else if (sort === 'created_desc') sortOption = { createdAt: -1 };

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
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      const userOrg = req.user?.organization;
      if (!userOrg) return res.status(404).json({ success: false, message: 'Unit not found' });
      query.organization = { $regex: new RegExp(`^${userOrg.trim()}$`, 'i') };
    }

    const unit = await Unit.findOne(query)
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
    const isSuperAdmin = req.user?.role === 'super_admin';
    const payload = { ...req.body };
    const userOrg = req.user?.organization;
    if (!isSuperAdmin || !payload.organization) {
      payload.organization = userOrg;
    }
    if (!payload.organization) {
      return res.status(400).json({ success: false, message: 'User organization is required to create a unit' });
    }
    if (!payload.createdBy && req.user?._id) {
      payload.createdBy = req.user._id;
    }

    if (!payload.unitNumber || !payload.unitNumber.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Plot / Unit Number is required.' });
    }
    payload.unitNumber = payload.unitNumber.toString().trim();

    // Check duplicate unitNumber within the same project & block/tower
    const existingUnit = await Unit.findOne({
      project: payload.project,
      unitNumber: payload.unitNumber,
      organization: { $regex: new RegExp(`^${payload.organization.trim()}$`, 'i') },
      ...(payload.block ? { block: payload.block } : {})
    });
    if (existingUnit) {
      return res.status(400).json({
        success: false,
        message: `Inventory "${payload.unitNumber}" already exists in this project${payload.block ? ' in ' + payload.block : ''}.`
      });
    }

    // Standardize Area & Canonical Sq.Ft
    if (payload.area) {
      if (payload.area.extent && payload.area.unit) {
        payload.area.sqft = calculateCanonicalSqFt(payload.area.extent, payload.area.unit, payload.area.customSqFtPerUnit);
      } else if (payload.area.superBuiltUp || payload.area.plotArea) {
        payload.area.sqft = payload.area.superBuiltUp || payload.area.plotArea || 0;
      }
    }

    // Standardize Pricing & Package Price
    if (payload.pricing) {
      const calculatedTotal = calculateTotalPrice(
        payload.pricing.baseRate || payload.pricing.basePrice,
        payload.pricing.rateType || 'per_sqft',
        payload.area?.extent || 0,
        payload.area?.unit || 'sqft',
        payload.area?.sqft || 0,
        payload.pricing.developmentCharges || 0,
        payload.pricing.registrationCharges || 0,
        payload.pricing.otherCharges || 0
      );

      if (!payload.pricing.totalPrice && !payload.pricing.totalPackagePrice) {
        payload.pricing.totalPrice = calculatedTotal;
        payload.pricing.totalPackagePrice = calculatedTotal;
      } else {
        payload.pricing.totalPackagePrice = payload.pricing.totalPackagePrice || payload.pricing.totalPrice || calculatedTotal;
        payload.pricing.totalPrice = payload.pricing.totalPrice || payload.pricing.totalPackagePrice || calculatedTotal;
      }
    }

    if (payload.facing) {
      payload.facing = payload.facing.toLowerCase().trim();
    }

    const unit = await Unit.create(payload);
    const populated = await unit.populate('project', 'name code city');
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};

const updateUnit = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      const userOrg = req.user?.organization;
      if (!userOrg) return res.status(404).json({ success: false, message: 'Unit not found' });
      query.organization = { $regex: new RegExp(`^${userOrg.trim()}$`, 'i') };
    }

    const payload = { ...req.body };
    // Standardize Area & Canonical Sq.Ft if updated
    if (payload.area) {
      if (payload.area.extent && payload.area.unit) {
        payload.area.sqft = calculateCanonicalSqFt(payload.area.extent, payload.area.unit, payload.area.customSqFtPerUnit);
      }
    }

    if (payload.pricing) {
      const calculatedTotal = calculateTotalPrice(
        payload.pricing.baseRate || payload.pricing.basePrice,
        payload.pricing.rateType || 'per_sqft',
        payload.area?.extent || 0,
        payload.area?.unit || 'sqft',
        payload.area?.sqft || 0,
        payload.pricing.developmentCharges || 0,
        payload.pricing.registrationCharges || 0,
        payload.pricing.otherCharges || 0
      );
      payload.pricing.totalPackagePrice = payload.pricing.totalPackagePrice || payload.pricing.totalPrice || calculatedTotal;
      payload.pricing.totalPrice = payload.pricing.totalPrice || payload.pricing.totalPackagePrice || calculatedTotal;
    }

    const unit = await Unit.findOneAndUpdate(query, payload, { new: true, runValidators: true });
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    res.json({ success: true, data: unit });
  } catch (err) { next(err); }
};

const updateUnitStatus = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      const userOrg = req.user?.organization;
      if (!userOrg) return res.status(404).json({ success: false, message: 'Unit not found' });
      query.organization = { $regex: new RegExp(`^${userOrg.trim()}$`, 'i') };
    }

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

    const unit = await Unit.findOneAndUpdate(query, update, { new: true });
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    res.json({ success: true, data: unit });
  } catch (err) { next(err); }
};

const getInventoryMatrix = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const project = req.params.project || req.query.project;

    const query = {};
    if (project) {
      query.project = project;
    }
    if (isSuperAdmin) {
      if (req.query.organization) query.organization = { $regex: new RegExp(`^${req.query.organization.trim()}$`, 'i') };
    } else {
      if (!userOrg) return res.json({ success: true, data: {} });
      query.organization = { $regex: new RegExp(`^${userOrg.trim()}$`, 'i') };
    }

    const units = await Unit.find(query).sort('tower floor unitNumber').select('unitNumber tower block floor status type area facing pricing propertyType physicalDetails agriculturalDetails project').populate('project', 'name');
    // Group by tower / block → floor
    const matrix = {};
    units.forEach(u => {
      const section = u.block || u.tower || (u.project?.name || 'Main');
      if (!matrix[section]) matrix[section] = {};
      const floorKey = u.floor || 1;
      if (!matrix[section][floorKey]) matrix[section][floorKey] = [];
      matrix[section][floorKey].push(u);
    });
    res.json({ success: true, data: matrix });
  } catch (err) { next(err); }
};

const deleteUnit = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      const userOrg = req.user?.organization;
      if (!userOrg) return res.status(404).json({ success: false, message: 'Unit not found' });
      query.organization = { $regex: new RegExp(`^${userOrg.trim()}$`, 'i') };
    }

    const unit = await Unit.findOneAndDelete(query);
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    res.json({ success: true, message: 'Unit deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { getUnits, getUnit, createUnit, updateUnit, deleteUnit, updateUnitStatus, getInventoryMatrix };
