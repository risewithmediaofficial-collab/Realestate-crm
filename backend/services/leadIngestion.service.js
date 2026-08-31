const Lead = require('../models/Lead.model');
const User = require('../models/User.model');
const Project = require('../models/Project.model');
const MetaIntegrationLog = require('../models/MetaIntegrationLog.model');

/**
 * Assign an agent based on configuration rule.
 */
async function resolveAssignment(assignmentRule = {}, defaultProjectId = null) {
  try {
    const ruleType = assignmentRule.type || 'round_robin';

    if (ruleType === 'no_assignment') {
      return null;
    }

    if (ruleType === 'specific_agent' && assignmentRule.agentId) {
      const specificUser = await User.findById(assignmentRule.agentId);
      if (specificUser && specificUser.isActive !== false) {
        return specificUser._id;
      }
    }

    // Project-based assignment or round robin among active sales agents
    let candidateUsers = [];
    if (ruleType === 'project_based' && defaultProjectId) {
      candidateUsers = await User.find({
        role: { $in: ['sales_rep', 'sales_executive', 'sales_manager', 'admin'] },
        isActive: { $ne: false },
      }).select('_id name email');
    }

    if (!candidateUsers || candidateUsers.length === 0) {
      candidateUsers = await User.find({
        role: { $in: ['sales_rep', 'sales_executive', 'sales_manager', 'admin'] },
        isActive: { $ne: false },
      }).select('_id name email');
    }

    if (candidateUsers.length === 0) {
      const fallbackAdmin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
      return fallbackAdmin ? fallbackAdmin._id : null;
    }

    // Round-robin: find agent with least active leads assigned today/this week
    const candidateIds = candidateUsers.map(u => u._id);
    const recentLeadsCount = await Lead.aggregate([
      { $match: { assignedTo: { $in: candidateIds } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    recentLeadsCount.forEach(item => {
      countMap[item._id.toString()] = item.count;
    });

    let selectedUser = candidateUsers[0];
    let minCount = Infinity;

    for (const user of candidateUsers) {
      const c = countMap[user._id.toString()] || 0;
      if (c < minCount) {
        minCount = c;
        selectedUser = user;
      }
    }

    return selectedUser._id;
  } catch (err) {
    console.error('Error resolving lead assignment:', err);
    return null;
  }
}

/**
 * Centralized Lead Ingestion Service
 */
async function ingestLead(leadData, options = {}) {
  const { assignmentRule, defaultProjectId } = options;

  const normalizedPhone = (leadData.phone || '').trim().replace(/[\s\-()]/g, '');
  const normalizedEmail = (leadData.email || '').trim().toLowerCase();
  const metaLeadId = leadData.sourceMetadata?.metaLeadId;

  // 1. Check for exact Meta Lead ID duplicate
  if (metaLeadId) {
    const existingMetaLead = await Lead.findOne({ 'sourceMetadata.metaLeadId': metaLeadId });
    if (existingMetaLead) {
      await MetaIntegrationLog.create({
        type: 'duplicate_detected',
        severity: 'info',
        message: `Skipped duplicate Meta leadgen_id: ${metaLeadId}`,
        details: { leadId: existingMetaLead._id, phone: normalizedPhone },
      });
      return { lead: existingMetaLead, isDuplicate: true, duplicateReason: 'meta_lead_id_exists' };
    }
  }

  // 2. Check for existing customer duplicate by phone or email
  let duplicateOf = null;
  let isDuplicate = false;

  if (normalizedPhone) {
    const existingPhoneLead = await Lead.findOne({ phone: normalizedPhone }).sort({ createdAt: -1 });
    if (existingPhoneLead) {
      isDuplicate = true;
      duplicateOf = existingPhoneLead._id;
    }
  } else if (normalizedEmail) {
    const existingEmailLead = await Lead.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    if (existingEmailLead) {
      isDuplicate = true;
      duplicateOf = existingEmailLead._id;
    }
  }

  // 3. Resolve Project
  let finalProject = leadData.interestedProject || defaultProjectId || null;
  if (finalProject && typeof finalProject === 'string' && !finalProject.match(/^[0-9a-fA-F]{24}$/)) {
    // If it's a project name/code, try looking it up
    const foundProject = await Project.findOne({
      $or: [
        { name: { $regex: finalProject, $options: 'i' } },
        { code: { $regex: finalProject, $options: 'i' } },
      ],
    });
    if (foundProject) finalProject = foundProject._id;
    else finalProject = null;
  }

  // 4. Resolve Assignment
  let assignedTo = leadData.assignedTo || null;
  if (!assignedTo) {
    assignedTo = await resolveAssignment(assignmentRule, finalProject);
  }

  // 5. Initial Lead Score calculation
  let leadScore = leadData.leadScore || 50;
  if (leadData.source === 'meta_ads' || leadData.source === 'facebook' || leadData.source === 'instagram') {
    leadScore = 65;
    if (leadData.budget && (leadData.budget.max || leadData.budget.min)) leadScore += 15;
    if (finalProject) leadScore += 10;
  }

  const now = new Date();
  const slaDeadline = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute SLA

  // 6. Build Activities
  const initialActivity = {
    type: 'system',
    title: leadData.source === 'meta_ads'
      ? 'Lead Ingested from Meta Lead Ads'
      : `Lead Ingested via ${leadData.source || 'CRM'}`,
    description: leadData.sourceMetadata?.formName
      ? `Captured from Instant Form "${leadData.sourceMetadata.formName}" on ${leadData.sourceMetadata.platform || 'Meta'}`
      : 'Initial lead creation and auto-qualification',
    performedAt: now,
    metadata: {
      source: leadData.source,
      sourceMetadata: leadData.sourceMetadata,
    },
  };

  const payload = {
    name: leadData.name || 'Meta Lead Prospect',
    email: normalizedEmail || undefined,
    phone: normalizedPhone,
    alternatePhone: leadData.alternatePhone,
    city: leadData.city || 'Pune',
    locality: leadData.locality,
    budget: leadData.budget || {},
    source: leadData.source || 'meta_ads',
    utmSource: leadData.utmSource || 'meta',
    utmMedium: leadData.utmMedium || 'cpc',
    utmCampaign: leadData.utmCampaign || leadData.sourceMetadata?.campaignName,
    campaign: leadData.campaign,
    stage: leadData.stage || 'new',
    leadScore: Math.min(leadScore, 100),
    leadType: leadData.leadType || (leadScore >= 70 ? 'hot' : 'warm'),
    assignedTo,
    assignedAt: assignedTo ? now : undefined,
    interestedProject: finalProject,
    interestedUnitType: leadData.interestedUnitType,
    interestedArea: leadData.interestedArea,
    isDuplicate,
    duplicateOf,
    slaStartedAt: now,
    slaDeadline,
    slaBreached: false,
    activities: [initialActivity],
    tags: leadData.tags || ['Meta Lead Ad'],
    notes: leadData.notes || '',
    sourceMetadata: {
      ...leadData.sourceMetadata,
      receivedAt: leadData.sourceMetadata?.receivedAt || now,
    },
  };

  const createdLead = await Lead.create(payload);

  await MetaIntegrationLog.create({
    type: 'lead_creation',
    severity: 'info',
    message: `Lead created successfully: "${createdLead.name}" (${createdLead.phone})`,
    details: {
      leadId: createdLead._id,
      source: createdLead.source,
      metaLeadId: createdLead.sourceMetadata?.metaLeadId,
      assignedTo: createdLead.assignedTo,
      isDuplicate,
    },
  });

  return {
    lead: createdLead,
    isDuplicate,
    duplicateOf,
  };
}

module.exports = {
  ingestLead,
  resolveAssignment,
};
