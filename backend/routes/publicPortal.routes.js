const express = require('express');
const router = express.Router();
const {
  getPublicProjects,
  getPublicProjectById,
  getPublicProjectUnits,
  createPublicInquiry,
  createPublicSiteVisit,
  createPublicBooking
} = require('../controllers/publicPortal.controller');

// Public endpoints (no JWT required)
router.get('/projects', getPublicProjects);
router.get('/projects/:id', getPublicProjectById);
router.get('/projects/:id/units', getPublicProjectUnits);
router.post('/inquiry', createPublicInquiry);
router.post('/site-visits', createPublicSiteVisit);
router.post('/booking', createPublicBooking);

module.exports = router;
