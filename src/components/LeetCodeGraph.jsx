import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

// Helper to format date as YYYY-MM-DD in local time
const formatLocalDate = (date) => {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

export default function LeetCodeGraph() {
    const [dataTracker, setDataTracker] = useState({});
    const [stats, setStats] = useState({ totalCompleted: 0, activeDays: 0, maxStreak: 0, currentStreak: 0 });
    const [loading, setLoading] = useState(true);

    const [hoveredCell, setHoveredCell] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const now = new Date();
    const currentYear = now.getFullYear();
    const availableYears = [currentYear, currentYear - 1, currentYear - 2];
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Compute Date Range based on selection
    let startDate = new Date(selectedYear, 0, 1);
    let endDate = new Date(selectedYear, 11, 31);

    useEffect(() => {
        async function fetchYearlyData() {
            setLoading(true);
            try {
                const startStr = formatLocalDate(startDate);
                const endStr = formatLocalDate(endDate);

                // Fetch all daily logs where completed is true for the past 365 days
                const { data: logsData } = await supabase
                    .from('daily_logs')
                    .select('log_date')
                    .eq('completed', true)
                    .gte('log_date', startStr)
                    .lte('log_date', endStr);

                // Aggregate by log_date
                const logCounts = {};
                (logsData || []).forEach(log => {
                    logCounts[log.log_date] = (logCounts[log.log_date] || 0) + 1;
                });

                setDataTracker(logCounts);

                // Calculate Stats
                const totalCompleted = (logsData || []).length;
                const activeDays = Object.keys(logCounts).length;

                // Streak Calculation
                let currentStreak = 0;
                let maxStreak = 0;
                let tempStreak = 0;

                // Cap iteration target to today so we don't count future missed days for current streak
                const streakEndDate = selectedYear === 'Past Year' || selectedYear === currentYear ? new Date() : endDate;

                // Go from start date to end date
                let cursorDate = new Date(startDate);
                while (cursorDate <= streakEndDate) {
                    const dStr = formatLocalDate(cursorDate);
                    if (logCounts[dStr]) {
                        tempStreak++;
                        maxStreak = Math.max(maxStreak, tempStreak);
                        currentStreak = tempStreak;
                    } else {
                        // Reset if it's not today. If today is missed but yesterday was hit, current streak is broken.
                        if (dStr !== endStr || currentStreak > 0) {
                            currentStreak = 0;
                        }
                        tempStreak = 0; // reset
                    }
                    cursorDate.setDate(cursorDate.getDate() + 1);
                }

                // Special case for current streak if today is missing but yesterday was active
                // If today is missing, technically streak is 0 unless we give a grace period. 
                // Let's re-calculate cleanly going backwards for current streak:
                let backwardsCursor = new Date(streakEndDate);
                let currentCalc = 0;

                // Check today
                if (logCounts[formatLocalDate(backwardsCursor)]) {
                    currentCalc++;
                    backwardsCursor.setDate(backwardsCursor.getDate() - 1);
                    while (logCounts[formatLocalDate(backwardsCursor)]) {
                        currentCalc++;
                        backwardsCursor.setDate(backwardsCursor.getDate() - 1);
                    }
                } else {
                    // check if yesterday was active (grace period for today)
                    backwardsCursor.setDate(backwardsCursor.getDate() - 1);
                    if (logCounts[formatLocalDate(backwardsCursor)]) {
                        while (logCounts[formatLocalDate(backwardsCursor)]) {
                            currentCalc++;
                            backwardsCursor.setDate(backwardsCursor.getDate() - 1);
                        }
                    }
                }

                setStats({ totalCompleted, activeDays, maxStreak, currentStreak: currentCalc });

            } catch (error) {
                console.error("Error fetching yearly data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchYearlyData();
    }, [selectedYear]);

    // Build the grid
    const weeks = [];
    let currentWeek = [];
    let cursor = new Date(startDate);

    // Pad the first week if startDate is not a Sunday
    const startDay = cursor.getDay();
    for (let i = 0; i < startDay; i++) {
        currentWeek.push(null);
    }

    while (cursor <= endDate) {
        currentWeek.push(new Date(cursor));
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    // Push the last incomplete week
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
            currentWeek.push(null);
        }
        weeks.push(currentWeek);
    }

    // Determine current date to gray out future cells
    const todayStr = formatLocalDate(new Date());

    const getColorLevel = (count) => {
        if (!count || count === 0) return 'level-0';
        if (count === 1) return 'level-1';
        if (count <= 3) return 'level-2';
        if (count <= 5) return 'level-3';
        return 'level-4';
    };

    const handleMouseEnter = (e, dateObj, count) => {
        if (!dateObj) return;
        const rect = e.target.getBoundingClientRect();
        setTooltipPos({ x: rect.left + window.scrollX + (rect.width / 2), y: rect.top + window.scrollY - 10 });
        setHoveredCell({
            date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            count: count || 0
        });
    };

    const handleMouseLeave = () => {
        setHoveredCell(null);
    };

    if (loading) {
        return <div className="leetcode-graph-skeleton skeleton-pulse"></div>;
    }

    return (
        <div className="leetcode-graph-container card fade-in">
            <div className="leetcode-header">
                <div className="leetcode-stats-left">
                    <select
                        className="leetcode-year-select"
                        value={selectedYear}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSelectedYear(val === 'Past Year' ? val : parseInt(val, 10));
                        }}
                    >
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="leetcode-grid-scroll">
                <div className="leetcode-grid">
                    {weeks.map((week, wIdx) => {
                        let isStartOfMonth = false;
                        const firstValidDay = week.find(d => d !== null);
                        if (firstValidDay) {
                            if (firstValidDay.getDate() <= 7 && wIdx > 0) {
                                const prevWeekFirstDay = weeks[wIdx - 1]?.find(d => d !== null);
                                if (prevWeekFirstDay && prevWeekFirstDay.getMonth() !== firstValidDay.getMonth()) {
                                    isStartOfMonth = true;
                                }
                            } else if (wIdx === 0) {
                                isStartOfMonth = true;
                            }
                        }

                        return (
                            <div key={wIdx} className={`leetcode-col ${isStartOfMonth ? 'month-start' : ''}`}>
                                {week.map((day, dIdx) => {
                                    if (!day) return <div key={dIdx} className="leetcode-cell empty"></div>;
                                    const dateStr = formatLocalDate(day);
                                    const count = dataTracker[dateStr];
                                    const levelName = getColorLevel(count);

                                    return (
                                        <div key={dIdx} className="leetcode-cell-wrapper">
                                            <div
                                                className={`leetcode-cell ${levelName} ${dateStr > todayStr ? 'future' : ''}`}
                                                onMouseEnter={(e) => handleMouseEnter(e, day, count)}
                                                onMouseLeave={handleMouseLeave}
                                            ></div>
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
                        let lastMonth = -1;
                        let count = 0;

                        weeks.forEach((week) => {
                            const firstValidDay = week.find(d => d !== null);
                            if (firstValidDay) {
                                const m = firstValidDay.getMonth();
                                if (m !== lastMonth) {
                                    if (lastMonth !== -1) monthLabels.push({ m: lastMonth, c: count });
                                    lastMonth = m;
                                    count = 1;
                                } else {
                                    count++;
                                }
                            } else {
                                count++;
                            }
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
                <div
                    className="leetcode-tooltip"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <strong>{hoveredCell.count}</strong> habits completed on {hoveredCell.date}
                </div>
            )}
        </div>
    );
}
