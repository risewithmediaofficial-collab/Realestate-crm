const express = require('express');
const router = express.Router();
const {
  getLeads, getLead, createLead, updateLead, deleteLead, deleteAllLeads,
  addActivity, assignLead, updateStage, getLeadStats,
  addCallLog, getFollowUpsToday, getStatsByUser,
} = require('../controllers/leads.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/stats', getLeadStats);
router.get('/stats/stages', getLeadStats);
router.get('/follow-ups/today', getFollowUpsToday);   // notification feed
router.get('/stats/by-user', getStatsByUser);          // telecaller stats
router.delete('/delete-all', deleteAllLeads);
router.route('/').get(getLeads).post(createLead);
router.route('/:id').get(getLead).put(updateLead).delete(deleteLead);
router.post('/:id/activity', addActivity);
router.post('/:id/call-log', addCallLog);              // add call note
router.put('/:id/assign', assignLead);
router.put('/:id/stage', updateStage);

module.exports = router;
