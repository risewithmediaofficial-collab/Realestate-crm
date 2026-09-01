const express = require('express');
const router = express.Router();
const {
  getAllNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats,
} = require('../controllers/notifications.controller');
const { auth } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(auth);

// Get all notifications with optional filters
router.get('/', getAllNotifications);

// Get unread notifications only
router.get('/unread', getUnreadNotifications);

// Get notification statistics
router.get('/stats', getNotificationStats);

// Mark a single notification as read
router.put('/:id/read', markNotificationAsRead);

// Mark all notifications as read
router.put('/all/read', markAllNotificationsAsRead);

// Delete a notification
router.delete('/:id', deleteNotification);

module.exports = router;
