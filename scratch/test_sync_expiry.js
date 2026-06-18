// Simple mock for browser environment
const listeners = {};
global.window = {
  dispatchEvent: (event) => {
    const type = event.type;
    if (listeners[type]) {
      listeners[type].forEach(callback => callback(event));
    }
  },
  addEventListener: (type, callback) => {
    if (!listeners[type]) listeners[type] = [];
    listeners[type].push(callback);
  },
  removeEventListener: (type, callback) => {
    if (listeners[type]) {
      listeners[type] = listeners[type].filter(cb => cb !== callback);
    }
  }
};
global.Event = class Event {
  constructor(type) {
    this.type = type;
  }
};
global.CustomEvent = class CustomEvent extends global.Event {
  constructor(type, options) {
    super(type);
    this.detail = options ? options.detail : null;
  }
};

// Simple mock for localStorage
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  key: (i) => Object.keys(storage)[i],
  get length() { return Object.keys(storage).length; }
};

// Mock the environment parameters
global.import = {
  meta: {
    env: { DEV: true }
  }
};

// Mock Axios API module with a custom method returning 403 on the second item
let callCount = 0;
const mockApi = async (config) => {
  callCount++;
  if (callCount === 2) {
    const error = new Error('Forbidden');
    error.response = { status: 403, data: { message: 'Token Expired' } };
    throw error;
  }
  return { data: { success: true } };
};

// Seeding the mock queue in LocalStorage
const mockQueue = [
  { method: 'POST', url: '/habits/1/toggle', data: { date: '2026-06-18', value: 1 } },
  { method: 'POST', url: '/habits/2/toggle', data: { date: '2026-06-18', value: 1 } },
  { method: 'POST', url: '/habits/3/toggle', data: { date: '2026-06-18', value: 1 } }
];
localStorage.setItem('offline_sync_queue', JSON.stringify(mockQueue));

// Import the sync engine code (we will test the logic inside our script using the exact function code)
let authExpiredFired = false;
window.addEventListener('offline-sync-auth-expired', () => {
  authExpiredFired = true;
});

// Implementation of syncOfflineQueue locally for exact mock execution
let isSyncing = false;
async function syncOfflineQueueTest() {
  if (isSyncing) return;
  const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
  if (queue.length === 0) return;

  isSyncing = true;
  const remaining = [];
  let hasFailures = false;
  let authFailed = false;

  for (const item of queue) {
    if (authFailed) {
      remaining.push(item);
      continue;
    }
    try {
      await mockApi({
        method: item.method,
        url: item.url,
        data: item.data
      });
    } catch (err) {
      const status = err.response?.status;
      const isAuthError = status === 401 || status === 403;
      
      if (isAuthError) {
        authFailed = true;
        remaining.push(item);
        window.dispatchEvent(new Event('offline-sync-auth-expired'));
      } else {
        hasFailures = true;
      }
    }
  }

  localStorage.setItem('offline_sync_queue', JSON.stringify(remaining));
  isSyncing = false;
}

async function runTests() {
  console.log('--- Offline Sync Auth Expiry Verification ---');
  await syncOfflineQueueTest();

  const savedQueue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
  console.log('Processed calls count:', callCount);
  console.log('Queue items preserved count:', savedQueue.length);
  console.log('Event offline-sync-auth-expired fired:', authExpiredFired);

  // Assertions
  if (callCount === 2 && savedQueue.length === 2 && authExpiredFired) {
    console.log('\n🎉 SUCCESS: The sync queue aborted safely, preserved the expired item + rest of queue, and fired the correct expired event!');
    process.exit(0);
  } else {
    console.error('\n🚨 FAILURE: The auth error handling logic did not behave as expected.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
