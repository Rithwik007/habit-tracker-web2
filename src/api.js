import axios from 'axios';
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

let authStateResolved = false;
let authStatePromise = null;

if (typeof window !== 'undefined') {
  const initPromise = new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      authStateResolved = true;
      resolve(user);
    });
  });

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      if (!authStateResolved) {
        console.warn('[OfflineSync] Firebase Auth state resolution timed out (5s)');
        authStateResolved = true;
        resolve(null);
      }
    }, 5000);
  });

  authStatePromise = Promise.race([initPromise, timeoutPromise]);
}

async function getAuthToken() {
  if (auth.currentUser) {
    return auth.currentUser.getIdToken();
  }
  if (!authStateResolved && authStatePromise) {
    const user = await authStatePromise;
    if (user) {
      return user.getIdToken();
    }
  }
  return null;
}

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('[OfflineSync] Request interceptor auth token fetch failed:', e);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// --- OFFLINE SUPPORT & BACKEND SYNC ENGINE ---

let isSyncing = false;

function generateObjectId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return timestamp + random;
}

export async function syncOfflineQueue() {
  if (isSyncing) return;
  const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
  if (queue.length === 0) return;

  isSyncing = true;
  if (import.meta.env.DEV) {
    console.log(`[OfflineSync] Syncing ${queue.length} items to database...`);
  }
  
  const remaining = [];
  let hasFailures = false;
  let authFailed = false;
  
  for (const item of queue) {
    if (authFailed) {
      remaining.push(item);
      continue;
    }
    try {
      await api({
        method: item.method,
        url: item.url,
        data: item.data
      });
      if (import.meta.env.DEV) {
        console.log(`[OfflineSync] Synced item successfully: ${item.method} ${item.url}`);
      }
    } catch (err) {
      console.error(`[OfflineSync] Failed to sync item:`, item, err);
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
      if (isNetworkError) {
        remaining.push(item);
      } else {
        const status = err.response?.status;
        const isAuthError = status === 401 || status === 403;
        
        if (isAuthError) {
          authFailed = true;
          remaining.push(item);
          if (import.meta.env.DEV) {
            console.log('[OfflineSync] Auth token expired or invalid. Pausing sync queue.');
          }
          window.dispatchEvent(new Event('offline-sync-auth-expired'));
        } else {
          hasFailures = true;
          const msg = err.response?.data?.message || err.message || 'Validation error';
          const detailMessage = `Sync failed: ${msg}`;
          window.dispatchEvent(new CustomEvent('offline-sync-error', { detail: { message: detailMessage } }));
          
          try {
            const url = item.url;
            const urlRoot = url.split('/')[1];
            if (urlRoot) {
              for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('api_cache_/')) {
                  const path = key.substring(10);
                  if (path.startsWith(`/${urlRoot}`)) {
                    localStorage.removeItem(key);
                    if (import.meta.env.DEV) {
                      console.log(`[OfflineSync] Invalidated cache key due to sync failure: ${key}`);
                    }
                  }
                }
              }
            }
          } catch (cacheErr) {
            console.error('[OfflineSync] Failed to invalidate cache:', cacheErr);
          }
          
          try {
            const failedList = JSON.parse(localStorage.getItem('failed_sync_history') || '[]');
            failedList.push({
              ...item,
              error: msg,
              failedAt: new Date().toISOString()
            });
            localStorage.setItem('failed_sync_history', JSON.stringify(failedList));
          } catch (e) {
            console.error('[OfflineSync] Failed to log failure to sync history:', e);
          }
        }
      }
    }
  }
  
  try {
    localStorage.setItem('offline_sync_queue', JSON.stringify(remaining));
  } catch (e) {
    console.error('[OfflineSync] Failed to update offline queue in localStorage:', e);
  }
  isSyncing = false;
  
  if (remaining.length === 0) {
    if (import.meta.env.DEV) {
      console.log('[OfflineSync] Offline queue fully synchronized!');
    }
    window.dispatchEvent(new Event('offline-sync-completed'));
  }
  
  if (hasFailures) {
    window.dispatchEvent(new Event('offline-sync-refresh'));
  }
}

function enqueueAction(action) {
  let queue = [];
  try {
    queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
  } catch (e) {
    console.error('[OfflineSync] Failed to parse offline queue:', e);
  }

  // 1. Collapse Sequential Habit Toggles
  if (action.url.includes('/toggle') && action.method.toLowerCase() === 'post') {
    const existingIndex = queue.findIndex(item => item.url === action.url && item.data?.date === action.data?.date);
    if (existingIndex !== -1) {
      queue[existingIndex].data.value = action.data.value;
      queue[existingIndex].data.completed = action.data.completed;
      queue[existingIndex].data.status = action.data.status;
      saveQueue(queue);
      return;
    }
  }

  // 2. Collapse Sequential Note Edits
  if (action.url === '/notes' && action.method.toLowerCase() === 'post') {
    const existingIndex = queue.findIndex(item => item.url === action.url && item.data?.date === action.data?.date);
    if (existingIndex !== -1) {
      queue[existingIndex].data.content = action.data.content;
      saveQueue(queue);
      return;
    }
  }

  // 3. Collapse Redundant Goal Toggles
  if (action.url.includes('/goals/') && action.url.includes('/toggle') && action.method.toLowerCase() === 'put') {
    const existingIndex = queue.findIndex(item => item.url === action.url);
    if (existingIndex !== -1) {
      queue.splice(existingIndex, 1);
      saveQueue(queue);
      return;
    }
  }

  queue.push(action);
  saveQueue(queue);
}

function saveQueue(queue) {
  try {
    localStorage.setItem('offline_sync_queue', JSON.stringify(queue));
  } catch (e) {
    console.error('[OfflineSync] Failed to save queue to localStorage:', e);
  }
}

function optimisticUpdateCache(method, url, payload) {
  try {
    // 1. Toggle habit completion
    if (url.includes('/habits/') && url.includes('/toggle')) {
      const parts = url.split('/habits/');
      const habitId = parts[1].split('/')[0];
      const { date, value, completed, status } = payload;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('api_cache_/habits/') && !key.includes('/all/')) {
          const habits = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(habits)) {
            const updated = habits.map(h => {
              if (h._id !== habitId) return h;
              
              const isExplicitUncheck = completed === false || (h.tracksValue === false && value === 0);
              const isSkip = status === 'skipped';
              let completions = h.completions || [];

              if (isExplicitUncheck) {
                completions = completions.filter(c => c.date !== date);
              } else if (isSkip) {
                const completionIndex = completions.findIndex(c => c.date === date);
                if (completionIndex > -1) {
                  completions = completions.map((c, idx) => idx === completionIndex ? { ...c, value: null, status: 'skipped' } : c);
                } else {
                  completions = [...completions, { date, value: null, status: 'skipped' }];
                }
              } else {
                const completionIndex = completions.findIndex(c => c.date === date);
                let finalValue = value;
                if (h.tracksValue) {
                  finalValue = value === undefined || value === null ? 0 : Number(value);
                } else {
                  finalValue = value === undefined || value === null ? 1 : Number(value);
                }
                
                if (completionIndex > -1) {
                  completions = completions.map((c, idx) => idx === completionIndex ? { ...c, value: finalValue, status: 'completed' } : c);
                } else {
                  completions = [...completions, { date, value: finalValue, status: 'completed' }];
                }
              }
              return { ...h, completions };
            });
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      }
    }
    
    // 2. Save note
    if (url === '/notes' && method.toLowerCase() === 'post') {
      const { userId, date, content } = payload;
      const cacheKeyAll = `api_cache_/notes/${userId}`;
      const cacheKeyDate = `api_cache_/notes/${userId}/${date}`;
      
      localStorage.setItem(cacheKeyDate, JSON.stringify({ content, date, userId }));
      
      const notes = JSON.parse(localStorage.getItem(cacheKeyAll) || '[]');
      if (Array.isArray(notes)) {
        const index = notes.findIndex(n => n.date === date);
        if (index !== -1) {
          notes[index].content = content;
        } else {
          notes.push({ _id: payload._id || `temp-${Date.now()}`, date, content, userId });
        }
        localStorage.setItem(cacheKeyAll, JSON.stringify(notes));
      }
    }
    
    // 3. Delete note
    if (url.includes('/notes/') && method.toLowerCase() === 'delete') {
      const parts = url.split('/notes/')[1].split('/');
      const userId = parts[0];
      const date = parts[1];
      const cacheKeyAll = `api_cache_/notes/${userId}`;
      const cacheKeyDate = `api_cache_/notes/${userId}/${date}`;
      
      localStorage.removeItem(cacheKeyDate);
      
      const notes = JSON.parse(localStorage.getItem(cacheKeyAll) || '[]');
      if (Array.isArray(notes)) {
        const updated = notes.filter(n => n.date !== date);
        localStorage.setItem(cacheKeyAll, JSON.stringify(updated));
      }
    }
    
    // 4. Save mood
    if (url === '/moods' && method.toLowerCase() === 'post') {
      const { userId, date, score } = payload;
      const cacheKey = `api_cache_/moods/${userId}/${date}`;
      localStorage.setItem(cacheKey, JSON.stringify({ score, date, userId }));
    }
    
    // 5. Create goal
    if (url === '/goals' && method.toLowerCase() === 'post') {
      const { userId, text, time, nagTime, date } = payload;
      const cacheKeyAll = `api_cache_/goals/${userId}/${date}`;
      const goals = JSON.parse(localStorage.getItem(cacheKeyAll) || '[]');
      goals.push({
        _id: payload._id || `temp-${Date.now()}`,
        userId,
        text,
        time,
        nagTime,
        date,
        completed: false
      });
      localStorage.setItem(cacheKeyAll, JSON.stringify(goals));
    }
    
    // 6. Toggle goal
    if (url.includes('/goals/') && url.includes('/toggle') && method.toLowerCase() === 'put') {
      const goalId = url.split('/goals/')[1].split('/')[0];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('api_cache_/goals/')) {
          const goals = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(goals)) {
            const updated = goals.map(g => g._id === goalId ? { ...g, completed: !g.completed } : g);
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      }
    }
    
    // 7. Delete goal
    if (url.includes('/goals/') && method.toLowerCase() === 'delete') {
      const goalId = url.split('/goals/')[1];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('api_cache_/goals/')) {
          const goals = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(goals)) {
            const updated = goals.filter(g => g._id !== goalId);
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      }
    }

    // 8. Profile Activation
    if (url.includes('/profiles/') && url.includes('/activate') && method.toLowerCase() === 'post') {
      const profileId = url.split('/profiles/')[1].split('/')[0];
      const { userId } = payload;
      const cacheKey = `api_cache_/users/${userId}`;
      const userProfile = JSON.parse(localStorage.getItem(cacheKey));
      if (userProfile) {
        userProfile.activeProfileId = profileId;
        localStorage.setItem(cacheKey, JSON.stringify(userProfile));
      }
    }

    // 9. Update Theme
    if (url.includes('/users/') && url.includes('/theme') && method.toLowerCase() === 'patch') {
      const userId = url.split('/users/')[1].split('/')[0];
      const { theme } = payload;
      const cacheKey = `api_cache_/users/${userId}`;
      const userProfile = JSON.parse(localStorage.getItem(cacheKey));
      if (userProfile) {
        userProfile.theme = theme;
        localStorage.setItem(cacheKey, JSON.stringify(userProfile));
      }
    }

    // 10. Update System Reminders
    if (url.includes('/users/') && url.includes('/systemReminders') && method.toLowerCase() === 'patch') {
      const userId = url.split('/users/')[1].split('/')[0];
      const { systemReminders } = payload;
      const cacheKey = `api_cache_/users/${userId}`;
      const userProfile = JSON.parse(localStorage.getItem(cacheKey));
      if (userProfile) {
        userProfile.systemReminders = systemReminders;
        localStorage.setItem(cacheKey, JSON.stringify(userProfile));
      }
    }
  } catch (e) {
    console.error('[OfflineSync] Optimistic update failed:', e);
  }
}

api.interceptors.response.use(
  response => {
    const { config, data } = response;
    if (config.method.toLowerCase() === 'get') {
      try {
        const cacheKey = `api_cache_${config.url}`;
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (e) {
        console.warn('[OfflineSync] Local storage quota full, skipped GET caching:', e);
      }
    }
    return response;
  },
  async error => {
    const { config } = error;
    if (!config) return Promise.reject(error);

    const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
    if (!isNetworkError) return Promise.reject(error);

    const method = config.method.toLowerCase();

    // GET requests: Serve from cache if available
    if (method === 'get') {
      const cacheKey = `api_cache_${config.url}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        if (import.meta.env.DEV) {
          console.log(`[OfflineSync] Serving GET cache for: ${config.url}`);
        }
        return Promise.resolve({ data: JSON.parse(cached) });
      }
      return Promise.reject(error);
    }

    // Mutation requests (POST, PUT, DELETE, PATCH): Queue locally
    const isMutation = ['post', 'put', 'delete', 'patch'].includes(method);
    if (isMutation) {
      if (import.meta.env.DEV) {
        console.log(`[OfflineSync] Queueing offline mutation: ${config.method} ${config.url}`);
      }
      const payload = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : null;

      enqueueAction({
        method: config.method,
        url: config.url,
        data: payload,
        timestamp: Date.now()
      });

      optimisticUpdateCache(method, config.url, payload);

      let mockData = { success: true };
      if (method === 'post') {
        mockData = {
          ...payload,
          _id: payload?._id || `temp-${Date.now()}`,
          isOfflineMock: true
        };
      }
      return Promise.resolve({ data: mockData });
    }

    return Promise.reject(error);
  }
);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (import.meta.env.DEV) {
      console.log('[OfflineSync] Online event. Triggering sync...');
    }
    syncOfflineQueue();
  });
  
  if (navigator.onLine) {
    setTimeout(syncOfflineQueue, 2000);
  }
}

export const habitApi = {
  getAll: (userId) => api.get(`/habits/${userId}`),
  getAllAcrossProfiles: (userId) => api.get(`/habits/all/${userId}`),
  create: (habitData) => api.post('/habits', { _id: generateObjectId(), ...habitData }),
  update: (id, habitData) => api.put(`/habits/${id}`, habitData),
  delete: (id) => api.delete(`/habits/${id}`),
  toggleCompletion: (id, date, value, completed, status = 'completed') => api.post(`/habits/${id}/toggle`, { date, value, completed, status })
};

export const userApi = {
  getProfile: (firebaseId) => api.get(`/users/${firebaseId}`),
  updateProfile: (profileData) => api.post('/users/profile', profileData),
  updateTheme: (firebaseId, theme) => api.patch(`/users/${firebaseId}/theme`, { theme }),
  updateNotifPrefs: (firebaseId, notifPrefs) => api.patch(`/users/${firebaseId}/notifPrefs`, { notifPrefs }),
  updatePushSubscription: (firebaseId, subscription) => api.post(`/users/${firebaseId}/push-subscription`, { subscription }),
  updateSystemReminders: (firebaseId, systemReminders) => api.patch(`/users/${firebaseId}/systemReminders`, { systemReminders }),
  deleteUser: (firebaseId) => api.delete(`/users/${firebaseId}`)
};

export const noteApi = {
  getAll: (userId) => api.get(`/notes/${userId}`),
  getByDate: (userId, date) => api.get(`/notes/${userId}/${date}`),
  save: (userId, date, content) => api.post('/notes', { userId, date, content }),
  delete: (userId, date) => api.delete(`/notes/${userId}/${date}`)
};

export const moodApi = {
  getByDate: (userId, date) => api.get(`/moods/${userId}/${date}`),
  save: (userId, date, score) => api.post('/moods', { userId, date, score })
};

export const adminApi = {
  getAllUsers: (adminUid) => api.get('/admin/users', { headers: { 'x-admin-uid': adminUid } }),
  getUserHabits: (uid, adminUid) => api.get(`/admin/user-habits/${uid}`, { headers: { 'x-admin-uid': adminUid } }),
  deleteUser: (uid, adminUid) => api.delete(`/admin/user/${uid}`, { headers: { 'x-admin-uid': adminUid } })
};

export const goalApi = {
  getAll: (userId, date) => api.get(`/goals/${userId}/${date}`),
  getHistory: (userId) => api.get(`/goals/history/${userId}`),
  create: (goalData) => api.post('/goals', { _id: generateObjectId(), ...goalData }),
  toggle: (id) => api.put(`/goals/${id}/toggle`),
  delete: (id) => api.delete(`/goals/${id}`)
};

export const profileApi = {
  getAll: (userId) => api.get(`/profiles?userId=${userId}`),
  create: (profileData) => api.post('/profiles', { _id: generateObjectId(), ...profileData }),
  update: (id, profileData) => api.patch(`/profiles/${id}`, profileData),
  delete: (id) => api.delete(`/profiles/${id}`),
  activate: (id, userId) => api.post(`/profiles/${id}/activate`, { userId }),
  seedHabits: (id, userId, habits) => api.post(`/profiles/${id}/seed-habits`, { userId, habits })
};

export default api;
