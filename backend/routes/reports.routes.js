const express = require('express');
const router = express.Router();
const { getLeadReport, getSalesReport, getInventoryReport, getTeamPerformance, getFinanceReport } = require('../controllers/reports.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/leads', getLeadReport);
router.get('/sales', getSalesReport);
router.get('/inventory', getInventoryReport);
router.get('/team', getTeamPerformance);
router.get('/finance', getFinanceReport);

module.exports = router;
