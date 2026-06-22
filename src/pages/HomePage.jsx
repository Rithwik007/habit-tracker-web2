import { useState, useEffect, useCallback } from 'react';
import { habitApi, moodApi, goalApi } from '../api';
import Greeting from '../components/Greeting';
import useMidnightRefresh from '../hooks/useMidnightRefresh';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { motion } from 'framer-motion';
import { isHabitDueOnDate, calculateAverageValue } from '../utils/profileAnalytics';

const MOODS = [
    { score: 1, emoji: '😫', label: 'Terrible' },
    { score: 2, emoji: '😕', label: 'Bad' },
    { score: 3, emoji: '😐', label: 'Okay' },
    { score: 4, emoji: '🙂', label: 'Good' },
    { score: 5, emoji: '🤩', label: 'Amazing' },
];

// Main dashboard page

function GoalInputForm({ onAdd }) {
    const [text, setText] = useState('');
    const [hasDeadline, setHasDeadline] = useState(false);
    const [time, setTime] = useState('');
    const [nagTime, setNagTime] = useState('');

    const handleAdd = () => {
        onAdd(text, time, nagTime, hasDeadline);
        setText('');
        setTime('');
        setNagTime('');
        setHasDeadline(false);
    };

    return (
        <div className="goal-input-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            <input
                className="manage-input goal-input-main"
                style={{ flex: '2 1 200px' }}
                type="text"
                placeholder="What's your goal for today?"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button 
                className={`notif-toggle-btn ${hasDeadline ? 'active' : ''}`}
                style={{ flex: '0 0 auto', padding: '0 12px', height: '42px', borderRadius: '8px' }}
                onClick={() => setHasDeadline(!hasDeadline)}
                title="Toggle Deadline"
            >
                ⏰
            </button>
            {hasDeadline && (
                <>
                    <input
                        className="manage-input goal-input-time"
                        style={{ flex: '1 1 100px' }}
                        type="time"
                        value={time}
                        onChange={e => setTime(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        title="Deadline"
                    />
                    <input 
                        className="manage-input" 
                        style={{ flex: '1 1 100px', padding: '10px' }}
                        type="number"
                        min="0"
                        placeholder="Nag (mins)"
                        value={nagTime}
                        onChange={e => setNagTime(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        title="Nag Interval (leave empty or 0 to disable)"
                    />
                </>
            )}
            <button className="add-btn" onClick={handleAdd} style={{ padding: '0 20px', flex: '1 1 100px' }}>+ Add Goal</button>
        </div>
    );
}

export default function HomePage() {
    const { user } = useAuth();
    const { habits, habitsLoading, refreshHabits, setHabits } = useData();
    const [logs, setLogs] = useState({});
    const [mood, setMood] = useState(null);
    const [goals, setGoals] = useState([]);
    const [historyGoals, setHistoryGoals] = useState([]);
    const [goalTab, setGoalTab] = useState('today');
    const [seeding, setSeeding] = useState(false);
    const [error, setError] = useState(null);
    const { addToast } = useToast();
    const today = useMidnightRefresh();
    const [valueInputs, setValueInputs] = useState({});
    const [pendingValue, setPendingValue] = useState({});

    // Initialize inputs and pending state
    useEffect(() => {
        const inputs = {};
        (Array.isArray(habits) ? habits : []).forEach(habit => {
            if (habit.tracksValue) {
                const completion = Array.isArray(habit.completions)
                    ? habit.completions.find(c => c.date === today)
                    : null;
                if (completion) {
                    inputs[habit._id] = completion.value !== null ? completion.value.toString() : '';
                } else {
                    const draft = localStorage.getItem(`draft_val_${habit._id}_${today}`);
                    inputs[habit._id] = draft !== null ? draft : '';
                }
            }
        });
        setValueInputs(inputs);
    }, [habits, today]);

    // Build today's logs from cached habits
    // logs[habitId] = 'completed' | 'partial' | 'skipped' | undefined
    useEffect(() => {
        const logsMap = {};
        (Array.isArray(habits) ? habits : []).forEach(habit => {
            if (Array.isArray(habit.completions)) {
                const todayComp = habit.completions.find(c => c.date === today);
                if (todayComp) {
                    logsMap[habit._id] = todayComp.status || 'completed';
                }
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
            .then(({ data }) => setGoals(Array.isArray(data) ? data : []))
            .catch(() => setGoals([]));
            
        goalApi.getHistory(user.uid)
            .then(({ data }) => setHistoryGoals(Array.isArray(data) ? data : []))
            .catch(() => setHistoryGoals([]));
    }, [user?.uid, today]);

    const submitHabitValue = async (habit, value) => {
        const habitId = habit._id;
        // Optimistic update
        setLogs(prev => ({ ...prev, [habitId]: true }));
        setPendingValue(prev => ({ ...prev, [habitId]: false }));
        setHabits(prev => prev.map(h => {
            if (h._id !== habitId) return h;
            const existingCompletions = (Array.isArray(h.completions) ? h.completions : []).filter(c => c.date !== today);
            return { ...h, completions: [...existingCompletions, { date: today, value }] };
        }));
        
        // Also save draft to localStorage so that if unchecked, it's there
        localStorage.setItem(`draft_val_${habitId}_${today}`, value.toString());

        try {
            await habitApi.toggleCompletion(habitId, today, value, true);
            addToast(`${habit.name}: logged ${value} ${habit.valueUnit || ''}`);
        } catch (e) {
            addToast('Failed to save value', 'error');
            // Revert
            setLogs(prev => ({ ...prev, [habitId]: false }));
            refreshHabits();
        }
    };

    const toggleHabit = async (habit) => {
        const habitId = habit._id;
        const current = logs[habitId]; // 'completed' | 'skipped' | undefined
        const isDone = current === 'completed';
        const isSkipped = current === 'skipped';

        if (habit.tracksValue) {
            if (isDone) {
                // It was checked. We are unchecking it.
                // 1. Save current value as draft in localStorage
                const currentValue = valueInputs[habitId] || '';
                if (currentValue !== '') {
                    localStorage.setItem(`draft_val_${habitId}_${today}`, currentValue);
                }
                
                // 2. Clear pending state just in case
                setPendingValue(prev => ({ ...prev, [habitId]: false }));

                // 3. Optimistic update
                setLogs(prev => ({ ...prev, [habitId]: undefined }));
                setHabits(prev => prev.map(h => {
                    if (h._id !== habitId) return h;
                    const completions = (Array.isArray(h.completions) ? h.completions : []).filter(c => c.date !== today);
                    return { ...h, completions };
                }));

                try {
                    await habitApi.toggleCompletion(habitId, today, null, false);
                    addToast('Unchecked ' + habit.name);
                } catch (e) {
                    addToast('Failed to save progress', 'error');
                    // Revert
                    setLogs(prev => ({ ...prev, [habitId]: 'completed' }));
                    refreshHabits();
                }
            } else {
                // It was not checked (or skipped). User clicked checkbox/row.
                // Check if they already have a value in the input.
                const valStr = valueInputs[habitId] || '';
                if (valStr.trim() !== '') {
                    // There is a draft/input value! Complete it with this value.
                    const val = Number(valStr);
                    if (!isNaN(val)) {
                        await submitHabitValue(habit, val);
                    } else {
                        // Focus and mark pending
                        setPendingValue(prev => ({ ...prev, [habitId]: true }));
                    }
                } else {
                    // No value entered yet. Mark as pending and expand input.
                    setPendingValue(prev => ({ ...prev, [habitId]: true }));
                }
            }
        } else {
            // Standard habit: cycle unchecked -> completed -> unchecked
            // (skip is a separate button; clicking check-circle when skipped = complete)
            const next = isDone ? undefined : 'completed';
            setLogs(prev => ({ ...prev, [habitId]: next }));
            setHabits(prev => prev.map(h => {
                if (h._id !== habitId) return h;
                const completions = next === 'completed'
                    ? [...(Array.isArray(h.completions) ? h.completions : []).filter(c => c.date !== today), { date: today, value: 1, status: 'completed' }]
                    : (Array.isArray(h.completions) ? h.completions : []).filter(c => c.date !== today);
                return { ...h, completions };
            }));

            try {
                if (next === 'completed') {
                    await habitApi.toggleCompletion(habitId, today, 1, true, 'completed');
                    addToast(habit.name);
                } else {
                    await habitApi.toggleCompletion(habitId, today, null, false);
                }
            } catch (e) {
                addToast('Failed to save progress', 'error');
                // Revert
                setLogs(prev => ({ ...prev, [habitId]: current }));
                setHabits(prev => prev.map(h => {
                    if (h._id !== habitId) return h;
                    const completions = current === 'completed'
                        ? [...(Array.isArray(h.completions) ? h.completions : []).filter(c => c.date !== today), { date: today, value: 1, status: 'completed' }]
                        : (Array.isArray(h.completions) ? h.completions : []).filter(c => c.date !== today);
                    return { ...h, completions };
                }));
            }
        }
    };

    const skipHabit = async (habit) => {
        const habitId = habit._id;
        const current = logs[habitId];
        const isAlreadySkipped = current === 'skipped';

        if (isAlreadySkipped) {
            // Un-skip: remove the completion record entirely
            setLogs(prev => ({ ...prev, [habitId]: undefined }));
            setHabits(prev => prev.map(h => {
                if (h._id !== habitId) return h;
                const completions = (Array.isArray(h.completions) ? h.completions : []).filter(c => c.date !== today);
                return { ...h, completions };
            }));
            try {
                await habitApi.toggleCompletion(habitId, today, null, false);
            } catch (e) {
                addToast('Failed to unskip', 'error');
                setLogs(prev => ({ ...prev, [habitId]: 'skipped' }));
                refreshHabits();
            }
        } else {
            // Skip it (from any state — completed or unchecked)
            setLogs(prev => ({ ...prev, [habitId]: 'skipped' }));
            setPendingValue(prev => ({ ...prev, [habitId]: false })); // clear any pending value state
            setHabits(prev => prev.map(h => {
                if (h._id !== habitId) return h;
                const existingWithoutToday = (Array.isArray(h.completions) ? h.completions : []).filter(c => c.date !== today);
                return { ...h, completions: [...existingWithoutToday, { date: today, value: null, status: 'skipped' }] };
            }));
            try {
                await habitApi.toggleCompletion(habitId, today, null, true, 'skipped');
                addToast(`Skipped ${habit.name}`);
            } catch (e) {
                addToast('Failed to skip', 'error');
                setLogs(prev => ({ ...prev, [habitId]: current }));
                refreshHabits();
            }
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

    const addGoal = async (goalText, goalTime, goalNagTime, goalHasDeadline) => {
        if (!goalText.trim()) return;
        try {
            const { data } = await goalApi.create({
                userId: user.uid,
                text: goalText.trim(),
                time: goalHasDeadline ? goalTime.trim() : '',
                nagTime: goalHasDeadline ? (parseInt(goalNagTime, 10) || 0) : 0,
                date: today
            });
            setGoals(prev => [...(Array.isArray(prev) ? prev : []), data]);
            setHistoryGoals(prev => [data, ...(Array.isArray(prev) ? prev : [])]);
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

    const dueHabits = (Array.isArray(habits) ? habits : []).filter(h => isHabitDueOnDate(h, today, h.completions || []));
    // Exclude skipped habits from both numerator and denominator — same treatment as unscheduled habits
    const effectiveDueHabits = dueHabits.filter(h => logs[h._id] !== 'skipped');
    // partial counts toward today's completion score (same as 'completed')
    const completed = effectiveDueHabits.filter(h => logs[h._id] === 'completed' || logs[h._id] === 'partial').length;
    const pct = effectiveDueHabits.length > 0 ? Math.round((completed / effectiveDueHabits.length) * 100) : 0;

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
                    <span className="kpi-sub">{completed} / {effectiveDueHabits.length} habits</span>
                </motion.div>
                <motion.div className="kpi-card" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                    <span className="kpi-label">Remaining</span>
                    <span className="kpi-value">{effectiveDueHabits.length - completed}</span>
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
                    {goalTab === 'today' && <span className="badge badge-primary">{(Array.isArray(goals) ? goals : []).filter(g => g.completed).length} / {goals.length || 0} done</span>}
                </div>
                
                {goalTab === 'today' ? (
                    <>
                        <GoalInputForm onAdd={addGoal} />

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
                    </div>
                ) : dueHabits.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                        No disciplines scheduled for today.
                    </div>
                ) : (
                    <motion.div
                        className="habit-list"
                        initial="hidden"
                        animate="show"
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                    >
                        {dueHabits.map(habit => {
                            const done = logs[habit._id] === 'completed';
                            const isPartial = logs[habit._id] === 'partial';
                            const isSkipped = logs[habit._id] === 'skipped';
                            const isPending = !!pendingValue[habit._id];
                            const tracksVal = habit.tracksValue;
                            const inputValue = valueInputs[habit._id] || '';
                            const avgVal = tracksVal ? calculateAverageValue(habit) : null;
                            const todayComp = tracksVal ? (habit.completions || []).find(c => c.date === today) : null;
                            const todayValue = todayComp ? todayComp.value : null;
                            
                            return (
                                <motion.div
                                    key={habit._id}
                                    variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}
                                    className={`habit-item${done ? ' completed' : ''}${isPartial ? ' partial' : ''}${isPending ? ' pending-value' : ''}${isSkipped ? ' skipped' : ''}`}
                                    onClick={() => !isSkipped && toggleHabit(habit)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                        padding: '12px 16px',
                                        border: isPending ? '2px dashed var(--primary-light)' : isSkipped ? '1px dashed rgba(245, 158, 11, 0.5)' : isPartial ? '1px solid rgba(251, 191, 36, 0.4)' : undefined,
                                        background: isSkipped ? 'rgba(245, 158, 11, 0.05)' : isPartial ? 'rgba(251, 191, 36, 0.05)' : undefined,
                                        gap: tracksVal ? '12px' : '0'
                                    }}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <div className="habit-info">
                                            <span className="habit-name">{habit.name}</span>
                                            {tracksVal && avgVal !== null && (
                                                <span className="habit-streak" style={{ color: isPartial ? '#fbbf24' : 'var(--text-dim)' }}>
                                                    {done || isPartial
                                                        ? (habit.valueTarget !== null && habit.valueTarget !== undefined
                                                            ? `${todayValue} / ${habit.valueTarget}${habit.valueUnit ? ' ' + habit.valueUnit : ''}`
                                                            : `${todayValue}${habit.valueUnit ? ' ' + habit.valueUnit : ''}`)
                                                        : `Avg: ${avgVal}${habit.valueUnit ? ' ' + habit.valueUnit : ''}`
                                                    }
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {/* Skip button — subtle, reveals on hover */}
                                            <button
                                                className={`skip-btn${isSkipped ? ' active' : ''}`}
                                                title={isSkipped ? 'Un-skip' : 'Skip today'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    skipHabit(habit);
                                                }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                                                </svg>
                                            </button>
                                            <div 
                                                className="check-circle"
                                                style={{
                                                    border: isPending ? '2px dashed var(--primary-light)' : isPartial ? '2px solid #fbbf24' : undefined,
                                                    opacity: isSkipped ? 0.35 : 1,
                                                    background: isPartial ? 'rgba(251,191,36,0.12)' : undefined
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleHabit(habit);
                                                }}
                                            >
                                                {(done || isPartial) && (
                                                    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: isPartial ? '#fbbf24' : undefined }}>
                                                        <motion.polyline
                                                            points="20 6 9 17 4 12"
                                                            initial={{ pathLength: 0 }}
                                                            animate={{ pathLength: 1 }}
                                                            transition={{ duration: 0.3, ease: 'easeOut' }}
                                                        />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {tracksVal && !isSkipped && (
                                        <div 
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px', 
                                                width: '100%', 
                                                paddingTop: '8px', 
                                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                                justifyContent: 'flex-start'
                                            }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <input
                                                type="number"
                                                placeholder={`Enter ${habit.valueUnit || 'value'}...`}
                                                className="notif-time-input"
                                                style={{ 
                                                    width: '120px', 
                                                    padding: '6px 8px', 
                                                    fontSize: '0.85rem',
                                                    height: 'auto',
                                                    margin: 0
                                                }}
                                                value={inputValue}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setValueInputs(prev => ({ ...prev, [habit._id]: val }));
                                                }}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        const numVal = Number(inputValue);
                                                        if (!isNaN(numVal) && inputValue.trim() !== '') {
                                                            submitHabitValue(habit, numVal);
                                                        } else {
                                                            addToast('Please enter a valid numeric value', 'error');
                                                        }
                                                    }
                                                }}
                                            />
                                            {habit.valueUnit && <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{habit.valueUnit}</span>}
                                            <button 
                                                className="add-btn" 
                                                style={{ 
                                                    padding: '6px 12px', 
                                                    fontSize: '0.8rem', 
                                                    height: 'auto',
                                                    margin: 0
                                                }}
                                                onClick={() => {
                                                    const numVal = Number(inputValue);
                                                    if (!isNaN(numVal) && inputValue.trim() !== '') {
                                                        submitHabitValue(habit, numVal);
                                                    } else {
                                                        addToast('Please enter a valid numeric value', 'error');
                                                    }
                                                }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
