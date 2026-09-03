const express = require('express');
const router = express.Router();
const {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  approveBooking,
  cancelBooking,
  deleteBooking,
  getBookingStats,
  markReadyForRegistration,
  getUpcomingReminders
} = require('../controllers/booking.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/stats', getBookingStats);
router.get('/upcoming-reminders', getUpcomingReminders);
router.get('/reminders', getUpcomingReminders);
router.put('/:id/ready-for-registration', markReadyForRegistration);
router.put('/:id/approve', approveBooking);
router.put('/:id/cancel', cancelBooking);
router.route('/').get(getBookings).post(createBooking);
router.route('/:id').get(getBooking).put(updateBooking).delete(deleteBooking);

module.exports = router;
