const Notification = require('../models/Notification.model');
const { getNotifications, markAsRead, getUnreadCount } = require('../services/notificationService');

const getAllNotifications = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const userId = req.user?._id;

    if (!userId || !userOrg) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { isRead, limit = 20, offset = 0 } = req.query;
    const query = { 
      userId: userId,
      organization: userOrg,
    };

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort('-createdAt')
        .limit(Number(limit))
        .skip(Number(offset))
        .populate('relatedEntity.id', 'bookingNumber customerName name'),
      Notification.countDocuments(query),
    ]);

    res.json({ 
      success: true, 
      data: notifications,
      total,
      unread: notifications.filter(n => !n.isRead).length,
    });
  } catch (err) { 
    next(err); 
  }
};

const getUnreadNotifications = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const userOrg = req.user?.organization;

    if (!userId || !userOrg) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const notifications = await Notification.find({
      userId: userId,
      organization: userOrg,
      isRead: false,
    })
      .sort('-createdAt')
      .limit(10)
      .populate('relatedEntity.id', 'bookingNumber customerName name');

    const unreadCount = await getUnreadCount(userId, userOrg);

    res.json({ 
      success: true, 
      data: notifications,
      unreadCount,
    });
  } catch (err) { 
    next(err); 
  }
};

const markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userOrg = req.user?.organization;

    const notification = await Notification.findOne({
      _id: id,
      userId: userId,
      organization: userOrg,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ success: true, data: notification });
  } catch (err) { 
    next(err); 
  }
};

const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const userOrg = req.user?.organization;

    if (!userId || !userOrg) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await Notification.updateMany(
      { userId: userId, organization: userOrg, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { 
    next(err); 
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userOrg = req.user?.organization;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: userId,
      organization: userOrg,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) { 
    next(err); 
  }
};

const getNotificationStats = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const userOrg = req.user?.organization;

    if (!userId || !userOrg) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const [unreadCount, totalCount, criticalCount] = await Promise.all([
      Notification.countDocuments({ userId, organization: userOrg, isRead: false }),
      Notification.countDocuments({ userId, organization: userOrg }),
      Notification.countDocuments({ userId, organization: userOrg, severity: 'critical', isRead: false }),
    ]);

    res.json({
      success: true,
      data: {
        unreadCount,
        totalCount,
        criticalCount,
      },
    });
  } catch (err) { 
    next(err); 
  }
};

module.exports = {
  getAllNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats,
};
