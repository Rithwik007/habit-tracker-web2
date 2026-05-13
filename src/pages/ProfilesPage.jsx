import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { profileApi, habitApi } from '../api';
import { motion, AnimatePresence } from 'framer-motion';

const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

function ProfileCard({ p, isActive, onActivate, onEdit, onDelete, profiles }) {
    const isScheduledFuture = p.startDate && p.startDate > todayStr;
    const hasSchedule = p.startDate || p.endDate;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`profile-card ${isActive ? 'profile-card--active' : ''}`}
        >
            {/* Glow accent bar */}
            <div className={`profile-card__bar ${isActive ? 'profile-card__bar--active' : ''}`} />

            <div className="profile-card__body">
                {/* Left: icon + info */}
                <div className="profile-card__left">
                    <div className={`profile-card__icon ${isActive ? 'profile-card__icon--active' : ''}`}>
                        {p.isDefault ? '🏠' : isActive ? '⚡' : isScheduledFuture ? '📅' : '📁'}
                    </div>
                    <div>
                        <div className="profile-card__name-row">
                            <span className="profile-card__name">{p.name}</span>
                            <div className="profile-card__badges">
                                {p.isDefault && <span className="badge badge--default">Default</span>}
                                {isActive && <span className="badge badge--active">Active</span>}
                                {isScheduledFuture && !isActive && <span className="badge badge--scheduled">Scheduled</span>}
                            </div>
                        </div>
                        <div className="profile-card__meta">
                            {hasSchedule
                                ? `${p.startDate || '–'} → ${p.endDate || 'Forever'}`
                                : 'No schedule set'}
                        </div>
                    </div>
                </div>

                {/* Right: actions */}
                <div className="profile-card__actions">
                    {!isActive && (
                        <button className="profile-action-btn profile-action-btn--activate" onClick={() => onActivate(p)}>
                            Activate
                        </button>
                    )}
                    <button className="profile-action-btn profile-action-btn--edit" onClick={() => onEdit(p)}>
                        Edit
                    </button>
                    {!p.isDefault && profiles.length > 1 && (
                        <button className="profile-action-btn profile-action-btn--delete" onClick={() => onDelete(p)}>
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default function ProfilesPage() {
    const { user } = useAuth();
    const { profiles, activeProfile, refreshProfiles, refreshHabits } = useData();

    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [autoRevert, setAutoRevert] = useState(true);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [dateError, setDateError] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [defaultHabits, setDefaultHabits] = useState([]);
    const [selectedDefaultHabits, setSelectedDefaultHabits] = useState([]);
    const [habitsLoaded, setHabitsLoaded] = useState(false);

    useEffect(() => {
        if (!formOpen || editingId) return;
        const defaultProfile = profiles.find(p => p.isDefault);
        if (!defaultProfile) {
            setHabitsLoaded(true);
            return;
        }
        setHabitsLoaded(false);
        // Use getAllAcrossProfiles so we get Default habits even if it's not the active profile
        habitApi.getAllAcrossProfiles(user.uid)
            .then(res => {
                const all = res.data || [];
                const defHabits = all.filter(h => String(h.profileId) === String(defaultProfile._id));
                setDefaultHabits(defHabits);
            })
            .catch(() => setDefaultHabits([]))
            .finally(() => setHabitsLoaded(true));
    }, [formOpen, profiles, user?.uid, editingId]);

const resetForm = () => {
        setName('');
        setStartDate('');
        setEndDate('');
        setAutoRevert(true);
        setEditingId(null);
        setDateError('');
        setFormOpen(false);
        setDefaultHabits([]);
        setSelectedDefaultHabits([]);
        setHabitsLoaded(false);
    };

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        if (!name.trim() || !user?.uid) return;
        if (startDate && endDate && startDate > endDate) {
            setDateError('End date must be after start date');
            return;
        }
        setDateError('');
        setLoading(true);
        try {
            let profileId;
            if (editingId) {
                await profileApi.update(editingId, {
                    name,
                    startDate: startDate || null,
                    endDate: endDate || null,
                    autoRevertToDefault: autoRevert
                });
                profileId = editingId;
            } else {
                const created = await profileApi.create({
                    userId: user.uid,
                    name,
                    startDate: startDate || null,
                    endDate: endDate || null,
                    autoRevertToDefault: autoRevert
                });
                profileId = created.data._id;
                // seed selected habits if any
                if (selectedDefaultHabits.length > 0) {
                    await profileApi.seedHabits(profileId, user.uid, selectedDefaultHabits);
                }
            }
            await refreshProfiles();
            resetForm();
        } catch (err) {
            const msg = err?.response?.data?.message || 'Error saving profile';
            setDateError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (p) => {
        setEditingId(p._id);
        setName(p.name);
        setStartDate(p.startDate || '');
        setEndDate(p.endDate || '');
        setAutoRevert(p.autoRevertToDefault);
        setDateError('');
        setFormOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (p) => {
        if (p.isDefault) return alert('Cannot delete the default profile.');
        if (p._id === activeProfile?._id) return alert('Cannot delete the active profile. Switch first.');
        if (!window.confirm(`Delete "${p.name}"? All habits in this profile will be permanently deleted.`)) return;
        try {
            await profileApi.delete(p._id);
            await refreshProfiles();
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to delete profile');
        }
    };

    const handleActivate = async (p) => {
        if (p._id === activeProfile?._id) return;
        try {
            await profileApi.activate(p._id, user.uid);
            await refreshProfiles();
            refreshHabits();
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to activate profile');
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '760px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title" style={{ marginBottom: '6px' }}>Habit Profiles</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        Switch between different habit sets — Home, Travel, Exam Mode, and more.
                    </p>
                </div>
                {!formOpen && (
                    <button
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', whiteSpace: 'nowrap' }}
                        onClick={() => setFormOpen(true)}
                    >
                        <span style={{ fontSize: '1.1rem' }}>+</span> New Profile
                    </button>
                )}
            </div>

            {/* Form */}
            <AnimatePresence>
                {formOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2 }}
                    >
                        <form onSubmit={handleCreateOrUpdate} className="card" style={{ marginBottom: '28px', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <span className="card-title">{editingId ? '✏️ Edit Profile' : '✨ New Profile'}</span>
                                <button type="button" onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Profile Name *</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Vacation, Exam Mode, Travel…"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Start Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={startDate}
                                        onChange={e => { setStartDate(e.target.value); setDateError(''); }}
                                    />
                                </div>

                                <div className="input-group">
                                    <label>End Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={endDate}
                                        onChange={e => { setEndDate(e.target.value); setDateError(''); }}
                                    />
                                </div>

                                {dateError && (
                                    <div style={{ gridColumn: '1 / -1', color: '#f87171', fontSize: '0.85rem', marginTop: '-8px' }}>
                                        ⚠ {dateError}
                                    </div>
                                )}
                                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                    <input
                                        type="checkbox"
                                        checked={autoRevert}
                                        onChange={e => setAutoRevert(e.target.checked)}
                                        id="autoRevert"
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <div>
                                        <label htmlFor="autoRevert" style={{ margin: 0, fontWeight: 500, cursor: 'pointer' }}>Auto-revert to Default</label>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Automatically switch back to Default profile when End Date passes</div>
                                    </div>
                                </div>
                                {/* Habit seeding UI – only on create */}
                                {!editingId && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ marginBottom: '8px', display: 'block', fontWeight: 500 }}>Copy habits from Default profile</label>
                                        {!habitsLoaded ? (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                Loading habits…
                                            </div>
                                        ) : defaultHabits.length === 0 ? (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No habits in Default profile to copy.</div>
                                        ) : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {defaultHabits.map(h => (
                                                    <button
                                                        type="button"
                                                        key={h._id}
                                                        onClick={() => {
                                                            const exists = selectedDefaultHabits.find(s => s._id === h._id);
                                                            if (exists) {
                                                                setSelectedDefaultHabits(prev => prev.filter(s => s._id !== h._id));
                                                            } else {
                                                                setSelectedDefaultHabits(prev => [...prev, h]);
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '20px',
                                                            background: selectedDefaultHabits.find(s => s._id === h._id) ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                                                            color: selectedDefaultHabits.find(s => s._id === h._id) ? 'white' : 'var(--text-dim)',
                                                            border: selectedDefaultHabits.find(s => s._id === h._id) ? '1px solid var(--primary)' : '1px solid var(--border)',
                                                            cursor: 'pointer',
                                                            fontSize: '0.78rem'
                                                        }}
                                                    >
                                                        {h.icon} {h.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                                    {loading ? 'Saving…' : editingId ? 'Update Profile' : 'Create Profile'}
                                </button>
                                <button type="button" className="btn-secondary" onClick={resetForm}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile List */}
            {profiles.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📁</div>
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>No profiles yet</div>
                    <div style={{ fontSize: '0.85rem' }}>Create your first profile to get started</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <AnimatePresence mode="popLayout">
                        {profiles.map(p => (
                            <ProfileCard
                                key={p._id}
                                p={p}
                                isActive={p._id?.toString() === activeProfile?._id?.toString()}
                                onActivate={handleActivate}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                profiles={profiles}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Tip */}
            {profiles.length > 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', marginTop: '24px' }}>
                    💡 Habits you add are always scoped to the currently active profile.
                </p>
            )}

            <style>{`
                .profile-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    overflow: hidden;
                    transition: box-shadow 0.2s, border-color 0.2s;
                    position: relative;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .profile-card--active {
                    border-color: rgba(99,102,241,0.5);
                    box-shadow: 0 0 0 1px rgba(99,102,241,0.15), 0 4px 24px rgba(99,102,241,0.1);
                }
                .profile-card:hover {
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                }
                .profile-card__bar {
                    height: 3px;
                    background: var(--border);
                    transition: background 0.3s;
                }
                .profile-card__bar--active {
                    background: linear-gradient(90deg, var(--primary), var(--primary-light));
                }
                .profile-card__body {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 18px 20px;
                    flex-wrap: wrap;
                }
                .profile-card__left {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    flex: 1;
                    min-width: 0;
                }
                .profile-card__icon {
                    width: 42px;
                    height: 42px;
                    border-radius: 10px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    flex-shrink: 0;
                    transition: background 0.2s, border-color 0.2s;
                }
                .profile-card__icon--active {
                    background: rgba(99,102,241,0.15);
                    border-color: rgba(99,102,241,0.4);
                }
                .profile-card__name-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-bottom: 4px;
                }
                .profile-card__name {
                    font-weight: 700;
                    font-size: 1rem;
                    color: var(--text-primary);
                }
                .profile-card__meta {
                    font-size: 0.78rem;
                    color: var(--text-muted);
                }
                .profile-card__actions {
                    display: flex;
                    gap: 8px;
                    flex-shrink: 0;
                    flex-wrap: wrap;
                }
                .profile-action-btn {
                    padding: 6px 14px;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    border: 1px solid transparent;
                    transition: all 0.15s;
                    white-space: nowrap;
                }
                .profile-action-btn--activate {
                    background: rgba(99,102,241,0.15);
                    color: var(--primary-light);
                    border-color: rgba(99,102,241,0.3);
                }
                .profile-action-btn--activate:hover {
                    background: rgba(99,102,241,0.28);
                }
                .profile-action-btn--edit {
                    background: rgba(255,255,255,0.06);
                    color: var(--text-secondary);
                    border-color: var(--border);
                }
                .profile-action-btn--edit:hover {
                    background: rgba(255,255,255,0.12);
                    color: var(--text-primary);
                }
                .profile-action-btn--delete {
                    background: rgba(239,68,68,0.08);
                    color: #f87171;
                    border-color: rgba(239,68,68,0.2);
                }
                .profile-action-btn--delete:hover {
                    background: rgba(239,68,68,0.18);
                }
                .badge {
                    padding: 2px 9px;
                    border-radius: 20px;
                    font-size: 0.68rem;
                    font-weight: 700;
                    letter-spacing: 0.02em;
                    text-transform: uppercase;
                }
                .badge--default {
                    background: rgba(99,102,241,0.18);
                    color: var(--primary-light);
                    border: 1px solid rgba(99,102,241,0.3);
                }
                .badge--active {
                    background: rgba(16,185,129,0.15);
                    color: #34d399;
                    border: 1px solid rgba(16,185,129,0.3);
                }
                .badge--scheduled {
                    background: rgba(59,130,246,0.15);
                    color: #60a5fa;
                    border: 1px solid rgba(59,130,246,0.3);
                }
            `}</style>
        </div>
    );
}
