import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatLocalDate } from '../hooks/useMidnightRefresh';
import { calculateStreakForHabit, calculateBatchConsistency, calculateAverageValue } from '../utils/profileAnalytics';
import { useState, useEffect, useMemo } from 'react';
import { habitApi } from '../api';
import { motion } from 'framer-motion';

export default function ProgressPage() {
    const { user, profile } = useAuth();
    const { habits, habitsLoading, profiles } = useData();
    const [allHabits, setAllHabits] = useState([]);
    const [loadingAll, setLoadingAll] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        setLoadingAll(true);
        habitApi.getAllAcrossProfiles(user.uid)
            .then(res => setAllHabits(res.data || []))
            .catch(err => console.error(err))
            .finally(() => setLoadingAll(false));
    }, [user?.uid]);

    const allCompletions = useMemo(() => {
        return allHabits.flatMap(h => 
            (h.completions || [])
                .filter(c => c.status !== 'skipped')
                .map(c => ({ habitId: h._id, date: c.date, status: c.status || 'completed' }))
        );
    }, [allHabits]);

    const profileHistory = profile?.profileHistory || [];

    const stats = useMemo(() => {
        const { habitsByProfile, completionsByDate } = calculateBatchConsistency(profileHistory, allHabits, allCompletions);
        
        // Reverse history to have quick lookup for "last active on date"
        const reversedHistory = [...profileHistory].reverse();

        return profiles.map(p => {
            const pIdStr = p._id.toString();
            const pHabits = habitsByProfile[pIdStr] || [];
            
            let totalDaysActive = 0;
            let sumRate = 0;
            let activeDaysWithHabits = 0;

            const pStart = new Date(p.createdAt || new Date());
            const todayStrFormat = formatLocalDate(new Date());
            const endCursor = new Date(todayStrFormat + 'T12:00:00');
            let cursor = new Date(pStart);
            
            // Limit loop for performance if extremely old
            while (cursor <= endCursor) {
                const dStr = formatLocalDate(cursor);
                
                // Find which profile was active on this specific date
                const entry = reversedHistory.find(h => h.activatedAt <= dStr && (h.deactivatedAt === null || h.deactivatedAt >= dStr));
                const activeId = entry?.profileId;

                if (activeId === pIdStr) {
                    totalDaysActive++;
                    if (pHabits.length > 0) {
                        const completionsOnDate = Array.from(completionsByDate[dStr] || []).filter(hId => pHabits.some(ph => ph._id === hId));
                        const skippedCount = pHabits.filter(h => 
                            (h.completions || []).some(c => c.date === dStr && c.status === 'skipped')
                        ).length;
                        const effectiveTotal = pHabits.length - skippedCount;
                        if (effectiveTotal > 0) {
                            sumRate += completionsOnDate.length / effectiveTotal;
                            activeDaysWithHabits++;
                        }
                    }
                }
                cursor.setDate(cursor.getDate() + 1);
            }

            const avgRate = activeDaysWithHabits > 0 ? Math.round((sumRate / activeDaysWithHabits) * 100) : 0;
            const bestStreak = Math.max(...pHabits.map(h => calculateStreakForHabit(h, profileHistory, h.completions).longestStreak), 0);

            return { ...p, totalDaysActive, avgRate, bestStreak, habitCount: pHabits.length };
        });
    }, [profiles, profileHistory, allHabits, allCompletions]);

    if (habitsLoading || loadingAll) return <div className="loading-screen">✨ Analysing your journey...</div>;

    const habitStreaks = (Array.isArray(habits) ? habits : []).map(h => {
        const { currentStreak, longestStreak } = calculateStreakForHabit(h, profileHistory, h.completions);
        const avgVal = calculateAverageValue(h);
        return { ...h, streak: currentStreak, longestStreak, avgVal };
    }).sort((a, b) => b.streak - a.streak);

    const activeStreaksCount = habitStreaks.filter(h => h.streak > 0).length;
    const topStreakValue = Math.max(...habitStreaks.map(h => h.streak), 0);

    return (
        <div className="fade-in progress-container">
            <header className="progress-header">
                <h1 className="page-title">🏆 Your Mastery</h1>
                <p className="page-subtitle">Track consistency across every phase of your life</p>
            </header>

            <div className="kpi-row">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card kpi-widget">
                    <div className="kpi-icon">📈</div>
                    <div className="kpi-content">
                        <span className="kpi-val">{activeStreaksCount}</span>
                        <span className="kpi-lab">Active Streaks</span>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card kpi-widget">
                    <div className="kpi-icon">🔥</div>
                    <div className="kpi-content">
                        <span className="kpi-val">{topStreakValue}</span>
                        <span className="kpi-lab">Best Current</span>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card kpi-widget">
                    <div className="kpi-icon">🎯</div>
                    <div className="kpi-content">
                        <span className="kpi-val">{stats.reduce((acc, s) => acc + s.habitCount, 0)}</span>
                        <span className="kpi-lab">Total Disciplines</span>
                    </div>
                </motion.div>
            </div>

            <section className="section">
                <h2 className="section-title">🌍 Profile Performance History</h2>
                <div className="profiles-stat-grid">
                    {stats.map((p, i) => (
                        <motion.div 
                            key={p._id} 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ y: -5 }}
                            className="glass-card profile-stat-card"
                        >
                            <div className="profile-stat-header">
                                <span className="profile-stat-name">{p.name}</span>
                                {p._id === profile?.activeProfileId && (
                                    <span className="active-glow-tag">ACTIVE</span>
                                )}
                            </div>
                            
                            <div className="profile-metrics">
                                <div className="metric">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span className="metric-label">Consistency</span>
                                        <span className="metric-val">{p.avgRate}%</span>
                                    </div>
                                    <div className="progress-bar-bg">
                                        <div className="progress-bar-fill" style={{ width: `${p.avgRate}%` }}></div>
                                    </div>
                                </div>
                                <div className="metric-row">
                                    <div className="sub-metric">
                                        <span className="sub-label">Days</span>
                                        <span className="sub-val">{p.totalDaysActive}</span>
                                    </div>
                                    <div className="sub-metric">
                                        <span className="sub-label">Best Streak</span>
                                        <span className="sub-val">{p.bestStreak}</span>
                                    </div>
                                    <div className="sub-metric">
                                        <span className="sub-label">Habits</span>
                                        <span className="sub-val">{p.habitCount}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            <section className="section" style={{ marginTop: '40px' }}>
                <h2 className="section-title">🔥 Streak Leaderboard</h2>
                <div className="glass-card leaderboard-container">
                    {habitStreaks.map((h, index) => (
                        <div key={h._id} className="leaderboard-item">
                            <span className="rank">#{index + 1}</span>
                            <div className="habit-info">
                                <span className="habit-name">{h.icon} {h.name}</span>
                                <div className="streak-track">
                                    <div className="streak-fill" style={{ width: `${Math.min((h.streak / (topStreakValue || 1)) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                            <span className="streak-count">{h.streak}d{h.tracksValue && h.avgVal !== null ? ` · Avg: ${h.avgVal}${h.valueUnit ? ' ' + h.valueUnit : ''}` : ''}</span>
                        </div>
                    ))}
                    {habitStreaks.length === 0 && <div className="empty-msg">No habits in current profile.</div>}
                </div>
            </section>

            <style>{`
                .progress-container { max-width: 900px; margin: 0 auto; padding-bottom: 60px; }
                .progress-header { margin-bottom: 40px; text-align: left; }
                .page-subtitle { color: var(--text-muted); font-size: 1rem; margin-top: 8px; opacity: 0.8; }
                
                .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
                .kpi-widget { display: flex; align-items: center; gap: 20px; padding: 24px; border-radius: 20px; border: 1px solid var(--border); }
                .kpi-icon { font-size: 2.2rem; }
                .kpi-val { font-size: 2rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
                .kpi-lab { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; display: block; }
                
                .section-title { font-size: 1.2rem; margin: 30px 0 20px; font-weight: 700; color: var(--text-primary); }
                .profiles-stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
                
                .profile-stat-card { padding: 24px; border: 1px solid var(--border); border-radius: 20px; background: rgba(255,255,255,0.02); }
                .profile-stat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .profile-stat-name { font-weight: 700; font-size: 1.1rem; color: var(--text-primary); }
                
                .active-glow-tag { 
                    font-size: 0.6rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; 
                    background: rgba(99,102,241,0.2); color: var(--primary-light); border: 1px solid rgba(99,102,241,0.4);
                    box-shadow: 0 0 10px rgba(99,102,241,0.2);
                }
                
                .metric-label { font-size: 0.8rem; color: var(--text-muted); }
                .metric-val { font-size: 0.9rem; font-weight: 700; color: var(--primary-light); }
                .progress-bar-bg { height: 8px; background: rgba(255,255,255,0.05); borderRadius: 4px; overflow: hidden; }
                .progress-bar-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary-light)); }
                
                .metric-row { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); }
                .sub-metric { text-align: center; }
                .sub-label { font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px; }
                .sub-val { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
                
                .leaderboard-container { border-radius: 20px; overflow: hidden; }
                .leaderboard-item { display: flex; align-items: center; gap: 20px; padding: 16px 24px; border-bottom: 1px solid var(--border); transition: background 0.2s; }
                .leaderboard-item:hover { background: rgba(255,255,255,0.02); }
                .leaderboard-item:last-child { border-bottom: none; }
                .rank { font-size: 0.85rem; font-weight: 900; color: var(--text-muted); width: 25px; }
                .habit-info { flex: 1; display: flex; flexDirection: column; gap: 8px; }
                .habit-name { font-size: 1rem; font-weight: 600; }
                .streak-track { height: 4px; background: rgba(255,255,255,0.03); borderRadius: 2px; }
                .streak-fill { height: 100%; background: var(--primary); borderRadius: 2px; }
                .streak-count { font-size: 1rem; font-weight: 800; color: var(--primary-light); }
                
                .empty-msg { padding: 50px; text-align: center; color: var(--text-muted); }
            `}</style>
        </div>
    );
}
