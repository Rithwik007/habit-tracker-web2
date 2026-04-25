import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import useMidnightRefresh, { formatLocalDate } from '../hooks/useMidnightRefresh';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ daily: [], habitWise: [], today: 0 });
    const todayStr = useMidnightRefresh();
    const currentDate = new Date(todayStr || new Date());
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedDay, setSelectedDay] = useState(currentDate.getDate()); // 0 means Month Summary

    const [loading, setLoading] = useState(true);

    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        if (selectedDay > lastDay && selectedDay !== 0) {
            setSelectedDay(lastDay);
        }
    }, [selectedMonth, selectedYear, selectedDay]);

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            try {
                const { data: habits } = await supabase.from('habits').select('*').eq('user_id', user.id);

                const startOfMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
                const endOfMonth = formatLocalDate(new Date(selectedYear, selectedMonth + 1, 0));

                const [logsRes, moodRes] = await Promise.all([
                    supabase.from('daily_logs').select('*').eq('user_id', user.id).gte('log_date', startOfMonth).lte('log_date', endOfMonth),
                    supabase.from('mood_logs').select('*').eq('user_id', user.id).gte('log_date', startOfMonth).lte('log_date', endOfMonth)
                ]);

                const logs = logsRes.data || [];
                const moodLogs = moodRes.data || [];

                if (!habits) return;

                const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                const maxPointsPerDay = habits.length * 10;

                // 1. Daily Completion (Line Chart) & Mood Trends
                const dailyData = [];
                for (let i = 1; i <= daysInMonth; i++) {
                    const d = new Date(selectedYear, selectedMonth, i);
                    const dateStr = formatLocalDate(d);
                    const dayLogs = logs.filter(l => l.log_date === dateStr && l.completed);
                    const points = dayLogs.length * 10;
                    const pct = maxPointsPerDay > 0 ? Math.round((points / maxPointsPerDay) * 100) : 0;

                    const moodEntry = moodLogs.find(m => m.log_date === dateStr);
                    const moodScore = moodEntry ? moodEntry.mood_score : null;

                    if (selectedYear === currentYear && selectedMonth === currentMonth && d > currentDate) {
                        // Future
                    } else {
                        dailyData.push({
                            name: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                            points,
                            pct,
                            mood: moodScore
                        });
                    }
                }

                // 2. Habit-wise Consistency
                const habitData = habits.map(h => {
                    const hLogs = logs.filter(l => l.habit_id === h.id && l.completed);
                    const points = hLogs.length * 10;
                    return { name: h.name, points };
                }).sort((a, b) => b.points - a.points);

                // 3. Performance Metrics (Donut Only)
                let earned = 0;
                let possible = 0;

                if (selectedDay === 0) {
                    earned = logs.filter(l => l.completed).length * 10;
                    let maxDays = daysInMonth;
                    if (selectedYear === currentYear && selectedMonth === currentMonth) {
                        maxDays = currentDate.getDate();
                    } else if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth)) {
                        maxDays = 0;
                    }
                    possible = maxDays * maxPointsPerDay;
                } else {
                    const targetDateStr = formatLocalDate(new Date(selectedYear, selectedMonth, selectedDay));
                    earned = logs.filter(l => l.log_date === targetDateStr && l.completed).length * 10;
                    possible = maxPointsPerDay;
                }

                setStats({
                    daily: dailyData,
                    habitWise: habitData,
                    earned,
                    possible: possible > 0 ? possible : 1
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, [todayStr, selectedYear, selectedMonth, selectedDay, user?.id]);

    if (loading) return <div className="loading-screen">📊 Calculating Analytics...</div>;

    const COLORS = ['#6366f1', '#1e293b'];

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="page-title">📈 Analytics Overview</h1>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                    <select
                        className="manage-input"
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(Number(e.target.value))}
                        style={{ padding: '8px 12px', minWidth: '70px' }}>
                        <option value={0}>Month</option>
                        {Array.from({ length: new Date(selectedYear, selectedMonth + 1, 0).getDate() }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <select
                        className="manage-input"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        style={{ padding: '8px 12px', minWidth: '120px' }}>
                        {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select
                        className="manage-input"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        style={{ padding: '8px 12px', minWidth: '100px' }}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="charts-grid">
                <div className="card" style={{ gridColumn: 'span 3' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="card-title">Daily Performance Trend ({months[selectedMonth]})</span>
                        <div style={{ fontSize: '0.7rem', display: 'flex', gap: '15px' }}>
                            <span><span style={{ color: '#e23636' }}>●</span> Points</span>
                            <span><span style={{ color: '#25c0f4' }}>●</span> Perf %</span>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={stats.daily}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" fontSize={10} tickMargin={10} stroke="var(--text-dim)" />
                                <YAxis yAxisId="left" fontSize={10} stroke="var(--text-dim)" />
                                <YAxis yAxisId="right" orientation="right" fontSize={10} stroke="var(--text-dim)" domain={[0, 100]} />
                                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, fontSize: 12 }} />
                                <Line yAxisId="left" type="monotone" dataKey="points" stroke="#e23636" strokeWidth={3} dot={{ fill: '#e23636', r: 3 }} activeDot={{ r: 5 }} />
                                <Line yAxisId="right" type="monotone" dataKey="pct" stroke="#25c0f4" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header">
                        <span className="card-title">Consistency Points per Habit</span>
                    </div>
                    <div className="custom-scrollbar" style={{ width: '100%', height: 350, overflowY: 'auto', paddingRight: '5px' }}>
                        <ResponsiveContainer height={Math.max(200, stats.habitWise.length * 32)}>
                            <BarChart data={stats.habitWise} layout="vertical" margin={{ left: 5, right: 30, top: 0, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" fontSize={10} width={100} tickMargin={5} stroke="var(--text-dim)" />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, fontSize: 10 }} />
                                <Bar dataKey="points" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '350px' }}>
                    <div className="card-header">
                        <span className="card-title">
                            {selectedDay === 0 ? "Month Summary" : `Performance (${selectedDay} ${months[selectedMonth]})`}
                        </span>
                    </div>

                    <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={[
                                        { value: stats.earned },
                                        { value: Math.max(0, stats.possible - stats.earned) }
                                    ]}
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={0}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={450}
                                >
                                    <Cell fill="#e23636" />
                                    <Cell fill="rgba(255,255,255,0.05)" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white' }}>{stats.earned}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Points</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary-light)', marginTop: '4px', fontWeight: 600 }}>
                                {Math.round((stats.earned / stats.possible) * 100)}%
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ gridColumn: 'span 3' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="card-title">Vibe Trend (Daily Mood)</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            Scale: 1 (😫) to 5 (🤩)
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 200, marginTop: '10px' }}>
                        <ResponsiveContainer>
                            <LineChart data={stats.daily.filter(d => d.mood !== null)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" fontSize={10} tickMargin={10} stroke="var(--text-dim)" />
                                <YAxis fontSize={10} stroke="var(--text-dim)" domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, fontSize: 12 }} />
                                <Line type="stepAfter" dataKey="mood" stroke="#25c0f4" strokeWidth={3} dot={{ fill: '#25c0f4', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
