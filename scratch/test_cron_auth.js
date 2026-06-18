import express from 'express';
import axios from 'axios';

const app = express();

app.get('/api/cron-notify', (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  
  if (!cronSecret || secret !== cronSecret) {
    return res.status(401).json({ message: 'Unauthorized: Missing or invalid cron secret' });
  }
  res.json({ ok: true });
});

async function runTests() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`[Cron Auth Test Server] Running on port ${port}`);
  let failed = 0;

  async function checkCron(description, secretEnvValue, requestConfig, expectedStatus) {
    process.env.CRON_SECRET = secretEnvValue || '';
    try {
      const response = await axios(requestConfig);
      const status = response.status;
      if (status === expectedStatus) {
        console.log(`✅ PASS: ${description} (Expected ${expectedStatus}, got ${status})`);
      } else {
        console.error(`❌ FAIL: ${description} (Expected ${expectedStatus}, got ${status})`);
        failed++;
      }
    } catch (err) {
      const status = err.response ? err.response.status : 'No Response';
      if (status === expectedStatus) {
        console.log(`✅ PASS: ${description} (Expected ${expectedStatus}, got ${status})`);
      } else {
        console.error(`❌ FAIL: ${description} (Expected ${expectedStatus}, got ${status})`);
        failed++;
      }
    }
  }

  // Test 1: Env configured, correct header passed
  await checkCron(
    'Configured secret, correct x-cron-secret header',
    'prod-secret-key',
    {
      method: 'get',
      url: `${baseUrl}/api/cron-notify`,
      headers: { 'x-cron-secret': 'prod-secret-key' }
    },
    200
  );

  // Test 2: Env configured, correct query param passed
  await checkCron(
    'Configured secret, correct secret query param',
    'prod-secret-key',
    {
      method: 'get',
      url: `${baseUrl}/api/cron-notify?secret=prod-secret-key`
    },
    200
  );

  // Test 3: Env configured, incorrect secret header passed (should be blocked)
  await checkCron(
    'Configured secret, incorrect x-cron-secret header (must fail 401)',
    'prod-secret-key',
    {
      method: 'get',
      url: `${baseUrl}/api/cron-notify`,
      headers: { 'x-cron-secret': 'wrong-secret-key' }
    },
    401
  );

  // Test 4: Env unconfigured, any secret passed (should be blocked)
  await checkCron(
    'Unconfigured secret, matching header (must fail 401)',
    null,
    {
      method: 'get',
      url: `${baseUrl}/api/cron-notify`,
      headers: { 'x-cron-secret': 'some-secret' }
    },
    401
  );

  // Test 5: Env unconfigured, no secret passed (should be blocked)
  await checkCron(
    'Unconfigured secret, no secret passed (must fail 401)',
    null,
    {
      method: 'get',
      url: `${baseUrl}/api/cron-notify`
    },
    401
  );

  server.close();

  if (failed === 0) {
    console.log('\n🎉 ALL CRON SECURITY TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error(`\n🚨 ${failed} CRON SECURITY TESTS FAILED.`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
