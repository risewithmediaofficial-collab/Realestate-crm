const express = require('express');
const router = express.Router();
const { getChannelPartners, getChannelPartner, createChannelPartner, updateChannelPartner, approveChannelPartner, rejectChannelPartner, deleteChannelPartner, getCPStats } = require('../controllers/channelpartners.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/stats', getCPStats);
router.route('/').get(getChannelPartners).post(createChannelPartner);
router.route('/:id').get(getChannelPartner).put(updateChannelPartner).delete(deleteChannelPartner);
router.put('/:id/approve', approveChannelPartner);
router.put('/:id/reject', rejectChannelPartner);

module.exports = router;
