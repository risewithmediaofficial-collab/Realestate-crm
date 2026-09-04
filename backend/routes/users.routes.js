const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  approveUser,
  rejectUser,
  revokeApproval,
  toggleUserStatus,
  deleteUser,
  cleanupSeededUsers
} = require('../controllers/users.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.delete('/seeded/cleanup', authorize('super_admin'), cleanupSeededUsers);
router.route('/').get(getUsers).post(authorize('admin', 'super_admin'), createUser);
router.route('/:id').get(getUser).put(updateUser).delete(authorize('admin', 'super_admin'), deleteUser);

// Super Admin User Approval routes
router.patch('/:id/approve', authorize('super_admin'), approveUser);
router.patch('/:id/reject', authorize('super_admin'), rejectUser);
router.patch('/:id/revoke', authorize('super_admin'), revokeApproval);

router.route('/:id/toggle-status')
  .put(authorize('admin', 'super_admin'), toggleUserStatus)
  .patch(authorize('admin', 'super_admin'), toggleUserStatus);

module.exports = router;
