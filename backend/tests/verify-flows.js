const http = require('http');
const mongoose = require('mongoose');
const app = require('../index');

let server;
let port;
let token = '';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    const reqOptions = {
      hostname: '127.0.0.1',
      port: port,
      path: path,
      method: options.method || 'GET',
      headers: { ...defaultHeaders, ...(options.headers || {}) }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('🚀 Running Complete CRM End-to-End Flow Verification with latest in-memory app...\n');
  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${extra}`);
      failed++;
    }
  }

  // Start temporary server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      console.log(`📡 Fresh server instance running on port ${port}\n`);
      resolve();
    });
  });

  try {
    // 1. Health
    console.log('--- 1. Health & Server Metrics ---');
    const health = await request('/api/health');
    assert('Health endpoint returns 200 OK', health.status === 200);

    // 2. Authentication Flow
    console.log('\n--- 2. Authentication Flow ---');
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'mrprealestate@gmail.com', password: 'Admin@123' }
    });
    assert('Admin login returns 200', loginRes.status === 200, JSON.stringify(loginRes.body));
    token = loginRes.body?.token;
    assert('JWT token received', !!token);
    assert('User organization is MRP REAL ESTATE', loginRes.body?.user?.organization === 'MRP REAL ESTATE');

    // Current user /me
    const meRes = await request('/api/auth/me');
    assert('/api/auth/me returns current user', meRes.status === 200 && meRes.body?.user?.email === 'mrprealestate@gmail.com');

    // 3. Dashboard Stats & Finance Metrics Flow
    console.log('\n--- 3. Dashboard Stats & Finance Flow ---');
    const dashRes = await request('/api/dashboard/stats');
    assert('Dashboard stats returns 200', dashRes.status === 200);
    const finance = dashRes.body?.data?.finance;
    assert('Finance object present in stats', !!finance);
    assert('Finance totalDemandRaised > 0', typeof finance?.totalDemandRaised === 'number' && finance?.totalDemandRaised > 0, `Got: ${finance?.totalDemandRaised}`);
    assert('Finance totalPaidCollected > 0', typeof finance?.totalPaidCollected === 'number' && finance?.totalPaidCollected > 0, `Got: ${finance?.totalPaidCollected}`);
    assert('Finance totalOutstanding >= 0', typeof finance?.totalOutstanding === 'number' && finance?.totalOutstanding >= 0, `Got: ${finance?.totalOutstanding}`);
    assert('Finance realizationRate calculated', typeof finance?.realizationRate === 'number', `Got: ${finance?.realizationRate}`);
    console.log(`     📊 Demands: ₹${finance?.totalDemandRaised}, Collected: ₹${finance?.totalPaidCollected}, Outstanding: ₹${finance?.totalOutstanding}, Realization: ${finance?.realizationRate}%`);

    // 4. Payments & Collections Flow
    console.log('\n--- 4. Payments & Collections Flow ---');
    const payRes = await request('/api/payments');
    assert('Get /api/payments returns 200', payRes.status === 200);
    assert('Payments list is an array', Array.isArray(payRes.body?.data));
    const payStatsRes = await request('/api/payments/stats');
    assert('Get /api/payments/stats returns 200', payStatsRes.status === 200);
    assert('Payments stats totalDemand matches dashboard', payStatsRes.body?.data?.totalDemand === finance?.totalDemandRaised, `PayStats: ${payStatsRes.body?.data?.totalDemand} vs Dash: ${finance?.totalDemandRaised}`);
    assert('Payments stats outstanding matches dashboard', payStatsRes.body?.data?.outstanding === finance?.totalOutstanding, `PayStats: ${payStatsRes.body?.data?.outstanding} vs Dash: ${finance?.totalOutstanding}`);

    // 5. Leads Management Flow
    console.log('\n--- 5. Leads Management Flow ---');
    const leadsRes = await request('/api/leads');
    assert('Get /api/leads returns 200', leadsRes.status === 200);
    assert('Leads list is an array', Array.isArray(leadsRes.body?.data));
    const leadStatsRes = await request('/api/leads/stats/stages');
    assert('Get /api/leads/stats/stages returns 200', leadStatsRes.status === 200);

    // 6. Inventory Flow
    console.log('\n--- 6. Inventory & Units Flow ---');
    const invRes = await request('/api/inventory');
    assert('Get /api/inventory returns 200', invRes.status === 200);
    assert('Inventory list is an array', Array.isArray(invRes.body?.data));
    const matrixRes = await request('/api/inventory/matrix');
    assert('Get /api/inventory/matrix returns 200', matrixRes.status === 200);

    // 7. Projects Flow
    console.log('\n--- 7. Projects Flow ---');
    const projRes = await request('/api/projects');
    assert('Get /api/projects returns 200', projRes.status === 200);
    assert('Projects list is an array', Array.isArray(projRes.body?.data));

    // 8. Bookings Flow
    console.log('\n--- 8. Bookings Flow ---');
    const bookRes = await request('/api/bookings');
    assert('Get /api/bookings returns 200', bookRes.status === 200);
    assert('Bookings list is an array', Array.isArray(bookRes.body?.data));
    const bookAliasRes = await request('/api/booking');
    assert('Get /api/booking (singular alias) returns 200', bookAliasRes.status === 200);
    const bookStatsRes = await request('/api/bookings/stats');
    assert('Get /api/bookings/stats returns 200', bookStatsRes.status === 200);

    // 9. Site Visits Flow
    console.log('\n--- 9. Site Visits Flow ---');
    const svRes = await request('/api/site-visits');
    assert('Get /api/site-visits returns 200', svRes.status === 200);
    assert('Site visits list is an array', Array.isArray(svRes.body?.data));

    // 10. Reports Flow
    console.log('\n--- 10. Reports & Analytics Flow ---');
    const repLeads = await request('/api/reports/leads');
    assert('Get /api/reports/leads returns 200', repLeads.status === 200);
    const repFinance = await request('/api/reports/finance');
    assert('Get /api/reports/finance returns 200', repFinance.status === 200);
    assert('Reports finance totalDemanded matches dashboard', repFinance.body?.data?.summary?.totalDemanded === finance?.totalDemandRaised, `Reports: ${repFinance.body?.data?.summary?.totalDemanded} vs Dash: ${finance?.totalDemandRaised}`);
    assert('Reports finance totalOutstanding matches dashboard', repFinance.body?.data?.summary?.totalOutstanding === finance?.totalOutstanding, `Reports: ${repFinance.body?.data?.summary?.totalOutstanding} vs Dash: ${finance?.totalOutstanding}`);

    // 11. Tasks & Activities Flow
    console.log('\n--- 11. Tasks & Follow-up Activities Flow ---');
    const actRes = await request('/api/activities');
    assert('Get /api/activities returns 200', actRes.status === 200);
    const taskRes = await request('/api/activities/tasks');
    assert('Get /api/activities/tasks returns 200', taskRes.status === 200);
    const taskStatsRes = await request('/api/activities/tasks/stats');
    assert('Get /api/activities/tasks/stats returns 200', taskStatsRes.status === 200);

    // Summary
    console.log(`\n========================================`);
    console.log(`🏁 Verification Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================`);

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    if (server) server.close();
    process.exit(failed === 0 ? 0 : 1);
  }
}

runVerification();
