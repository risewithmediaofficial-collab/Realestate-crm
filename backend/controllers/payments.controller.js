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

    const [payments, total, units, existingUnitPayments, existingBookingPayments] = await Promise.all([
      Payment.find(query).sort({ dueDate: 1 }).skip(skip).limit(Number(limit))
        .populate('booking', 'bookingNumber customerName customerPhone paidAmount balanceAmount totalAmount status')
        .populate('unit', 'unitNumber type tower pricing')
        .populate('project', 'name city')
        .populate('collectedBy', 'name'),
      Payment.countDocuments(query),
      Unit.find({ ...orgQuery, status: { $in: ['booked', 'registered', 'sold'] } })
        .populate('project', 'name city')
        .populate('booking', 'bookingNumber customerName customerPhone paidAmount balanceAmount totalAmount status'),
      Payment.distinct('unit', orgQuery),
      Payment.distinct('booking', orgQuery)
    ]);

    const unitHasPaymentSet = new Set((existingUnitPayments || []).filter(Boolean).map(id => id.toString()));
    const bookingHasPaymentSet = new Set((existingBookingPayments || []).filter(Boolean).map(id => id.toString()));

    const combinedList = payments.map(p => {
      const pObj = p.toObject ? p.toObject() : { ...p };
      if (!pObj.customerName && pObj.booking?.customerName) {
        pObj.customerName = pObj.booking.customerName;
      }
      if (!pObj.customerPhone && pObj.booking?.customerPhone) {
        pObj.customerPhone = pObj.booking.customerPhone;
      }
      return pObj;
    });

    // If any booked/registered unit does not yet have a formal Payment notice in the DB, synthesize its booking token / agreement demand
    units.forEach(u => {
      const uId = u._id?.toString();
      const bId = (u.booking?._id || u.booking)?.toString();
      const alreadyHas = unitHasPaymentSet.has(uId) || (bId && bookingHasPaymentSet.has(bId)) || combinedList.some(p => p.unit?._id?.toString() === uId || p.unit?.toString() === uId || (bId && (p.booking?._id?.toString() === bId || p.booking?.toString() === bId)));
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
        const synthStatus = bal === 0 ? 'paid' : (actualPaid > 0 ? 'partial' : 'pending');

        // If the query specified a status, only add if the synthesized notice matches that status
        if (status && synthStatus !== status) {
          return;
        }

        const normalizedMode = cust.paymentMode ? String(cust.paymentMode).toLowerCase() : 'neft';
        combinedList.push({
          _id: `inv-pay-${u._id}`,
          demandNumber: `DEM-${u.unitNumber || 'BK01'}`,
          milestoneName: (synthStatus === 'paid' || u.status === 'registered') ? 'Final Registration & Handover Demand' : 'Booking Advance & Milestone Demand 01',
          customerName: cust.name || bk?.customerName || 'Primary Applicant',
          customerPhone: cust.phone || bk?.customerPhone || '—',
          customerEmail: cust.email || bk?.customerEmail || '—',
          demandAmount: totalDeal,
          paidAmount: actualPaid,
          balanceAmount: bal,
          status: synthStatus,
          dueDate: new Date(Date.now() + 15 * 86400000),
          paymentMode: normalizedMode,
          unit: {
            _id: u._id,
            unitNumber: u.unitNumber,
            type: u.type || 'Plot',
            tower: u.tower || 'Phase 1'
          },
          project: u.project ? (typeof u.project === 'object' ? u.project : { name: 'Active Project', _id: u.project }) : { name: 'Active Project' },
          booking: bk ? { _id: bk._id, bookingNumber: bk.bookingNumber } : undefined,
          transactions: actualPaid > 0 ? [{
            amount: actualPaid,
            paymentMode: normalizedMode,
            paymentDate: cust.bookingDate || u.updatedAt || new Date(),
            receiptNumber: `RCP-${u.unitNumber || '001'}`,
            notes: isCleared ? 'Full payment collected & balance cleared' : 'Advance booking token collected'
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
    const reqId = req.params.id;

    if (typeof reqId === 'string' && reqId.startsWith('inv-pay-')) {
      const unitId = reqId.replace('inv-pay-', '');
      if (mongoose.Types.ObjectId.isValid(unitId)) {
        const unitQuery = { _id: unitId };
        if (!isSuperAdmin) {
          const userOrg = req.user?.organization;
          if (userOrg) unitQuery.organization = new RegExp(`^${userOrg.trim()}$`, 'i');
        }
        const u = await Unit.findOne(unitQuery)
          .populate('project')
          .populate('booking', 'bookingNumber customerName customerPhone paidAmount balanceAmount totalAmount status');
        if (u) {
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
          const synthStatus = bal === 0 ? 'paid' : (actualPaid > 0 ? 'partial' : 'pending');

          const synthesized = {
            _id: `inv-pay-${u._id}`,
            demandNumber: `DEM-${u.unitNumber || 'BK01'}`,
            milestoneName: (synthStatus === 'paid' || u.status === 'registered') ? 'Final Registration & Handover Demand' : 'Booking Advance & Milestone Demand 01',
            customerName: cust.name || bk?.customerName || 'Primary Applicant',
            customerPhone: cust.phone || bk?.customerPhone || '—',
            customerEmail: cust.email || bk?.customerEmail || '—',
            demandAmount: totalDeal,
            paidAmount: actualPaid,
            balanceAmount: bal,
            status: synthStatus,
            dueDate: new Date(Date.now() + 15 * 86400000),
            paymentMode: cust.paymentMode || 'neft',
            unit: {
              _id: u._id,
              unitNumber: u.unitNumber,
              type: u.type || 'Plot',
              tower: u.tower || 'Phase 1'
            },
            project: u.project ? (typeof u.project === 'object' ? u.project : { name: 'Active Project', _id: u.project }) : { name: 'Active Project' },
            booking: bk ? { _id: bk._id, bookingNumber: bk.bookingNumber } : undefined,
            transactions: actualPaid > 0 ? [{
              amount: actualPaid,
              paymentMode: cust.paymentMode || 'neft',
              paymentDate: cust.bookingDate || u.updatedAt || new Date(),
              receiptNumber: `RCP-${u.unitNumber || '001'}`,
              notes: isCleared ? 'Full payment collected & balance cleared' : 'Advance booking token collected'
            }] : []
          };
          return res.json({ success: true, data: synthesized });
        }
      }
    }

    if (!mongoose.Types.ObjectId.isValid(reqId)) {
      return res.status(404).json({ success: false, message: 'Payment demand not found' });
    }

    const query = { _id: reqId };
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
    if (payload.paymentMode) {
      const v = String(payload.paymentMode).toLowerCase().trim().replace(/[\s\/-]+/g, '_');
      if (['upi', 'gpay', 'phonepe', 'paytm'].some(k => v.includes(k))) payload.paymentMode = 'upi';
      else if (v.includes('neft')) payload.paymentMode = 'neft';
      else if (v.includes('rtgs')) payload.paymentMode = 'rtgs';
      else if (v.includes('imps')) payload.paymentMode = 'imps';
      else if (v.includes('cheque') || v.includes('dd')) payload.paymentMode = 'cheque';
      else if (v.includes('cash')) payload.paymentMode = 'cash';
      else if (v.includes('card')) payload.paymentMode = 'card';
      else if (v.includes('loan')) payload.paymentMode = 'loan_disbursement';
      else payload.paymentMode = 'bank_transfer';
    }
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
    const cleanMode = paymentMode ? String(paymentMode).toLowerCase() : (payment.paymentMode || 'bank_transfer');
    payment.paymentMode = cleanMode;
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
      paymentMode: cleanMode,
      transactionReference,
      bankName,
      paymentDate: paymentDate || new Date(),
      notes,
      receiptNumber: receiptNumber || `RCP-${Date.now().toString().slice(-6)}`
    });

    await payment.save();

    // Sync collected payment to Unit and Booking
    try {
      if (payment.unit) {
        const u = await Unit.findById(payment.unit);
        if (u) {
          if (!u.bookingCustomer) u.bookingCustomer = {};
          const currentTotal = u.bookingCustomer.totalPaid || u.bookingCustomer.tokenAmount || 0;
          u.bookingCustomer.totalPaid = currentTotal + addedAmt;
          u.bookingCustomer.paidAmount = u.bookingCustomer.totalPaid;
          const totalVal = u.pricing?.totalPrice || u.totalPrice || payment.demandAmount;
          u.bookingCustomer.balanceDue = Math.max(0, totalVal - u.bookingCustomer.totalPaid);
          u.bookingCustomer.balanceAmount = u.bookingCustomer.balanceDue;
          if (u.bookingCustomer.balanceDue === 0) {
            u.bookingCustomer.bookingStatus = 'cleared';
          }
          await u.save();
        }
      }

      const bookingQuery = payment.booking
        ? { _id: payment.booking }
        : (payment.unit ? { unit: payment.unit } : null);

      if (bookingQuery) {
        const bk = await Booking.findOne(bookingQuery);
        if (bk) {
          const currentBkPaid = bk.paidAmount || bk.bookingAmount || 0;
          bk.paidAmount = currentBkPaid + addedAmt;
          const totalBkVal = bk.totalAmount || payment.demandAmount;
          bk.balanceAmount = Math.max(0, totalBkVal - bk.paidAmount);
          if (bk.balanceAmount === 0 && !['registered', 'closed', 'registration_closed'].includes(bk.status)) {
            bk.status = 'ready_for_registration';
          }
          await bk.save();
        }
      }
    } catch (syncErr) {
      console.error('Error syncing payment to unit/booking:', syncErr);
    }

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

    const [payments, units] = await Promise.all([
      Payment.find(match).populate('booking', 'paidAmount balanceAmount totalAmount status').lean(),
      Unit.find({ ...match, status: { $in: ['booked', 'registered', 'sold'] } })
        .populate('booking', 'paidAmount balanceAmount totalAmount status')
        .lean()
    ]);

    let totalDemand = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;

    const paymentUnitIds = new Set();
    const paymentBookingIds = new Set();

    (payments || []).forEach(p => {
      const dem = p.demandAmount || 0;
      const paid = p.paidAmount || 0;
      const bal = p.balanceAmount != null ? p.balanceAmount : Math.max(0, dem - paid);
      totalDemand += dem;
      totalCollected += paid;
      totalOutstanding += bal;
      if (p.status === 'overdue' || (p.status !== 'paid' && p.dueDate && new Date(p.dueDate) < today)) {
        overdueCount++;
      }
      if (p.unit) paymentUnitIds.add(p.unit.toString());
      if (p.booking) paymentBookingIds.add((p.booking?._id || p.booking).toString());
    });

    (units || []).forEach(u => {
      const uId = u._id?.toString();
      const bId = (u.booking?._id || u.booking)?.toString();
      const alreadyHas = paymentUnitIds.has(uId) || (bId && paymentBookingIds.has(bId));
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
        totalDemand += totalDeal;
        totalCollected += actualPaid;
        totalOutstanding += bal;
      }
    });

    res.json({
      success: true,
      data: {
        totalDemand,
        totalCollected,
        outstanding: totalOutstanding,
        overdueCount,
        realizationRate: totalDemand > 0 ? Number(((totalCollected / totalDemand) * 100).toFixed(1)) : 0
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getPayments, getPayment, createPayment, updatePayment, deletePayment, recordPayment, getPaymentStats };
