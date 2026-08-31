const express = require('express');
const router = express.Router();
const {
  getIntegrationStatus,
  getMetaConfig,
  testConnection,
  verifyWebhook,
  receiveWebhook,
  getForms,
  syncForms,
  updateFormMapping,
  toggleFormStatus,
  triggerManualSync,
  getWebhookEvents,
  retryWebhookEvent,
  getSyncHistory,
  getErrorLogs,
  clearErrorLogs,
} = require('../controllers/metaIntegration.controller');
const { protect } = require('../middleware/auth.middleware');

// ── Webhook endpoints (Public for Meta Graph API)
router.get('/webhook', verifyWebhook);
router.post('/webhook', receiveWebhook);

// ── Admin Protected Endpoints
router.use(protect);

// Status & Config
router.get('/status', getIntegrationStatus);
router.get('/config', getMetaConfig);
router.post('/test', testConnection);

// Form Mappings
router.get('/forms', getForms);
router.post('/forms/sync', syncForms);
router.put('/forms/:id/mapping', updateFormMapping);
router.post('/forms/:id/toggle', toggleFormStatus);

// Manual Sync
router.post('/leads/sync', triggerManualSync);
router.get('/sync-history', getSyncHistory);

// Webhook Events
router.get('/events', getWebhookEvents);
router.post('/events/:id/retry', retryWebhookEvent);

// Logs
router.get('/errors', getErrorLogs);
router.delete('/errors/clear', clearErrorLogs);

module.exports = router;
