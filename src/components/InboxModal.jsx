import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';
import { X, CheckCheck, MessageSquare, Bell } from 'lucide-react';

export default function InboxModal({ onClose }) {
  const { inAppNotifications, unreadCount, markRead, markAllRead, clearAll } = useNotification();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div 
        className="modal-content custom-scrollbar" 
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        style={{ maxWidth: '500px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
              <Bell size={20} />
            </div>
            <div>
              <h2 className="modal-title">Notifications</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ padding: '0 20px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {inAppNotifications.length > 0 && (
            <button 
              onClick={() => window.confirm('Clear all notifications?') && clearAll()}
              style={{ 
                background: 'none', border: 'none', color: 'var(--danger)', 
                fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600
              }}
            >
              Clear All
            </button>
          )}
          {unreadCount > 0 && (
            <button 
              onClick={markAllRead}
              style={{ 
                background: 'none', border: 'none', color: 'var(--primary-light)', 
                fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                fontWeight: 600
              }}
            >
              <CheckCheck size={14} /> Mark all as read
            </button>
          )}
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '0 20px 20px' }}>
          {inAppNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px', opacity: 0.3 }}>📥</div>
              <p>Your inbox is empty.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {inAppNotifications.map(n => (
                <div 
                  key={n._id}
                  onClick={() => !n.isRead && markRead(n._id)}
                  style={{
                    padding: '15px',
                    borderRadius: '12px',
                    background: n.isRead ? 'rgba(255,255,255,0.02)' : 'rgba(99, 102, 241, 0.08)',
                    border: `1px solid ${n.isRead ? 'var(--border)' : 'rgba(99, 102, 241, 0.2)'}`,
                    cursor: n.isRead ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {!n.isRead && (
                    <div style={{ 
                      position: 'absolute', top: '15px', right: '15px', 
                      width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' 
                    }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ 
                      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', 
                      color: n.sender === 'Admin' ? 'var(--primary-light)' : 'var(--text-dim)',
                      background: n.sender === 'Admin' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)',
                      padding: '2px 8px', borderRadius: '4px'
                    }}>
                      {n.sender}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    {n.title}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {n.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
