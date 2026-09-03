const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const Unit = require('../models/Unit.model');
const Project = require('../models/Project.model');
const Lead = require('../models/Lead.model');
const Booking = require('../models/Booking.model');

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
  if (statusCount.approved > 0 || statusCount.agreement_signed > 0 || statusCount.ready_for_registration > 0) return 'booking_in_progress';
  if (statusCount.pending_approval > 0) return 'booking_in_progress';
  
  return 'follow_up';
};

/**
 * Notify all Admins and assigned Telecaller/Executive in an organization
 */
const notifyAdminsAndAssigned = async (organization, assignedUserId, type, data) => {
  try {
    if (!organization) return [];
    const User = require('../models/User.model');
    const orgQuery = { organization: new RegExp(`^${organization.trim()}$`, 'i') };

    // Find all admins and sales managers
    const adminUsers = await User.find({
      ...orgQuery,
      role: { $in: ['admin', 'super_admin', 'sales_head', 'sales_manager'] },
      isActive: true
    }).select('_id');

    const recipientIds = new Set(adminUsers.map(u => u._id.toString()));
    if (assignedUserId) {
      recipientIds.add(assignedUserId.toString());
    }

    const createdList = [];
    for (const uId of recipientIds) {
      const n = await createNotification(uId, type, { ...data, organization });
      if (n) createdList.push(n);
    }
    return createdList;
  } catch (err) {
    console.error('Error in notifyAdminsAndAssigned:', err);
    return [];
  }
};

/**
 * Check and generate advance notifications for upcoming Sale Agreements and Registrations (Next 4 Days)
 */
const checkUpcomingAgreementsAndRegistrations = async (organization) => {
  try {
    const Booking = require('../models/Booking.model');
    const now = new Date();
    const fourDaysLater = new Date(now.getTime() + 4 * 86400000);
    fourDaysLater.setHours(23, 59, 59, 999);

    const query = {
      status: { $nin: ['cancelled', 'registered', 'registration_closed', 'refunded'] }
    };
    if (organization) {
      query.organization = new RegExp(`^${organization.trim()}$`, 'i');
    }

    const bookings = await Booking.find(query)
      .populate('unit', 'unitNumber type tower')
      .populate('project', 'name city')
      .populate('lead', 'name phone assignedTo')
      .populate('handledBy', 'name role')
      .populate('assignedTelecaller', 'name role');

    const alerts = [];

    for (const b of bookings) {
      const assignedPerson = b.assignedTelecaller?._id || b.handledBy?._id || b.lead?.assignedTo;
      const unitLabel = b.unit?.unitNumber || 'Plot/Unit';
      const projLabel = b.project?.name || 'Project';
      const custLabel = b.customerName || b.lead?.name || 'Client';

      // 1. Check Sale Agreement Date (within next 4 days or overdue/today)
      if (b.saleAgreementDate) {
        const agDate = new Date(b.saleAgreementDate);
        const diffMs = agDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / 86400000);

        if (diffDays >= -1 && diffDays <= 4) {
          const daysText = diffDays < 0 ? 'OVERDUE' : diffDays === 0 ? 'TODAY' : diffDays === 1 ? 'TOMORROW' : `in ${diffDays} days`;
          const title = diffDays <= 0 ? `⚠️ Sale Agreement Due Today: ${unitLabel}` : `📅 Upcoming Sale Agreement ${daysText}: ${unitLabel}`;
          const message = `Sale Agreement for ${custLabel} (${unitLabel}, ${projLabel}) is scheduled ${daysText} on ${agDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`;

          alerts.push({
            type: 'sale_agreement_upcoming',
            bookingId: b._id,
            bookingNumber: b.bookingNumber,
            customerName: custLabel,
            unitNumber: unitLabel,
            projectName: projLabel,
            scheduledDate: b.saleAgreementDate,
            daysRemaining: diffDays,
            assignedTo: b.assignedTelecaller || b.handledBy,
            title,
            message
          });

          // Check if already notified in last 18 hours
          const eighteenHoursAgo = new Date(now.getTime() - 18 * 3600000);
          const existingNotif = await Notification.findOne({
            'relatedEntity.id': b._id,
            type: 'sale_agreement_upcoming',
            createdAt: { $gte: eighteenHoursAgo }
          });

          if (!existingNotif) {
            await notifyAdminsAndAssigned(b.organization, assignedPerson, 'sale_agreement_upcoming', {
              title,
              message,
              severity: diffDays <= 1 ? 'high' : 'medium',
              relatedEntity: { type: 'booking', id: b._id, name: b.bookingNumber },
              actionUrl: `/booking`,
              actionLabel: 'View Booking',
              metadata: { bookingId: b._id, unitNumber: unitLabel, customerName: custLabel, diffDays }
            });
          }
        }
      }

      // 2. Check Registration Date (within next 4 days or overdue/today)
      if (b.registrationDate) {
        const regDate = new Date(b.registrationDate);
        const diffMs = regDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / 86400000);

        if (diffDays >= -1 && diffDays <= 4) {
          const daysText = diffDays < 0 ? 'OVERDUE' : diffDays === 0 ? 'TODAY' : diffDays === 1 ? 'TOMORROW' : `in ${diffDays} days`;
          const title = diffDays <= 0 ? `🏛️ Property Registration Due Today: ${unitLabel}` : `🏛️ Upcoming Property Registration ${daysText}: ${unitLabel}`;
          const message = `Property Registration for ${custLabel} (${unitLabel}, ${projLabel}) is scheduled ${daysText} on ${regDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at Sub-Registrar Office.`;

          alerts.push({
            type: 'registration_upcoming',
            bookingId: b._id,
            bookingNumber: b.bookingNumber,
            customerName: custLabel,
            unitNumber: unitLabel,
            projectName: projLabel,
            scheduledDate: b.registrationDate,
            daysRemaining: diffDays,
            assignedTo: b.assignedTelecaller || b.handledBy,
            title,
            message
          });

          const eighteenHoursAgo = new Date(now.getTime() - 18 * 3600000);
          const existingNotif = await Notification.findOne({
            'relatedEntity.id': b._id,
            type: 'registration_upcoming',
            createdAt: { $gte: eighteenHoursAgo }
          });

          if (!existingNotif) {
            await notifyAdminsAndAssigned(b.organization, assignedPerson, 'registration_upcoming', {
              title,
              message,
              severity: 'critical',
              relatedEntity: { type: 'booking', id: b._id, name: b.bookingNumber },
              actionUrl: `/booking`,
              actionLabel: 'View Booking',
              metadata: { bookingId: b._id, unitNumber: unitLabel, customerName: custLabel, diffDays }
            });
          }
        }
      }

      // 3. Check Ready for Registration state
      if (b.status === 'ready_for_registration' || b.isReadyForRegistration) {
        alerts.push({
          type: 'ready_for_registration',
          bookingId: b._id,
          bookingNumber: b.bookingNumber,
          customerName: custLabel,
          unitNumber: unitLabel,
          projectName: projLabel,
          readyDate: b.registrationReadyDate || b.updatedAt,
          assignedTo: b.assignedTelecaller || b.handledBy,
          title: `🏛️ Ready for Registration: ${unitLabel}`,
          message: `Unit ${unitLabel} (${custLabel}) is READY for Registration. Final clearances completed.`
        });
      }
    }

    // Also check booked Units from inventory with timeline dates
    const Unit = require('../models/Unit.model');
    const unitQuery = { status: { $in: ['booked', 'registered', 'sold'] } };
    if (organization) {
      unitQuery.organization = new RegExp(`^${organization.trim()}$`, 'i');
    }
    const bookedUnits = await Unit.find(unitQuery).populate('project', 'name');

    for (const u of bookedUnits) {
      const cust = u.bookingCustomer || {};
      const unitLabel = u.unitNumber || 'Unit';
      const custLabel = cust.name || 'Client';
      const projLabel = u.project?.name || 'Project';

      // Avoid duplicates if already alerted from Booking model
      const alreadyAlerted = alerts.some(a => a.unitNumber === unitLabel && a.customerName === custLabel);
      if (alreadyAlerted) continue;

      if (cust.saleAgreementDate) {
        const agDate = new Date(cust.saleAgreementDate);
        const diffMs = agDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / 86400000);
        if (diffDays >= -1 && diffDays <= 4) {
          const daysText = diffDays < 0 ? 'OVERDUE' : diffDays === 0 ? 'TODAY' : diffDays === 1 ? 'TOMORROW' : `in ${diffDays} days`;
          alerts.push({
            type: 'sale_agreement_upcoming',
            bookingId: `inv-${u._id}`,
            bookingNumber: `BK-${u.unitNumber}`,
            customerName: custLabel,
            unitNumber: unitLabel,
            projectName: projLabel,
            scheduledDate: cust.saleAgreementDate,
            daysRemaining: diffDays,
            title: diffDays <= 0 ? `⚠️ Sale Agreement Due Today: ${unitLabel}` : `📅 Upcoming Sale Agreement ${daysText}: ${unitLabel}`,
            message: `Sale Agreement for ${custLabel} (${unitLabel}) is scheduled ${daysText}.`
          });
        }
      }

      if (cust.registrationDate) {
        const regDate = new Date(cust.registrationDate);
        const diffMs = regDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / 86400000);
        if (diffDays >= -1 && diffDays <= 4) {
          const daysText = diffDays < 0 ? 'OVERDUE' : diffDays === 0 ? 'TODAY' : diffDays === 1 ? 'TOMORROW' : `in ${diffDays} days`;
          alerts.push({
            type: 'registration_upcoming',
            bookingId: `inv-${u._id}`,
            bookingNumber: `BK-${u.unitNumber}`,
            customerName: custLabel,
            unitNumber: unitLabel,
            projectName: projLabel,
            scheduledDate: cust.registrationDate,
            daysRemaining: diffDays,
            title: diffDays <= 0 ? `🏛️ Property Registration Due Today: ${unitLabel}` : `🏛️ Upcoming Property Registration ${daysText}: ${unitLabel}`,
            message: `Property Registration for ${custLabel} (${unitLabel}) is scheduled ${daysText}.`
          });
        }
      }

      if (cust.bookingStatus === 'ready_for_registration' || cust.isReadyForRegistration) {
        alerts.push({
          type: 'ready_for_registration',
          bookingId: `inv-${u._id}`,
          bookingNumber: `BK-${u.unitNumber}`,
          customerName: custLabel,
          unitNumber: unitLabel,
          projectName: projLabel,
          readyDate: cust.registrationReadyDate || u.updatedAt,
          title: `🏛️ Ready for Registration: ${unitLabel}`,
          message: `Unit ${unitLabel} (${custLabel}) is READY for Registration.`
        });
      }
    }

    return alerts;
  } catch (err) {
    console.error('Error checking upcoming reminders:', err);
    return [];
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  getUnreadCount,
  calculateLeadStage,
  notifyAdminsAndAssigned,
  checkUpcomingAgreementsAndRegistrations,
};
