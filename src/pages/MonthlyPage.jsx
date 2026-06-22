import { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { habitApi } from '../api';
import useMidnightRefresh, { formatLocalDate } from '../hooks/useMidnightRefresh';
import LeetCodeGraph from '../components/LeetCodeGraph';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getActiveProfileOnDate, isHabitDueOnDate } from '../utils/profileAnalytics';

export default function MonthlyPage() {
    const { user, profile } = useAuth();
    const { habits, habitsLoading, setHabits, profiles, activeProfile } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const todayStr = useMidnightRefresh(() => setCurrentDate(new Date()));
    const history = profile?.profileHistory || [];

    const toggleCell = async (habitId, dateStr) => {
        const habit = habits.find(h => h._id === habitId);
        if (!habit) return;
        const todayComp = habit.completions?.find(c => c.date === dateStr);
        const currentStatus = todayComp?.status || (todayComp ? 'completed' : null);

        // 3-state cycle: null → completed → skipped → null
        if (currentStatus === null || currentStatus === undefined) {
            // Was unchecked: mark completed
            const finalValue = habit.tracksValue ? (() => {
                const response = window.prompt(`Enter numeric value for "${habit.name}" (${habit.valueUnit || 'value'}):`);
                if (response === null) return null;
                const parsed = Number(response.trim());
                if (response.trim() === '' || isNaN(parsed)) { alert('Please enter a valid numeric value.'); return null; }
                return parsed;
            })() : 1;
            if (finalValue === null) return; // cancelled

            setHabits(prev => prev.map(h => {
                if (h._id !== habitId) return h;
                const completions = [...(h.completions || []).filter(c => c.date !== dateStr), { date: dateStr, value: finalValue, status: 'completed' }];
                return { ...h, completions };
            }));
            try {
                await habitApi.toggleCompletion(habitId, dateStr, finalValue, true, 'completed');
            } catch (e) {
                console.error('Toggle error:', e);
                setHabits(prev => prev.map(h => {
                    if (h._id !== habitId) return h;
                    const completions = (h.completions || []).filter(c => c.date !== dateStr);
                    return { ...h, completions };
                }));
            }
        } else if (currentStatus === 'completed') {
            // Was completed: mark skipped
            setHabits(prev => prev.map(h => {
                if (h._id !== habitId) return h;
                const completions = [...(h.completions || []).filter(c => c.date !== dateStr), { date: dateStr, value: null, status: 'skipped' }];
                return { ...h, completions };
            }));
            try {
                await habitApi.toggleCompletion(habitId, dateStr, null, true, 'skipped');
            } catch (e) {
                console.error('Toggle error:', e);
                setHabits(prev => prev.map(h => {
                    if (h._id !== habitId) return h;
                    const oldComp = todayComp || { date: dateStr, value: 1, status: 'completed' };
                    return { ...h, completions: [...(h.completions || []).filter(c => c.date !== dateStr), oldComp] };
                }));
            }
        } else {
            // Was skipped: uncheck (remove)
            setHabits(prev => prev.map(h => {
                if (h._id !== habitId) return h;
                const completions = (h.completions || []).filter(c => c.date !== dateStr);
                return { ...h, completions };
            }));
            try {
                await habitApi.toggleCompletion(habitId, dateStr, null, false);
            } catch (e) {
                console.error('Toggle error:', e);
                setHabits(prev => prev.map(h => {
                    if (h._id !== habitId) return h;
                    return { ...h, completions: [...(h.completions || []).filter(c => c.date !== dateStr), todayComp] };
                }));
            }
        }
    };

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const monthDays = useMemo(() => {
        const dCount = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        return Array.from({ length: dCount }, (_, i) => {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
            const dStr = formatLocalDate(date);
            return { dStr, day: i + 1 };
        });
    }, [currentDate]);

    // Pre-calculate profile switches for the header
    const dayMeta = useMemo(() => {
        return monthDays.map((md, idx) => {
            const currentPId = getActiveProfileOnDate(md.dStr, history, profiles);
            const prevPId = idx > 0 ? getActiveProfileOnDate(monthDays[idx-1].dStr, history, profiles) : null;
            const isSwitch = currentPId && currentPId !== prevPId;
            return { ...md, activePId: currentPId, isSwitch };
        });
    }, [monthDays, history, profiles]);

    if (habitsLoading) return <div className="loading-screen">⏳ Loading...</div>;

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
                                {dayMeta.map(dm => {
                                    const activeP = profiles.find(p => p._id === dm.activePId);
                                    return (
                                        <th key={dm.day} style={{ position: 'relative' }}>
                                            {dm.isSwitch && activeP && (
                                                <div className="switch-badge">→ {activeP.name}</div>
                                            )}
                                            <span>{dm.day}</span>
                                        </th>
                                    );
                                })}
                                <th className="total-col">Count</th>
                            </tr>
                        </thead>
                        <motion.tbody initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.03 } } }}>
                            {habits.map(habit => {
                                // Month count: status='completed' or 'partial' (partial counts toward streak/display), not skips
                                const habitMonthCount = (habit.completions || []).filter(c => {
                                    const [y, m] = (c.date || '').split('-');
                                    return Number(y) === currentDate.getFullYear() && (Number(m) - 1) === currentDate.getMonth() && c.status !== 'skipped';
                                }).length;

                                return (
                                    <motion.tr key={habit._id} variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}>
                                        <td className="habit-name-cell">{habit.name}</td>
                                        {dayMeta.map(dm => {
                                            const comp = (habit.completions || []).find(c => c.date === dm.dStr);
                                            const isCompleted = !!comp && comp.status !== 'skipped' && comp.status !== 'partial';
                                            const isPartial = !!comp && comp.status === 'partial';
                                            const isSkipped = !!comp && comp.status === 'skipped';
                                            const isFuture = dm.dStr > todayStr;
                                            const isHabitActive = habit.profileId === dm.activePId;
                                            const isScheduled = isHabitActive && isHabitDueOnDate(habit, dm.dStr, habit.completions || []);

                                            let cellClass = 'grid-cell';
                                            let cellStyle = {};

                                            if (isCompleted) {
                                                cellClass += ' done';
                                            } else if (isPartial) {
                                                // Warm amber — distinct from green (completed) and orange-dashed (skipped)
                                                cellStyle = {
                                                    background: 'rgba(251, 191, 36, 0.18)',
                                                    border: '1px solid rgba(251, 191, 36, 0.6)',
                                                    color: '#fbbf24',
                                                    opacity: 0.95
                                                };
                                            } else if (isSkipped) {
                                                // Amber/gold dashed — distinct from completed, missed, and unscheduled
                                                cellStyle = {
                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                    border: '1px dashed rgba(245, 158, 11, 0.55)',
                                                    color: '#f59e0b',
                                                    opacity: 0.85
                                                };
                                            } else if (isFuture) {
                                                cellClass += ' future';
                                                if (!isScheduled) {
                                                    cellStyle = { background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'default', opacity: 0.3 };
                                                } else {
                                                    cellStyle = { background: 'rgba(99, 102, 241, 0.04)', border: '1px dashed rgba(99, 102, 241, 0.15)', cursor: 'default' };
                                                }
                                            } else {
                                                if (dm.dStr === todayStr) {
                                                    cellClass += ' today';
                                                }
                                                
                                                if (!isScheduled) {
                                                    // Unscheduled = Ghost
                                                    cellStyle = { background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', opacity: 0.5 };
                                                } else {
                                                    // Scheduled but not done
                                                    if (dm.dStr === todayStr) {
                                                        cellStyle = { background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)' };
                                                    } else {
                                                        // Missed = Light Red
                                                        cellStyle = { background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)' };
                                                    }
                                                }
                                            }

                                            let cellTitle = '';
                                            if (isSkipped) {
                                                cellTitle = 'Skipped';
                                            } else if (isPartial) {
                                                const val = comp ? comp.value : '';
                                                const target = habit.valueTarget;
                                                cellTitle = target !== null && target !== undefined
                                                    ? `${val} / ${target}${habit.valueUnit ? ' ' + habit.valueUnit : ''} (partial)`
                                                    : `${val}${habit.valueUnit ? ' ' + habit.valueUnit : ''} (partial)`;
                                            } else if (isCompleted) {
                                                if (habit.tracksValue) {
                                                    const val = comp ? comp.value : '';
                                                    cellTitle = `${val} ${habit.valueUnit || ''}`.trim();
                                                } else {
                                                    cellTitle = 'Completed';
                                                }
                                            } else if (isScheduled && !isFuture) {
                                                cellTitle = 'Missed';
                                            }

                                            return (
                                                <td key={dm.day}>
                                                    <div
                                                        className={cellClass}
                                                        style={cellStyle}
                                                        title={cellTitle}
                                                        onClick={() => !isFuture && toggleCell(habit._id, dm.dStr)}
                                                    >
                                                        {isCompleted && (
                                                            <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        )}
                                                        {isPartial && (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                                                <line x1="5" y1="12" x2="19" y2="12" />
                                                                <polyline points="13 6 19 12 13 18" />
                                                            </svg>
                                                        )}
                                                        {isSkipped && (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                                <circle cx="12" cy="12" r="10"/>
                                                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                                                            </svg>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="total-val">{habitMonthCount}</td>
                                    </motion.tr>
                                );
                            })}
                        </motion.tbody>
                    </table>
                </div>
            </div>
            <style>{`
                .switch-badge { position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 0.6rem; color: var(--primary-light); white-space: nowrap; z-index: 5; background: var(--bg-card); padding: 1px 4px; border-radius: 4px; border: 1px solid var(--border); font-weight: 700; }
                .total-col { text-align: center; color: var(--primary-light); padding-left: 10px; }
                .total-val { text-align: center; font-weight: 800; color: var(--primary-light); }
                .habit-name-cell { font-weight: 500; font-size: 0.9rem; }
            `}</style>
        </div>
    );
}
