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

    // Habit-wise consistency for the selected month
    const habitWise = habits.map(h => {
        const count = (h.completions || []).filter(c => {
            const d = new Date(c.date);
            return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
        }).length;
        return { name: h.name, points: count * 10 };
    }).sort((a, b) => b.points - a.points);

    // Donut chart
    let earned = 0, possible = 1;
    if (selectedDay === 0) {
        let maxDays = daysInMonth;
        if (selectedYear === currentYear && selectedMonth === currentMonth) {
            maxDays = currentDate.getDate();
        }
        earned = habits.reduce((sum, h) =>
            sum + (h.completions || []).filter(c => {
                const d = new Date(c.date);
                return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
            }).length, 0) * 10;
        possible = maxDays * habits.length * 10 || 1;
    } else {
        const targetDateStr = formatLocalDate(new Date(selectedYear, selectedMonth, selectedDay));
        earned = habits.filter(h =>
            (h.completions || []).some(c => c.date === targetDateStr)
        ).length * 10;
        possible = habits.length * 10 || 1;
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

            <div className="charts-grid">
                <div className="card" style={{ gridColumn: 'span 3' }}>
                    <div className="card-header">
                        <span className="card-title">Daily Performance Trend ({months[selectedMonth]})</span>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" fontSize={10} tickMargin={10} stroke="var(--text-dim)" />
                                <YAxis yAxisId="left" fontSize={10} stroke="var(--text-dim)" />
                                <YAxis yAxisId="right" orientation="right" fontSize={10} stroke="var(--text-dim)" domain={[0, 100]} />
                                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, fontSize: 12 }} />
                                <Line yAxisId="left" type="monotone" dataKey="points" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 5 }} />
                                <Line yAxisId="right" type="monotone" dataKey="pct" stroke="#22d3ee" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header">
                        <span className="card-title">Consistency per Habit</span>
                    </div>
                    <div className="custom-scrollbar" style={{ width: '100%', height: 350, overflowY: 'auto' }}>
                        <ResponsiveContainer height={Math.max(200, habitWise.length * 32)}>
                            <BarChart data={habitWise} layout="vertical" margin={{ left: 5, right: 30, top: 0, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" fontSize={10} width={110} tickMargin={5} stroke="var(--text-dim)" />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, fontSize: 10 }} />
                                <Bar dataKey="points" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '350px' }}>
                    <div className="card-header">
                        <span className="card-title">
                            {selectedDay === 0 ? 'Month Summary' : `${selectedDay} ${months[selectedMonth]}`}
                        </span>
                    </div>
                    <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={[{ value: earned }, { value: Math.max(0, possible - earned) }]}
                                    innerRadius={70} outerRadius={90} paddingAngle={0}
                                    dataKey="value" startAngle={90} endAngle={450}
                                >
                                    <Cell fill="#6366f1" />
                                    <Cell fill="rgba(255,255,255,0.05)" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white' }}>{earned}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Points</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary-light)', marginTop: '4px', fontWeight: 600 }}>
                                {Math.round((earned / possible) * 100)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
