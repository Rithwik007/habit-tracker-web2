import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import useMidnightRefresh, { formatLocalDate } from '../hooks/useMidnightRefresh';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

export default function AnalyticsPage() {
    const [stats, setStats] = useState({ daily: [], habitWise: [], today: 0 });
    const todayStr = useMidnightRefresh();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            try {
                const { data: habits } = await supabase.from('habits').select('*');
                const last30Days = new Date();
                last30Days.setDate(last30Days.getDate() - 30);

                const { data: logs } = await supabase
                    .from('daily_logs')
                    .select('*')
                    .gte('log_date', formatLocalDate(last30Days));

                if (!habits || !logs) return;

                // 1. Daily Completion (Line Chart)
                const dailyData = [];
                for (let i = 29; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dateStr = formatLocalDate(d);
                    const dayLogs = logs.filter(l => l.log_date === dateStr && l.completed);
                    const pct = Math.round((dayLogs.length / habits.length) * 100) || 0;
                    dailyData.push({ name: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), pct });
                }

                // 2. Habit-wise Completion (Bar Chart)
                const habitData = habits.map(h => {
                    const hLogs = logs.filter(l => l.habit_id === h.id && l.completed);
                    const pct = Math.round((hLogs.length / 30) * 100);
                    return { name: h.name, pct };
                }).sort((a, b) => b.pct - a.pct);

                // 3. Today's Progress (Donut)
                const todayLogs = logs.filter(l => l.log_date === todayStr && l.completed);
                const todayPct = Math.round((todayLogs.length / habits.length) * 100);

                setStats({ daily: dailyData, habitWise: habitData, today: todayPct });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, [todayStr]);

    if (loading) return <div className="loading-screen">📊 Calculating Analytics...</div>;

    const COLORS = ['#6366f1', '#1e293b'];

    return (
        <div className="fade-in">
            <h1 className="page-title">📈 Analytics Overview</h1>

            <div className="charts-grid">
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header">
                        <span className="card-title">Daily Completion Rate (Last 30 Days)</span>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={stats.daily}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={10} tickMargin={10} />
                                <YAxis fontSize={10} domain={[0, 100]} />
                                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, fontSize: 12 }} />
                                <Line type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Consistency per Habit</span>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={stats.habitWise.slice(0, 8)} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" fontSize={10} width={100} tickMargin={5} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, fontSize: 10 }} />
                                <Bar dataKey="pct" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Today's Performance</span>
                    </div>
                    <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={[{ value: stats.today }, { value: 100 - stats.today }]} innerRadius={70} outerRadius={90} paddingAngle={0} dataKey="value" startAngle={90} endAngle={450}>
                                    <Cell fill="#6366f1" />
                                    <Cell fill="rgba(255,255,255,0.05)" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white' }}>{stats.today}%</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Done</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
