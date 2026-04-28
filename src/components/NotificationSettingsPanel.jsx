import { useNotification } from '../context/NotificationContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api';
import { useState, useEffect } from 'react';

export default function NotificationSettingsPanel() {
  const { permission, requestPermission, prefs, setHabitNotif, isSupported } = useNotification();
  const { habits } = useData();
  const { user, profile } = useAuth();
  const [waterReminders, setWaterReminders] = useState({ enabled: false, interval: 60 });
  
  useEffect(() => {
    if (profile?.systemReminders?.water) {
      setWaterReminders(profile.systemReminders.water);
    }
  }, [profile]);

  const updateWater = async (updates) => {
    const newState = { ...waterReminders, ...updates };
    setWaterReminders(newState);
    try {
      await userApi.updateSystemReminders(user.uid, { water: newState });
    } catch (err) {
      console.error('Failed to update system reminders');
    }
  };

  const renderBanner = () => {
    if (!isSupported) {
      return (
        <div className="notif-banner unsupported">
          <span>⚠️ Your browser doesn't support notifications</span>
        </div>
      );
    }
    if (permission === 'granted') {
      return (
        <div className="notif-banner granted">
          <span>✅ Notifications are enabled</span>
        </div>
      );
    }
    if (permission === 'denied') {
      return (
        <div className="notif-banner denied">
          <span>🚫 Notifications blocked. Enable them in browser settings.</span>
        </div>
      );
    }
    // default
    return (
      <div className="notif-banner default">
        <span>🔔 Enable notifications to get daily reminders</span>
        <button className="add-btn" style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={requestPermission}>
          Enable
        </button>
      </div>
    );
  };

  return (
    <div className="card fade-in">
      <div className="card-header">
        <span className="card-title">🔔 Habit Reminders</span>
        {isSupported && permission !== 'granted' && (
          <button
            className="add-btn"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            onClick={requestPermission}
          >
            Enable Notifications
          </button>
        )}
      </div>

      {renderBanner()}

      <div>
        {habits.length === 0 && (
          <div className="empty-state">No habits to configure reminders for.</div>
        )}
        {habits.map(habit => {
          const pref = prefs[habit._id] || { enabled: false, time: '08:00' };
          return (
            <div key={habit._id} className="notif-habit-row">
              <span className="notif-habit-name">{habit.name}</span>
              <input
                type="time"
                value={pref.time}
                onChange={e => setHabitNotif(habit._id, habit.name, pref.enabled, e.target.value)}
                className="notif-time-input"
                disabled={!pref.enabled}
              />
              <button
                className={`notif-toggle-btn ${pref.enabled ? 'active' : ''}`}
                onClick={() => setHabitNotif(habit._id, habit.name, !pref.enabled, pref.time)}
                disabled={permission !== 'granted'}
                title={permission !== 'granted' ? 'Enable notifications first' : ''}
              >
                {pref.enabled ? '🔔 ON' : '🔕 OFF'}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
        <div className="card-header" style={{ padding: '0 0 16px 0' }}>
          <span className="card-title">💧 Default Reminders</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
          These reminders run in the background throughout the day and don't need to be checked off.
        </p>
        
        <div className="notif-habit-row">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="notif-habit-name">Water Reminder</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Stay hydrated all day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem' }}>Every</span>
            <select 
              value={waterReminders.interval}
              onChange={e => updateWater({ interval: Number(e.target.value) })}
              className="notif-time-input"
              style={{ width: '80px', padding: '4px' }}
              disabled={!waterReminders.enabled}
            >
              <option value="30">30 min</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
              <option value="240">4 hours</option>
            </select>
          </div>
          <button
            className={`notif-toggle-btn ${waterReminders.enabled ? 'active' : ''}`}
            onClick={() => updateWater({ enabled: !waterReminders.enabled })}
            disabled={permission !== 'granted'}
          >
            {waterReminders.enabled ? '🔔 ON' : '🔕 OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}
