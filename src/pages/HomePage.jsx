import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Greeting from '../components/Greeting';
import useMidnightRefresh from '../hooks/useMidnightRefresh';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';

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
    const [mood, setMood] = useState(null);
    const { addToast } = useToast();

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

            // 4. Fetch today's mood
            const { data: moodData } = await supabase
                .from('mood_logs')
                .select('mood_score')
                .eq('log_date', dateToFetch)
                .maybeSingle();
            setMood(moodData?.mood_score || null);

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
            if (next) addToast(`Completed: ${habit.name}`);
        } catch (e) {
            console.error('Toggle error:', e);
            addToast('Failed to save progress', 'error');
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
            addToast('Note saved automatically!');
            setTimeout(() => setNoteSaved(false), 2000);
        } catch (e) {
            console.error('Save note error:', e);
            addToast('Error saving note', 'error');
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
            addToast('Successfully seeded 16 habits!');
        } catch (e) {
            addToast('Seeding failed', 'error');
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

            <div className="mood-redesign-container" style={{ marginBottom: '32px' }}>
                <div className="card mood-glass-card" style={{ padding: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div className="mood-glow-bg"></div>
                    <span className="kpi-label" style={{ display: 'block', marginBottom: '16px', fontSize: '0.9rem', opacity: 0.8, letterSpacing: '1px', textTransform: 'uppercase' }}>What's the vibe today?</span>

                    <div className="mood-dock">
                        {[
                            { score: 1, emoji: '😫', label: 'Tired & Low' },
                            { score: 2, emoji: '😕', label: 'Meh...' },
                            { score: 3, emoji: '😐', label: 'Getting there' },
                            { score: 4, emoji: '🙂', label: 'Solid' },
                            { score: 5, emoji: '🤩', label: 'Epic!' }
                        ].map(m => (
                            <motion.button
                                key={m.score}
                                className={`mood-emoji-btn ${mood === m.score ? 'active' : ''}`}
                                whileHover={{ scale: 1.3, y: -8 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                onClick={async () => {
                                    setMood(m.score);
                                    await supabase.from('mood_logs').upsert({ log_date: today, mood_score: m.score }, { onConflict: 'log_date' });
                                    addToast(`Feeling ${m.label}!`);
                                }}
                            >
                                <span className="emoji-icon">{m.emoji}</span>
                                {mood === m.score && (
                                    <motion.div
                                        layoutId="mood-active-glow"
                                        className="mood-active-glow"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    />
                                )}
                            </motion.button>
                        ))}
                    </div>

                    <div className="vibe-status" style={{ marginTop: '20px', height: '24px' }}>
                        {mood ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={mood}
                                style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <span>Current Vibe:</span>
                                <span style={{ color: 'white' }}>
                                    {[
                                        '', 'Tired & Low', 'Meh...', 'Getting there', 'Solid', 'Epic!'
                                    ][mood]}
                                </span>
                            </motion.div>
                        ) : (
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Tap an emoji to set your vibe</div>
                        )}
                    </div>
                </div>
            </div>

            <motion.div
                className="kpi-grid"
                initial="hidden"
                animate="show"
                variants={{
                    hidden: {},
                    show: {
                        transition: { staggerChildren: 0.15 }
                    }
                }}
            >
                <motion.div className="kpi-card" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                    <span className="kpi-label">Today's Score</span>
                    <span className="kpi-value">{pct}%</span>
                    <span className="kpi-sub">{completed} / {habits.length} habits</span>
                </motion.div>
                <motion.div className="kpi-card" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                    <span className="kpi-label">Remaining</span>
                    <span className="kpi-value">{habits.length - completed}</span>
                    <span className="kpi-sub">disciplines left</span>
                </motion.div>
                <motion.div className="kpi-card" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                    <span className="kpi-label">Total Habits</span>
                    <span className="kpi-value">{habits.length}</span>
                    <span className="kpi-sub">active trackers</span>
                </motion.div>
            </motion.div>

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
                    <motion.div
                        className="habit-list"
                        initial="hidden"
                        animate="show"
                        variants={{
                            hidden: {},
                            show: {
                                transition: { staggerChildren: 0.08 }
                            }
                        }}
                    >
                        {habits.map(habit => {
                            const done = !!logs[habit.id];
                            return (
                                <motion.div
                                    key={habit.id}
                                    variants={{
                                        hidden: { opacity: 0, filter: 'blur(5px)', x: -25 },
                                        show: { opacity: 1, filter: 'blur(0px)', x: 0 }
                                    }}
                                    className={`habit-item${done ? ' completed' : ''}`}
                                    onClick={() => toggleHabit(habit)}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.2}
                                    onDragEnd={(e, info) => {
                                        if (info.offset.x > 50 || info.offset.x < -50) {
                                            toggleHabit(habit);
                                        }
                                    }}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="habit-info">
                                        <span className="habit-name">{habit.name}</span>
                                    </div>
                                    <div className="check-circle">
                                        {done && (
                                            <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <motion.polyline
                                                    points="20 6 9 17 4 12"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                                />
                                            </svg>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
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
