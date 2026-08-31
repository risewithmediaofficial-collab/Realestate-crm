const express = require('express');
const router = express.Router();
const { getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign, getCampaignROI } = require('../controllers/campaigns.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/roi', getCampaignROI);
router.route('/').get(getCampaigns).post(createCampaign);
router.route('/:id').get(getCampaign).put(updateCampaign).delete(deleteCampaign);

module.exports = router;
