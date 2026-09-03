const express = require('express');
const router = express.Router();
const {
  getRequirements,
  getRequirement,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  matchInventory,
  getRequirementStats
} = require('../controllers/buyerRequirements.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/stats', getRequirementStats);
router.get('/:id/match-inventory', matchInventory);
router.route('/').get(getRequirements).post(createRequirement);
router.route('/:id').get(getRequirement).put(updateRequirement).delete(deleteRequirement);

module.exports = router;
