import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();

const allowedOrigins = [
  'https://habit-tracker-web2.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS Policy Blocked'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

// Custom error handling middleware to capture CORS blocker errors and return 400
app.use((err, req, res, next) => {
  if (err.message === 'CORS Policy Blocked') {
    return res.status(400).json({ error: 'CORS Blocked' });
  }
  res.status(500).json({ error: err.message });
});

async function runTests() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`[CORS Test Server] Running on port ${port}`);
  let failed = 0;

  async function checkOrigin(description, origin, expectedStatus) {
    try {
      const response = await axios.get(`${baseUrl}/api/ping`, {
        headers: origin ? { Origin: origin } : {}
      });
      
      const status = response.status;
      if (status === expectedStatus) {
        console.log(`✅ PASS: ${description} (${origin || 'No Origin'} -> ${status})`);
      } else {
        console.error(`❌ FAIL: ${description} (Expected ${expectedStatus}, got ${status})`);
        failed++;
      }
    } catch (err) {
      const status = err.response ? err.response.status : 'No Response';
      if (status === expectedStatus) {
        console.log(`✅ PASS: ${description} (${origin || 'No Origin'} -> ${status})`);
      } else {
        console.error(`❌ FAIL: ${description} (Expected ${expectedStatus}, got ${status})`);
        failed++;
      }
    }
  }

  // 1. Valid local dev origin
  await checkOrigin('Local Dev Origin (localhost)', 'http://localhost:5173', 200);

  // 2. Valid local IP origin
  await checkOrigin('Local Dev Origin (IP)', 'http://127.0.0.1:5173', 200);

  // 3. Valid production Vercel origin
  await checkOrigin('Production Vercel Origin', 'https://habit-tracker-web2.vercel.app', 200);

  // 4. Blank Origin (non-browser client)
  await checkOrigin('Blank/No Origin', null, 200);

  // 5. Invalid/Malicious Origin (CORS block)
  await checkOrigin('Malicious Origin (blocked)', 'https://malicious-site.com', 400);

  server.close();

  if (failed === 0) {
    console.log('\n🎉 ALL CORS TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error(`\n🚨 ${failed} CORS TESTS FAILED.`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
