import { useState } from 'react';
import useMidnightRefresh, { formatLocalDate } from '../hooks/useMidnightRefresh';
import { useData } from '../context/DataContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsPage() {
    const { habits, habitsLoading } = useData();
    const todayStr = useMidnightRefresh();
    const currentDate = new Date(todayStr || new Date());
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedDay, setSelectedDay] = useState(0);

    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (habitsLoading) return <div className="loading-screen">📊 Calculating Analytics...</div>;

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    // Build daily data from habits' completions
    const dailyData = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(selectedYear, selectedMonth, i);
        if (selectedYear === currentYear && selectedMonth === currentMonth && d > currentDate) break;
        const dateStr = formatLocalDate(d);
        const completedCount = habits.filter(h =>
            (h.completions || []).some(c => c.date === dateStr)
        ).length;
        const pct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;
        dailyData.push({
            name: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            points: completedCount * 10,
            pct
        });
    }

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="page-title">📈 Analytics Overview</h1>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                    <select className="manage-input" value={selectedDay} onChange={e => setSelectedDay(Number(e.target.value))} style={{ padding: '8px 12px', minWidth: '70px' }}>
                        <option value={0}>Month</option>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <select className="manage-input" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ padding: '8px 12px', minWidth: '120px' }}>
                        {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select className="manage-input" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: '8px 12px', minWidth: '100px' }}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="charts-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                    <div className="card-header">
                        <span className="card-title">Daily Performance Trend ({months[selectedMonth]} {selectedYear})</span>
                    </div>
                    <div style={{ width: '100%', height: 400, marginTop: '20px' }}>
                        <ResponsiveContainer>
                            <LineChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" fontSize={12} tickMargin={15} stroke="var(--text-dim)" />
                                <YAxis yAxisId="left" fontSize={12} stroke="var(--text-dim)" label={{ value: 'Points', angle: -90, position: 'insideLeft', fill: 'var(--text-dim)', fontSize: 12 }} />
                                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="var(--text-dim)" domain={[0, 100]} label={{ value: 'Completion %', angle: 90, position: 'insideRight', fill: 'var(--text-dim)', fontSize: 12 }} />
                                <Tooltip 
                                    contentStyle={{ 
                                        background: 'var(--bg-card)', 
                                        border: '1px solid var(--border)', 
                                        borderRadius: 'var(--radius)', 
                                        fontSize: 14, 
                                        boxShadow: 'var(--card-shadow)',
                                        color: 'var(--text-main)'
                                    }}
                                    itemStyle={{ padding: '4px 0', color: 'var(--text-main)' }}
                                />
                                <Line yAxisId="left" name="Points Earned" type="monotone" dataKey="points" stroke="var(--primary)" strokeWidth={4} dot={{ fill: 'var(--primary)', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                                <Line yAxisId="right" name="Completion %" type="monotone" dataKey="pct" stroke="var(--primary-light)" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
