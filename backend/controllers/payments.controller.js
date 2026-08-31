const Payment = require('../models/Payment.model');

const getPayments = async (req, res, next) => {
  try {
    const { status, booking, project, page = 1, limit = 20 } = req.query;
    const query = {};

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    if (!isSuperAdmin || req.query.organization) {
      query.organization = req.query.organization || userOrg || 'Rise With RealtyHub';
    }

    if (status) query.status = status;
    if (booking) query.booking = booking;
    if (project) query.project = project;
    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(query).sort({ dueDate: 1 }).skip(skip).limit(Number(limit))
        .populate('booking', 'bookingNumber customerName')
        .populate('unit', 'unitNumber type tower')
        .populate('project', 'name city')
        .populate('collectedBy', 'name'),
      Payment.countDocuments(query),
    ]);
    res.json({ success: true, data: payments, total });
  } catch (err) { next(err); }
};

const getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('booking').populate('unit').populate('project').populate('lead').populate('collectedBy', 'name');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
};

const mongoose = require('mongoose');
const createPayment = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    const userOrg = req.user?.organization || 'Rise With RealtyHub';
    if (!payload.organization) {
      payload.organization = userOrg;
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
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('booking').populate('unit').populate('project');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment demand not found' });
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
};

const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment demand not found' });
    res.json({ success: true, message: 'Payment demand deleted successfully' });
  } catch (err) { next(err); }
};

const recordPayment = async (req, res, next) => {
  try {
    const { paidAmount, paymentMode, transactionReference, bankName, paymentDate, notes, receiptNumber } = req.body;
    const payment = await Payment.findById(req.params.id);
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
    const [totalDemand, totalCollected, outstanding, overdue] = await Promise.all([
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$demandAmount' } } }]),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
      Payment.aggregate([{ $match: { status: { $in: ['pending', 'partial'] } } }, { $group: { _id: null, total: { $sum: '$balanceAmount' } } }]),
      Payment.countDocuments({ status: { $in: ['pending', 'partial'] }, dueDate: { $lt: today } }),
    ]);
    res.json({
      success: true,
      data: {
        totalDemand: totalDemand[0]?.total || 0,
        totalCollected: totalCollected[0]?.total || 0,
        outstanding: outstanding[0]?.total || 0,
        overdueCount: overdue,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getPayments, getPayment, createPayment, updatePayment, deletePayment, recordPayment, getPaymentStats };
