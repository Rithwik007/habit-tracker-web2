import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatLocalDate } from '../hooks/useMidnightRefresh';
import { calculateStreakForHabit, getDailyConsistencyScore } from '../utils/profileAnalytics';
import { useState, useEffect, useMemo } from 'react';
import { habitApi } from '../api';

export default function ProgressPage() {
    const { user, profile } = useAuth();
    const { habits, habitsLoading, profiles } = useData();
    const [allHabits, setAllHabits] = useState([]);
    const [loadingAll, setLoadingAll] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        setLoadingAll(true);
        habitApi.getAllAcrossProfiles(user.uid)
            .then(res => setAllHabits(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoadingAll(false));
    }, [user?.uid]);

    const allCompletions = useMemo(() => {
        return allHabits.flatMap(h => (h.completions || []).map(c => ({ habitId: h._id, date: c.date })));
    }, [allHabits]);

    const profileHistory = profile?.profileHistory || [];

    const profileBreakdown = useMemo(() => {
        return profiles.map(p => {
            // Calculate stats for this profile
            const pHabits = allHabits.filter(h => h.profileId === p._id);
            
            let totalDaysActive = 0;
            let validDaysCount = 0;
            let sumRate = 0;

            const pStart = new Date(p.createdAt || new Date());
            const todayStrFormat = formatLocalDate(new Date());
            const endCursor = new Date(todayStrFormat + 'T12:00:00');
            let cursor = new Date(pStart);
            
            while (cursor <= endCursor) {
                const dStr = formatLocalDate(cursor);
                const score = getDailyConsistencyScore(dStr, profileHistory, allHabits, allCompletions);
                if (score && score.activeProfileId === p._id) {
                    totalDaysActive++;
                    if (score.total > 0) {
                        validDaysCount++;
                        sumRate += score.rate;
                    }
                }
                cursor.setDate(cursor.getDate() + 1);
            }

            const avgRate = validDaysCount > 0 ? Math.round((sumRate / validDaysCount) * 100) : 0;
            
            let bestProfileStreak = 0;
            pHabits.forEach(h => {
                const { longestStreak } = calculateStreakForHabit(h, profileHistory, h.completions);
                if (longestStreak > bestProfileStreak) bestProfileStreak = longestStreak;
            });

            return { ...p, totalDaysActive, avgRate, bestProfileStreak, habitCount: pHabits.length };
        });
    }, [profiles, profileHistory, allHabits, allCompletions]);

    if (habitsLoading || loadingAll) return <div className="loading-screen">🔥 Calculating Streaks...</div>;

    const habitStreaks = (Array.isArray(habits) ? habits : []).map(h => {
        const { currentStreak, longestStreak } = calculateStreakForHabit(h, profileHistory, h.completions);
        return {
            ...h,
            streak: currentStreak,
            longestStreak
        };
    }).sort((a, b) => b.streak - a.streak);

    const activeStreaks = habitStreaks.filter(h => h.streak > 0).length;
    const bestStreak = Math.max(...habitStreaks.map(h => h.streak), 0);

    // Overall consistency: total completions over last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const totalCompletionsLast30 = (Array.isArray(habits) ? habits : []).reduce((sum, h) => {
        return sum + (Array.isArray(h.completions) ? h.completions : []).filter(c => new Date(c.date) >= thirtyDaysAgo).length;
    }, 0);
    const maxPossible = habits.length * 30;
    const avgScore = maxPossible > 0 ? Math.round((totalCompletionsLast30 / maxPossible) * 100) : 0;

    return (
        <div className="fade-in">
            <h1 className="page-title">🏆 Progress & Streaks</h1>

            <div className="kpi-grid">
                <div className="kpi-card">
                    <span className="kpi-label">30-Day Score</span>
                    <span className="kpi-value">{avgScore}%</span>
                    <span className="kpi-sub">Overall consistency</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">Best Streak</span>
                    <span className="kpi-value">{bestStreak}</span>
                    <span className="kpi-sub">Days in a row</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">Active Streaks</span>
                    <span className="kpi-value">{activeStreaks}</span>
                    <span className="kpi-sub">Current momentum</span>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">🌍 Profile Breakdown</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {profileBreakdown.map(p => (
                        <div key={p._id} className="streak-item" style={{ padding: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <h3 style={{ margin: 0 }}>{p.name}</h3>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.totalDaysActive} days active</span>
                            </div>
                            <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem' }}>
                                <div><strong>{p.avgRate}%</strong> avg consistency</div>
                                <div><strong>{p.bestProfileStreak}</strong> best streak</div>
                                <div><strong>{p.habitCount}</strong> habits</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card" style={{ marginTop: '30px' }}>
                <div className="card-header">
                    <span className="card-title">🔥 Streak Leaderboard (Active Profile)</span>
                </div>
                <div className="streak-list">
                    {habitStreaks.map((h, index) => (
                        <div key={h._id} className="streak-item">
                            <span className="streak-rank">#{index + 1}</span>
                            <span className="streak-name">{h.name}</span>
                            <div className="streak-bar-container">
                                <div
                                    className="streak-bar"
                                    style={{ width: `${Math.min((h.streak / (bestStreak || 1)) * 100, 100)}%` }}
                                />
                            </div>
                            <span className="streak-value">{h.streak} days</span>
                        </div>
                    ))}
                    {habitStreaks.length === 0 && <div className="empty-state">No habits tracked yet.</div>}
                </div>
            </div>
        </div>
    );
}
