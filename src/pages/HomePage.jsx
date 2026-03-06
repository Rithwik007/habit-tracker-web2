import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Greeting from '../components/Greeting';
import useMidnightRefresh from '../hooks/useMidnightRefresh';

const DEFAULT_HABITS = [
    "Wake up at 8:00 AM", "Oat Meal", "Gym", "Dsa", "web development",
    "no wasting money", "Apply Sunscreen", "No Junk Food",
    "less Screen time (5 hrs)", "Parents", "Bathing",
    "Bread Peanut Butter", "Eggs or chicken", "College Work",
    "sleep at 11 PM", "8 hours sleep"
];

export default function HomePage() {
    const [habits, setHabits] = useState([]);
    const [logs, setLogs] = useState({});
    const [note, setNote] = useState('');
    const [noteSaved, setNoteSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [seeding, setSeeding] = useState(false);

    // Reactive date that auto-updates at midnight
    const today = useMidnightRefresh();

    const fetchData = useCallback(async (dateOverride) => {
        const dateToFetch = dateOverride || today;
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch habits
            const { data: habitsData, error: habitsError } = await supabase
                .from('habits')
                .select('*')
                .order('created_at', { ascending: true });

            if (habitsError) throw habitsError;
            setHabits(habitsData || []);

            // 2. Fetch today's logs
            if (habitsData && habitsData.length > 0) {
                const { data: logsData, error: logsError } = await supabase
                    .from('daily_logs')
                    .select('*')
                    .eq('log_date', dateToFetch);

                if (logsError) throw logsError;
                const logsMap = {};
                (logsData || []).forEach(l => { logsMap[l.habit_id] = l.completed; });
                setLogs(logsMap);
            }

            // 3. Fetch today's note
            const { data: noteData, error: noteError } = await supabase
                .from('daily_notes')
                .select('note')
                .eq('note_date', dateToFetch)
                .maybeSingle();

            if (noteError) throw noteError;
            setNote(noteData?.note || '');

        } catch (e) {
            console.error('HomePage Fetch Error:', e);
            setError(e.message || 'Failed to connect to Supabase. Check your internet or ad-blocker.');
        } finally {
            setLoading(false);
        }
    }, [today]);

    // Re-fetch whenever `today` changes (including at midnight)
    useEffect(() => { fetchData(); }, [fetchData]);

    const toggleHabit = async (habit) => {
        const current = !!logs[habit.id];
        const next = !current;
        setLogs(prev => ({ ...prev, [habit.id]: next }));

        try {
            const { error: err } = await supabase.from('daily_logs').upsert(
                { habit_id: habit.id, log_date: today, completed: next },
                { onConflict: 'habit_id,log_date' }
            );
            if (err) throw err;
        } catch (e) {
            console.error('Toggle error:', e);
            alert('Failed to save progress: ' + e.message);
            // Revert UI on failure
            setLogs(prev => ({ ...prev, [habit.id]: current }));
        }
    };

    const saveNote = async () => {
        setNoteSaved(true);
        try {
            const { error: err } = await supabase.from('daily_notes').upsert(
                { note_date: today, note },
                { onConflict: 'note_date' }
            );
            if (err) throw err;
            setTimeout(() => setNoteSaved(false), 2000);
        } catch (e) {
            console.error('Save note error:', e);
            alert('Error saving note: ' + e.message);
            setNoteSaved(false);
        }
    };

    const seedHabits = async () => {
        setSeeding(true);
        try {
            for (const name of DEFAULT_HABITS) {
                await supabase.from('habits').upsert({ name }, { onConflict: 'name' });
            }
            await fetchData();
            alert('Successfully seeded 16 habits!');
        } catch (e) {
            alert('Seeding failed: ' + e.message);
        } finally {
            setSeeding(false);
        }
    };

    if (loading) return <div className="loading-screen">⏳ Syncing with Cloud...</div>;

    if (error) return (
        <div className="layout-center" style={{ padding: 40, textAlign: 'center' }}>
            <div className="card" style={{ borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
                <h2 style={{ color: '#ef4444' }}>⚠️ Connection Problem</h2>
                <p style={{ marginTop: 12, color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                    The app couldn't reach Supabase. This usually means:<br />
                    1. A browser extension (Ad-blocker) is blocking it.<br />
                    2. Your project URL is incorrect in the config.<br />
                    3. Your project is "Paused" in the Supabase dashboard.
                </p>
                <div style={{ padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, marginTop: 16, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    Error Detail: {error}
                </div>
                <button className="add-btn" style={{ marginTop: 20 }} onClick={fetchData}>Try Again</button>
            </div>
        </div>
    );

    const completed = habits.filter(h => logs[h.id]).length;
    const pct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;

    return (
        <div className="fade-in">
            <Greeting />

            <div className="kpi-grid">
                <div className="kpi-card">
                    <span className="kpi-label">Today's Score</span>
                    <span className="kpi-value">{pct}%</span>
                    <span className="kpi-sub">{completed} / {habits.length} habits</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">Remaining</span>
                    <span className="kpi-value">{habits.length - completed}</span>
                    <span className="kpi-sub">disciplines left</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">Total Habits</span>
                    <span className="kpi-value">{habits.length}</span>
                    <span className="kpi-sub">active trackers</span>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">📋 Daily Disciplines</span>
                    <span className="badge badge-primary">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>

                {habits.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                        <p style={{ marginBottom: 20 }}>Your database is currently empty.</p>
                        <button className="add-btn" onClick={seedHabits} disabled={seeding} style={{ background: 'var(--success)', padding: '12px 24px' }}>
                            {seeding ? 'Seeding Habits...' : '🚀 Click to Load 16 Default Habits'}
                        </button>
                    </div>
                ) : (
                    <div className="habit-list">
                        {habits.map(habit => {
                            const done = !!logs[habit.id];
                            return (
                                <div
                                    key={habit.id}
                                    className={`habit-item${done ? ' completed' : ''}`}
                                    onClick={() => toggleHabit(habit)}
                                >
                                    <div className="habit-info">
                                        <span className="habit-name">{habit.name}</span>
                                    </div>
                                    <div className="check-circle">
                                        {done && (
                                            <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">📝 Daily Note</span>
                    {noteSaved && <span className="badge badge-success">Saved!</span>}
                </div>
                <textarea
                    className="daily-note-area"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Log any extra activities, thoughts, or reflections for today..."
                />
                <button className="save-btn" onClick={saveNote} disabled={loading}>
                    Save Note
                </button>
            </div>
        </div>
    );
}
