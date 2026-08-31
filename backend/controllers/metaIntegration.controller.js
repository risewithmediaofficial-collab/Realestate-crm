const MetaWebhookEvent = require('../models/MetaWebhookEvent.model');
const MetaFormMapping = require('../models/MetaFormMapping.model');
const MetaSyncHistory = require('../models/MetaSyncHistory.model');
const MetaIntegrationLog = require('../models/MetaIntegrationLog.model');
const metaIntegrationService = require('../services/metaIntegration.service');

/**
 * GET /api/integrations/meta/status
 */
exports.getIntegrationStatus = async (req, res, next) => {
  try {
    const metrics = await metaIntegrationService.getIntegrationMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) { next(err); }
};

/**
 * GET /api/integrations/meta/config
 * Safe check of environment variables without leaking secret tokens.
 */
exports.getMetaConfig = async (req, res, next) => {
  try {
    const status = metaIntegrationService.getMetaConfigStatus();
    res.json({ success: true, data: status });
  } catch (err) { next(err); }
};

/**
 * POST /api/integrations/meta/test
 * Tests Meta Graph API connection or returns clear diagnostic status.
 */
exports.testConnection = async (req, res, next) => {
  try {
    const config = metaIntegrationService.getMetaConfigStatus();
    if (!config.configured) {
      return res.json({
        success: false,
        status: 'Not Configured',
        message: 'Meta credentials are incomplete. Please add missing environment variables.',
        missing: config.missing,
      });
    }

    const pageId = process.env.META_PAGE_ID;
    const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
    const apiVersion = process.env.META_API_VERSION || 'v21.0';

    try {
      const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${pageId}?fields=id,name,category,link&access_token=${pageToken}`,
        { headers: { 'Accept': 'application/json' } }
      );
      const pageData = await response.json();

      if (!response.ok) {
        throw new Error(pageData?.error?.message || `HTTP ${response.status}`);
      }

      await metaIntegrationService.logIntegrationEvent(
        'webhook_verification',
        `Successfully verified connection to Facebook Page: "${pageData.name}" (${pageData.id})`,
        'info',
        { pageId: pageData.id, pageName: pageData.name }
      );

      return res.json({
        success: true,
        status: 'Connected',
        message: `Successfully connected to Page "${pageData.name}"`,
        page: pageData,
      });
    } catch (apiErr) {
      await metaIntegrationService.logIntegrationEvent(
        'auth_error',
        `Meta API connection test failed: ${apiErr.message}`,
        'error',
        { error: apiErr.message }
      );

      return res.json({
        success: false,
        status: 'Error',
        message: `Meta API Error: ${apiErr.message}`,
      });
    }
  } catch (err) { next(err); }
};

/**
 * GET /api/integrations/meta/webhook
 * Meta Webhook verification handshake
 */
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verification = metaIntegrationService.verifyWebhookSubscription(mode, token, challenge);
  if (verification.verified) {
    console.log('✅ Meta Webhook successfully verified with challenge token');
    metaIntegrationService.logIntegrationEvent(
      'webhook_verification',
      'Meta Webhook verification handshake completed successfully',
      'info'
    );
    return res.status(200).send(challenge);
  }

  console.warn('❌ Meta Webhook verification token mismatch');
  metaIntegrationService.logIntegrationEvent(
    'webhook_verification',
    'Meta Webhook verification failed: verify token mismatch',
    'warning'
  );
  return res.status(403).send('Forbidden: Token mismatch');
};

/**
 * POST /api/integrations/meta/webhook
 * Receive real-time Meta Page leadgen webhook events
 */
exports.receiveWebhook = async (req, res) => {
  try {
    const payload = req.body;

    // Immediately acknowledge HTTP 200 to Meta
    res.status(200).json({ success: true, message: 'EVENT_RECEIVED' });

    if (payload && payload.object === 'page') {
      await metaIntegrationService.handleIncomingWebhook(payload);
    }
  } catch (err) {
    console.error('Error handling Meta webhook POST:', err);
    metaIntegrationService.logIntegrationEvent(
      'webhook_received',
      `Error processing webhook POST: ${err.message}`,
      'error'
    );
  }
};

/**
 * GET /api/integrations/meta/forms
 */
exports.getForms = async (req, res, next) => {
  try {
    const forms = await MetaFormMapping.find()
      .populate('defaultProject', 'name city code')
      .populate('assignmentRule.agentId', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: forms });
  } catch (err) { next(err); }
};

/**
 * POST /api/integrations/meta/forms/sync
 * Sync lead forms from Meta Graph API or initialize defaults
 */
exports.syncForms = async (req, res, next) => {
  try {
    const config = metaIntegrationService.getMetaConfigStatus();

    if (!config.configured) {
      // Return existing stored forms with helpful message
      const existing = await MetaFormMapping.find()
        .populate('defaultProject', 'name city code')
        .populate('assignmentRule.agentId', 'name email avatar');

      return res.json({
        success: true,
        data: existing,
        message: 'Meta API credentials not configured yet. Displaying local form mappings.',
      });
    }

    const pageId = process.env.META_PAGE_ID;
    const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
    const apiVersion = process.env.META_API_VERSION || 'v21.0';

    const url = `https://graph.facebook.com/${apiVersion}/${pageId}/leadgen_forms?fields=id,name,status,questions&access_token=${pageToken}`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const responseData = await response.json();
    const remoteForms = responseData?.data || [];

    const synced = [];
    for (const rf of remoteForms) {
      let mappingDoc = await MetaFormMapping.findOne({ formId: rf.id });

      const defaultFieldMappings = (rf.questions || []).map(q => ({
        metaField: q.key || q.label || '',
        crmField: (q.key || '').includes('phone') ? 'phone'
          : (q.key || '').includes('email') ? 'email'
          : (q.key || '').includes('name') ? 'name'
          : (q.key || '').includes('city') ? 'city'
          : 'notes',
      }));

      if (!mappingDoc) {
        mappingDoc = await MetaFormMapping.create({
          formId: rf.id,
          formName: rf.name || `Form ${rf.id}`,
          pageId,
          status: rf.status === 'ACTIVE' ? 'active' : 'paused',
          fieldMappings: defaultFieldMappings,
          isActive: true,
          lastSyncedAt: new Date(),
        });
      } else {
        mappingDoc.formName = rf.name || mappingDoc.formName;
        mappingDoc.status = rf.status === 'ACTIVE' ? 'active' : 'paused';
        mappingDoc.lastSyncedAt = new Date();
        await mappingDoc.save();
      }
      synced.push(mappingDoc);
    }

    res.json({ success: true, data: synced, count: synced.length });
  } catch (err) { next(err); }
};

/**
 * PUT /api/integrations/meta/forms/:id/mapping
 */
exports.updateFormMapping = async (req, res, next) => {
  try {
    const { fieldMappings, defaultProject, defaultLeadStatus, defaultLeadType, assignmentRule, isActive } = req.body;

    const updatePayload = {};
    if (fieldMappings) updatePayload.fieldMappings = fieldMappings;
    if (defaultProject !== undefined) updatePayload.defaultProject = defaultProject || null;
    if (defaultLeadStatus) updatePayload.defaultLeadStatus = defaultLeadStatus;
    if (defaultLeadType) updatePayload.defaultLeadType = defaultLeadType;
    if (assignmentRule) updatePayload.assignmentRule = assignmentRule;
    if (isActive !== undefined) updatePayload.isActive = isActive;

    const updated = await MetaFormMapping.findByIdAndUpdate(req.params.id, updatePayload, { new: true })
      .populate('defaultProject', 'name city code')
      .populate('assignmentRule.agentId', 'name email avatar');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Form mapping not found' });
    }

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

/**
 * POST /api/integrations/meta/forms/:id/toggle
 */
exports.toggleFormStatus = async (req, res, next) => {
  try {
    const form = await MetaFormMapping.findById(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });

    form.isActive = !form.isActive;
    await form.save();

    res.json({ success: true, data: form });
  } catch (err) { next(err); }
};

/**
 * POST /api/integrations/meta/leads/sync
 * Manual recovery sync
 */
exports.triggerManualSync = async (req, res, next) => {
  try {
    const result = await metaIntegrationService.runManualLeadSync(req.user?._id);
    res.json({ success: result.success, message: result.message, data: result.syncRecord });
  } catch (err) { next(err); }
};

/**
 * GET /api/integrations/meta/events
 */
exports.getWebhookEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 25, status, formId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (formId) query.formId = formId;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await MetaWebhookEvent.countDocuments(query);
    const events = await MetaWebhookEvent.find(query)
      .sort({ receivedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdLead', 'name phone email stage');

    res.json({
      success: true,
      data: events,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) { next(err); }
};

/**
 * POST /api/integrations/meta/events/:id/retry
 */
exports.retryWebhookEvent = async (req, res, next) => {
  try {
    const event = await MetaWebhookEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    event.retryCount = (event.retryCount || 0) + 1;
    await event.save();

    const result = await metaIntegrationService.processWebhookEvent(event);
    res.json({ success: result.success, data: event, error: result.error });
  } catch (err) { next(err); }
};

/**
 * GET /api/integrations/meta/sync-history
 */
exports.getSyncHistory = async (req, res, next) => {
  try {
    const history = await MetaSyncHistory.find()
      .populate('startedBy', 'name email')
      .sort({ startedAt: -1 })
      .limit(50);

    res.json({ success: true, data: history });
  } catch (err) { next(err); }
};

/**
 * GET /api/integrations/meta/errors
 */
exports.getErrorLogs = async (req, res, next) => {
  try {
    const { severity, limit = 50 } = req.query;
    const query = {};
    if (severity) query.severity = severity;

    const logs = await MetaIntegrationLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/integrations/meta/errors/clear
 */
exports.clearErrorLogs = async (req, res, next) => {
  try {
    await MetaIntegrationLog.deleteMany({});
    res.json({ success: true, message: 'Integration logs cleared' });
  } catch (err) { next(err); }
};
