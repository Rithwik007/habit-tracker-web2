import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme, THEMES } from '../context/ThemeContext';

export default function ProfileModal({ onClose }) {
    const { user, profile, signOut, updateProfile, isAdmin, deleteUser } = useAuth();
    const { addToast } = useToast();
    const { theme, setTheme } = useTheme();
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
        const confirmDelete = window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.");
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
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '24px',
                        padding: '40px',
                        width: '90%',
                        maxWidth: '550px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        position: 'relative'
                    }}
                    className="custom-scrollbar"
                >
                    <button onClick={onClose} style={{ 
                        position: 'absolute', top: '24px', right: '24px',
                        background: 'rgba(255,255,255,0.05)', border: 'none', 
                        color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.5rem',
                        width: '40px', height: '40px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>×</button>

                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>Profile Settings</h2>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>Customize your experience and account info</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '40px' }}>
                        {/* Left Side: Avatar & Identity */}
                        <div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                                <div
                                    onClick={() => fileRef.current.click()}
                                    style={{
                                        width: '120px', height: '120px', borderRadius: '50%',
                                        background: photoURL ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '3rem', cursor: 'pointer',
                                        border: '4px solid var(--primary)',
                                        overflow: 'hidden', position: 'relative',
                                        boxShadow: '0 0 20px var(--primary-glow)'
                                    }}
                                >
                                    {photoURL
                                        ? <img src={photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <span style={{ color: 'white' }}>{(displayName || user?.email || 'U')[0].toUpperCase()}</span>
                                    }
                                    <div style={{
                                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: 0, transition: '0.2s',
                                        fontSize: '1.2rem', color: '#fff'
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                    >📷</div>
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                                <button 
                                    onClick={() => fileRef.current.click()}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: '0.8rem', marginTop: '12px', cursor: 'pointer', fontWeight: 600 }}
                                >Change Photo</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <button className="add-btn" onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '12px' }}>
                                    {saving ? 'Saving...' : 'Save Profile'}
                                </button>
                                <button onClick={handleSignOut} style={{ 
                                    width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)',
                                    color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600
                                }}>Sign Out</button>
                            </div>
                        </div>

                        {/* Right Side: Themes & Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Theme Selector */}
                            <div>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>✨ Select Theme</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                    {THEMES.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTheme(t.id)}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '12px',
                                                border: `2px solid ${theme === t.id ? 'var(--primary)' : 'var(--border)'}`,
                                                background: theme === t.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                color: theme === t.id ? 'var(--text-main)' : 'var(--text-dim)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s',
                                                fontSize: '0.85rem',
                                                fontWeight: 600
                                            }}
                                        >
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: t.color }} />
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '8px' }}>Display Name</label>
                                <input
                                    className="manage-input"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    placeholder="Your name"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '8px' }}>Email Address</label>
                                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                    {user?.email}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            User ID: {user?.uid}
                        </div>
                        {!isAdmin && (
                            <button
                                onClick={handleDeleteAccount}
                                style={{
                                    background: 'none', border: 'none', color: 'var(--danger)',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
                                }}
                            >Delete Account</button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
