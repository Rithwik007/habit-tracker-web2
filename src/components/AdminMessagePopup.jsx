import { motion } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';
import { X, Bell, CheckCircle } from 'lucide-react';

export default function AdminMessagePopup() {
  const { latestPopup, setLatestPopup, markRead } = useNotification();

  if (!latestPopup) return null;

  const handleClose = () => {
    markRead(latestPopup._id);
    setLatestPopup(null);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200, background: 'rgba(0,0,0,0.8)' }}>
      <motion.div 
        className="card" 
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        style={{ 
          maxWidth: '450px', width: '90%', padding: '30px', textAlign: 'center',
          background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)',
          border: '2px solid var(--primary)',
          boxShadow: '0 0 40px rgba(99, 102, 241, 0.3)'
        }}
      >
        <div style={{ 
          width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          color: 'var(--primary-light)', border: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
          <Bell size={32} className="pulse" />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '10px' }}>
          New Admin Message
        </h2>
        <p style={{ color: 'var(--primary-light)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {latestPopup.title}
        </p>
        
        <div style={{ 
          background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', 
          marginBottom: '25px', textAlign: 'left', border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: '1rem', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {latestPopup.message}
          </p>
        </div>

        <button 
          className="add-btn" 
          onClick={handleClose}
          style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          <CheckCircle size={18} /> Got it, thanks!
        </button>
      </motion.div>
    </div>
  );
}
