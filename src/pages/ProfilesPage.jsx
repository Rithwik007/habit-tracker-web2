import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { profileApi, habitApi } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_HABITS } from '../constants/habitPresets';

const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

function ProfileCard({ p, isActive, onActivate, onEdit, onDelete, profiles, allHabits }) {
    const isScheduledFuture = p.startDate && p.startDate > todayStr;
    const hasSchedule = p.startDate || p.endDate;
    const [expanded, setExpanded] = useState(false);

    const pHabits = allHabits.filter(h => h.profileId === p._id);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`profile-card ${isActive ? 'profile-card--active' : ''}`}
        >
            <div className={`profile-card__bar ${isActive ? 'profile-card__bar--active' : ''}`} />

            <div className="profile-card__body">
                <div className="profile-card__left">
                    <div className={`profile-card__icon ${isActive ? 'profile-card__icon--active' : ''}`} onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
                        {p.isDefault ? '🏠' : isActive ? '⚡' : isScheduledFuture ? '📅' : '📁'}
                    </div>
                    <div onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
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
                            {' • '}{pHabits.length} habits
                        </div>
                    </div>
                </div>

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

            <AnimatePresence>
                {expanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', padding: '0 20px 15px 76px', borderTop: '1px solid rgba(255,255,255,0.03)' }}
                    >
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Habits in this profile:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {pHabits.map(h => (
                                <span key={h._id} style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {h.icon} {h.name}
                                </span>
                            ))}
                            {pHabits.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No habits yet</span>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function ProfilesPage() {
    const { user, refreshProfile } = useAuth();
    const { profiles, activeProfile, refreshProfiles, refreshHabits } = useData();
    const [allHabits, setAllHabits] = useState([]);

    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [autoRevert, setAutoRevert] = useState(true);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [dateError, setDateError] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [selectedPresetHabits, setSelectedPresetHabits] = useState([]);
    const [customHabits, setCustomHabits] = useState([]);
    const [customHabitInput, setCustomHabitInput] = useState('');

    useEffect(() => {
        if (!user?.uid) return;
        habitApi.getAllAcrossProfiles(user.uid)
            .then(res => setAllHabits(res.data || []))
            .catch(() => setAllHabits([]));
    }, [user?.uid, profiles]);

    const resetForm = () => {
        setName('');
        setStartDate('');
        setEndDate('');
        setAutoRevert(true);
        setEditingId(null);
        setDateError('');
        setFormOpen(false);
        setSelectedPresetHabits([]);
        setCustomHabits([]);
        setCustomHabitInput('');
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
                
                const allToSeed = [...selectedPresetHabits, ...customHabits];
                if (allToSeed.length > 0) {
                    await profileApi.seedHabits(profileId, user.uid, allToSeed);
                }
            }
            await refreshProfiles();
            await refreshProfile();
            resetForm();
        } catch (err) {
            setDateError(err?.response?.data?.message || 'Error saving profile');
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
        if (!window.confirm(`Delete "${p.name}"? All habits and analysis for this profile will be permanently deleted.`)) return;
        try {
            await profileApi.delete(p._id);
            await refreshProfiles();
            await refreshProfile();
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to delete profile');
        }
    };

    const handleActivate = async (p) => {
        if (p._id === activeProfile?._id) return;
        try {
            await profileApi.activate(p._id, user.uid);
            await refreshProfile();
            await refreshProfiles();
            refreshHabits();
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to activate profile');
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '760px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title" style={{ marginBottom: '6px' }}>Habit Profiles</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        Switch between different life phases to stay consistent everywhere.
                    </p>
                </div>
                {!formOpen && (
                    <button className="btn-primary" onClick={() => setFormOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px' }}>
                        <span style={{ fontSize: '1.1rem' }}>+</span> New Profile
                    </button>
                )}
            </div>

            <AnimatePresence>
                {formOpen && (
                    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                        <form onSubmit={handleCreateOrUpdate} className="card" style={{ marginBottom: '28px', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <span className="card-title">{editingId ? '✏️ Edit Profile' : '✨ New Profile'}</span>
                                <button type="button" onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem' }}>×</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Profile Name *</label>
                                    <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vacation, Exam Mode…" required autoFocus />
                                </div>
                                <div className="input-group">
                                    <label>Start Date</label>
                                    <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                                <div className="input-group">
                                    <label>End Date</label>
                                    <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                                {dateError && <div style={{ gridColumn: '1 / -1', color: '#f87171', fontSize: '0.85rem' }}>⚠ {dateError}</div>}
                                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                    <input type="checkbox" checked={autoRevert} onChange={e => setAutoRevert(e.target.checked)} id="autoRevert" />
                                    <label htmlFor="autoRevert" style={{ cursor: 'pointer' }}>Auto-revert to Default when finished</label>
                                </div>
                                {!editingId && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ margin: '15px 0 8px', display: 'block', fontWeight: 600 }}>🎯 Suggested Disciplines</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                                            {DEFAULT_HABITS.map(h => (
                                                <button type="button" key={h.name} onClick={() => {
                                                    const exists = selectedPresetHabits.find(s => s.name === h.name);
                                                    setSelectedPresetHabits(exists ? selectedPresetHabits.filter(s => s.name !== h.name) : [...selectedPresetHabits, h]);
                                                }} style={{ padding: '6px 12px', borderRadius: '20px', background: selectedPresetHabits.find(s => s.name === h.name) ? 'var(--primary)' : 'rgba(255,255,255,0.04)', color: 'inherit', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                    {h.icon} {h.name}
                                                </button>
                                            ))}
                                        </div>
                                        <label style={{ margin: '8px 0', display: 'block', fontWeight: 600 }}>✍️ Custom Discipline</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="text" className="input-field" style={{ flex: 1 }} value={customHabitInput} onChange={e => setCustomHabitInput(e.target.value)} placeholder="e.g. Morning Meditation" onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (customHabitInput.trim()) {
                                                        setCustomHabits([...customHabits, { name: customHabitInput.trim(), icon: '⭐', color: '#6366F1' }]);
                                                        setCustomHabitInput('');
                                                    }
                                                }
                                            }} />
                                        </div>
                                        {customHabits.map(h => (
                                            <span key={h.name} style={{ display: 'inline-block', margin: '8px 8px 0 0', padding: '4px 10px', background: 'rgba(99,102,241,0.1)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--primary-light)' }}>
                                                {h.name} <span style={{ cursor: 'pointer' }} onClick={() => setCustomHabits(customHabits.filter(c => c.name !== h.name))}>×</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>{loading ? 'Saving…' : editingId ? 'Update Profile' : 'Create Profile'}</button>
                                <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {profiles.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>No profiles yet</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <AnimatePresence mode="popLayout">
                        {profiles.map(p => (
                            <ProfileCard key={p._id} p={p} isActive={p._id?.toString() === activeProfile?._id?.toString()} onActivate={handleActivate} onEdit={handleEdit} onDelete={handleDelete} profiles={profiles} allHabits={allHabits} />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <style>{`
                .profile-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; position: relative; }
                .profile-card--active { border-color: rgba(99,102,241,0.5); box-shadow: 0 4px 24px rgba(99,102,241,0.1); }
                .profile-card__bar { height: 3px; background: var(--border); }
                .profile-card__bar--active { background: linear-gradient(90deg, var(--primary), var(--primary-light)); }
                .profile-card__body { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; flex-wrap: wrap; }
                .profile-card__left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
                .profile-card__icon { width: 42px; height: 42px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
                .profile-card__icon--active { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.4); }
                .profile-card__name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
                .profile-card__name { font-weight: 700; font-size: 1rem; }
                .profile-card__meta { font-size: 0.78rem; color: var(--text-muted); }
                .profile-card__actions { display: flex; gap: 8px; }
                .profile-action-btn { padding: 6px 14px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
                .profile-action-btn--activate { background: rgba(99,102,241,0.15); color: var(--primary-light); border-color: rgba(99,102,241,0.3); }
                .profile-action-btn--edit { background: rgba(255,255,255,0.06); color: var(--text-secondary); border: 1px solid var(--border); }
                .profile-action-btn--delete { background: rgba(239,68,68,0.08); color: #f87171; border-color: rgba(239,68,68,0.2); }
                .badge { padding: 2px 9px; border-radius: 20px; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; }
                .badge--default { background: rgba(99,102,241,0.18); color: var(--primary-light); }
                .badge--active { background: rgba(16,185,129,0.15); color: #34d399; }
                .badge--scheduled { background: rgba(59,130,246,0.15); color: #60a5fa; }
            `}</style>
        </div>
    );
}
