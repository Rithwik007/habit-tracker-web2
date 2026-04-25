import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function ProgressPage() {
    const { user } = useAuth();
    const [habits, setHabits] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const { data: habitsData } = await supabase.from('habits').select('*').eq('user_id', user.id);
                const { data: logsData } = await supabase.from('daily_logs').select('*').eq('user_id', user.id).order('log_date', { ascending: false });
                setHabits(habitsData || []);
                setLogs(logsData || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user?.id]);

    const calculateStreak = (habitId) => {
        const hLogs = logs.filter(l => l.habit_id === habitId).sort((a, b) => new Date(b.log_date) - new Date(a.log_date));
        let streak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < hLogs.length; i++) {
            const logDate = new Date(hLogs[i].log_date);
            logDate.setHours(0, 0, 0, 0);

            const diff = Math.floor((checkDate - logDate) / (1000 * 60 * 60 * 24));

            if (hLogs[i].completed) {
                if (diff <= 1) { // 0 if today, 1 if yesterday
                    streak++;
                    checkDate = logDate;
                } else {
                    break;
                }
            } else {
                if (diff === 0) continue; // Skip today if not done yet
                break;
            }
        }
        return streak;
    };

    if (loading) return <div className="loading-screen">🔥 Calculating Streaks...</div>;

    const habitStreaks = habits.map(h => ({
        ...h,
        streak: calculateStreak(h.id)
    })).sort((a, b) => b.streak - a.streak);

    const activeStreaks = habitStreaks.filter(h => h.streak > 0).length;
    const bestStreak = Math.max(...habitStreaks.map(h => h.streak), 0);
    const avgScore = habits.length > 0 ? Math.round((logs.filter(l => l.completed).length / (habits.length * 30)) * 100) : 0;

    return (
        <div className="fade-in">
            <h1 className="page-title">🏆 Progress & Streaks</h1>

            <div className="kpi-grid">
                <div className="kpi-card">
                    <span className="kpi-label">Month Score</span>
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
                    <span className="card-title">🔥 Streak Leaderboard</span>
                </div>
                <div className="streak-list">
                    {habitStreaks.map((h, index) => (
                        <div key={h.id} className="streak-item">
                            <span className="streak-rank">#{index + 1}</span>
                            <span className="streak-name">{h.name}</span>
                            <div className="streak-bar-container">
                                <div
                                    className="streak-bar"
                                    style={{ width: `${Math.min((h.streak / (bestStreak || 1)) * 100, 100)}%` }}
                                ></div>
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
