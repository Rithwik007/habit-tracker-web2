import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../api';
import { motion } from 'framer-motion';

export default function ProfilesPage() {
    const { user } = useAuth();
    const { profiles, activeProfile, refreshProfiles, refreshHabits } = useData();

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [autoRevert, setAutoRevert] = useState(true);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        if (!name.trim() || !user?.uid) return;
        if (startDate && endDate && startDate > endDate) {
            alert('End date must be after start date');
            return;
        }

        setLoading(true);
        try {
            if (editingId) {
                await profileApi.update(editingId, { 
                    name, 
                    startDate: startDate || null, 
                    endDate: endDate || null, 
                    autoRevertToDefault: autoRevert 
                });
            } else {
                await profileApi.create({ 
                    userId: user.uid, 
                    name, 
                    startDate: startDate || null, 
                    endDate: endDate || null, 
                    autoRevertToDefault: autoRevert 
                });
            }
            setName('');
            setStartDate('');
            setEndDate('');
            setAutoRevert(true);
            setEditingId(null);
            await refreshProfiles();
        } catch (err) {
            console.error('Failed to save profile', err);
            alert('Error saving profile');
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
    };

    const handleDelete = async (p) => {
        if (p.isDefault) return alert('Cannot delete default profile');
        if (p._id === activeProfile?._id) return alert('Cannot delete active profile. Switch first.');
        
        if (!window.confirm(`Delete profile "${p.name}"? All habits in this profile will be permanently deleted.`)) return;

        try {
            await profileApi.delete(p._id);
            await refreshProfiles();
        } catch (err) {
            console.error(err);
            alert('Failed to delete profile');
        }
    };

    const handleActivate = async (p) => {
        if (p._id === activeProfile?._id) return;
        try {
            await profileApi.activate(p._id, user.uid);
            await refreshProfiles();
            refreshHabits(); // Fetch habits for the new active profile
        } catch (err) {
            console.error(err);
            alert('Failed to activate profile');
        }
    };

    return (
        <div className="fade-in">
            <h1 className="page-title">⚙️ Habit Profiles</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                Manage different sets of habits for different contexts (e.g. Home, Trip, Exam Season).
            </p>

            <form onSubmit={handleCreateOrUpdate} className="card" style={{ marginBottom: '30px' }}>
                <div className="card-header">
                    <span className="card-title">{editingId ? 'Edit Profile' : 'Create New Profile'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Profile Name *</label>
                        <input 
                            type="text" 
                            className="input-field" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="e.g. Vacation" 
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <label>Start Date (Optional)</label>
                        <input 
                            type="date" 
                            className="input-field" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                        />
                    </div>
                    <div className="input-group">
                        <label>End Date (Optional)</label>
                        <input 
                            type="date" 
                            className="input-field" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                        />
                    </div>
                    <div className="input-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                            type="checkbox" 
                            checked={autoRevert} 
                            onChange={e => setAutoRevert(e.target.checked)} 
                            id="autoRevert"
                        />
                        <label htmlFor="autoRevert" style={{ marginBottom: 0 }}>Auto-revert to Default profile after End Date</label>
                    </div>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : (editingId ? 'Update Profile' : 'Create Profile')}
                    </button>
                    {editingId && (
                        <button type="button" className="btn-secondary" onClick={() => {
                            setEditingId(null);
                            setName('');
                            setStartDate('');
                            setEndDate('');
                        }}>Cancel Edit</button>
                    )}
                </div>
            </form>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Your Profiles</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {profiles.map(p => {
                        const isActive = p._id === activeProfile?._id;
                        const isScheduledFuture = p.startDate && p.startDate > todayStr;
                        return (
                            <motion.div key={p._id} className="streak-item" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} layout>
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {p.name}
                                        {p.isDefault && <span style={{ fontSize: '0.7rem', background: 'var(--primary)', padding: '2px 8px', borderRadius: '12px' }}>Default</span>}
                                        {isActive && <span style={{ fontSize: '0.7rem', background: '#10B981', padding: '2px 8px', borderRadius: '12px' }}>Active Now</span>}
                                        {isScheduledFuture && !isActive && <span style={{ fontSize: '0.7rem', background: '#3B82F6', padding: '2px 8px', borderRadius: '12px' }}>Scheduled</span>}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {p.startDate ? `${p.startDate} to ${p.endDate || 'Forever'}` : 'Not scheduled'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {!isActive && (
                                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleActivate(p)}>
                                            Activate
                                        </button>
                                    )}
                                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleEdit(p)}>
                                        Edit
                                    </button>
                                    {!p.isDefault && profiles.length > 1 && (
                                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => handleDelete(p)}>
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
