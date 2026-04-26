import { useState, useEffect, useCallback } from 'react';
import { habitApi, moodApi } from '../api';
import Greeting from '../components/Greeting';
import useMidnightRefresh from '../hooks/useMidnightRefresh';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { motion } from 'framer-motion';

const MOODS = [
    { score: 1, emoji: '😫', label: 'Terrible' },
    { score: 2, emoji: '😕', label: 'Bad' },
    { score: 3, emoji: '😐', label: 'Okay' },
    { score: 4, emoji: '🙂', label: 'Good' },
    { score: 5, emoji: '🤩', label: 'Amazing' },
];

const DEFAULT_HABITS = [
    "Wake up at 8:00 AM", "Oat Meal", "Gym", "Dsa", "web development",
    "no wasting money", "Apply Sunscreen", "No Junk Food",
    "less Screen time (5 hrs)", "Parents", "Bathing",
    "Bread Peanut Butter", "Eggs or chicken", "College Work",
    "sleep at 11 PM", "8 hours sleep"
];

export default function HomePage() {
    const { user } = useAuth();
    const { habits, habitsLoading, refreshHabits } = useData();
    const [logs, setLogs] = useState({});
    const [mood, setMood] = useState(null);
    const [seeding, setSeeding] = useState(false);
    const [error, setError] = useState(null);
    const { addToast } = useToast();
    const today = useMidnightRefresh();

    // Build today's logs from cached habits
    useEffect(() => {
        const logsMap = {};
        habits.forEach(habit => {
            if (habit.completions?.some(c => c.date === today)) {
                logsMap[habit._id] = true;
            }
        });
        setLogs(logsMap);
    }, [habits, today]);

    // Load mood (lightweight, not cached)
    useEffect(() => {
        if (!user?.uid || !today) return;
        moodApi.getByDate(user.uid, today)
            .then(({ data }) => setMood(data?.score || null))
            .catch(() => {});
    }, [user?.uid, today]);

    const toggleHabit = async (habit) => {
        const habitId = habit._id;
        const current = !!logs[habitId];
        const next = !current;
        setLogs(prev => ({ ...prev, [habitId]: next }));
        try {
            await habitApi.toggleCompletion(habitId, today, next ? 1 : 0);
            if (next) addToast(`✅ ${habit.name}`);
        } catch (e) {
            addToast('Failed to save progress', 'error');
            setLogs(prev => ({ ...prev, [habitId]: current }));
        }
    };

    const saveMood = async (score) => {
        setMood(score);
        try {
            await moodApi.save(user.uid, today, score);
            const found = MOODS.find(m => m.score === score);
            addToast(`Mood set: ${found?.emoji} ${found?.label}`);
        } catch (e) {
            addToast('Failed to save mood', 'error');
        }
    };

    const addCustomHabit = async (name) => {
        if (!name.trim()) return;
        try {
            await habitApi.create({ name: name.trim(), userId: user.uid });
            addToast('Habit added!');
            refreshHabits();
        } catch (e) {
            addToast('Failed to add habit', 'error');
        }
    };

    const seedHabits = async () => {
        setSeeding(true);
        try {
            for (const name of DEFAULT_HABITS) {
                await habitApi.create({ name, userId: user.uid, targetValue: 1, unit: 'times' });
            }
            refreshHabits();
            addToast('Default habits loaded!');
        } catch (e) {
            addToast('Seeding failed', 'error');
        } finally {
            setSeeding(false);
        }
    };

    if (habitsLoading) return <div className="loading-screen">⏳ Loading...</div>;

    const completed = habits.filter(h => logs[h._id]).length;
    const pct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;

    return (
        <div className="fade-in">
            <Greeting />

            <motion.div
                className="kpi-grid"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15 } } }}
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

            {/* Mood of the Day */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <span className="card-title">😊 Mood of the Day</span>
                    {mood && <span className="badge badge-primary">{MOODS.find(m => m.score === mood)?.label}</span>}
                </div>
                <div className="mood-picker">
                    {MOODS.map(m => (
                        <button
                            key={m.score}
                            className={`mood-btn${mood === m.score ? ' selected' : ''}`}
                            onClick={() => saveMood(m.score)}
                            title={m.label}
                        >
                            {m.emoji}
                        </button>
                    ))}
                    <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        {mood ? `Feeling ${MOODS.find(m => m.score === mood)?.label} today` : 'How are you feeling today?'}
                    </span>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">📋 Daily Disciplines</span>
                    <span className="badge badge-primary">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>

                {habits.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                        <p style={{ marginBottom: 20, color: 'var(--text-dim)' }}>No habits yet. Add some!</p>
                        <div className="manage-form" style={{ maxWidth: '500px', margin: '0 auto 24px', justifyContent: 'center' }}>
                            <input
                                className="manage-input"
                                type="text"
                                placeholder="Enter a habit name..."
                                id="quick-add-habit"
                                onKeyDown={e => e.key === 'Enter' && (addCustomHabit(e.target.value), e.target.value = '')}
                            />
                            <button className="add-btn" onClick={() => {
                                const el = document.getElementById('quick-add-habit');
                                addCustomHabit(el.value); el.value = '';
                            }}>+ Add</button>
                        </div>
                        <button className="add-btn" onClick={seedHabits} disabled={seeding}
                            style={{ background: 'var(--success)', padding: '12px 24px', width: 'fit-content' }}>
                            {seeding ? 'Seeding...' : '🚀 Load Default Habits'}
                        </button>
                    </div>
                ) : (
                    <motion.div
                        className="habit-list"
                        initial="hidden"
                        animate="show"
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                    >
                        {habits.map(habit => {
                            const done = !!logs[habit._id];
                            return (
                                <motion.div
                                    key={habit._id}
                                    variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}
                                    className={`habit-item${done ? ' completed' : ''}`}
                                    onClick={() => toggleHabit(habit)}
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
        </div>
    );
}
