const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

async function runPostmanCollection() {
  const collectionPath = path.join(__dirname, 'RealEstate_CRM.postman_collection.json');
  const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

  console.log(`\n${colors.bright}${colors.cyan}══════════════════════════════════════════════════════════════`);
  console.log(` 📮 POSTMAN COLLECTION RUNNER: ${collection.info.name}`);
  console.log(`══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Context variables
  const variables = {};
  (collection.variable || []).forEach(v => {
    variables[v.key] = v.value;
  });

  const replaceVars = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => variables[key] ?? '');
  };

  let totalRequests = collection.item.length;
  let totalAssertions = 0;
  let passedAssertions = 0;
  let failedAssertions = 0;

  for (let i = 0; i < collection.item.length; i++) {
    const item = collection.item[i];
    const req = item.request;
    const method = req.method;
    const rawUrl = replaceVars(req.url.raw);

    const headers = {};
    (req.header || []).forEach(h => {
      headers[h.key] = replaceVars(h.value);
    });

    let body = undefined;
    if (req.body && req.body.raw) {
      body = replaceVars(req.body.raw);
    }

    console.log(`${colors.bright}${colors.blue}▶ [${i + 1}/${totalRequests}] ${method} ${rawUrl}${colors.reset}`);
    console.log(`  ${colors.magenta}Item:${colors.reset} ${item.name}`);

    let response;
    let resJson;
    let resStatus = 0;
    try {
      const res = await fetch(rawUrl, {
        method,
        headers,
        body
      });
      resStatus = res.status;
      try {
        resJson = await res.json();
      } catch {
        resJson = null;
      }
      response = { status: resStatus, json: () => resJson };
    } catch (err) {
      console.log(`  ${colors.red}✖ Request failed: ${err.message}${colors.reset}\n`);
      continue;
    }

    // Build Postman environment
    const pm = {
      response: {
        to: {
          have: {
            status: (expected) => {
              if (resStatus !== expected) {
                throw new Error(`Expected status ${expected} but got ${resStatus}`);
              }
            }
          }
        },
        json: () => resJson
      },
      expect: (actual) => {
        return {
          to: {
            eql: (expected) => {
              if (actual !== expected) throw new Error(`Expected "${expected}" but got "${actual}"`);
            },
            be: {
              a: (type) => {
                if (typeof actual !== type) throw new Error(`Expected type "${type}" but got "${typeof actual}"`);
              },
              at: {
                least: (num) => {
                  if (actual < num) throw new Error(`Expected at least ${num} but got ${actual}`);
                }
              },
              get true() {
                if (actual !== true) throw new Error(`Expected true but got ${actual}`);
                return true;
              },
              get false() {
                if (actual !== false) throw new Error(`Expected false but got ${actual}`);
                return true;
              },
              an: (type) => {
                if (type === 'object' && typeof actual === 'object' && actual !== null) return true;
                if (typeof actual !== type) throw new Error(`Expected type "${type}" but got "${typeof actual}"`);
              },
              get undefined() {
                if (actual !== undefined) throw new Error(`Expected undefined but got ${JSON.stringify(actual)}`);
                return true;
              }
            },
            have: {
              property: (prop) => {
                if (!actual || !(prop in actual)) throw new Error(`Missing property "${prop}"`);
              },
              status: (expected) => {
                if (resStatus !== expected) throw new Error(`Expected status ${expected} but got ${resStatus}`);
              }
            }
          }
        };
      },
      test: (testName, testFn) => {
        totalAssertions++;
        try {
          testFn();
          passedAssertions++;
          console.log(`    ${colors.green}✔ ${testName}${colors.reset}`);
        } catch (err) {
          failedAssertions++;
          console.log(`    ${colors.red}✖ ${testName}: ${err.message}${colors.reset}`);
        }
      },
      collectionVariables: {
        get: (k) => variables[k],
        set: (k, v) => { variables[k] = v; }
      }
    };

    // Execute test scripts
    const testEvents = (item.event || []).filter(e => e.listen === 'test');
    for (const te of testEvents) {
      if (te.script && te.script.exec) {
        const scriptCode = te.script.exec.join('\n');
        try {
          const fn = new Function('pm', scriptCode);
          fn(pm);
        } catch (scriptErr) {
          console.log(`    ${colors.red}✖ Script error: ${scriptErr.message}${colors.reset}`);
        }
      }
    }

    console.log('');
  }

  console.log(`${colors.bright}${colors.cyan}══════════════════════════════════════════════════════════════`);
  console.log(` 📊 POSTMAN RUN SUMMARY:`);
  console.log(`    Requests Executed:  ${totalRequests}`);
  console.log(`    Total Assertions:   ${totalAssertions}`);
  console.log(`    Passed:             ${colors.green}${passedAssertions}${colors.cyan}`);
  console.log(`    Failed:             ${failedAssertions > 0 ? colors.red + failedAssertions : colors.green + '0'}${colors.cyan}`);
  console.log(`    Success Rate:       ${((passedAssertions / (totalAssertions || 1)) * 100).toFixed(1)}%`);
  console.log(`══════════════════════════════════════════════════════════════${colors.reset}\n`);

  if (failedAssertions > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPostmanCollection().catch(e => {
  console.error(e);
  process.exit(1);
});
