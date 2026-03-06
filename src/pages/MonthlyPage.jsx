import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import useMidnightRefresh, { formatLocalDate } from '../hooks/useMidnightRefresh';

export default function MonthlyPage() {
    const [habits, setHabits] = useState([]);
    const [logs, setLogs] = useState([]);
    const [notes, setNotes] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Reactive today string that auto-updates at midnight
    const todayStr = useMidnightRefresh(() => {
        // When midnight hits, refresh the current month's data
        setCurrentDate(new Date());
    });

    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const { data: habitsData } = await supabase.from('habits').select('*').order('created_at', { ascending: true });
                setHabits(habitsData || []);

                const startStr = formatLocalDate(monthStart);
                const endStr = formatLocalDate(monthEnd);

                const { data: logsData } = await supabase
                    .from('daily_logs')
                    .select('*')
                    .gte('log_date', startStr)
                    .lte('log_date', endStr);

                setLogs(logsData || []);

                const { data: notesData } = await supabase
                    .from('daily_notes')
                    .select('*')
                    .gte('note_date', startStr)
                    .lte('note_date', endStr);

                const notesMap = {};
                (notesData || []).forEach(n => { notesMap[n.note_date] = n.note; });
                setNotes(notesMap);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [currentDate]);

    const toggleCell = async (habitId, dateStr) => {
        const existing = logs.find(l => l.habit_id === habitId && l.log_date === dateStr);
        const next = existing ? !existing.completed : true;

        // Optimistic UI
        if (existing) {
            setLogs(prev => prev.map(l => (l.habit_id === habitId && l.log_date === dateStr) ? { ...l, completed: next } : l));
        } else {
            setLogs(prev => [...prev, { habit_id: habitId, log_date: dateStr, completed: next }]);
        }

        await supabase.from('daily_logs').upsert(
            { habit_id: habitId, log_date: dateStr, completed: next },
            { onConflict: 'habit_id,log_date' }
        );
    };

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    if (loading) return <div className="loading-screen">⏳ Analyzing Monthly History...</div>;

    const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
        <div className="fade-in">
            <h1 className="page-title">📅 Monthly Tracker</h1>

            <div className="card">
                <div className="card-header">
                    <div className="month-nav">
                        <button className="month-btn" onClick={() => changeMonth(-1)}>←</button>
                        <span className="month-label">
                            {currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </span>
                        <button className="month-btn" onClick={() => changeMonth(1)}>→</button>
                    </div>
                </div>

                <div className="monthly-grid-wrapper">
                    <table className="monthly-grid">
                        <thead>
                            <tr>
                                <th>Habit</th>
                                {daysArr.map(d => {
                                    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                    const dateStr = formatLocalDate(dateObj);
                                    const dayNote = notes[dateStr];
                                    return (
                                        <th key={d} className={dayNote ? 'has-note' : ''}>
                                            <span>{d}</span>
                                            {dayNote && <div className="day-tooltip">{dayNote}</div>}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {habits.map(habit => (
                                <tr key={habit.id}>
                                    <td>{habit.name}</td>
                                    {daysArr.map(d => {
                                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                        const dateStr = formatLocalDate(date);
                                        const log = logs.find(l => l.habit_id === habit.id && l.log_date === dateStr);
                                        const isToday = dateStr === todayStr;
                                        const isFuture = date > new Date();

                                        return (
                                            <td key={d}>
                                                <div
                                                    className={`grid-cell${log?.completed ? ' done' : ''}${isToday ? ' today' : ''}${isFuture ? ' future' : ''}`}
                                                    onClick={() => !isFuture && toggleCell(habit.id, dateStr)}
                                                >
                                                    {log?.completed && (
                                                        <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
