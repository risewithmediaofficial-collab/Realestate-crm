# Multiple Plots Booking & Notification System - Implementation Guide

## Overview
Fixed the interconnected multiple plots booking issue where a customer/lead can now book multiple plots independently without interfering with each other. Added a comprehensive notification/alert system in the sidebar to track booking status changes.

---

## Key Issues Fixed

### 1. **Interconnected Booking Problem**
**Issue**: When a lead had multiple active bookings, the system would:
- Overwrite lead stage based on a single booking
- Cancel one booking would reset ALL bookings to 'follow_up'
- Prevent independent tracking of multiple plot bookings

**Solution**:
- Added `activeBookings` array to Lead model to track all bookings independently
- Modified booking controller to calculate lead stage based on ALL active bookings
- Each booking status change only updates that specific booking, not all bookings

---

## Backend Changes

### 1. **Notification Model** (`/backend/models/Notification.model.js`)
```javascript
// New model created to store user notifications
- userId: Reference to User
- type: booking_created, booking_approved, booking_cancelled, booking_status_changed, etc.
- title, message, description: Notification content
- relatedEntity: Link to booking/lead/payment
- severity: low, medium, high, critical
- isRead: Track read status
- actionUrl: Link to related entity
- metadata: Additional context data
```

### 2. **Lead Model Updates** (`/backend/models/Lead.model.js`)
```javascript
// New fields added to Track multiple bookings:

interestedUnits: [{           // Array of units customer is interested in
  unit: ObjectId ref('Unit'),
  addedAt: Date,
  notes: String
}]

activeBookings: [{            // Track all active bookings per lead
  booking: ObjectId ref('Booking'),
  unit: ObjectId ref('Unit'),
  status: String,
  createdAt: Date
}]
```

### 3. **Notification Service** (`/backend/services/notificationService.js`)
```javascript
// Key Functions:
- createNotification(): Create new notification for user
- getNotifications(): Fetch user notifications with filters
- markAsRead(): Mark notification as read
- getUnreadCount(): Get count of unread notifications
- calculateLeadStage(): Calculate lead stage based on ALL active bookings

// calcul ateLeadStage Logic:
  - If any booking is registered → 'booked'
  - If any booking is approved/agreement_signed → 'booking_in_progress'
  - If any booking is pending → 'booking_in_progress'
  - Otherwise → 'follow_up'
```

### 4. **Booking Controller Updates** (`/backend/controllers/booking.controller.js`)

#### createBooking()
```javascript
// Changes:
- Add booking to lead's activeBookings array (not overwriting)
- Add unit to interestedUnits if not exists
- Calculate lead stage based on ALL active bookings
- Send notification to assigned user about new booking
```

#### updateBooking()
```javascript
// Changes:
- Update specific booking in activeBookings array
- Recalculate lead stage from all active bookings
- Send status change notification
- Only affect the current booking's unit, not others
```

#### approveBooking()
```javascript
// Changes:
- Update booking in activeBookings array to 'approved'
- Recalculate lead stage
- Send approval notification
```

#### cancelBooking()
```javascript
// Changes:
- Mark booking as 'cancelled' in activeBookings array
- Only change lead to 'qualified' if NO active bookings remain
- Send cancellation notification
```

### 5. **Notification Controller** (`/backend/controllers/notifications.controller.js`)
```javascript
Endpoints:
- GET /api/notifications - Get all notifications
- GET /api/notifications/unread - Get only unread
- GET /api/notifications/stats - Get notification stats
- PUT /api/notifications/:id/read - Mark single as read
- PUT /api/notifications/all/read - Mark all as read
- DELETE /api/notifications/:id - Delete notification
```

### 6. **Notification Routes** (`/backend/routes/notifications.routes.js`)
- Registered at `/api/notifications`
- All routes protected with auth middleware
- Supports filtering and pagination

### 7. **Backend Index Update** (`/backend/index.js`)
```javascript
// Added:
- Notification routes import
- Route registration at /api/notifications
```

---

## Frontend Changes

### 1. **Notification Center Component** (`/frontend/src/components/notifications/NotificationCenter.jsx`)
```javascript
Features:
- Slide-out notification panel from right sidebar
- Shows all/unread notifications with filter tabs
- Mark single/all as read functionality
- Delete notifications
- Quick action links to related entities
- Severity indicators (critical, high, medium, low)
- Type-based icons for different notification types
- Unread count badge
- Auto-refresh from API
```

### 2. **Notification Styles** (`/frontend/src/styles/notifications.css`)
```css
- Responsive slide-out panel (420px width, 100% on mobile)
- Smooth animations and transitions
- Severity color coding
- Dark mode compatible
- Scrollbar styling
- Custom notification item styling
- Action button states
```

### 3. **Sidebar Updates** (`/frontend/src/components/layout/Sidebar.jsx`)
```javascript
Changes:
- Added Bell icon import from lucide-react
- Imported NotificationCenter component
- Added notification toggle button in sidebar header
- Added state for notification panel open/close
- Passed userId and callbacks to NotificationCenter
```

---

## Booking Flow Example

### Scenario: Customer wants to book 2 plots

1. **First Booking Created**
   ```
   Lead Stage: new → booking_in_progress
   activeBookings: [{ booking: BK001, unit: Plot-A, status: pending_approval }]
   interestedUnits: [{ unit: Plot-A }]
   Notification: "New Booking Created" sent to assigned user
   ```

2. **Second Booking Created (Independent)**
   ```
   Lead Stage: booking_in_progress (STAYS SAME)
   activeBookings: [
     { booking: BK001, unit: Plot-A, status: pending_approval },
     { booking: BK002, unit: Plot-B, status: pending_approval }
   ]
   interestedUnits: [{ unit: Plot-A }, { unit: Plot-B }]
   Notification: "New Booking Created" for BK002
   ```

3. **First Booking Approved**
   ```
   Lead Stage: booking_in_progress (CALCULATED from all bookings)
   activeBookings: [
     { booking: BK001, unit: Plot-A, status: approved },
     { booking: BK002, unit: Plot-B, status: pending_approval }
   ]
   Notification: "Booking Approved" for BK001
   ```

4. **Second Booking Cancelled**
   ```
   Lead Stage: booking_in_progress (still has BK001 active)
   activeBookings: [
     { booking: BK001, unit: Plot-A, status: approved },
     { booking: BK002, unit: Plot-B, status: cancelled }
   ]
   Unit B: Released to 'available'
   Notification: "Booking Cancelled" for BK002
   ```

---

## API Endpoints

### Notifications
```
GET    /api/notifications              - List all notifications
GET    /api/notifications/unread       - List unread notifications
GET    /api/notifications/stats        - Get notification statistics
PUT    /api/notifications/:id/read     - Mark as read
PUT    /api/notifications/all/read     - Mark all as read
DELETE /api/notifications/:id          - Delete notification
```

### Booking (Enhanced)
```
POST   /api/bookings                   - Create booking (now creates independent booking)
GET    /api/bookings/:id               - Get booking details
PUT    /api/bookings/:id               - Update booking (fixed: only affects this booking)
PUT    /api/bookings/:id/approve       - Approve booking (sends notification)
PUT    /api/bookings/:id/cancel        - Cancel booking (sends notification)
```

---

## Testing Guide

### 1. **Multiple Bookings Test**
```
1. Create Lead A
2. Create Booking 1 for Lead A on Plot X
   → Lead stage should be "booking_in_progress"
3. Create Booking 2 for Lead A on Plot Y
   → Lead stage should STAY "booking_in_progress" (not affected)
4. Update Booking 1 to "approved"
   → Lead stage should STAY "booking_in_progress"
   → Booking 2 should stay independent
5. Cancel Booking 1
   → Lead stage should STAY "booking_in_progress" (Booking 2 still active)
6. Cancel Booking 2
   → Lead stage should change to "follow_up" (no active bookings)
```

### 2. **Notification Test**
```
1. Open Sidebar → Click Notification Bell
2. Create new booking
   → New notification should appear
3. Approve booking
   → Status change notification
4. Click Mark as Read
   → Notification should update
5. Click View Booking
   → Navigate to booking details
```

### 3. **Lead activeBookings Verification**
```
Query lead in MongoDB:
db.leads.findOne({ _id: ObjectId("...") }, { activeBookings: 1 })

Result should show:
{
  activeBookings: [
    { booking: ObjectId, unit: ObjectId, status: 'approved', createdAt: Date },
    { booking: ObjectId, unit: ObjectId, status: 'pending_approval', createdAt: Date }
  ]
}
```

---

## Notification Types

```javascript
- booking_created         : New booking created
- booking_approved        : Booking approved by admin
- booking_cancelled       : Booking cancelled (high severity)
- booking_status_changed  : Any status change
- payment_received        : Payment received
- agreement_signed        : Agreement signed
- registration_completed  : Registration done
- lead_assigned          : Lead assigned to user
- lead_updated           : Lead information updated
- sla_breach             : SLA deadline breached
- general                : General notifications
```

---

## Configuration

### Environment Variables (Already Set)
- `/api/notifications` endpoint ready
- Authentication middleware applied
- Organization-scoped data isolation

### Database Indexes
```javascript
// Notification Model
- userId: 1, isRead: 1, createdAt: -1
- userId: 1, createdAt: -1
- organization: 1, userId: 1

// Lead Model (existing)
- organization: 1
- Phone, email, stage, assignedTo indexes
- (New) activeBookings tracking
```

---

## Benefits

✅ **Multiple Independent Bookings**: Customer can pursue multiple plot bookings simultaneously
✅ **Accurate Lead Stage**: Calculated from ALL active bookings, not just one
✅ **Real-time Notifications**: Users get notified of booking changes
✅ **Better Tracking**: All booking history tracked in activeBookings array
✅ **No Data Loss**: Cancelled bookings marked as 'cancelled', not deleted
✅ **Audit Trail**: Complete notification history for compliance
✅ **Sidebar Integration**: Quick access to notifications without leaving sidebar

---

## Migration Notes

### For Existing Data
Old leads have empty `activeBookings`. To migrate:
```javascript
// Migration script (optional):
db.leads.updateMany(
  { activeBookings: { $exists: false } },
  { $set: { activeBookings: [], interestedUnits: [] } }
)

// Or populate activeBookings from existing bookings:
db.leads.aggregate([
  {
    $lookup: {
      from: 'bookings',
      localField: '_id',
      foreignField: 'lead',
      as: 'bookings'
    }
  },
  {
    $project: {
      activeBookings: {
        $map: {
          input: '$bookings',
          as: 'b',
          in: {
            booking: '$$b._id',
            unit: '$$b.unit',
            status: '$$b.status',
            createdAt: '$$b.createdAt'
          }
        }
      }
    }
  }
])
```

---

## Summary

This implementation provides a **complete overhaul of the booking system** to support truly independent multiple bookings per customer, with integrated notification/alert infrastructure for real-time updates in the sidebar. The solution maintains backward compatibility while fixing the interconnected booking issue completely.
