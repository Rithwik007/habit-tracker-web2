import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { userApi } from '../api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, profile } = useAuth();
  const { habits } = useData();
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [prefs, setPrefs] = useState({});
  const timers = useRef({});
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // Load prefs from profile (MongoDB) when user/profile changes
  // Falls back to localStorage for offline resilience
  useEffect(() => {
    if (!user) {
      setPrefs({});
      return;
    }

    // Load from MongoDB profile (synced across devices)
    if (profile?.notifPrefs) {
      // MongoDB returns Map as object — convert if needed
      const loaded = profile.notifPrefs instanceof Map
        ? Object.fromEntries(profile.notifPrefs)
        : profile.notifPrefs;
      setPrefs(loaded);
      // Keep localStorage in sync as a cache
      localStorage.setItem(`notif_prefs_${user.uid}`, JSON.stringify(loaded));
    } else {
      // Fallback: load from localStorage cache
      const cached = localStorage.getItem(`notif_prefs_${user.uid}`);
      setPrefs(cached ? JSON.parse(cached) : {});
    }
  }, [user, profile?.notifPrefs]);

  // Cancel all timers on logout
  useEffect(() => {
    if (!user) {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    }
  }, [user]);

  const scheduleNotification = useCallback((habitId, habitName, time) => {
    // Cancel existing timer for this habit
    if (timers.current[habitId]) {
      clearTimeout(timers.current[habitId]);
      delete timers.current[habitId];
    }

    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    // If time already passed today, schedule for tomorrow
    if (target <= now) target.setDate(target.getDate() + 1);

    const delay = target - now;

    timers.current[habitId] = setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('⏰ Habit Reminder', {
          body: `Time for: ${habitName}`,
          icon: '/favicon.ico',
          tag: `habit-${habitId}`,
          requireInteraction: false,
        });
      }
      // Auto-reschedule for same time next day
      scheduleNotification(habitId, habitName, time);
    }, delay);
  }, []);

  // Re-hydrate all enabled notifications when user + habits are ready
  useEffect(() => {
    if (!user || !habits || habits.length === 0 || !isSupported) return;
    if (Notification.permission !== 'granted') return;
    if (Object.keys(prefs).length === 0) return;

    Object.entries(prefs).forEach(([habitId, pref]) => {
      if (pref.enabled) {
        const habit = habits.find(h => h._id === habitId);
        if (habit) scheduleNotification(habitId, habit.name, pref.time);
      }
    });
  }, [user, habits, isSupported, prefs, scheduleNotification]);

  const requestPermission = async () => {
    if (!isSupported) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      console.warn('Notification permission request failed:', err);
      setPermission('denied');
      return 'denied';
    }
  };

  // Save prefs to both MongoDB + localStorage for cross-device sync
  const savePrefs = useCallback(async (newPrefs) => {
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

    if (enabled && Notification.permission === 'granted') {
      scheduleNotification(habitId, habitName, time);
    } else {
      if (timers.current[habitId]) {
        clearTimeout(timers.current[habitId]);
        delete timers.current[habitId];
      }
    }
  }, [user, prefs, scheduleNotification, savePrefs]);

  const clearHabitNotif = useCallback((habitId) => {
    if (!user) return;
    const newPrefs = { ...prefs };
    delete newPrefs[habitId];
    savePrefs(newPrefs);
    if (timers.current[habitId]) {
      clearTimeout(timers.current[habitId]);
      delete timers.current[habitId];
    }
  }, [user, prefs, savePrefs]);

  // Test notification — fires immediately to verify browser allows them
  const testNotification = useCallback(() => {
    if (Notification.permission !== 'granted') return;
    new Notification('✅ Notifications Working!', {
      body: 'Your habit reminders are set up correctly.',
      icon: '/favicon.ico',
      tag: 'test-notif',
    });
  }, []);

  return (
    <NotificationContext.Provider value={{
      permission,
      requestPermission,
      prefs,
      setHabitNotif,
      clearHabitNotif,
      testNotification,
      isSupported,
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
