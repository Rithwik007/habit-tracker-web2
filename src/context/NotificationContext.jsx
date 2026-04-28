import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { habits } = useData();
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [prefs, setPrefs] = useState({});
  const timers = useRef({});
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // Load prefs from localStorage when user changes
  useEffect(() => {
    if (!user) {
      setPrefs({});
      return;
    }
    const stored = localStorage.getItem(`notif_prefs_${user.uid}`);
    setPrefs(stored ? JSON.parse(stored) : {});
  }, [user]);

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

    const stored = localStorage.getItem(`notif_prefs_${user.uid}`);
    const loadedPrefs = stored ? JSON.parse(stored) : {};

    Object.entries(loadedPrefs).forEach(([habitId, pref]) => {
      if (pref.enabled) {
        const habit = habits.find(h => h._id === habitId);
        if (habit) scheduleNotification(habitId, habit.name, pref.time);
      }
    });
  }, [user, habits, isSupported, scheduleNotification]);

  const requestPermission = async () => {
    if (!isSupported) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      // Firefox in iframes throws instead of returning 'denied'
      console.warn('Notification permission request failed:', err);
      setPermission('denied');
      return 'denied';
    }
  };

  const setHabitNotif = useCallback((habitId, habitName, enabled, time) => {
    if (!user) return;

    const newPrefs = {
      ...prefs,
      [habitId]: { enabled, time },
    };
    setPrefs(newPrefs);
    localStorage.setItem(`notif_prefs_${user.uid}`, JSON.stringify(newPrefs));

    if (enabled && Notification.permission === 'granted') {
      scheduleNotification(habitId, habitName, time);
    } else {
      // Cancel the timer if disabling
      if (timers.current[habitId]) {
        clearTimeout(timers.current[habitId]);
        delete timers.current[habitId];
      }
    }
  }, [user, prefs, scheduleNotification]);

  const clearHabitNotif = useCallback((habitId) => {
    if (!user) return;

    const newPrefs = { ...prefs };
    delete newPrefs[habitId];
    setPrefs(newPrefs);
    localStorage.setItem(`notif_prefs_${user.uid}`, JSON.stringify(newPrefs));

    if (timers.current[habitId]) {
      clearTimeout(timers.current[habitId]);
      delete timers.current[habitId];
    }
  }, [user, prefs]);

  return (
    <NotificationContext.Provider value={{
      permission,
      requestPermission,
      prefs,
      setHabitNotif,
      clearHabitNotif,
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
