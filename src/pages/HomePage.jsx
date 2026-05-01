import { useState, useEffect, useCallback } from 'react';
import { habitApi, moodApi, goalApi } from '../api';
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
    const [goals, setGoals] = useState([]);
    const [historyGoals, setHistoryGoals] = useState([]);
    const [goalTab, setGoalTab] = useState('today');
    const [newGoalText, setNewGoalText] = useState('');
    const [newGoalTime, setNewGoalTime] = useState('');
    const [newGoalNagTime, setNewGoalNagTime] = useState('');
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
        
        goalApi.getAll(user.uid, today)
            .then(({ data }) => setGoals(data))
            .catch(() => {});
            
        goalApi.getHistory(user.uid)
            .then(({ data }) => setHistoryGoals(data))
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
        if (!confirm('This will delete ALL your current habits and reset to the default set. Are you sure?')) return;
        setSeeding(true);
        try {
            // 1. Delete all current habits
            for (const habit of habits) {
                await habitApi.delete(habit._id);
            }

            // 2. Load defaults
            for (const name of DEFAULT_HABITS) {
                await habitApi.create({ name, userId: user.uid, targetValue: 1, unit: 'times' });
            }
            refreshHabits();
            addToast('Habits reset to default!');
        } catch (e) {
            addToast('Seeding failed', 'error');
        } finally {
            setSeeding(false);
        }
    };

    const addGoal = async () => {
        if (!newGoalText.trim()) return;
        try {
            const { data } = await goalApi.create({
                userId: user.uid,
                text: newGoalText.trim(),
                time: newGoalTime.trim(),
                nagTime: parseInt(newGoalNagTime, 10) || 0,
                date: today
            });
            setGoals(prev => [...prev, data]);
            setHistoryGoals(prev => [data, ...prev]);
            setNewGoalText('');
            setNewGoalTime('');
            setNewGoalNagTime('');
            addToast('🎯 Goal added!');
        } catch (e) {
            addToast('Failed to add goal', 'error');
        }
    };

    const toggleGoal = async (id) => {
        try {
            setGoals(prev => prev.map(g => g._id === id ? { ...g, completed: !g.completed } : g));
            setHistoryGoals(prev => prev.map(g => g._id === id ? { ...g, completed: !g.completed } : g));
            await goalApi.toggle(id);
        } catch (e) {
            addToast('Failed to update goal', 'error');
            // Revert state on error
            setGoals(prev => prev.map(g => g._id === id ? { ...g, completed: !g.completed } : g));
            setHistoryGoals(prev => prev.map(g => g._id === id ? { ...g, completed: !g.completed } : g));
        }
    };

    const deleteGoal = async (e, id) => {
        e.stopPropagation();
        try {
            await goalApi.delete(id);
            setGoals(prev => prev.filter(g => g._id !== id));
            setHistoryGoals(prev => prev.filter(g => g._id !== id));
            addToast('Goal removed');
        } catch (e) {
            addToast('Failed to delete goal', 'error');
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

            {/* Today's Goals Section */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <span 
                            className={`card-title ${goalTab === 'today' ? '' : 'dimmed'}`} 
                            style={{ cursor: 'pointer', opacity: goalTab === 'today' ? 1 : 0.5 }}
                            onClick={() => setGoalTab('today')}
                        >🎯 Today's Goals</span>
                        <span 
                            className={`card-title ${goalTab === 'history' ? '' : 'dimmed'}`} 
                            style={{ cursor: 'pointer', opacity: goalTab === 'history' ? 1 : 0.5 }}
                            onClick={() => setGoalTab('history')}
                        >📜 History</span>
                    </div>
                    {goalTab === 'today' && <span className="badge badge-primary">{goals.filter(g => g.completed).length} / {goals.length} done</span>}
                </div>
                
                {goalTab === 'today' ? (
                    <>
                        <div className="goal-input-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                            <input
                                className="manage-input goal-input-main"
                                style={{ flex: '2 1 200px' }}
                                type="text"
                                placeholder="What's your goal for today?"
                                value={newGoalText}
                                onChange={e => setNewGoalText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addGoal()}
                            />
                            <input
                                className="manage-input goal-input-time"
                                style={{ flex: '1 1 100px' }}
                                type="time"
                                value={newGoalTime}
                                onChange={e => setNewGoalTime(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addGoal()}
                                title="Deadline"
                            />
                            <input 
                                className="manage-input" 
                                style={{ flex: '1 1 120px', padding: '10px' }}
                                type="number"
                                min="0"
                                placeholder="Nag (mins)"
                                value={newGoalNagTime}
                                onChange={e => setNewGoalNagTime(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addGoal()}
                                title="Nag Interval (leave empty or 0 to disable)"
                            />
                            <button className="add-btn" onClick={addGoal} style={{ padding: '0 20px', flex: '1 1 100px' }}>+ Add Goal</button>
                        </div>

                        {goals.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px 0', fontSize: '0.9rem' }}>
                                No goals set for today yet.
                            </p>
                        ) : (
                            <div className="goal-list">
                                {goals.sort((a, b) => a.completed - b.completed).map(goal => (
                                    <div 
                                        key={goal._id} 
                                        className={`goal-item${goal.completed ? ' completed' : ''}`}
                                        onClick={() => toggleGoal(goal._id)}
                                    >
                                        <div className="check-circle" style={{ width: '22px', height: '22px', marginRight: '4px' }}>
                                            {goal.completed && (
                                                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="goal-content">
                                            <span className="goal-text">{goal.text}</span>
                                            {goal.time && <span className="goal-time-badge">🕒 Complete by {goal.time}</span>}
                                            {goal.nagTime > 0 && <span className="goal-time-badge" style={{marginLeft: '6px'}}>🔔 Nag {goal.nagTime}m</span>}
                                        </div>
                                        <div className="goal-delete-btn" onClick={(e) => deleteGoal(e, goal._id)}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                                            </svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="goal-list history-list">
                        {historyGoals.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px 0', fontSize: '0.9rem' }}>
                                No goal history found.
                            </p>
                        ) : (
                            historyGoals.map(goal => (
                                <div 
                                    key={goal._id} 
                                    className={`goal-item${goal.completed ? ' completed' : ''}`}
                                    onClick={() => toggleGoal(goal._id)}
                                    style={{ opacity: goal.completed ? 0.7 : 1 }}
                                >
                                    <div className="check-circle" style={{ width: '22px', height: '22px', marginRight: '4px' }}>
                                        {goal.completed && (
                                            <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="goal-content">
                                        <span className="goal-text">{goal.text}</span>
                                        <span className="goal-time-badge" style={{ background: 'var(--bg-card-hover)' }}>📅 {goal.date}</span>
                                        {goal.time && <span className="goal-time-badge">🕒 {goal.time}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

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
