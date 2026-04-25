import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const DEFAULT_HABITS = [
    "Wake up at 8:00 AM", "Oat Meal", "Gym", "Dsa", "web development",
    "no wasting money", "Apply Sunscreen", "No Junk Food",
    "less Screen time (5 hrs)", "Parents", "Bathing",
    "Bread Peanut Butter", "Eggs or chicken", "College Work",
    "sleep at 11 PM", "8 hours sleep"
];

export default function ManageHabitsPage() {
    const { user } = useAuth();
    const [habits, setHabits] = useState([]);
    const [newHabit, setNewHabit] = useState('');
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const { addToast } = useToast();

    async function fetchHabits() {
        setLoading(true);
        try {
            const { data } = await supabase.from('habits').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
            setHabits(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchHabits(); }, [user?.id]);

    const addHabit = async () => {
        const name = newHabit.trim();
        if (!name) return;
        try {
            await supabase.from('habits').insert({
                name,
                user_id: user.id
            });
            setNewHabit('');
            addToast('Habit added successfully!');
            fetchHabits();
        } catch (e) {
            addToast('Error adding habit', 'error');
        }
    };

    const deleteHabit = async (id) => {
        if (!confirm('Delete this habit? All its historical progress will be lost.')) return;
        try {
            await supabase.from('habits').delete().eq('id', id);
            addToast('Habit deleted');
            fetchHabits();
        } catch (e) {
            addToast('Error deleting habit', 'error');
        }
    };

    const seedDefault = async () => {
        setSeeding(true);
        try {
            for (const name of DEFAULT_HABITS) {
                await supabase.from('habits').upsert({ name, user_id: user.id }, { onConflict: 'name' });
            }
            fetchHabits();
            addToast('Default habits loaded successfully!');
        } catch (e) {
            addToast('Error seeding habits', 'error');
        } finally {
            setSeeding(false);
        }
    };

    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    const saveEdit = async (id) => {
        if (!editValue.trim()) return;
        try {
            await supabase.from('habits').update({ name: editValue.trim() }).eq('id', id);
            setEditingId(null);
            fetchHabits();
            addToast('Habit updated!');
        } catch (e) {
            addToast('Error updating habit', 'error');
        }
    };

    if (loading) return <div className="loading-screen">⚙️ Loading Settings...</div>;

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

                <div style={{ marginTop: 12 }}>
                    <button className="add-btn" onClick={seedDefault} disabled={seeding} style={{ background: 'var(--success-border)', color: 'var(--success)', border: '1px solid var(--success-border)' }}>
                        {seeding ? '⏳ Loading...' : '🚀 Reload Default Set'}
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Active Trackers ({habits.length})</span>
                </div>
                <div className="habit-list">
                    {habits.map(habit => (
                        <div key={habit.id} className="habit-manage-item">
                            <div style={{ display: 'flex', flex: 1, gap: '12px', alignItems: 'center' }}>
                                {editingId === habit.id ? (
                                    <input 
                                        className="manage-input"
                                        style={{ padding: '4px 8px', height: 'auto' }}
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && saveEdit(habit.id)}
                                        autoFocus
                                    />
                                ) : (
                                    <span style={{ fontWeight: 600 }}>{habit.name}</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {editingId === habit.id ? (
                                    <button className="add-btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => saveEdit(habit.id)}>Save</button>
                                ) : (
                                    <button className="delete-btn" style={{ background: 'rgba(37, 192, 244, 0.1)', color: 'var(--primary-light)', borderColor: 'rgba(37, 192, 244, 0.3)' }} onClick={() => {
                                        setEditingId(habit.id);
                                        setEditValue(habit.name);
                                    }}>Edit</button>
                                )}
                                <button className="delete-btn" onClick={() => deleteHabit(habit.id)}>Remove</button>
                            </div>
                        </div>
                    ))}
                    {habits.length === 0 && <div className="empty-state">No habits tracked yet.</div>}
                </div>
            </div>
        </div>
    );
}
