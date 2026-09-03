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

async function runTest() {
  console.log('🚀 Verifying all new CRM enhancements & features...\n');
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

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      console.log(`📡 Test server running on port ${port}\n`);
      resolve();
    });
  });

  try {
    // 1. Auth Login
    console.log('--- 1. Auth Setup ---');
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'mrprealestate@gmail.com', password: 'Admin@123' }
    });
    assert('Admin login returns 200', loginRes.status === 200);
    token = loginRes.body?.token;
    const adminUser = loginRes.body?.user;

    // 2. Lead Creation with Site Visit Scheduling
    console.log('\n--- 2. Lead Creation & Direct Site Visit Scheduling ---');
    const leadRes = await request('/api/leads', {
      method: 'POST',
      body: {
        name: 'Suresh Raina',
        phone: '9876500112',
        email: 'suresh.raina@demo.com',
        source: 'website',
        stage: 'site_visit_scheduled',
        leadType: 'hot',
        interestedUnitType: 'Managed Farmlands',
        budget: { min: 4500000, max: 8500000 },
        notes: 'Interested in 1.5 Acre Red Soil Farmland with Teak Trees'
      }
    });
    assert('Create lead returns 201', leadRes.status === 201);
    const newLead = leadRes.body?.data;
    assert('Lead created with stage site_visit_scheduled', newLead?.stage === 'site_visit_scheduled');

    // Create Site Visit linked to lead
    const svRes = await request('/api/site-visits', {
      method: 'POST',
      body: {
        lead: newLead?._id,
        scheduledDate: new Date(Date.now() + 86400000 * 2),
        scheduledTime: '11:00 AM',
        pickupRequired: true,
        pickupLocation: 'Kanakapura Metro Station',
        notes: 'Family visit for Farmland inspection'
      }
    });
    assert('Schedule direct site visit returns 201', svRes.status === 201);

    // 3. Lead Reassignment mid-process
    console.log('\n--- 3. Mid-Process Lead Reassignment ---');
    const assignRes = await request(`/api/leads/${newLead?._id}/assign`, {
      method: 'PUT',
      body: { assignedTo: adminUser?._id }
    });
    assert('Reassign lead returns 200', assignRes.status === 200);
    assert('Lead assignedTo matches adminUser id', assignRes.body?.data?.assignedTo?._id === adminUser?._id);

    // 4. Inventory Creation with Trees Count, Trees Type & Decimal Extent
    console.log('\n--- 4. Inventory Farm Land Trees & Decimal Extent ---');
    const projects = await request('/api/projects');
    const testProjId = projects.body?.data?.[0]?._id;

    const unitRes = await request('/api/inventory', {
      method: 'POST',
      body: {
        project: testProjId,
        unitNumber: `FL-${Date.now().toString().slice(-4)}`,
        type: 'Managed Farmlands',
        propertyType: 'farmland',
        area: {
          extent: 1.25, // Fractional / decimal extent (1.25 Acres)
          unit: 'acre',
          sqft: 54450
        },
        agriculturalDetails: {
          treesType: 'Teakwood & Sandalwood',
          treesCount: 180,
          treesAge: '4 Years Mature',
          soilType: 'red_soil',
          irrigation: 'automated_drip',
          fencing: 'chain_link'
        },
        pricing: {
          baseRate: 3500000,
          rateType: 'per_acre',
          totalPrice: 4375000
        },
        status: 'available'
      }
    });
    assert('Create farm land unit with decimal extent & trees returns 201', unitRes.status === 201);
    const createdUnit = unitRes.body?.data;
    assert('Unit has decimal extent 1.25', createdUnit?.area?.extent === 1.25, `Got: ${createdUnit?.area?.extent}`);
    assert('Unit has treesCount 180', createdUnit?.agriculturalDetails?.treesCount === 180, `Got: ${createdUnit?.agriculturalDetails?.treesCount}`);
    assert('Unit has treesType Teakwood & Sandalwood', createdUnit?.agriculturalDetails?.treesType === 'Teakwood & Sandalwood', `Got: ${createdUnit?.agriculturalDetails?.treesType}`);

    // 5. Custom Buyer Requirements Module
    console.log('\n--- 5. Custom Buyer Requirements Dashboard API ---');
    const reqCreate = await request('/api/buyer-requirements', {
      method: 'POST',
      body: {
        customerName: 'Vikram Sethi',
        phone: '9845012345',
        email: 'vikram.sethi@gmail.com',
        city: 'Bangalore',
        category: 'farmland',
        purpose: 'weekend_farmhouse',
        preferredLocations: ['Kanakapura Road', 'Sarjapur'],
        preferredSoil: 'red_soil',
        waterSourceRequired: 'borewell',
        minExtent: 1,
        maxExtent: 2.5,
        extentUnit: 'Acres',
        budgetMin: 3500000,
        budgetMax: 6000000,
        priority: 'hot',
        status: 'sourcing_in_progress',
        notes: 'Looking for 1-2.5 Acres with ready borewell and red soil for weekend retreat.'
      }
    });
    assert('Create buyer requirement returns 201', reqCreate.status === 201);
    const newReq = reqCreate.body?.data;
    assert('Buyer requirement priority is hot', newReq?.priority === 'hot');
    assert('Buyer requirement budgetMax is 6000000', newReq?.budgetMax === 6000000);

    const reqList = await request('/api/buyer-requirements');
    assert('Get /api/buyer-requirements returns 200', reqList.status === 200);
    assert('Buyer requirements list has entries', Array.isArray(reqList.body?.data) && reqList.body?.data?.length > 0);

    const matchRes = await request(`/api/buyer-requirements/${newReq?._id}/match-inventory`);
    assert('Match inventory for requirement returns 200', matchRes.status === 200);
    assert('Matching returns matched units array', Array.isArray(matchRes.body?.data));

    const reqStats = await request('/api/buyer-requirements/stats');
    assert('Get /api/buyer-requirements/stats returns 200', reqStats.status === 200);
    assert('Stats contains totalRequirements > 0', reqStats.body?.data?.totalRequirements > 0);
    assert('Stats contains totalBudgetPool > 0', reqStats.body?.data?.totalBudgetPool > 0);

    console.log(`\n========================================`);
    console.log(`🏁 All New Features Verification: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================`);

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    if (server) server.close();
    process.exit(failed === 0 ? 0 : 1);
  }
}

runTest();
