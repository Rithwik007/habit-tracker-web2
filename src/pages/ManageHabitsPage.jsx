import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';

const DEFAULT_HABITS = [
    "Wake up at 8:00 AM", "Oat Meal", "Gym", "Dsa", "web development",
    "no wasting money", "Apply Sunscreen", "No Junk Food",
    "less Screen time (5 hrs)", "Parents", "Bathing",
    "Bread Peanut Butter", "Eggs or chicken", "College Work",
    "sleep at 11 PM", "8 hours sleep"
];

export default function ManageHabitsPage() {
    const [habits, setHabits] = useState([]);
    const [newHabit, setNewHabit] = useState('');
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const { addToast } = useToast();

    async function fetchHabits() {
        setLoading(true);
        try {
            const { data } = await supabase.from('habits').select('*').order('created_at', { ascending: true });
            setHabits(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchHabits(); }, []);

    const addHabit = async () => {
        const name = newHabit.trim();
        if (!name) return;
        try {
            await supabase.from('habits').insert({
                name
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
                await supabase.from('habits').upsert({ name }, { onConflict: 'name' });
            }
            fetchHabits();
            addToast('Default habits loaded successfully!');
        } catch (e) {
            addToast('Error seeding habits', 'error');
        } finally {
            setSeeding(false);
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: 600 }}>{habit.name}</span>
                            </div>
                            <button className="delete-btn" onClick={() => deleteHabit(habit.id)}>Remove</button>
                        </div>
                    ))}
                    {habits.length === 0 && <div className="empty-state">No habits tracked yet.</div>}
                </div>
            </div>
        </div>
    );
}
