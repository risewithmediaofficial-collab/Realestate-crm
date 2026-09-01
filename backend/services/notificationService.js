const Notification = require('../models/Notification.model');

/**
 * Create a notification for a user
 * @param {String} userId - User ID to notify
 * @param {String} type - Notification type
 * @param {Object} data - Notification data { title, message, organization, ... }
 */
const createNotification = async (userId, type, data) => {
  try {
    if (!userId || !type || !data.organization) {
      console.warn('Missing required fields for notification:', { userId, type, org: data.organization });
      return null;
    }

    const notification = await Notification.create({
      userId,
      type,
      title: data.title,
      message: data.message,
      description: data.description,
      relatedEntity: data.relatedEntity || {},
      severity: data.severity || 'medium',
      actionUrl: data.actionUrl,
      actionLabel: data.actionLabel,
      metadata: data.metadata,
      organization: data.organization,
    });
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

/**
 * Get notifications for a user
 * @param {String} userId - User ID
 * @param {String} organization - Organization
 * @param {Object} query - Query filters { isRead, limit, offset, ... }
 */
const getNotifications = async (userId, organization, query = {}) => {
  try {
    const { isRead, limit = 20, offset = 0 } = query;
    const filter = { userId, organization };
    
    if (isRead !== undefined) {
      filter.isRead = isRead;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort('-createdAt')
        .limit(Number(limit))
        .skip(Number(offset))
        .populate('relatedEntity.id', 'name bookingNumber customerName'),
      Notification.countDocuments(filter),
    ]);

    return { notifications, total };
  } catch (err) {
    console.error('Error getting notifications:', err);
    throw err;
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId) => {
  return Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true, readAt: new Date() },
    { new: true }
  );
};

/**
 * Get unread notification count for a user
 */
const getUnreadCount = async (userId, organization) => {
  return Notification.countDocuments({
    userId,
    organization,
    isRead: false,
  });
};

/**
 * Calculate lead stage based on all its active bookings
 */
const calculateLeadStage = (bookings) => {
  if (!bookings || bookings.length === 0) return 'follow_up';

  // Count bookings by status
  const statusCount = {
    pending_approval: 0,
    approved: 0,
    agreement_signed: 0,
    registered: 0,
    cancelled: 0,
  };

  bookings.forEach(b => {
    statusCount[b.status] = (statusCount[b.status] || 0) + 1;
  });

  // Priority logic:
  // If any booking is in approval flow -> booking_in_progress
  // If all bookings are cancelled -> follow_up
  // If at least one is approved/signed -> booking_in_progress
  // If at least one is registered -> booked
  
  if (statusCount.registered > 0) return 'booked';
  if (statusCount.approved > 0 || statusCount.agreement_signed > 0) return 'booking_in_progress';
  if (statusCount.pending_approval > 0) return 'booking_in_progress';
  
  return 'follow_up';
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  getUnreadCount,
  calculateLeadStage,
};
