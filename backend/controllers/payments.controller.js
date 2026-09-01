const mongoose = require('mongoose');
const Payment = require('../models/Payment.model');
const Unit = require('../models/Unit.model');
const Booking = require('../models/Booking.model');

const getPayments = async (req, res, next) => {
  try {
    const { status, booking, project, page = 1, limit = 20 } = req.query;
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const orgQuery = isSuperAdmin
      ? (req.query.organization ? { organization: new RegExp(`^${req.query.organization}$`, 'i') } : {})
      : { organization: userOrg ? new RegExp(`^${userOrg}$`, 'i') : '__NO_ORG__' };

    const query = { ...orgQuery };
    if (status) query.status = status;
    if (booking) query.booking = booking;
    if (project) query.project = project;
    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total, units] = await Promise.all([
      Payment.find(query).sort({ dueDate: 1 }).skip(skip).limit(Number(limit))
        .populate('booking', 'bookingNumber customerName customerPhone')
        .populate('unit', 'unitNumber type tower pricing')
        .populate('project', 'name city')
        .populate('collectedBy', 'name'),
      Payment.countDocuments(query),
      Unit.find({ ...orgQuery, status: { $in: ['booked', 'registered', 'sold'] } })
        .populate('project', 'name city')
    ]);

    const combinedList = [...payments];

    // If any booked/registered unit does not yet have a formal Payment notice, synthesize its booking token / agreement demand
    units.forEach(u => {
      const alreadyHas = combinedList.some(p => p.unit?._id?.toString() === u._id?.toString() || p.unit?.toString() === u._id?.toString());
      if (!alreadyHas && (u.bookingCustomer?.name || u.booking)) {
        const cust = u.bookingCustomer || {};
        const totalDeal = u.pricing?.totalPrice || u.totalPrice || 0;
        const tokenPaid = cust.tokenAmount || 0;
        const bal = Math.max(0, totalDeal - tokenPaid);
        combinedList.push({
          _id: `inv-pay-${u._id}`,
          demandNumber: `DEM-${u.unitNumber || 'BK01'}`,
          milestoneName: u.status === 'registered' ? 'Final Registration & Handover Demand' : 'Booking Advance & Milestone Demand 01',
          customerName: cust.name || 'Primary Applicant',
          customerPhone: cust.phone || '—',
          customerEmail: cust.email || '—',
          demandAmount: totalDeal,
          paidAmount: tokenPaid,
          balanceAmount: bal,
          status: bal === 0 ? 'paid' : (tokenPaid > 0 ? 'partial' : 'pending'),
          dueDate: new Date(Date.now() + 15 * 86400000),
          paymentMode: cust.paymentMode || 'neft',
          unit: {
            _id: u._id,
            unitNumber: u.unitNumber,
            type: u.type || 'Plot',
            tower: u.tower || 'Phase 1'
          },
          project: u.project ? (typeof u.project === 'object' ? u.project : { name: 'Active Project', _id: u.project }) : { name: 'Active Project' },
          transactions: tokenPaid > 0 ? [{
            amount: tokenPaid,
            paymentMode: cust.paymentMode || 'neft',
            paymentDate: cust.bookingDate || u.updatedAt || new Date(),
            receiptNumber: `RCP-${u.unitNumber || '001'}`,
            notes: 'Advance booking token collected'
          }] : []
        });
      }
    });

    res.json({ success: true, data: combinedList, total: Math.max(total, combinedList.length) });
  } catch (err) { next(err); }
};

const getPayment = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const payment = await Payment.findOne(query)
      .populate('booking').populate('unit').populate('project').populate('lead').populate('collectedBy', 'name');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
};

const createPayment = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const payload = { ...req.body };
    const userOrg = req.user?.organization;
    if (!isSuperAdmin || !payload.organization) {
      payload.organization = userOrg;
    }
    if (!payload.organization) {
      return res.status(400).json({ success: false, message: 'User organization is required to create a payment' });
    }
    if (!payload.createdBy && req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      payload.createdBy = req.user._id;
    }

    if (!payload.demandNumber || payload.demandNumber.trim() === '') {
      payload.demandNumber = `DEM-${Date.now().toString().slice(-6)}`;
    }
    const dAmt = Number(payload.demandAmount) || 0;
    const pAmt = Number(payload.paidAmount) || 0;
    payload.demandAmount = dAmt;
    payload.paidAmount = pAmt;
    if (payload.balanceAmount === undefined) {
      payload.balanceAmount = Math.max(0, dAmt - pAmt);
    }
    if (payload.booking && !mongoose.Types.ObjectId.isValid(payload.booking)) delete payload.booking;
    if (payload.lead && !mongoose.Types.ObjectId.isValid(payload.lead)) delete payload.lead;
    if (payload.project && !mongoose.Types.ObjectId.isValid(payload.project)) delete payload.project;
    if (payload.unit && !mongoose.Types.ObjectId.isValid(payload.unit)) delete payload.unit;
    const payment = await Payment.create(payload);
    const populated = await payment.populate([
      { path: 'booking', select: 'bookingNumber customerName customerPhone' },
      { path: 'project', select: 'name city' },
      { path: 'unit', select: 'unitNumber type tower' }
    ]);
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};

const updatePayment = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const payment = await Payment.findOneAndUpdate(query, req.body, { new: true, runValidators: true })
      .populate('booking').populate('unit').populate('project');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment demand not found' });
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
};

const deletePayment = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const payment = await Payment.findOneAndDelete(query);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment demand not found' });
    res.json({ success: true, message: 'Payment demand deleted successfully' });
  } catch (err) { next(err); }
};

const recordPayment = async (req, res, next) => {
  try {
    const { paidAmount, paymentMode, transactionReference, bankName, paymentDate, notes, receiptNumber } = req.body;
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const payment = await Payment.findOne(query);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    const addedAmt = Number(paidAmount) || 0;
    payment.paidAmount = (payment.paidAmount || 0) + addedAmt;
    payment.paymentMode = paymentMode || payment.paymentMode || 'bank_transfer';
    payment.transactionReference = transactionReference || payment.transactionReference;
    payment.bankName = bankName || payment.bankName;
    payment.paymentDate = paymentDate || new Date();
    payment.notes = notes || payment.notes;
    if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      payment.collectedBy = req.user._id;
    }
    payment.balanceAmount = Math.max(0, payment.demandAmount - payment.paidAmount);
    payment.status = payment.balanceAmount === 0 ? 'paid' : 'partial';

    // Add to transaction log
    if (!payment.transactions) payment.transactions = [];
    payment.transactions.push({
      amount: addedAmt,
      paymentMode: paymentMode || 'bank_transfer',
      transactionReference,
      bankName,
      paymentDate: paymentDate || new Date(),
      notes,
      receiptNumber: receiptNumber || `RCP-${Date.now().toString().slice(-6)}`
    });

    await payment.save();
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
};

const getPaymentStats = async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const match = isSuperAdmin
      ? (req.query.organization ? { organization: new RegExp(`^${req.query.organization}$`, 'i') } : {})
      : { organization: userOrg ? new RegExp(`^${userOrg}$`, 'i') : '__NO_ORG__' };

    const [totalDemand, totalCollected, outstanding, overdue, unitAgg] = await Promise.all([
      Payment.aggregate([
        ...(Object.keys(match).length ? [{ $match: match }] : []),
        { $group: { _id: null, total: { $sum: '$demandAmount' } } }
      ]),
      Payment.aggregate([
        ...(Object.keys(match).length ? [{ $match: match }] : []),
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
      ]),
      Payment.aggregate([
        { $match: { ...match, status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$balanceAmount' } } }
      ]),
      Payment.countDocuments({ ...match, status: { $in: ['pending', 'partial'] }, dueDate: { $lt: today } }),
      Unit.aggregate([
        ...(Object.keys(match).length ? [{ $match: { ...match, status: { $in: ['booked', 'registered', 'sold'] } } }] : [{ $match: { status: { $in: ['booked', 'registered', 'sold'] } } }]),
        {
          $group: {
            _id: null,
            totalValue: { $sum: '$pricing.totalPrice' },
            tokenCollected: { $sum: '$bookingCustomer.tokenAmount' }
          }
        }
      ])
    ]);

    const unitVal = unitAgg[0]?.totalValue || 0;
    const unitToken = unitAgg[0]?.tokenCollected || 0;

    const dem = Math.max(totalDemand[0]?.total || 0, unitVal);
    const col = Math.max(totalCollected[0]?.total || 0, unitToken);
    const bal = Math.max(0, dem - col);

    res.json({
      success: true,
      data: {
        totalDemand: dem,
        totalCollected: col,
        outstanding: bal,
        overdueCount: overdue,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getPayments, getPayment, createPayment, updatePayment, deletePayment, recordPayment, getPaymentStats };
