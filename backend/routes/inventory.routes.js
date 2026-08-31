const express = require('express');
const router = express.Router();
const { getUnits, getUnit, createUnit, updateUnit, deleteUnit, updateUnitStatus, getInventoryMatrix } = require('../controllers/inventory.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/matrix', getInventoryMatrix);
router.route('/').get(getUnits).post(createUnit);
router.route('/:id').get(getUnit).put(updateUnit).delete(deleteUnit);
router.put('/:id/status', updateUnitStatus);

module.exports = router;
