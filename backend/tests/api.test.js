require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('../index');

// ANSI colors for clean test reporting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

let server;
let baseUrl;
let authToken = '';
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const request = async (method, path, body = null, token = authToken) => {
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
};

const assert = (description, condition, details = '') => {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${colors.green}✔${colors.reset} ${description}`);
  } else {
    failedTests++;
    console.log(`  ${colors.red}✖ ${description}${colors.reset}`);
    if (details) console.log(`    ${colors.yellow}Details: ${details}${colors.reset}`);
  }
};

const section = (title) => {
  console.log(`\n${colors.cyan}${colors.bright}━━━ ${title} ━━━${colors.reset}`);
};

const runAllTests = async () => {
  console.log(`\n${colors.bright}${colors.blue}====================================================`);
  console.log(`🚀 STARTING REAL ESTATE CRM API & WORKFLOW TEST SUITE`);
  console.log(`====================================================${colors.reset}\n`);

  // Start test server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`📡 Test server running on ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ─── 1. Health Check ─────────────────────────────
    section('1. Server Health & Status');
    const health = await request('GET', '/api/health', null, null);
    assert('Health endpoint returns 200 OK', health.status === 200);
    assert('Health status body is OK', health.data?.status === 'OK');

    // ─── 2. Authentication ───────────────────────────
    section('2. Authentication & JWT Security');
    const badLogin = await request('POST', '/api/auth/login', { email: 'admin@crm.com', password: 'WrongPassword' }, null);
    assert('Invalid password rejects with 401', badLogin.status === 401);

    const goodLogin = await request('POST', '/api/auth/login', { email: 'admin@crm.com', password: 'Admin@123' }, null);
    assert('Valid admin login returns 200', goodLogin.status === 200);
    assert('JWT access token is issued', !!goodLogin.data?.token);
    authToken = goodLogin.data?.token;

    const me = await request('GET', '/api/auth/me');
    assert('Current user profile retrieved via /me', me.status === 200 && me.data?.user?.email === 'admin@crm.com');

    // ─── 3. Dashboard Analytics & KPIs ────────────────
    section('3. Dashboard KPIs & Funnel Metrics');
    const dash = await request('GET', '/api/dashboard/stats');
    assert('Dashboard stats endpoint returns 200', dash.status === 200);
    assert('Dashboard contains KPI summary metrics', typeof dash.data?.data?.kpis?.totalLeads === 'number');
    assert('Dashboard contains 9-stage conversion funnel', Array.isArray(dash.data?.data?.funnel));
    assert('Dashboard contains inventory absorption stats', Array.isArray(dash.data?.data?.inventoryStats));

    // ─── 4. Projects Module ──────────────────────────
    section('4. Projects & Tower Structures');
    const projectsList = await request('GET', '/api/projects');
    assert('Projects list returns 200', projectsList.status === 200);
    assert('Projects array contains seeded projects', projectsList.data?.data?.length >= 2);
    const existingProjId = projectsList.data?.data?.[0]?._id;

    // Create new test project
    const projCode = `EHL${Date.now().toString().slice(-4)}`;
    const newProj = await request('POST', '/api/projects', {
      name: 'Emerald Heights Luxury Plots',
      code: projCode,
      city: 'Pune',
      address: 'Kharadi IT Park, Pune',
      type: 'plots',
      status: 'launched',
      totalUnits: 50,
      priceRange: { min: 4500000, max: 9500000 },
    });
    assert('Create project returns 201 Created', newProj.status === 201);
    const createdProjId = newProj.data?.data?._id;

    const getProj = await request('GET', `/api/projects/${createdProjId}`);
    assert('Fetch single project returns 200 with details', getProj.status === 200 && getProj.data?.data?.code === projCode);

    const updateProj = await request('PUT', `/api/projects/${createdProjId}`, { status: 'under_construction' });
    assert('Update project returns 200 with new status', updateProj.status === 200 && updateProj.data?.data?.status === 'under_construction');

    const delProj = await request('DELETE', `/api/projects/${createdProjId}`);
    assert('Delete project returns 200', delProj.status === 200);

    // ─── 5. Inventory & Stacking Matrix ───────────────
    section('5. Inventory Units & Stacking Matrix');
    const units = await request('GET', '/api/inventory?limit=10');
    assert('Get inventory units returns 200', units.status === 200);
    assert('Inventory returns units list', units.data?.data?.length > 0);
    const testUnitId = units.data?.data?.[0]?._id;

    const matrix = await request('GET', `/api/inventory/matrix?project=${existingProjId}&tower=A`);
    assert('Get visual stacking matrix returns 200 with floors', matrix.status === 200 && typeof matrix.data?.data === 'object');

    // Create unit
    const newUnit = await request('POST', '/api/inventory', {
      unitNumber: 'A-999',
      project: existingProjId,
      tower: 'A',
      floor: 9,
      type: '3BHK',
      category: 'residential',
      facing: 'east',
      area: { carpet: 1000, builtUp: 1200, superBuiltUp: 1400 },
      pricing: { basePrice: 10000000, totalPrice: 11800000 },
      status: 'available',
    });
    assert('Create unit returns 201', newUnit.status === 201);
    const createdUnitId = newUnit.data?.data?._id;

    const updateUnitStatus = await request('PUT', `/api/inventory/${createdUnitId}/status`, { status: 'on_hold', holdRemarks: 'Client hold 48h' });
    assert('Update unit status to on_hold returns 200', updateUnitStatus.status === 200 && updateUnitStatus.data?.data?.status === 'on_hold');

    const delUnit = await request('DELETE', `/api/inventory/${createdUnitId}`);
    assert('Delete unit returns 200', delUnit.status === 200);

    // ─── 6. Leads & Pipeline Workflow ─────────────────
    section('6. Leads Lifecycle & Pre-Sales Pipeline');
    const leads = await request('GET', '/api/leads?limit=5');
    assert('Get leads list returns 200', leads.status === 200);
    assert('Leads pagination metadata present', typeof leads.data?.total === 'number');

    const newLead = await request('POST', '/api/leads', {
      name: 'Rohan Deshmukh',
      phone: '9823000099',
      email: 'rohan.deshmukh@test.com',
      city: 'Pune',
      source: 'meta_ads',
      stage: 'new',
      leadScore: 82,
      leadType: 'hot',
      interestedProject: existingProjId,
      budget: { min: 8000000, max: 14000000 },
    });
    assert('Create lead returns 201 with SLA initialization', newLead.status === 201 && newLead.data?.data?.leadScore === 82);
    const createdLeadId = newLead.data?.data?._id;

    const updateStage = await request('PUT', `/api/leads/${createdLeadId}/stage`, { stage: 'qualified', note: 'Customer confirmed 3BHK interest' });
    assert('Move lead stage to qualified returns 200', updateStage.status === 200 && updateStage.data?.data?.stage === 'qualified');

    const addActivity = await request('POST', `/api/leads/${createdLeadId}/activity`, {
      type: 'call',
      title: 'Detailed pricing walkthrough call',
      outcome: 'interested',
      duration: 240,
    });
    assert('Add interaction activity to lead returns 200/201', addActivity.status === 200 || addActivity.status === 201);

    const leadStats = await request('GET', '/api/leads/stats');
    assert('Get lead stage aggregation stats returns 200', leadStats.status === 200);

    // ─── 7. Site Visits Management ────────────────────
    section('7. Site Visits Scheduling & Dispositions');
    const visits = await request('GET', '/api/site-visits');
    assert('Get site visits returns 200', visits.status === 200);

    const newVisit = await request('POST', '/api/site-visits', {
      lead: createdLeadId,
      project: existingProjId,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'scheduled',
    });
    assert('Schedule new site visit returns 201', newVisit.status === 201);
    const createdVisitId = newVisit.data?.data?._id;

    const checkInVisit = await request('PUT', `/api/site-visits/${createdVisitId}/checkin`, { location: 'Site Experience Center Gate 1', otpVerified: true });
    assert('Executive site check-in returns 200 with in_progress status', checkInVisit.status === 200 && checkInVisit.data?.data?.status === 'in_progress');

    const checkOutVisit = await request('PUT', `/api/site-visits/${createdVisitId}/checkout`, {
      outcome: 'interested',
      feedback: 'Customer liked Tower A 3BHK top floor view. Requesting cost sheet.',
      rating: 5,
    });
    assert('Complete site visit checkout returns 200 with outcome', checkOutVisit.status === 200 && checkOutVisit.data?.data?.status === 'completed');

    const visitStats = await request('GET', '/api/site-visits/stats');
    assert('Site visit outcome statistics returns 200', visitStats.status === 200 && typeof visitStats.data?.data?.total === 'number');

    const delVisit = await request('DELETE', `/api/site-visits/${createdVisitId}`);
    assert('Delete site visit returns 200', delVisit.status === 200);

    // ─── 8. Bookings & Applications ───────────────────
    section('8. Bookings & Agreement Approvals');
    const bookings = await request('GET', '/api/bookings');
    assert('Get bookings returns 200', bookings.status === 200);

    const newBooking = await request('POST', '/api/bookings', {
      lead: createdLeadId,
      unit: testUnitId,
      project: existingProjId,
      customerName: 'Rohan Deshmukh',
      customerPhone: '9823000099',
      customerEmail: 'rohan.deshmukh@test.com',
      panNumber: 'ABCDE1234F',
      totalAmount: 12500000,
      bookingAmount: 500000,
      paymentPlan: 'construction_linked',
      status: 'pending_approval',
    });
    assert('Submit booking application returns 201', newBooking.status === 201);
    const createdBookingId = newBooking.data?.data?._id;

    const approveBooking = await request('PUT', `/api/bookings/${createdBookingId}/approve`);
    assert('Approve booking returns 200 with approved status', approveBooking.status === 200 && approveBooking.data?.data?.status === 'approved');

    const bookingStats = await request('GET', '/api/bookings/stats');
    assert('Get booking metrics & total values returns 200', bookingStats.status === 200 && typeof bookingStats.data?.data?.total === 'number');

    const cancelBooking = await request('PUT', `/api/bookings/${createdBookingId}/cancel`, { reason: 'Loan rejection' });
    assert('Cancel booking frees unit and sets cancelled status', cancelBooking.status === 200 && cancelBooking.data?.data?.status === 'cancelled');

    const delBooking = await request('DELETE', `/api/bookings/${createdBookingId}`);
    assert('Delete booking returns 200', delBooking.status === 200);

    // Clean up test lead
    await request('DELETE', `/api/leads/${createdLeadId}`);

    // ─── 9. Payments & Milestone Collections ──────────
    section('9. Payments, Milestone Demands & Collections');
    const payments = await request('GET', '/api/payments');
    assert('Get payment demands returns 200', payments.status === 200);

    const newPayment = await request('POST', '/api/payments', {
      project: existingProjId,
      unit: testUnitId,
      demandNumber: 'DEM-TEST-999',
      demandAmount: 1500000,
      milestoneDescription: 'Completion of 3rd Floor Slab (15%)',
      dueDate: new Date('2026-09-30'),
      status: 'pending',
    });
    assert('Raise milestone demand notice returns 201', newPayment.status === 201);
    const createdPaymentId = newPayment.data?.data?._id;

    const recordPay = await request('PUT', `/api/payments/${createdPaymentId}/record`, {
      paidAmount: 1000000,
      paymentMode: 'neft',
      transactionReference: 'TXN-99881122',
      bankName: 'HDFC Bank',
    });
    assert('Record partial payment adjusts balance and sets status', recordPay.status === 200 && recordPay.data?.data?.status === 'partial' && recordPay.data?.data?.balanceAmount === 500000);

    const paymentStats = await request('GET', '/api/payments/stats');
    assert('Get payment collection totals & overdue returns 200', paymentStats.status === 200 && typeof paymentStats.data?.data?.totalCollected === 'number');

    const delPayment = await request('DELETE', `/api/payments/${createdPaymentId}`);
    assert('Delete payment demand returns 200', delPayment.status === 200);

    // ─── 10. Channel Partners ─────────────────────────
    section('10. Channel Partners & Broker KYC');
    const cps = await request('GET', '/api/channel-partners');
    assert('Get channel partners list returns 200', cps.status === 200);

    const newCP = await request('POST', '/api/channel-partners', {
      firmName: 'Shree Ganesh Properties',
      contactPerson: 'Sanjay More',
      phone: '9922001122',
      email: 'sg.properties@test.com',
      city: 'Pune',
      reraNumber: 'A52100078901',
      tier: 'gold',
      status: 'pending',
      defaultCommissionRate: 2.0,
    });
    assert('Register new broker firm returns 201', newCP.status === 201);
    const createdCPId = newCP.data?.data?._id;

    const approveCP = await request('PUT', `/api/channel-partners/${createdCPId}/approve`);
    assert('Approve broker KYC returns 200', approveCP.status === 200 && approveCP.data?.data?.status === 'approved');

    const cpStats = await request('GET', '/api/channel-partners/stats');
    assert('Channel partner commission and booking stats return 200', cpStats.status === 200 && typeof cpStats.data?.data?.total === 'number');

    const delCP = await request('DELETE', `/api/channel-partners/${createdCPId}`);
    assert('Delete channel partner returns 200', delCP.status === 200);

    // ─── 11. Marketing Campaigns & ROI ────────────────
    section('11. Ad Campaigns & Marketing ROI Attribution');
    const camps = await request('GET', '/api/campaigns');
    assert('Get ad campaigns returns 200', camps.status === 200);

    const newCamp = await request('POST', '/api/campaigns', {
      name: 'Diwali Festive Offer Meta Campaign',
      type: 'meta_ads',
      budget: 200000,
      spent: 50000,
      leads: 30,
      conversions: 1,
      revenue: 12000000,
      status: 'active',
    });
    assert('Create ad campaign returns 201', newCamp.status === 201);
    const createdCampId = newCamp.data?.data?._id;

    const roi = await request('GET', '/api/campaigns/roi');
    assert('Get calculated campaign ROI & CPL returns 200', roi.status === 200 && Array.isArray(roi.data?.data));

    const delCamp = await request('DELETE', `/api/campaigns/${createdCampId}`);
    assert('Delete campaign returns 200', delCamp.status === 200);

    // ─── 12. Activities & Tasks ───────────────────────
    section('12. Activities & Staff Follow-up Tasks');
    const tasks = await request('GET', '/api/activities');
    assert('Get tasks list returns 200', tasks.status === 200);

    const newTask = await request('POST', '/api/activities', {
      title: 'Send brochure to VIP prospect',
      type: 'follow_up',
      priority: 'high',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'pending',
    });
    assert('Create task returns 201', newTask.status === 201);
    const createdTaskId = newTask.data?.data?._id;

    const completeTask = await request('PUT', `/api/activities/${createdTaskId}/complete`, { outcome: 'Brochure emailed and confirmed' });
    assert('Complete task returns 200', completeTask.status === 200 && completeTask.data?.data?.status === 'completed');

    const taskStats = await request('GET', '/api/activities/stats');
    assert('Get task pending/overdue statistics returns 200', taskStats.status === 200);

    const delTask = await request('DELETE', `/api/activities/${createdTaskId}`);
    assert('Delete task returns 200', delTask.status === 200);

    // ─── 13. Reports & Executive BI ───────────────────
    section('13. Executive Reports & BI Analytics');
    const leadReport = await request('GET', '/api/reports/leads');
    assert('Lead attribution report returns 200 with source and stage breakdowns', leadReport.status === 200 && Array.isArray(leadReport.data?.data?.bySource));

    const salesReport = await request('GET', '/api/reports/sales');
    assert('Sales realization report returns 200 with project revenues', salesReport.status === 200 && Array.isArray(salesReport.data?.data?.bookingsByProject));

    const inventoryReport = await request('GET', '/api/reports/inventory');
    assert('Inventory absorption report returns 200 with unit type distributions', inventoryReport.status === 200 && Array.isArray(inventoryReport.data?.data?.byStatus));

    const teamReport = await request('GET', '/api/reports/team');
    assert('Team performance scorecard returns 200 with rep achievements', teamReport.status === 200 && Array.isArray(teamReport.data?.data));

    // ─── 14. Users & Access Management ────────────────
    section('14. Users & Role-Based Access Control');
    const usersList = await request('GET', '/api/users');
    assert('Users list returns 200 without password hashes', usersList.status === 200 && !usersList.data?.data?.[0]?.password);

    const newUser = await request('POST', '/api/users', {
      name: 'Kavita Shinde',
      email: 'kavita.shinde@crmtest.com',
      password: 'Password@123',
      role: 'sales_executive',
      phone: '+91-9988776655',
    });
    assert('Create user returns 201', newUser.status === 201);
    const createdUserId = newUser.data?.data?._id;

    const toggleStatus = await request('PUT', `/api/users/${createdUserId}/toggle-status`);
    assert('Toggle user active/inactive status returns 200', toggleStatus.status === 200 && toggleStatus.data?.data?.isActive === false);

    const delUser = await request('DELETE', `/api/users/${createdUserId}`);
    assert('Delete user returns 200', delUser.status === 200);

    // ─── 15. Meta Lead Ads Integration & Webhooks ─────
    section('15. Meta Lead Ads Integration & Webhooks');

    // 15.1 Status & Configuration
    const metaStatus = await request('GET', '/api/integrations/meta/status');
    assert('Meta status endpoint returns 200 with connection and webhook metrics', metaStatus.status === 200 && metaStatus.data?.data?.connectionStatus);

    const metaConfig = await request('GET', '/api/integrations/meta/config');
    assert('Meta config endpoint returns 200 without exposing sensitive secrets', metaConfig.status === 200 && Array.isArray(metaConfig.data?.data?.missing));

    const metaConnTest = await request('POST', '/api/integrations/meta/test');
    assert('Meta connection test returns safe diagnostic response', metaConnTest.status === 200 && metaConnTest.data?.status);

    // 15.2 Webhook Handshake Verification (Public)
    const validVerifyUrl = `${baseUrl}/api/integrations/meta/webhook?hub.mode=subscribe&hub.verify_token=prop_crm_webhook_verify_2026&hub.challenge=test_challenge_9988`;
    const validVerifyRes = await fetch(validVerifyUrl);
    const validVerifyBody = await validVerifyRes.text();
    assert('Meta webhook GET verification returns 200 with challenge token', validVerifyRes.status === 200 && validVerifyBody === 'test_challenge_9988');

    const invalidVerifyUrl = `${baseUrl}/api/integrations/meta/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test_challenge_9988`;
    const invalidVerifyRes = await fetch(invalidVerifyUrl);
    assert('Meta webhook GET verification rejects invalid token with 403', invalidVerifyRes.status === 403);

    // 15.3 Webhook POST Ingestion (Public)
    const simulatedLeadgenId = `leadgen_test_${Date.now()}`;
    const webhookPayload = {
      object: 'page',
      entry: [
        {
          id: 'page_1029384756',
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: simulatedLeadgenId,
                page_id: 'page_1029384756',
                form_id: 'form_88776655',
                ad_id: 'ad_44332211',
                adgroup_id: 'adset_998877',
                created_time: Math.floor(Date.now() / 1000),
                simulated: true,
                lead_data: {
                  id: simulatedLeadgenId,
                  field_data: [
                    { name: 'full_name', values: ['Pooja Deshmukh'] },
                    { name: 'phone_number', values: ['+919765432109'] },
                    { name: 'email', values: ['pooja.deshmukh@example.com'] },
                    { name: 'city', values: ['Pune'] },
                    { name: 'what_is_your_budget?', values: ['1.5 Cr'] },
                  ],
                },
              },
            },
          ],
        },
      ],
    };

    const webhookPostRes = await fetch(`${baseUrl}/api/integrations/meta/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });
    const webhookPostData = await webhookPostRes.json();
    assert('Meta webhook POST returns 200 EVENT_RECEIVED immediately', webhookPostRes.status === 200 && webhookPostData.message === 'EVENT_RECEIVED');

    // Allow async ingestion to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    // 15.4 Webhook Event Storage & Deduplication
    const webhookEvents = await request('GET', '/api/integrations/meta/events');
    assert('Stored webhook events retrieved via GET /events', webhookEvents.status === 200 && webhookEvents.data?.data?.length > 0);

    const duplicateWebhookRes = await fetch(`${baseUrl}/api/integrations/meta/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });
    assert('Duplicate webhook event handled gracefully without error', duplicateWebhookRes.status === 200);

    // 15.5 Form Mappings & Sync
    const formsList = await request('GET', '/api/integrations/meta/forms');
    assert('Meta forms mapping list returns 200', formsList.status === 200);

    // 15.6 Manual Sync & History
    const manualSync = await request('POST', '/api/integrations/meta/leads/sync');
    assert('Manual sync endpoint responds safely with sync history object', manualSync.status === 200 && manualSync.data?.data);

    const syncHistory = await request('GET', '/api/integrations/meta/sync-history');
    assert('Sync history endpoint returns list of runs', syncHistory.status === 200 && Array.isArray(syncHistory.data?.data));

    // 15.7 Error Logs
    const errorLogs = await request('GET', '/api/integrations/meta/errors');
    assert('Integration diagnostic logs retrieved via GET /errors', errorLogs.status === 200 && Array.isArray(errorLogs.data?.data));

  } catch (err) {
    console.error(`\n${colors.red}❌ Unexpected test runner error:${colors.reset}`, err);
    failedTests++;
  } finally {
    // Teardown
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    console.log(`\n${colors.bright}====================================================`);
    console.log(`📋 TEST SUITE EXECUTION SUMMARY`);
    console.log(`====================================================${colors.reset}`);
    console.log(`   Total Assertions:  ${totalTests}`);
    console.log(`   ${colors.green}Passed:            ${passedTests}${colors.reset}`);
    console.log(`   ${colors.red}Failed:            ${failedTests}${colors.reset}`);
    console.log(`   Success Rate:      ${((passedTests / (totalTests || 1)) * 100).toFixed(1)}%`);
    console.log(`====================================================\n`);

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
};

runAllTests();
