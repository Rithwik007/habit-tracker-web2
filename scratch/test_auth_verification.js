import jwt from 'jsonwebtoken';
import express from 'express';
import axios from 'axios';

// Mock jwt.verify BEFORE importing auth.js to intercept token parsing
jwt.verify = (token, key, options, callback) => {
  if (token === 'invalid-token') {
    callback(new Error('Invalid token'));
  } else {
    // If the token matches certain usernames, return them as decoded payloads
    callback(null, {
      user_id: token,
      email: token === 'admin-uid' ? 'rithwikracharla@gmail.com' : `${token}@example.com`
    });
  }
};

// Mock the Mongoose User model BEFORE importing routes
import User from '../server/models/User.js';
User.findOne = async (query) => {
  const uid = query.firebaseId;
  if (uid === 'admin-uid') {
    return { firebaseId: 'admin-uid', email: 'rithwikracharla@gmail.com' };
  }
  if (uid === 'victim-uid') {
    return { firebaseId: 'victim-uid', email: 'victim@example.com' };
  }
  if (uid === 'attacker-uid') {
    return { firebaseId: 'attacker-uid', email: 'attacker@example.com' };
  }
  return null;
};

User.find = () => {
  return {
    sort: () => {
      return Promise.resolve([
        { firebaseId: 'admin-uid', email: 'rithwikracharla@gmail.com' }
      ]);
    }
  };
};

// Import verifyUser and adminRoutes
import { verifyUser } from '../server/middleware/auth.js';
import adminRoutes from '../server/routes/admin.js';

const app = express();
app.use(express.json());

// Register a dummy route to test verifyUser behaviour on :firebaseId
app.get('/api/users/:firebaseId', verifyUser, (req, res) => {
  res.json({ success: true, message: 'Access granted to user profile' });
});

// Register admin routes
app.use('/api/admin', adminRoutes);

// Helper function to run verification tests
async function runTests() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TestServer] Mock server listening on port ${port}`);

  let failedTests = 0;

  async function assertResponse(description, requestConfig, expectedStatus) {
    try {
      const response = await axios(requestConfig);
      if (response.status === expectedStatus) {
        console.log(`✅ PASS: ${description} (Expected ${expectedStatus}, got ${response.status})`);
      } else {
        console.error(`❌ FAIL: ${description} (Expected ${expectedStatus}, got ${response.status})`);
        failedTests++;
      }
    } catch (err) {
      const status = err.response ? err.response.status : 'No Response';
      if (status === expectedStatus) {
        console.log(`✅ PASS: ${description} (Expected ${expectedStatus}, got ${status})`);
      } else {
        console.error(`❌ FAIL: ${description} (Expected ${expectedStatus}, got ${status})`);
        console.error(`   Error details:`, err.response?.data);
        failedTests++;
      }
    }
  }

  console.log('\n--- STARTING AUTH BYPASS TESTS ---');

  // Test 1: User accessing their own profile
  await assertResponse(
    'User (attacker) should access their own profile',
    {
      method: 'get',
      url: `${baseUrl}/api/users/attacker-uid`,
      headers: { Authorization: 'Bearer attacker-uid' }
    },
    200
  );

  // Test 2: User trying to access someone else's profile (should be blocked)
  await assertResponse(
    'User (attacker) trying to access victim profile (must fail 403)',
    {
      method: 'get',
      url: `${baseUrl}/api/users/victim-uid`,
      headers: { Authorization: 'Bearer attacker-uid' }
    },
    403
  );

  // Test 3: Admin route access by non-admin with spoofed x-admin-uid header (must fail 403)
  await assertResponse(
    'Non-admin trying to access admin list with header spoofing (must fail 403)',
    {
      method: 'get',
      url: `${baseUrl}/api/admin/users`,
      headers: {
        Authorization: 'Bearer attacker-uid',
        'x-admin-uid': 'admin-uid'
      }
    },
    403
  );

  // Test 4: Admin route access by a valid admin token (should pass)
  await assertResponse(
    'Admin accessing admin list with correct token',
    {
      method: 'get',
      url: `${baseUrl}/api/admin/users`,
      headers: { Authorization: 'Bearer admin-uid' }
    },
    200
  );

  // Test 5: Admin route access with no token (must fail 401/403)
  await assertResponse(
    'Unauthenticated access to admin routes',
    {
      method: 'get',
      url: `${baseUrl}/api/admin/users`
    },
    401 // Should fail at verifyToken stage with missing header
  );

  server.close();

  console.log('\n--- TEST SUMMARY ---');
  if (failedTests === 0) {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error(`🚨 ${failedTests} TESTS FAILED.`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
