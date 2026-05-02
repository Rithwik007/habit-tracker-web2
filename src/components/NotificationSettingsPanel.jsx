import { useNotification } from '../context/NotificationContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { userApi, habitApi } from '../api';
import { useState, useEffect } from 'react';

export default function NotificationSettingsPanel() {
  const { permission, requestPermission, prefs, setHabitNotif, isSupported } = useNotification();
  const { habits, refreshHabits } = useData();
  const { user, profile } = useAuth();
  const [waterReminders, setWaterReminders] = useState({ enabled: false, interval: 60 });
  const [expandedId, setExpandedId] = useState(null);
  
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

  const updateHabitSettings = async (id, updates) => {
    try {
      await habitApi.update(id, updates);
      refreshHabits();
    } catch (err) {
      console.error('Failed to update habit settings');
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
          const isExpanded = expandedId === habit._id;
          
          return (
            <div key={habit._id} className={`notif-habit-card ${isExpanded ? 'expanded' : ''}`} style={{ borderBottom: '1px solid var(--border-color)', padding: '12px 0' }}>
              <div className="notif-habit-row" style={{ borderBottom: 'none', padding: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : habit._id)}>
                  <span style={{ fontSize: '0.8rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  <span className="notif-habit-name">{habit.name}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  >
                    {pref.enabled ? '🔔 ON' : '🔕 OFF'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="fade-in" style={{ marginTop: '12px', paddingLeft: '20px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>⏰ Overdue Nagging</span>
                        {!pref.enabled && <span style={{ fontSize: '0.6rem', color: 'var(--warning)' }}>⚠️ Turn on standard reminder above to use this</span>}
                      </div>
                      <button 
                        className={`notif-toggle-btn ${habit.naggingInterval > 0 ? 'active' : ''}`}
                        onClick={() => updateHabitSettings(habit._id, { naggingInterval: habit.naggingInterval > 0 ? 0 : 30 })}
                        style={{ padding: '2px 8px', fontSize: '0.65rem' }}
                        disabled={!pref.enabled}
                      >
                        {habit.naggingInterval > 0 ? 'ON' : 'OFF'}
                      </button>
                    </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Custom Reminder Message</label>
                        <input
                          type="text"
                          className="notif-time-input"
                          style={{ width: '100%', fontSize: '0.8rem' }}
                          placeholder="Don't break the streak!..."
                          defaultValue={habit.reminderMessage || ''}
                          onBlur={e => {
                            if (e.target.value !== (habit.reminderMessage || '')) {
                              updateHabitSettings(habit._id, { reminderMessage: e.target.value });
                            }
                          }}
                          onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Deadline Time</label>
                          <input
                            type="time"
                            className="notif-time-input"
                            style={{ width: '100%' }}
                            defaultValue={habit.deadlineTime || ''}
                            onBlur={e => {
                              if (e.target.value !== (habit.deadlineTime || '')) {
                                updateHabitSettings(habit._id, { deadlineTime: e.target.value });
                              }
                            }}
                          />
                        </div>

                        <div style={{ flex: 1, opacity: habit.naggingInterval > 0 ? 1 : 0.5, pointerEvents: habit.naggingInterval > 0 ? 'auto' : 'none' }}>
                          <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Nag every (min)</label>
                          <input
                            type="number"
                            className="notif-time-input"
                            style={{ width: '100%' }}
                            defaultValue={habit.naggingInterval || 0}
                            onBlur={e => {
                              const val = Number(e.target.value);
                              if (val !== (habit.naggingInterval || 0)) {
                                updateHabitSettings(habit._id, { naggingInterval: val });
                              }
                            }}
                            onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
