import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { habitApi } from '../api';
import useMidnightRefresh, { formatLocalDate } from '../hooks/useMidnightRefresh';
import LeetCodeGraph from '../components/LeetCodeGraph';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function MonthlyPage() {
    const { user } = useAuth();
    const { habits, habitsLoading, refreshHabits } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const todayStr = useMidnightRefresh(() => setCurrentDate(new Date()));

    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();

    const toggleCell = async (habitId, dateStr) => {
        const habit = habits.find(h => h._id === habitId);
        const alreadyDone = habit?.completions?.some(c => c.date === dateStr);
        try {
            await habitApi.toggleCompletion(habitId, dateStr, alreadyDone ? 0 : 1);
            refreshHabits();
        } catch (e) {
            console.error('Toggle error:', e);
        }
    };

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    if (habitsLoading) return <div className="loading-screen">⏳ Loading...</div>;

    const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
        <div className="fade-in">
            <h1 className="page-title">📅 Monthly History</h1>

            <LeetCodeGraph />

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
                                {daysArr.map(d => <th key={d}><span>{d}</span></th>)}
                                <th style={{ textAlign: 'center', paddingLeft: '10px', minWidth: '60px', color: 'var(--primary-light)' }}>Count</th>
                            </tr>
                        </thead>
                        <motion.tbody
                            initial="hidden" animate="show"
                            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                        >
                            {habits.map(habit => {
                                const habitMonthCount = (habit.completions || []).filter(c => {
                                    const d = new Date(c.date);
                                    return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
                                }).length;
                                return (
                                    <motion.tr key={habit._id} variants={{ hidden: { opacity: 0, x: -15 }, show: { opacity: 1, x: 0 } }}>
                                        <td>{habit.name}</td>
                                        {daysArr.map(d => {
                                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                            const dateStr = formatLocalDate(date);
                                            const isDone = (habit.completions || []).some(c => c.date === dateStr);
                                            const isToday = dateStr === todayStr;
                                            const isFuture = date > new Date();
                                            return (
                                                <td key={d}>
                                                    <div
                                                        className={`grid-cell${isDone ? ' done' : ''}${isToday ? ' today' : ''}${isFuture ? ' future' : ''}`}
                                                        onClick={() => !isFuture && toggleCell(habit._id, dateStr)}
                                                    >
                                                        {isDone && (
                                                            <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td style={{ textAlign: 'center', fontWeight: '800', fontSize: '0.9rem', color: 'var(--primary-light)', paddingLeft: '10px' }}>
                                            {habitMonthCount}
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </motion.tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
