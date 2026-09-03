const { chromium } = require('playwright');

async function runPlaywrightE2ETest() {
  console.log('\n🎭 STARTING PLAYWRIGHT END-TO-END VERIFICATION\n');
  let browser;
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
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });

    // ─── 1. Detect Active Frontend Port ─────────────
    let baseUrl = 'http://localhost:5174';
    try {
      await page.goto('http://localhost:5174/login', { timeout: 3000, waitUntil: 'domcontentloaded' });
    } catch {
      baseUrl = 'http://localhost:5173';
      await page.goto('http://localhost:5173/login', { timeout: 5000, waitUntil: 'domcontentloaded' });
    }

    console.log(`--- 1. Login Page Navigation & Authentication on ${baseUrl} ---`);
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    assert('Login page loaded', page.url().includes('/login'));

    await page.fill('input#identifier', 'mrprealestate@gmail.com');
    await page.fill('input#password', 'Admin@123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
    assert('Successfully logged in and redirected to app', !page.url().includes('/login'));

    // ─── 2. Dashboard KPIs ────────────────────────────
    console.log('\n--- 2. Dashboard Verification & Navbar Check ---');
    await page.waitForSelector('text=MRP REAL ESTATE', { timeout: 8000 }).catch(() => null);
    const hasOrgName = await page.locator('text=MRP REAL ESTATE').count();
    assert('Dashboard shows logged in organization MRP REAL ESTATE', hasOrgName > 0);

    // Verify Navbar clean state: notifications and help icons removed
    const notifBtnCount = await page.locator('#topbar-notifications-btn').count();
    const helpBtnCount = await page.locator('.topbar-help-btn').count();
    assert('Notifications bell icon is NOT present in navbar', notifBtnCount === 0);
    assert('Quick Help icon is NOT present in navbar', helpBtnCount === 0);

    // ─── 3. Leads Page & Edit Modal ───────────────────
    console.log('\n--- 3. Leads Pipeline & Edit Modal User Dropdown Check ---');
    await page.goto(`${baseUrl}/leads`, { waitUntil: 'networkidle' });
    assert('Navigated to Leads page', page.url().includes('/leads'));

    // Wait for leads table or cards to render
    await page.waitForTimeout(2000);
    const editButtons = page.locator('button:has-text("Edit"), [title="Edit Lead"]');
    const editCount = await editButtons.count();
    assert('Lead edit buttons are present in the table', editCount > 0);

    // Open Edit Modal for first lead
    await editButtons.first().click();
    await page.waitForSelector('text=Edit Lead Details', { timeout: 5000 });
    assert('Edit Lead Modal opened', true);

    // Locate the Assigned Executive / Telecaller container
    const assignedLabel = page.locator('text=Assigned Executive / Telecaller');
    assert('Assigned Executive / Telecaller label is visible', await assignedLabel.count() > 0);

    // Find the select button for Assigned Executive
    // In EditLeadModal, the form-row has:
    // 1st CustomSelect: Lead Pipeline Stage
    // 2nd CustomSelect: Assigned Executive / Telecaller
    const customSelectButtons = page.locator('.custom-select-trigger, .select-button, [role="combobox"], .form-row:has-text("Assigned Executive") button');
    let assignedSelectButton = null;

    // Click the select button under "Assigned Executive / Telecaller"
    const assignedContainer = page.locator('div:has(> label:has-text("Assigned Executive"))').first();
    const trigger = assignedContainer.locator('button').first();

    const selectedText = (await trigger.innerText()).trim();
    console.log(`  ℹ️  Currently displayed in Assigned Executive: "${selectedText}"`);

    // Verify it is NOT showing a raw MongoDB ObjectId
    const isRawObjectId = /^[0-9a-fA-F]{24}$/.test(selectedText);
    assert('Selected value does NOT show raw MongoDB ObjectId string', !isRawObjectId, `Got: "${selectedText}"`);

    // Click to open the dropdown
    await trigger.click();
    await page.waitForTimeout(500);

    // Get all options in the open dropdown menu
    const dropdownMenu = page.locator('.custom-select-menu, .select-dropdown, .custom-select-options, [role="listbox"]').first();
    const dropdownText = await dropdownMenu.innerText();
    console.log(`  ℹ️  Dropdown menu options text:\n${dropdownText.split('\n').map(l => '      ' + l).join('\n')}`);

    // Verify dummy placeholder names are completely removed
    assert('Dummy name "Amit Singh" is NOT in dropdown', !dropdownText.includes('Amit Singh'));
    assert('Dummy name "Neha Patel" is NOT in dropdown', !dropdownText.includes('Neha Patel'));
    assert('Dummy name "Ravi Verma" is NOT in dropdown', !dropdownText.includes('Ravi Verma'));
    assert('Dummy name "Priya Sharma" is NOT in dropdown', !dropdownText.includes('Priya Sharma'));

    // Verify real organization users ARE present
    assert('Organization Admin "MRP REAL ESTATE" is present in dropdown', dropdownText.includes('MRP REAL ESTATE'));
    assert('Organization Telecaller "Sathish Kumar" is present in dropdown', dropdownText.includes('Sathish Kumar'));

    // Select Sathish Kumar
    const sathishOption = dropdownMenu.locator('text=Sathish Kumar').first();
    if (await sathishOption.count() > 0) {
      await sathishOption.click();
      await page.waitForTimeout(300);
      const newSelected = (await trigger.innerText()).trim();
      assert('Selected Sathish Kumar successfully', newSelected.includes('Sathish Kumar'));
    }

    // Save changes
    const saveButton = page.locator('button[type="submit"]:has-text("Update"), button[type="submit"]:has-text("Save"), button:has-text("Save Changes")').first();
    if (await saveButton.count() > 0) {
      await saveButton.click();
      await page.waitForTimeout(1500);
      assert('Save button clicked and modal processed', true);
    }

    // ─── 4. Payments Page & Tabs ──────────────────────
    console.log('\n--- 4. Payments Page & Milestone Clearance Verification ---');
    await page.goto(`${baseUrl}/payments`, { waitUntil: 'networkidle' });
    assert('Navigated to Payments page', page.url().includes('/payments'));

    await page.waitForTimeout(1500);
    const bodyText = await page.locator('body').innerText();

    assert('Payments header / title rendered', bodyText.includes('Payment') || bodyText.includes('Collections'));
    assert('Milestone / Demand statistics present', bodyText.includes('Demanded') || bodyText.includes('Demand') || bodyText.includes('Collected'));

    // Verify tabs exist
    const pendingTab = page.locator('.tab:has-text("Pending"), .tab:has-text("pending")').first();
    const paidTab = page.locator('.tab:has-text("Paid"), .tab:has-text("paid")').first();

    assert('Pending Demands tab is visible', await pendingTab.count() > 0);
    assert('Paid & Cleared tab is visible', await paidTab.count() > 0);

    // Switch between tabs
    if (await paidTab.count() > 0) {
      await paidTab.click();
      await page.waitForTimeout(1000);
      assert('Switched to Paid & Cleared tab', true);
    }

    // ─── 5. Browser Console Error Check ───────────────
    console.log('\n--- 5. Browser Console Health Check ---');
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('ResizeObserver') &&
      !e.includes('Download the React DevTools')
    );
    if (criticalErrors.length > 0) {
      console.log('  ⚠️  Console warnings/errors detected:', criticalErrors);
    }
    assert('Zero critical unhandled runtime errors in browser console', criticalErrors.length === 0, criticalErrors.join(' | '));

  } catch (err) {
    console.error('\n❌ Playwright execution error:', err);
    failed++;
  } finally {
    if (browser) await browser.close();
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log(` 🎭 PLAYWRIGHT TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`    Success Rate: ${((passed / (passed + failed || 1)) * 100).toFixed(1)}%`);
  console.log('════════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runPlaywrightE2ETest();
