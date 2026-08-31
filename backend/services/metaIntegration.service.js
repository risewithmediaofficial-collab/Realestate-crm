const MetaWebhookEvent = require('../models/MetaWebhookEvent.model');
const MetaFormMapping = require('../models/MetaFormMapping.model');
const MetaSyncHistory = require('../models/MetaSyncHistory.model');
const MetaIntegrationLog = require('../models/MetaIntegrationLog.model');
const Lead = require('../models/Lead.model');
const { mapMetaFields } = require('./metaFieldMapper.service');
const { ingestLead } = require('./leadIngestion.service');

const REQUIRED_ENV_VARS = [
  'META_APP_ID',
  'META_APP_SECRET',
  'META_VERIFY_TOKEN',
  'META_PAGE_ACCESS_TOKEN',
  'META_PAGE_ID',
];

/**
 * Checks which environment variables are present vs missing without leaking secrets.
 */
function getMetaConfigStatus() {
  const missing = [];
  const configuredKeys = [];

  REQUIRED_ENV_VARS.forEach(key => {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push(key);
    } else {
      configuredKeys.push(key);
    }
  });

  const isConfigured = missing.length === 0;
  let status = 'Not Configured';
  if (isConfigured) {
    status = 'Configured';
  } else if (configuredKeys.length > 0) {
    status = 'Testing';
  }

  return {
    configured: isConfigured,
    status,
    missing,
    configuredKeys,
    pageId: process.env.META_PAGE_ID ? `${process.env.META_PAGE_ID.substring(0, 4)}••••` : null,
    apiVersion: process.env.META_API_VERSION || 'v21.0',
    hasVerifyToken: Boolean(process.env.META_VERIFY_TOKEN),
  };
}

/**
 * Validates webhook verification handshake from Meta.
 */
function verifyWebhookSubscription(mode, token, challenge) {
  const expectedToken = process.env.META_VERIFY_TOKEN || 'prop_crm_webhook_verify_2026';
  if (mode === 'subscribe' && token === expectedToken) {
    return { verified: true, challenge };
  }
  return { verified: false };
}

/**
 * Logs an integration event safely.
 */
async function logIntegrationEvent(type, message, severity = 'info', details = null) {
  try {
    // Sanitize any potential access tokens from details
    let safeDetails = details;
    if (details && typeof details === 'object') {
      safeDetails = JSON.parse(JSON.stringify(details, (k, v) => {
        if (typeof v === 'string' && (k.toLowerCase().includes('token') || k.toLowerCase().includes('secret'))) {
          return '••••••••';
        }
        return v;
      }));
    }

    await MetaIntegrationLog.create({
      type,
      message,
      severity,
      details: safeDetails,
    });
  } catch (err) {
    console.error('Failed to log Meta integration event:', err);
  }
}

/**
 * Fetches full lead payload from Meta Graph API
 */
async function fetchLeadFromGraphApi(leadgenId) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const apiVersion = process.env.META_API_VERSION || 'v21.0';

  if (!accessToken) {
    throw new Error('META_PAGE_ACCESS_TOKEN is not configured.');
  }

  const url = `https://graph.facebook.com/${apiVersion}/${leadgenId}?access_token=${accessToken}`;
  const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Graph API returned HTTP ${response.status}: ${errText}`);
  }
  return await response.json();
}

/**
 * Asynchronously processes a received Meta webhook event.
 */
async function processWebhookEvent(webhookEventDoc) {
  const event = webhookEventDoc;
  try {
    event.status = 'processing';
    await event.save();

    let metaLeadData = null;

    // Check if configuration exists to fetch live lead from Graph API
    const configStatus = getMetaConfigStatus();
    if (configStatus.configured && !event.payload?.simulated) {
      try {
        metaLeadData = await fetchLeadFromGraphApi(event.leadgenId);
      } catch (graphErr) {
        await logIntegrationEvent(
          'lead_fetch',
          `Failed to fetch Meta lead ${event.leadgenId} from Graph API: ${graphErr.message}`,
          'error',
          { leadgenId: event.leadgenId, error: graphErr.message }
        );
        event.status = 'failed';
        event.errorMessage = `Graph API Error: ${graphErr.message}`;
        event.processedAt = new Date();
        await event.save();
        return { success: false, error: graphErr.message };
      }
    } else {
      // If unconfigured or test event, use embedded field_data or mock
      metaLeadData = event.payload?.lead_data || {
        id: event.leadgenId,
        created_time: new Date().toISOString(),
        ad_id: event.adId,
        form_id: event.formId,
        field_data: [
          { name: 'full_name', values: ['Meta Lead Ad Inquirer'] },
          { name: 'phone_number', values: ['+919800000000'] },
          { name: 'email', values: [`lead_${event.leadgenId}@meta-inquiry.com`] },
          { name: 'city', values: ['Pune'] },
        ],
      };
    }

    // Lookup form mapping if exists
    let formMapping = null;
    if (event.formId) {
      formMapping = await MetaFormMapping.findOne({ formId: event.formId, isActive: true });
    }

    // Map Meta fields to CRM lead
    const mappedLead = mapMetaFields(metaLeadData, formMapping);

    // Set Meta metadata
    mappedLead.source = 'meta_ads';
    mappedLead.sourceMetadata = {
      platform: event.platform || 'facebook',
      metaLeadId: event.leadgenId,
      pageId: event.pageId,
      formId: event.formId,
      formName: formMapping?.formName || event.payload?.form_name || 'Meta Instant Lead Form',
      campaignId: event.payload?.campaign_id,
      campaignName: event.payload?.campaign_name,
      adSetId: event.adGroupId,
      adSetName: event.payload?.adset_name,
      adId: event.adId,
      adName: event.payload?.ad_name,
      rawMetaFields: mappedLead.rawMetaFields,
      receivedAt: event.receivedAt,
    };

    // Ingest through common service
    const ingestResult = await ingestLead(mappedLead, {
      assignmentRule: formMapping?.assignmentRule,
      defaultProjectId: formMapping?.defaultProject,
    });

    event.status = ingestResult.isDuplicate && ingestResult.duplicateReason === 'meta_lead_id_exists'
      ? 'duplicate'
      : 'processed';
    event.createdLead = ingestResult.lead?._id;
    event.processedAt = new Date();
    await event.save();

    await logIntegrationEvent(
      'webhook_received',
      `Processed webhook event for leadgen_id: ${event.leadgenId} (${mappedLead.name})`,
      'info',
      { leadId: ingestResult.lead?._id, isDuplicate: ingestResult.isDuplicate }
    );

    return { success: true, lead: ingestResult.lead, isDuplicate: ingestResult.isDuplicate };
  } catch (err) {
    event.status = 'failed';
    event.errorMessage = err.message;
    event.processedAt = new Date();
    await event.save();

    await logIntegrationEvent(
      'general_error',
      `Webhook processing failed for ${event.leadgenId}: ${err.message}`,
      'error',
      { leadgenId: event.leadgenId, error: err.stack }
    );

    return { success: false, error: err.message };
  }
}

/**
 * Handle incoming Meta Page webhook payload
 */
async function handleIncomingWebhook(payload) {
  const entry = payload.entry || [];
  const processedEvents = [];

  for (const pageEntry of entry) {
    const pageId = pageEntry.id;
    const changes = pageEntry.changes || [];

    for (const change of changes) {
      if (change.field === 'leadgen') {
        const val = change.value || {};
        const leadgenId = val.leadgen_id;
        const formId = val.form_id;
        const adId = val.ad_id;
        const adGroupId = val.adgroup_id;
        const createdTime = val.created_time;

        if (!leadgenId) continue;

        // Check if event already stored
        let webhookEvent = await MetaWebhookEvent.findOne({ leadgenId });

        if (webhookEvent) {
          await logIntegrationEvent(
            'duplicate_detected',
            `Received duplicate webhook notification for leadgen_id: ${leadgenId}`,
            'info',
            { leadgenId, eventId: webhookEvent._id }
          );
          processedEvents.push({ leadgenId, status: 'duplicate', eventId: webhookEvent._id });
          continue;
        }

        // Store event immediately
        webhookEvent = await MetaWebhookEvent.create({
          eventId: pageEntry.id ? `${pageEntry.id}_${leadgenId}` : leadgenId,
          platform: 'facebook',
          objectType: 'page',
          pageId,
          leadgenId,
          formId,
          adId,
          adGroupId,
          payload: val,
          status: 'received',
          receivedAt: createdTime ? new Date(createdTime * 1000) : new Date(),
        });

        // Trigger asynchronous processing
        setImmediate(() => {
          processWebhookEvent(webhookEvent).catch(e => console.error('Async lead error:', e));
        });

        processedEvents.push({ leadgenId, status: 'received', eventId: webhookEvent._id });
      }
    }
  }

  return processedEvents;
}

/**
 * Runs a manual synchronization run.
 */
async function runManualLeadSync(userId = null) {
  const syncRecord = await MetaSyncHistory.create({
    syncType: 'manual',
    status: 'started',
    startedBy: userId,
    startedAt: new Date(),
  });

  const configStatus = getMetaConfigStatus();

  if (!configStatus.configured) {
    syncRecord.status = 'failed';
    syncRecord.completedAt = new Date();
    syncRecord.durationMs = Date.now() - syncRecord.startedAt.getTime();
    syncRecord.errorsCount = 1;
    syncRecord.errorDetails = [
      `Cannot sync leads: Missing Meta configuration (${configStatus.missing.join(', ')}).`,
    ];
    await syncRecord.save();

    await logIntegrationEvent(
      'sync',
      `Manual sync aborted: Missing credentials (${configStatus.missing.join(', ')})`,
      'warning',
      { missing: configStatus.missing }
    );

    return {
      success: false,
      message: `Meta credentials not configured. Missing: ${configStatus.missing.join(', ')}`,
      syncRecord,
    };
  }

  try {
    const pageId = process.env.META_PAGE_ID;
    const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
    const apiVersion = process.env.META_API_VERSION || 'v21.0';

    // 1. Fetch lead forms
    const formsUrl = `https://graph.facebook.com/${apiVersion}/${pageId}/leadgen_forms?access_token=${pageToken}`;
    const formsRes = await fetch(formsUrl, { headers: { 'Accept': 'application/json' } });
    const formsData = await formsRes.json();
    const forms = formsData?.data || [];

    let totalLeadsFound = 0;
    let newLeadsCreated = 0;
    let duplicatesFound = 0;
    const errors = [];

    // 2. Fetch leads from active forms
    for (const form of forms) {
      try {
        const leadsUrl = `https://graph.facebook.com/${apiVersion}/${form.id}/leads?access_token=${pageToken}&limit=50`;
        const leadsRes = await fetch(leadsUrl, { headers: { 'Accept': 'application/json' } });
        const leadsData = await leadsRes.json();
        const leadItems = leadsData?.data || [];
        totalLeadsFound += leadItems.length;

        for (const metaLead of leadItems) {
          const leadgenId = metaLead.id;
          const existingEvent = await MetaWebhookEvent.findOne({ leadgenId });

          if (existingEvent && existingEvent.status === 'processed') {
            duplicatesFound++;
            continue;
          }

          let event = existingEvent;
          if (!event) {
            event = await MetaWebhookEvent.create({
              eventId: `sync_${leadgenId}`,
              platform: 'facebook',
              pageId,
              leadgenId,
              formId: form.id,
              payload: metaLead,
              status: 'received',
            });
          }

          const res = await processWebhookEvent(event);
          if (res.success) {
            if (res.isDuplicate) duplicatesFound++;
            else newLeadsCreated++;
          } else {
            errors.push(`Lead ${leadgenId}: ${res.error}`);
          }
        }
      } catch (formErr) {
        errors.push(`Form ${form.name || form.id}: ${formErr.message}`);
      }
    }

    syncRecord.status = errors.length > 0 && newLeadsCreated === 0 ? 'failed' : 'completed';
    syncRecord.totalLeadsFound = totalLeadsFound;
    syncRecord.newLeadsCreated = newLeadsCreated;
    syncRecord.duplicatesFound = duplicatesFound;
    syncRecord.errorsCount = errors.length;
    syncRecord.errorDetails = errors;
    syncRecord.completedAt = new Date();
    syncRecord.durationMs = Date.now() - syncRecord.startedAt.getTime();
    await syncRecord.save();

    await logIntegrationEvent(
      'sync',
      `Manual sync finished: ${newLeadsCreated} created, ${duplicatesFound} duplicates, ${errors.length} errors.`,
      errors.length > 0 ? 'warning' : 'info',
      { newLeadsCreated, duplicatesFound, totalLeadsFound }
    );

    return {
      success: true,
      syncRecord,
    };
  } catch (err) {
    syncRecord.status = 'failed';
    syncRecord.completedAt = new Date();
    syncRecord.durationMs = Date.now() - syncRecord.startedAt.getTime();
    syncRecord.errorsCount = 1;
    syncRecord.errorDetails = [err.message];
    await syncRecord.save();

    return {
      success: false,
      message: `Sync failed: ${err.message}`,
      syncRecord,
    };
  }
}

/**
 * Returns integration overview metrics for the dashboard.
 */
async function getIntegrationMetrics() {
  const config = getMetaConfigStatus();
  const totalMetaLeads = await Lead.countDocuments({
    $or: [{ source: 'meta_ads' }, { 'sourceMetadata.platform': { $in: ['facebook', 'instagram', 'meta'] } }],
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayMetaLeads = await Lead.countDocuments({
    $or: [{ source: 'meta_ads' }, { 'sourceMetadata.platform': { $in: ['facebook', 'instagram', 'meta'] } }],
    createdAt: { $gte: todayStart },
  });

  const failedWebhooks = await MetaWebhookEvent.countDocuments({ status: 'failed' });
  const pendingEvents = await MetaWebhookEvent.countDocuments({ status: { $in: ['received', 'processing'] } });

  const lastLead = await Lead.findOne({
    $or: [{ source: 'meta_ads' }, { 'sourceMetadata.platform': { $in: ['facebook', 'instagram', 'meta'] } }],
  }).sort({ createdAt: -1 }).select('name createdAt sourceMetadata');

  const lastSync = await MetaSyncHistory.findOne().sort({ startedAt: -1 });

  return {
    connectionStatus: config.status,
    isConfigured: config.configured,
    missingConfig: config.missing,
    webhookStatus: config.hasVerifyToken ? 'Active' : 'Unverified Token',
    totalMetaLeads,
    todayMetaLeads,
    failedWebhooks,
    pendingEvents,
    lastLeadReceived: lastLead ? { name: lastLead.name, at: lastLead.createdAt, form: lastLead.sourceMetadata?.formName } : null,
    lastSync: lastSync ? { status: lastSync.status, at: lastSync.completedAt || lastSync.startedAt, created: lastSync.newLeadsCreated } : null,
  };
}

module.exports = {
  REQUIRED_ENV_VARS,
  getMetaConfigStatus,
  verifyWebhookSubscription,
  logIntegrationEvent,
  processWebhookEvent,
  handleIncomingWebhook,
  runManualLeadSync,
  getIntegrationMetrics,
};
