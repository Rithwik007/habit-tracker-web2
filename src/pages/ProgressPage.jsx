import { useData } from '../context/DataContext';

export default function ProgressPage() {
    const { habits, habitsLoading } = useData();

    // Calculate streak from completions array in the habit document
    const calculateStreak = (completions) => {
        if (!completions || completions.length === 0) return 0;

        const sortedDates = completions
            .map(c => c.date)
            .sort((a, b) => new Date(b) - new Date(a));

        let streak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        for (const dateStr of sortedDates) {
            const [year, month, day] = dateStr.split('-');
            const logDate = new Date(year, month - 1, day);
            logDate.setHours(0, 0, 0, 0);
            const diff = Math.floor((checkDate - logDate) / (1000 * 60 * 60 * 24));

            if (diff <= 1) {
                streak++;
                checkDate = logDate;
            } else {
                break;
            }
        }
        return streak;
    };

    if (habitsLoading) return <div className="loading-screen">🔥 Calculating Streaks...</div>;

    const habitStreaks = habits.map(h => ({
        ...h,
        streak: calculateStreak(h.completions)
    })).sort((a, b) => b.streak - a.streak);

    const activeStreaks = habitStreaks.filter(h => h.streak > 0).length;
    const bestStreak = Math.max(...habitStreaks.map(h => h.streak), 0);

    // Overall consistency: total completions over last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const totalCompletionsLast30 = habits.reduce((sum, h) => {
        return sum + (h.completions || []).filter(c => new Date(c.date) >= thirtyDaysAgo).length;
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
                    <span className="card-title">🔥 Streak Leaderboard</span>
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
