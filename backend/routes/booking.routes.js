const express = require('express');
const router = express.Router();
const { getBookings, getBooking, createBooking, updateBooking, approveBooking, cancelBooking, deleteBooking, getBookingStats } = require('../controllers/booking.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/stats', getBookingStats);
router.route('/').get(getBookings).post(createBooking);
router.route('/:id').get(getBooking).put(updateBooking).delete(deleteBooking);
router.put('/:id/approve', approveBooking);
router.put('/:id/cancel', cancelBooking);

module.exports = router;
