const express = require('express');
const router = express.Router();
const { getPayments, getPayment, createPayment, updatePayment, deletePayment, recordPayment, getPaymentStats } = require('../controllers/payments.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/stats', getPaymentStats);
router.route('/').get(getPayments).post(createPayment);
router.route('/:id').get(getPayment).put(updatePayment).delete(deletePayment);
router.put('/:id/record', recordPayment);

module.exports = router;
