import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProfileModal({ onClose }) {
    const { user, profile, signOut, updateProfile, isAdmin } = useAuth();
    const { addToast } = useToast();
    const [displayName, setDisplayName] = useState(profile?.display_name || user?.displayName || '');
    const [photoURL, setPhotoURL] = useState(profile?.photoURL || user?.photoURL || '');
    const [saving, setSaving] = useState(false);
    const fileRef = useRef();

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { addToast('Image must be under 2MB', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setPhotoURL(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await updateProfile(displayName, photoURL);
            if (error) throw error;
            addToast('Profile updated!');
            onClose();
        } catch (e) {
            addToast('Error saving profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        addToast('Signed out successfully');
        onClose();
    };

    const handleDeleteAccount = async () => {
        if (isAdmin) {
            addToast('Admin accounts cannot be deleted.', 'error');
            return;
        }
        const confirmDelete = window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone and will erase all your habits and notes.");
        if (!confirmDelete) return;
        
        setSaving(true);
        const { error } = await deleteUser(user.uid);
        if (error) {
            addToast(error.message || 'Error deleting account', 'error');
            setSaving(false);
        } else {
            addToast('Account deleted successfully');
            onClose();
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start'
                }}
            >
                <motion.div
                    initial={{ x: -300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        marginLeft: '64px',
                        marginBottom: '20px',
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '28px',
                        width: '320px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Your Profile</h3>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                    </div>

                    {/* Avatar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                        <div
                            onClick={() => fileRef.current.click()}
                            style={{
                                width: '88px', height: '88px', borderRadius: '50%',
                                background: photoURL ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2rem', cursor: 'pointer',
                                border: '3px solid var(--border)',
                                overflow: 'hidden', position: 'relative',
                                transition: 'border-color 0.2s'
                            }}
                        >
                            {photoURL
                                ? <img src={photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span>{(displayName || user?.email || 'U')[0].toUpperCase()}</span>
                            }
                            <div style={{
                                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: 0, transition: '0.2s',
                                fontSize: '1rem', color: '#fff'
                            }}
                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.style.opacity = 0}
                            >📷</div>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>Click photo to change</span>
                    </div>

                    {/* Fields */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>Display Name</label>
                            <input
                                className="manage-input"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                placeholder="Your name"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>Email</label>
                            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                                {user?.email}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>Account ID</label>
                            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                                {user?.uid}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
                        <button className="add-btn" onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
                            {saving ? '💾 Saving...' : '💾 Save Changes'}
                        </button>
                        <button
                            onClick={handleSignOut}
                            style={{
                                width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)',
                                background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)',
                                color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
                            }}
                        >
                            Sign Out
                        </button>
                        {!isAdmin && (
                            <button
                                onClick={handleDeleteAccount}
                                disabled={saving}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248,113,113,0.3)',
                                    color: 'var(--danger)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
                                }}
                            >
                                Delete Account
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
