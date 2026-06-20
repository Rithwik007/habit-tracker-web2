import { useState } from 'react';
import { useData } from '../context/DataContext';
import { habitApi } from '../api';
import useMidnightRefresh, { formatLocalDate } from '../hooks/useMidnightRefresh';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import NotificationSettingsPanel from '../components/NotificationSettingsPanel';

// Page for managing habits and notification settings

export default function ManageHabitsPage() {
    const { user } = useAuth();
    const { habits, habitsLoading, refreshHabits } = useData();
    const [newHabit, setNewHabit] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    
    // Add frequency state for creating new habit
    const [freqType, setFreqType] = useState('daily');
    const [freqDays, setFreqDays] = useState([1, 2, 3, 4, 5]); // Default: Mon-Fri
    const [freqTimesPerWeek, setFreqTimesPerWeek] = useState(3);
    const [freqEveryNDays, setFreqEveryNDays] = useState(2);

    // Add value-tracking state for creating new habit
    const [tracksValue, setTracksValue] = useState(false);
    const [valueUnit, setValueUnit] = useState('');

    // Add frequency state for editing habit
    const [editFreqType, setEditFreqType] = useState('daily');
    const [editFreqDays, setEditFreqDays] = useState([]);
    const [editFreqTimesPerWeek, setEditFreqTimesPerWeek] = useState(1);
    const [editFreqEveryNDays, setEditFreqEveryNDays] = useState(2);

    // Add value-tracking state for editing habit
    const [editTracksValue, setEditTracksValue] = useState(false);
    const [editValueUnit, setEditValueUnit] = useState('');

    const { addToast } = useToast();

    const addHabit = async () => {
        const name = newHabit.trim();
        if (!name) return;
        try {
            const frequency = {
                type: freqType,
                days: freqType === 'specific_days' ? freqDays : [],
                timesPerWeek: freqType === 'times_per_week' ? freqTimesPerWeek : 1,
                everyNDays: freqType === 'every_n_days' ? freqEveryNDays : 2
            };
            await habitApi.create({ 
                name, 
                userId: user.uid, 
                frequency, 
                tracksValue, 
                valueUnit: tracksValue ? valueUnit.trim() : '' 
            });
            setNewHabit('');
            setFreqType('daily');
            setFreqDays([1, 2, 3, 4, 5]);
            setFreqTimesPerWeek(3);
            setFreqEveryNDays(2);
            setTracksValue(false);
            setValueUnit('');
            addToast('Habit added!');
            refreshHabits();
        } catch (e) {
            addToast('Error adding habit', 'error');
        }
    };

    const deleteHabit = async (id) => {
        if (!confirm('Delete this habit? All its historical progress will be lost.')) return;
        try {
            await habitApi.delete(id);
            addToast('Habit deleted');
            refreshHabits();
        } catch (e) {
            addToast('Error deleting habit', 'error');
        }
    };

    // Removing seedDefault function

    const saveEdit = async (id) => {
        if (!editValue.trim()) return;
        try {
            const frequency = {
                type: editFreqType,
                days: editFreqType === 'specific_days' ? editFreqDays : [],
                timesPerWeek: editFreqType === 'times_per_week' ? editFreqTimesPerWeek : 1,
                everyNDays: editFreqType === 'every_n_days' ? editFreqEveryNDays : 2
            };
            await habitApi.update(id, { 
                name: editValue.trim(), 
                frequency, 
                tracksValue: editTracksValue, 
                valueUnit: editTracksValue ? editValueUnit.trim() : '' 
            });
            setEditingId(null);
            refreshHabits();
            addToast('Habit updated!');
        } catch (e) {
            addToast('Error updating habit', 'error');
        }
    };

    if (habitsLoading) return <div className="loading-screen">⚙️ Loading...</div>;

    return (
        <div className="fade-in">
            <h1 className="page-title">⚙️ Manage Disciplines</h1>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Add New Discipline</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0 0 0' }}>
                    <div className="manage-form" style={{ flexWrap: 'wrap', margin: 0, padding: 0 }}>
                        <input
                            className="manage-input"
                            style={{ minWidth: '200px', flex: 1 }}
                            type="text"
                            placeholder="e.g. Read 10 pages..."
                            value={newHabit}
                            onChange={e => setNewHabit(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addHabit()}
                        />
                        <button className="add-btn" onClick={addHabit}>+ Add Habit</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>Frequency Type</label>
                                <select
                                    className="notif-time-input"
                                    style={{ width: '180px', padding: '8px' }}
                                    value={freqType}
                                    onChange={e => setFreqType(e.target.value)}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="specific_days">Specific Days</option>
                                    <option value="times_per_week">X times per week</option>
                                    <option value="every_n_days">Every N Days</option>
                                </select>
                            </div>

                            {freqType === 'times_per_week' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} className="fade-in">
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>Target completions</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            min="1"
                                            max="7"
                                            className="notif-time-input"
                                            style={{ width: '80px', padding: '8px' }}
                                            value={freqTimesPerWeek}
                                            onChange={e => setFreqTimesPerWeek(Math.max(1, Math.min(7, parseInt(e.target.value) || 1)))}
                                        />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>times a week</span>
                                    </div>
                                </div>
                            )}

                            {freqType === 'every_n_days' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} className="fade-in">
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>Interval (days)</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Every</span>
                                        <input
                                            type="number"
                                            min="2"
                                            max="90"
                                            className="notif-time-input"
                                            style={{ width: '80px', padding: '8px' }}
                                            value={freqEveryNDays}
                                            onChange={e => setFreqEveryNDays(Math.max(2, parseInt(e.target.value) || 2))}
                                        />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>days</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {freqType === 'specific_days' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="fade-in">
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>Repeat on</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, idx) => {
                                        const isSelected = freqDays.includes(idx);
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                className={`notif-toggle-btn ${isSelected ? 'active' : ''}`}
                                                style={{ 
                                                    padding: '6px 12px', 
                                                    fontSize: '0.8rem', 
                                                    border: '1px solid var(--border-color)',
                                                    opacity: isSelected ? 1 : 0.6,
                                                    background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.03)'
                                                }}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setFreqDays(freqDays.filter(d => d !== idx));
                                                    } else {
                                                        setFreqDays([...freqDays, idx].sort());
                                                    }
                                                }}
                                            >
                                                {dayName}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Value Tracking Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    id="tracks-value-checkbox"
                                    checked={tracksValue}
                                    onChange={e => setTracksValue(e.target.checked)}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <label htmlFor="tracks-value-checkbox" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 500 }}>
                                    Track a numeric value with this habit? (e.g. water intake, running distance)
                                </label>
                            </div>
                            
                            {tracksValue && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '24px' }} className="fade-in">
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>Unit Label</label>
                                    <input
                                        type="text"
                                        className="notif-time-input"
                                        style={{ width: '180px', padding: '8px' }}
                                        placeholder="e.g. glasses, miles, pages"
                                        value={valueUnit}
                                        onChange={e => setValueUnit(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Active Trackers ({habits.length})</span>
                </div>
                <div className="habit-list">
                    {habits.map(habit => (
                        <div key={habit._id} className="habit-manage-item">
                            <div style={{ display: 'flex', flex: 1, gap: '12px', alignItems: 'center' }}>
                                {editingId === habit._id ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                        <input
                                            className="manage-input"
                                            style={{ padding: '8px', height: 'auto', width: '100%' }}
                                            placeholder="Habit Name"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Frequency Type</label>
                                                    <select
                                                        className="notif-time-input"
                                                        style={{ padding: '6px', fontSize: '0.8rem' }}
                                                        value={editFreqType}
                                                        onChange={e => setEditFreqType(e.target.value)}
                                                    >
                                                        <option value="daily">Daily</option>
                                                        <option value="specific_days">Specific Days</option>
                                                        <option value="times_per_week">X times per week</option>
                                                        <option value="every_n_days">Every N Days</option>
                                                    </select>
                                                </div>

                                                {editFreqType === 'times_per_week' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} className="fade-in">
                                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Target</label>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max="7"
                                                                className="notif-time-input"
                                                                style={{ width: '60px', padding: '6px', fontSize: '0.8rem' }}
                                                                value={editFreqTimesPerWeek}
                                                                onChange={e => setEditFreqTimesPerWeek(Math.max(1, Math.min(7, parseInt(e.target.value) || 1)))}
                                                            />
                                                            <span style={{ fontSize: '0.8rem' }}>times/week</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {editFreqType === 'every_n_days' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} className="fade-in">
                                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Interval</label>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ fontSize: '0.8rem' }}>Every</span>
                                                            <input
                                                                type="number"
                                                                min="2"
                                                                max="90"
                                                                className="notif-time-input"
                                                                style={{ width: '60px', padding: '6px', fontSize: '0.8rem' }}
                                                                value={editFreqEveryNDays}
                                                                onChange={e => setEditFreqEveryNDays(Math.max(2, parseInt(e.target.value) || 2))}
                                                            />
                                                            <span style={{ fontSize: '0.8rem' }}>days</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {editFreqType === 'specific_days' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} className="fade-in">
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Repeat on</label>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, idx) => {
                                                            const isSelected = editFreqDays.includes(idx);
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    className={`notif-toggle-btn ${isSelected ? 'active' : ''}`}
                                                                    style={{ 
                                                                        padding: '4px 8px', 
                                                                        fontSize: '0.75rem', 
                                                                        border: '1px solid var(--border-color)',
                                                                        opacity: isSelected ? 1 : 0.6,
                                                                        background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.03)'
                                                                    }}
                                                                    onClick={() => {
                                                                        if (isSelected) {
                                                                            setEditFreqDays(editFreqDays.filter(d => d !== idx));
                                                                        } else {
                                                                            setEditFreqDays([...editFreqDays, idx].sort());
                                                                        }
                                                                    }}
                                                                >
                                                                    {dayName}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Edit Value Tracking Toggle */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input
                                                        type="checkbox"
                                                        id={`edit-tracks-value-${habit._id}`}
                                                        checked={editTracksValue}
                                                        onChange={e => setEditTracksValue(e.target.checked)}
                                                        style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                                                    />
                                                    <label htmlFor={`edit-tracks-value-${habit._id}`} style={{ fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                                                        Track a numeric value?
                                                    </label>
                                                </div>
                                                
                                                {editTracksValue && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '22px' }} className="fade-in">
                                                        <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Unit Label</label>
                                                        <input
                                                            type="text"
                                                            className="notif-time-input"
                                                            style={{ width: '150px', padding: '6px', fontSize: '0.8rem' }}
                                                            placeholder="e.g. glasses, miles"
                                                            value={editValueUnit}
                                                            onChange={e => setEditValueUnit(e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontWeight: 600 }}>{habit.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                            {(() => {
                                                const freq = habit.frequency || { type: 'daily' };
                                                if (freq.type === 'specific_days') {
                                                    const days = freq.days || [];
                                                    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                                    return `Specific days: ${days.map(d => names[d]).join(', ')}`;
                                                }
                                                if (freq.type === 'times_per_week') {
                                                    return `${freq.timesPerWeek || 1} time(s) per week`;
                                                }
                                                if (freq.type === 'every_n_days') {
                                                    return `Every ${freq.everyNDays || 2} days`;
                                                }
                                                return 'Daily';
                                            })()}
                                            {habit.tracksValue && ` • Tracks value (${habit.valueUnit || 'no unit'})`}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                {editingId === habit._id ? (
                                    <button className="add-btn" style={{ padding: '8px 16px' }} onClick={() => saveEdit(habit._id)}>Save</button>
                                ) : (
                                    <button className="delete-btn" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary-light)', borderColor: 'rgba(99,102,241,0.3)' }}
                                        onClick={() => { 
                                            setEditingId(habit._id); 
                                            setEditValue(habit.name);
                                            const freq = habit.frequency || { type: 'daily' };
                                            setEditFreqType(freq.type || 'daily');
                                            setEditFreqDays(freq.days || []);
                                            setEditFreqTimesPerWeek(freq.timesPerWeek || 1);
                                            setEditFreqEveryNDays(freq.everyNDays || 2);
                                            setEditTracksValue(habit.tracksValue || false);
                                            setEditValueUnit(habit.valueUnit || '');
                                        }}>Edit</button>
                                )}
                                <button className="delete-btn" onClick={() => deleteHabit(habit._id)}>Remove</button>
                            </div>
                        </div>
                    ))}
                    {habits.length === 0 && <div className="empty-state">No habits tracked yet.</div>}
                </div>
            </div>

            {/* Notification Settings */}
            <NotificationSettingsPanel />
        </div>
    );
}
