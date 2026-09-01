# Quick Reference: Multiple Plots Booking System

## Files Modified/Created

### Backend
```
✅ CREATED:
- /backend/models/Notification.model.js
- /backend/services/notificationService.js
- /backend/controllers/notifications.controller.js
- /backend/routes/notifications.routes.js

✏️ MODIFIED:
- /backend/models/Lead.model.js (added activeBookings, interestedUnits)
- /backend/controllers/booking.controller.js (major changes to all functions)
- /backend/index.js (added notification routes)
```

### Frontend
```
✅ CREATED:
- /frontend/src/components/notifications/NotificationCenter.jsx
- /frontend/src/styles/notifications.css

✏️ MODIFIED:
- /frontend/src/components/layout/Sidebar.jsx (added notification bell + center)
```

---

## Key Concepts

### Lead Stage Calculation
```javascript
// Old Logic (BROKEN):
if (booking.status === 'approved') lead.stage = 'booked'
if (booking.status === 'cancelled') lead.stage = 'follow_up'
// ❌ Problem: Each booking overwrites previous stage

// New Logic (FIXED):
Calculate based on ALL active bookings:
if (any booking is registered) → 'booked'
else if (any booking is approved/signed) → 'booking_in_progress'
else if (any booking is pending) → 'booking_in_progress'
else → 'follow_up'
// ✅ Independent tracking per booking
```

### ActiveBookings Array
```javascript
// Lead document now has:
activeBookings: [
  {
    booking: ObjectId,      // Booking reference
    unit: ObjectId,         // Unit/Plot reference
    status: String,         // Current status
    createdAt: Date         // When added
  }
]

// Benefits:
- ✅ Track all bookings independently
- ✅ See booking history at a glance
- ✅ Calculate stage from complete picture
- ✅ Never lose booking data (just mark cancelled)
```

---

## Workflow Changes

### Creating Multiple Bookings
```
BEFORE: 
  Lead stage: new
  + Create Booking 1 → stage = booking_in_progress
  + Create Booking 2 → stage OVERWRITES to booking_in_progress (again)
  ❌ Both bookings get same stage, interconnected

AFTER:
  Lead stage: new
  + Create Booking 1 → stage = booking_in_progress (from activeBookings)
  + Create Booking 2 → stage STILL booking_in_progress 
                       (calculated from ALL bookings, not overwritten)
  ✅ Both bookings independent, stage reflects true status
```

### Updating Booking Status
```
BEFORE:
  Lead has Booking 1 (approved) & Booking 2 (pending)
  Cancel Booking 1 → lead.stage = follow_up
  ❌ Lost that Booking 2 is still pending!

AFTER:
  Lead has Booking 1 (cancelled) & Booking 2 (pending)
  Cancel Booking 1 → activeBookings[0].status = 'cancelled'
                   → stage recalculated = booking_in_progress
  ✅ Booking 2 still active, accurate stage maintained
```

---

## API Examples

### Create Multiple Bookings
```bash
# Booking 1
POST /api/bookings
{
  "lead": "lead_id",
  "unit": "plot_a_id",
  "project": "project_id",
  "customerName": "John Doe",
  "totalAmount": 50000000,
  "status": "pending_approval"
}
→ Lead.activeBookings = [{ booking: BK001, unit: plot_a, status: pending_approval }]

# Booking 2 (same lead, different unit)
POST /api/bookings
{
  "lead": "lead_id",
  "unit": "plot_b_id",
  "project": "project_id",
  "customerName": "John Doe",
  "totalAmount": 75000000,
  "status": "pending_approval"
}
→ Lead.activeBookings = [
    { booking: BK001, unit: plot_a, status: pending_approval },
    { booking: BK002, unit: plot_b, status: pending_approval }
  ]
→ Lead stage remains: booking_in_progress (calculated from both)
```

### Update Booking Status
```bash
# Approve first booking
PUT /api/bookings/BK001
{
  "status": "approved"
}
→ activeBookings[0].status = 'approved'
→ Lead.stage recalculated = booking_in_progress (both active)
→ Notification created: "Booking Approved"
→ Unit A marked as 'booked'

# Cancel second booking
PUT /api/bookings/BK002
{
  "status": "cancelled"
}
→ activeBookings[1].status = 'cancelled'
→ Lead.stage recalculated = booking_in_progress (BK001 still approved)
→ Notification created: "Booking Cancelled"
→ Unit B marked as 'available'
```

### Get Notifications
```bash
GET /api/notifications
→ Returns unread notifications

GET /api/notifications?isRead=false
→ Filter unread only

GET /api/notifications/stats
→ {
    unreadCount: 5,
    totalCount: 25,
    criticalCount: 1
  }

PUT /api/notifications/:id/read
→ Mark single notification as read

PUT /api/notifications/all/read
→ Mark all as read
```

---

## Testing Checklist

- [ ] Create booking → Check activeBookings array in Lead
- [ ] Create 2nd booking → Verify stage recalculated correctly
- [ ] Update 1st booking status → Check only that booking updated
- [ ] Cancel 1st booking → Verify 2nd booking still active
- [ ] Cancel all bookings → Lead stage should reset
- [ ] Notification appears on booking create
- [ ] Notification appears on booking update
- [ ] Click notification → Navigate to booking
- [ ] Mark as read → Icon updates
- [ ] Delete notification → Removed from list
- [ ] Get unread count → Returns correct number

---

## Common Issues & Solutions

### Issue: Lead stage keeps resetting
```
❌ Cause: Old booking controller logic
✅ Solution: Use new calculateLeadStage() from notificationService
```

### Issue: Booking updates affect other bookings
```
❌ Cause: Not updating activeBookings array
✅ Solution: Find booking in array, update that entry only
```

### Issue: Notification not appearing
```
❌ Cause: createNotification() not called
✅ Solution: Check booking controller calls createNotification()
           Check user has assignedTo set
           Check API route is registered
```

### Issue: Can't see multiple bookings for lead
```
❌ Cause: Only checking lead.booking (single ref)
✅ Solution: Query lead.activeBookings array instead
```

---

## Performance Notes

- ✅ activeBookings is embedded array (no extra lookup)
- ✅ Notification queries indexed on userId + isRead
- ✅ Lead stage calculated in-memory (no extra DB call)
- ✅ NotificationCenter uses pagination (limit 20)

---

## Maintenance

### Adding New Booking Status
```javascript
// 1. Update Booking.model.js status enum
status: { enum: [..., 'new_status'] }

// 2. Update calculateLeadStage() logic if needed
function calculateLeadStage(bookings) {
  // Add logic for new_status
}

// 3. Update Notification types if needed
type: { enum: [..., 'booking_new_status'] }
```

### Adding New Notification Type
```javascript
// 1. Update Notification.model.js type enum
type: { enum: [..., 'new_type'] }

// 2. Update NotificationCenter.jsx getTypeIcon()
function getTypeIcon(type) {
  case 'new_type': return '📱'
}

// 3. Create notification in appropriate controller
await createNotification(userId, 'new_type', {
  title: '...',
  message: '...',
  // ...
})
```

---

## Future Enhancements

- [ ] Real-time notifications via WebSocket
- [ ] Email notifications for critical bookings
- [ ] SMS alerts for booking status changes
- [ ] Bulk booking operations
- [ ] Booking expiry automation
- [ ] Lead merger handling for activeBookings
- [ ] Booking transfer between leads
