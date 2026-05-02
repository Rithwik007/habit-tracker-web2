import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { userApi } from '../api';

const NotificationContext = createContext(null);

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationProvider({ children }) {
  const { user, profile } = useAuth();
  const { habits } = useData();
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [prefs, setPrefs] = useState({});
  const [inAppNotifications, setInAppNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestPopup, setLatestPopup] = useState(null);
  const [hasShownPopup, setHasShownPopup] = useState(false);
  const isSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

  // Load prefs from profile (MongoDB) when user/profile changes
  useEffect(() => {
    if (!user) {
      setPrefs({});
      return;
    }

    if (profile?.notifPrefs) {
      const loaded = profile.notifPrefs instanceof Map
        ? Object.fromEntries(profile.notifPrefs)
        : profile.notifPrefs;
      setPrefs(loaded);
      localStorage.setItem(`notif_prefs_${user.uid}`, JSON.stringify(loaded));
    } else {
      const cached = localStorage.getItem(`notif_prefs_${user.uid}`);
      setPrefs(cached ? JSON.parse(cached) : {});
    }
  }, [user, profile?.notifPrefs]);

  const subscribeToPush = useCallback(async () => {
    if (!isSupported || !user) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Ensure we have a public key from env
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VITE_VAPID_PUBLIC_KEY is not defined in .env');
        return;
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      await userApi.updatePushSubscription(user.uid, subscription);
      console.log('Successfully subscribed to Web Push and saved to backend.');
    } catch (err) {
      console.error('Failed to subscribe to Web Push:', err);
    }
  }, [isSupported, user]);

  const requestPermission = async () => {
    if (!isSupported) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        await subscribeToPush();
      }
      return result;
    } catch (err) {
      console.warn('Notification permission request failed:', err);
      setPermission('denied');
      return 'denied';
    }
  };

  // Re-subscribe if we have permission but haven't sent the subscription yet (e.g. app reload)
  useEffect(() => {
    if (user && permission === 'granted') {
      // It's safe to call this on reload, the browser will just return the existing subscription 
      // or recreate it if expired, and we update the backend.
      subscribeToPush();
    }
  }, [user, permission, subscribeToPush]);

  const savePrefs = useCallback(async (newPrefs) => {
    if (!user) return;
    setPrefs(newPrefs);
    localStorage.setItem(`notif_prefs_${user.uid}`, JSON.stringify(newPrefs));
    try {
      await userApi.updateNotifPrefs(user.uid, newPrefs);
    } catch (err) {
      console.warn('Failed to sync notif prefs to backend:', err);
    }
  }, [user]);

  const setHabitNotif = useCallback((habitId, habitName, enabled, time) => {
    if (!user) return;
    const newPrefs = { ...prefs, [habitId]: { enabled, time } };
    savePrefs(newPrefs);

    if (enabled && permission === 'default') {
       requestPermission();
    }
  }, [user, prefs, savePrefs, permission]);

  const clearHabitNotif = useCallback((habitId) => {
    if (!user) return;
    const newPrefs = { ...prefs };
    delete newPrefs[habitId];
    savePrefs(newPrefs);
  }, [user, prefs, savePrefs]);

  const testNotification = useCallback(() => {
    if (Notification.permission !== 'granted') return;
    // Just a local test for sanity check
    new Notification('✅ Notifications Working!', {
      body: 'Your habit reminders are set up correctly.',
      icon: '/favicon.ico',
      tag: 'test-notif',
    });
  }, []);

  const fetchInAppNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await userApi.getNotifications(user.uid);
      setInAppNotifications(data || []);
      const unread = data.filter(n => !n.isRead);
      setUnreadCount(unread.length);

      // Identify latest unread admin message for popup
      if (!hasShownPopup && unread.length > 0) {
        setLatestPopup(unread[0]); // Data is sorted by newest first
        setHasShownPopup(true);
      }
    } catch (err) {
      console.error('Failed to fetch in-app notifications:', err);
    }
  }, [user, hasShownPopup]);

  useEffect(() => {
    if (user) {
      fetchInAppNotifications();
      // Poll every 5 minutes
      const interval = setInterval(fetchInAppNotifications, 5 * 60 * 1000);
      return () => clearInterval(interval);
    } else {
      setInAppNotifications([]);
      setUnreadCount(0);
      setLatestPopup(null);
      setHasShownPopup(false);
    }
  }, [user, fetchInAppNotifications]);

  const markRead = async (id) => {
    if (!user) return;
    try {
      await userApi.markNotificationRead(user.uid, id);
      setInAppNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (latestPopup?._id === id) setLatestPopup(null);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    try {
      await userApi.markAllNotificationsRead(user.uid);
      setInAppNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setLatestPopup(null);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      await userApi.clearNotifications(user.uid);
      setInAppNotifications([]);
      setUnreadCount(0);
      setLatestPopup(null);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{
      permission,
      requestPermission,
      prefs,
      setHabitNotif,
      clearHabitNotif,
      testNotification,
      isSupported,
      inAppNotifications,
      unreadCount,
      latestPopup,
      setLatestPopup,
      markRead,
      markAllRead,
      clearAll,
      refreshNotifications: fetchInAppNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};
