require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('../index');

let server;
let port;
let token = 'jwt_superadmin_root_token_verify_suite';
let superAdminToken = 'jwt_superadmin_root_token_verify_suite';

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    const reqOptions = {
      hostname: 'localhost',
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

async function runTests() {
  console.log('🚀 Starting CRM Full System & Workflow Verification Suite...\n');
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

  try {
    // 1. Health & Server Metrics
    console.log('--- 1. System Health, Metrics & Load Balancing ---');
    const health = await request('/api/health');
    assert('Health Check Endpoint returns 200', health.status === 200);
    assert('Health reports uptime and CPU cores', typeof health.body?.cpuCores === 'number');
    assert('Security Headers present (helmet)', !!health.headers['x-content-type-options']);

    // 2. Auth Endpoints
    console.log('\n--- 2. Authentication & RBAC ---');
    const testEmail = `realty_${Date.now()}@hub.com`;
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'New Realty Partner',
        email: testEmail,
        password: 'Password@123',
        organization: 'Apex Realty Developers',
        role: 'admin'
      }
    });
    assert('Register new RealtyHub account returns 201', regRes.status === 201);
    assert('Registration returns JWT token and user object', !!regRes.body?.token && !!regRes.body?.user);

    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: 'Password@123' }
    });
    assert('Login with registered email & password returns 200', loginRes.status === 200);
    if (loginRes.body?.token) {
      token = loginRes.body.token;
      superAdminToken = token;
      assert('JWT token received on Login', !!token);
    }

    // 3. Projects API with Multi-Approvals
    console.log('\n--- 3. Projects API & Multi-Approvals System ---');
    const projectsRes = await request('/api/projects');
    assert('Get Projects returns 200', projectsRes.status === 200);
    assert('Projects list is an array', Array.isArray(projectsRes.body?.data));

    // Test creating a project with multiple approvals
    const newProjCode = `TEST-${Date.now().toString().slice(-4)}`;
    const createProjRes = await request('/api/projects', {
      method: 'POST',
      body: {
        name: 'Azure Tech Palms',
        code: newProjCode,
        city: 'Hyderabad',
        address: 'Hitech City Phase 2',
        type: 'residential_apartment',
        categoryDetails: {
          approvals: ['RERA Approved', 'DTCP Approved', 'HMDA Approved', 'Bank Approved (SBI/HDFC)'],
          approvalBody: 'RERA Approved, DTCP Approved, HMDA Approved, Bank Approved (SBI/HDFC)',
          totalAcres: 15,
          extentUnit: 'Acres'
        },
        totalUnits: 180,
        priceRange: { min: 7500000, max: 22000000 }
      }
    });
    assert('Create Project with Multiple Approvals returns 201', createProjRes.status === 201);
    const createdProj = createProjRes.body?.data;
    assert('Created Project contains approvals array', Array.isArray(createdProj?.categoryDetails?.approvals) && createdProj.categoryDetails.approvals.length === 4);

    // 4. Leads API
    console.log('\n--- 4. Leads API & Ingestion ---');
    const leadsRes = await request('/api/leads?limit=10');
    assert('Get Leads returns 200', leadsRes.status === 200);
    assert('Leads response is an array', Array.isArray(leadsRes.body?.data));

    const testLeadRes = await request('/api/leads', {
      method: 'POST',
      body: {
        name: 'Rahul Varma',
        phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `rahul.varma.${Date.now()}@example.com`,
        source: 'meta_ads',
        interestedProject: createdProj?._id
      }
    });
    assert('Create Lead returns 201', testLeadRes.status === 201);
    const createdLead = testLeadRes.body?.data;

    // 5. Site Visits API
    console.log('\n--- 5. Site Visits API ---');
    const siteVisitsRes = await request('/api/site-visits');
    assert('Get Site Visits returns 200', siteVisitsRes.status === 200);

    const createVisitRes = await request('/api/site-visits', {
      method: 'POST',
      body: {
        lead: createdLead?._id,
        project: createdProj?._id,
        scheduledDate: new Date(),
        visitType: 'first_visit',
        notes: 'Interested in 3 BHK corner unit'
      }
    });
    assert('Schedule Site Visit returns 201', createVisitRes.status === 201);

    // 6. Bookings API
    console.log('\n--- 6. Bookings API ---');
    const bookingsRes = await request('/api/bookings');
    assert('Get Bookings returns 200', bookingsRes.status === 200);

    const createBookingRes = await request('/api/bookings', {
      method: 'POST',
      body: {
        customerName: createdLead?.name || 'Rahul Varma',
        customerPhone: createdLead?.phone || '+91 98000 12345',
        customerEmail: createdLead?.email || 'rahul@example.com',
        project: createdProj?._id,
        totalAmount: 9500000,
        tokenAmount: 500000,
        paymentPlan: 'construction_linked'
      }
    });
    assert('Create Booking returns 201', createBookingRes.status === 201);
    const createdBooking = createBookingRes.body?.data;
    assert('Admin booking is auto-approved without requiring approval', createdBooking?.status === 'approved');

    // Test Delete Booking
    const tempBookingRes = await request('/api/bookings', {
      method: 'POST',
      body: {
        customerName: 'Temp Deletable Booking',
        customerPhone: '9999900000',
        totalAmount: 5000000
      }
    });
    if (tempBookingRes.body?.data?._id) {
      const deleteBookingRes = await request(`/api/bookings/${tempBookingRes.body.data._id}`, { method: 'DELETE' });
      assert('Delete Booking returns 200', deleteBookingRes.status === 200);
    }

    // 7. Payments API
    console.log('\n--- 7. Payments API ---');
    const paymentsRes = await request('/api/payments');
    assert('Get Payments returns 200', paymentsRes.status === 200);

    if (createdBooking?._id) {
      const paymentRes = await request('/api/payments', {
        method: 'POST',
        body: {
          booking: createdBooking._id,
          demandAmount: 500000,
          paidAmount: 500000,
          paymentMode: 'neft',
          transactionReference: `TXN-${Date.now()}`,
          status: 'paid'
        }
      });
      assert('Record Payment returns 201', paymentRes.status === 201);
    }

    // 8. Tasks & Activities API
    console.log('\n--- 8. Tasks & Activities API ---');
    const tasksRes = await request('/api/activities');
    assert('Get Tasks returns 200', tasksRes.status === 200);

    const createTaskRes = await request('/api/activities', {
      method: 'POST',
      body: {
        title: 'Follow-up on Agreement Signature',
        type: 'call',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000),
        lead: createdLead?._id
      }
    });
    assert('Create Activity Task returns 201', createTaskRes.status === 201);

    // 9. Reports & Dynamic Aggregation
    console.log('\n--- 9. Reports & Dynamic Aggregations ---');
    const reportsRes = await request('/api/reports/leads');
    assert('Lead Reports Endpoint returns 200', reportsRes.status === 200);

    const financeReportRes = await request('/api/reports/finance');
    assert('Finance Reports Endpoint returns 200', financeReportRes.status === 200);
    assert('Finance Reports returns summary object', !!financeReportRes.body?.data?.summary);

    const dashStatsRes = await request('/api/dashboard/stats');
    assert('Dashboard Stats returns 200 with finance KPIs', dashStatsRes.status === 200 && !!dashStatsRes.body?.data?.finance);

    // 10. Cache Validation
    console.log('\n--- 10. Cache & Performance Headers ---');
    const cached1 = await request('/api/projects');
    const cached2 = await request('/api/projects');
    assert('Second read has Cache HIT header', cached2.headers['x-cache'] === 'HIT');

    // 11. Clean Up Test Data
    if (createdProj?._id) {
      await request(`/api/projects/${createdProj._id}`, { method: 'DELETE' });
    }
    if (createdLead?._id) {
      await request(`/api/leads/${createdLead._id}`, { method: 'DELETE' });
    }

    console.log(`\n========================================`);
    console.log(`🏁 Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Start temporary test server
server = app.listen(0, () => {
  port = server.address().port;
  runTests();
});
