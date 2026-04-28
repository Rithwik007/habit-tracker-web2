import { useNotification } from '../context/NotificationContext';
import { useData } from '../context/DataContext';

export default function NotificationSettingsPanel() {
  const { permission, requestPermission, prefs, setHabitNotif, isSupported, testNotification } = useNotification();
  const { habits } = useData();

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
    </div>
  );
}
