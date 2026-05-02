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
    const { addToast } = useToast();

    const addHabit = async () => {
        const name = newHabit.trim();
        if (!name) return;
        try {
            await habitApi.create({ name, userId: user.uid });
            setNewHabit('');
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
            await habitApi.update(id, { name: editValue.trim() });
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
                <div className="manage-form" style={{ flexWrap: 'wrap' }}>
                    <input
                        className="manage-input"
                        style={{ minWidth: '200px' }}
                        type="text"
                        placeholder="e.g. Read 10 pages..."
                        value={newHabit}
                        onChange={e => setNewHabit(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addHabit()}
                    />
                    <button className="add-btn" onClick={addHabit}>+ Add Habit</button>
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
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600 }}>{habit.name}</span>
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
