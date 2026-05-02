import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

const formatLocalDate = (date) => {
    const d = new Date(date);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
};

export default function LeetCodeGraph() {
    const { habits, habitsLoading } = useData();
    const [dataTracker, setDataTracker] = useState({});
    const [hoveredCell, setHoveredCell] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const now = new Date();
    const currentYear = now.getFullYear();
    const availableYears = [currentYear, currentYear - 1, currentYear - 2];
    const [selectedYear, setSelectedYear] = useState(currentYear);

    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    const endStr = formatLocalDate(endDate);

    useEffect(() => {
        if (habitsLoading) return;
        const logCounts = {};
        (habits || []).forEach(habit => {
            (habit.completions || []).forEach(c => {
                const d = new Date(c.date);
                if (d.getFullYear() === selectedYear) {
                    logCounts[c.date] = (logCounts[c.date] || 0) + 1;
                }
            });
        });
        setDataTracker(logCounts);
    }, [selectedYear, habits, habitsLoading]);

    // Build grid
    const weeks = [];
    let currentWeek = [];
    let cursor = new Date(startDate);
    
    // Pad first week of the year
    for (let i = 0; i < cursor.getDay(); i++) currentWeek.push(null);
    
    while (cursor <= endDate) {
        currentWeek.push(new Date(cursor));
        
        const nextDay = new Date(cursor);
        nextDay.setDate(cursor.getDate() + 1);
        
        // If the week is full (7 days) OR it's the last day of the month
        if (currentWeek.length === 7 || cursor.getMonth() !== nextDay.getMonth()) {
            // Pad the end of the week if necessary
            while (currentWeek.length < 7) currentWeek.push(null);
            weeks.push(currentWeek);
            currentWeek = [];
            
            // If it was the last day of the month, pad the beginning of the next week
            if (nextDay <= endDate && cursor.getMonth() !== nextDay.getMonth()) {
                for (let i = 0; i < nextDay.getDay(); i++) currentWeek.push(null);
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(null);
        weeks.push(currentWeek);
    }

    const todayStr = formatLocalDate(new Date());

    const getColorLevel = (count) => {
        if (!count) return 'level-0';
        if (count === 1) return 'level-1';
        if (count <= 3) return 'level-2';
        if (count <= 5) return 'level-3';
        return 'level-4';
    };

    const handleMouseEnter = (e, dateObj, count) => {
        if (!dateObj) return;
        const rect = e.target.getBoundingClientRect();
        setTooltipPos({ x: rect.left + window.scrollX + rect.width / 2, y: rect.top + window.scrollY - 10 });
        setHoveredCell({ date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), count: count || 0 });
    };

    if (habitsLoading) return <div className="leetcode-graph-skeleton skeleton-pulse"></div>;

    return (
        <div className="leetcode-graph-container card fade-in">
            <div className="leetcode-header">
                <select
                    className="leetcode-year-select"
                    value={selectedYear}
                    onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                >
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            <div className="leetcode-grid-scroll">
                <div className="leetcode-grid">
                    {weeks.map((week, wIdx) => {
                        let isStartOfMonth = false;
                        if (wIdx === 0) {
                            isStartOfMonth = true;
                        } else {
                            const hasFirstDay = week.some(d => d !== null && d.getDate() === 1);
                            if (hasFirstDay) isStartOfMonth = true;
                        }
                        return (
                            <div key={wIdx} className={`leetcode-col ${isStartOfMonth ? 'month-start' : ''}`}>
                                {week.map((day, dIdx) => {
                                    if (!day) return <div key={dIdx} className="leetcode-cell empty"></div>;
                                    const dateStr = formatLocalDate(day);
                                    const count = dataTracker[dateStr];
                                    return (
                                        <div key={dIdx} className="leetcode-cell-wrapper">
                                            <div
                                                className={`leetcode-cell ${getColorLevel(count)} ${dateStr > todayStr ? 'future' : ''}`}
                                                onMouseEnter={e => handleMouseEnter(e, day, count)}
                                                onMouseLeave={() => setHoveredCell(null)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
                <div className="leetcode-months">
                    {(() => {
                        const monthLabels = [];
                        let lastMonth = -1, count = 0;
                        weeks.forEach(week => {
                            const hasFirstDay = week.find(d => d !== null && d.getDate() === 1);
                            let m = lastMonth;
                            if (hasFirstDay) {
                                m = hasFirstDay.getMonth();
                            } else if (lastMonth === -1) {
                                const firstValidDay = week.find(d => d !== null);
                                if (firstValidDay) m = firstValidDay.getMonth();
                            }

                            if (m !== lastMonth) {
                                if (lastMonth !== -1) monthLabels.push({ m: lastMonth, c: count });
                                lastMonth = m;
                                count = 1;
                            } else count++;
                        });
                        monthLabels.push({ m: lastMonth, c: count });
                        return monthLabels.map((ml, i) => (
                            <div key={i} className="leetcode-month-col-span" style={{ width: ml.c * 18 }}>
                                <span className="leetcode-month-label-centered">
                                    {new Date(0, ml.m).toLocaleString('en-US', { month: 'short' })}
                                </span>
                            </div>
                        ));
                    })()}
                </div>
            </div>

            {hoveredCell && (
                <div className="leetcode-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                    <strong>{hoveredCell.count}</strong> habits completed on {hoveredCell.date}
                </div>
            )}
        </div>
    );
}
