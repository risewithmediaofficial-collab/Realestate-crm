const express = require('express');
const router = express.Router();
const { getSiteVisits, getSiteVisit, createSiteVisit, updateSiteVisit, checkIn, checkOut, deleteSiteVisit, getSiteVisitStats } = require('../controllers/sitevisits.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/stats', getSiteVisitStats);
router.route('/').get(getSiteVisits).post(createSiteVisit);
router.route('/:id').get(getSiteVisit).put(updateSiteVisit).delete(deleteSiteVisit);
router.put('/:id/checkin', checkIn);
router.put('/:id/checkout', checkOut);

module.exports = router;
