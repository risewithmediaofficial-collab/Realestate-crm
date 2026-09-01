const express = require('express');
const router = express.Router();
const { getUnits, getUnit, createUnit, updateUnit, deleteUnit, updateUnitStatus, getInventoryMatrix } = require('../controllers/inventory.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/matrix/:project?', getInventoryMatrix);
router.get('/matrix', getInventoryMatrix);
router.route('/')
  .get(getUnits)
  .post(authorize('admin', 'super_admin', 'director'), createUnit);

router.route('/:id')
  .get(getUnit)
  .put(authorize('admin', 'super_admin', 'director'), updateUnit)
  .delete(authorize('admin', 'super_admin', 'director'), deleteUnit);

router.put('/:id/status', updateUnitStatus);

module.exports = router;
