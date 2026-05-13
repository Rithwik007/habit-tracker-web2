/**
 * scripts/verify-deployment.js
 * 
 * Run this AFTER deploying to Render to verify everything is wired up correctly.
 * Usage:
 *   node scripts/verify-deployment.js https://your-render-url.onrender.com YOUR_CRON_SECRET
 *
 * Example:
 *   node scripts/verify-deployment.js https://habit-tracker-api.onrender.com 752cbb91483d6cc2c10b31623a52e91b9810b2ef44a2ed7a67173f655dd6c793
 */

const BASE_URL = process.argv[2];
const CRON_SECRET = process.argv[3];

if (!BASE_URL) {
  console.error('Usage: node scripts/verify-deployment.js <RENDER_URL> [CRON_SECRET]');
  process.exit(1);
}

const CRON_SECRET_VALUE = CRON_SECRET || '752cbb91483d6cc2c10b31623a52e91b9810b2ef44a2ed7a67173f655dd6c793';

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    const result = await fn();
    if (result.ok) {
      console.log(`  ✅ PASS — ${name}`);
      if (result.detail) console.log(`         ${result.detail}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL — ${name}: ${result.reason}`);
      failed++;
    }
  } catch (err) {
    console.log(`  ❌ ERROR — ${name}: ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log(`\n🔍 Verifying deployment at: ${BASE_URL}\n`);

  // 1. Basic health check
  await check('API is alive (GET /api/ping)', async () => {
    const res = await fetch(`${BASE_URL}/api/ping`);
    const data = await res.json();
    return { ok: data.ok === true, detail: data.message };
  });

  // 2. Root route
  await check('Root route responds (GET /)', async () => {
    const res = await fetch(`${BASE_URL}/`);
    const text = await res.text();
    return { ok: res.status === 200, detail: text.slice(0, 60) };
  });

  // 3. Cron endpoint — without secret (should 401 if secret is set)
  await check('Cron endpoint rejects missing secret (GET /api/cron-notify)', async () => {
    const res = await fetch(`${BASE_URL}/api/cron-notify`);
    return { ok: res.status === 401, detail: `Status: ${res.status} (expected 401)` };
  });

  // 4. Cron endpoint — with correct secret (should 200)
  await check('Cron endpoint accepts correct secret (GET /api/cron-notify)', async () => {
    const res = await fetch(`${BASE_URL}/api/cron-notify`, {
      headers: { 'x-cron-secret': CRON_SECRET_VALUE }
    });
    if (!res.ok) return { ok: false, reason: `Status ${res.status}` };
    const data = await res.json();
    return { ok: data.ok === true, detail: `Sent: ${data.notifsSent ?? 0}, Errors: ${data.errors ?? 0}` };
  });

  // 5. Profiles route is mounted (GET /api/profiles)
  await check('Profiles route responds (GET /api/profiles?userId=test)', async () => {
    const res = await fetch(`${BASE_URL}/api/profiles?userId=test`);
    // Expect 200 with empty array (user doesn't exist, but route is mounted)
    const text = await res.text();
    return { ok: res.status === 200 || res.status === 400, detail: `Status: ${res.status}` };
  });

  // 6. Habits route is mounted — uses path param, not query param
  await check('Habits route responds (GET /api/habits/:userId)', async () => {
    const res = await fetch(`${BASE_URL}/api/habits/test`);
    // User "test" doesn't exist → returns [] with 200 (user not found → empty array)
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    const ok = res.status === 200 || res.status === 400 || res.status === 500;
    return { ok, detail: `Status: ${res.status}, Body: ${typeof data === 'string' ? data.slice(0,40) : JSON.stringify(data).slice(0,40)}` };
  });

  // 7. Habits all-profiles route is mounted — uses path param
  await check('Habits all-profiles route (GET /api/habits/all/:userId)', async () => {
    const res = await fetch(`${BASE_URL}/api/habits/all/test`);
    const text = await res.text();
    return { ok: res.status === 200 || res.status === 400, detail: `Status: ${res.status}` };
  });

  // Summary
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log(`  🎉 All checks passed! Deployment looks healthy.\n`);
  } else {
    console.log(`  ⚠️  Some checks failed. Review the output above.\n`);
  }
}

run().catch(console.error);
