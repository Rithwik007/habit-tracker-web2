import { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { habitApi } from '../api';
import { calculateYearlyStats } from '../utils/profileAnalytics';

const formatLocalDate = (date) => {
    const d = new Date(date);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
};

export default function LeetCodeGraph() {
    const { user, profile } = useAuth();
    const { habitsLoading, profiles } = useData();
    const [allHabits, setAllHabits] = useState([]);
    const [loadingAll, setLoadingAll] = useState(true);
    const [hoveredCell, setHoveredCell] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const now = new Date();
    const currentYear = now.getFullYear();
    const availableYears = [currentYear, currentYear - 1, currentYear - 2];
    const [selectedYear, setSelectedYear] = useState(currentYear);

    const startDate = useMemo(() => new Date(selectedYear, 0, 1), [selectedYear]);
    const endDate = useMemo(() => new Date(selectedYear, 11, 31), [selectedYear]);

    useEffect(() => {
        if (!user?.uid) return;
        setLoadingAll(true);
        habitApi.getAllAcrossProfiles(user.uid)
            .then(res => setAllHabits(res.data || []))
            .catch(err => console.error(err))
            .finally(() => setLoadingAll(false));
    }, [user?.uid]);

    const allCompletions = useMemo(() => {
        return allHabits.flatMap(h => (h.completions || []).map(c => ({ habitId: h._id, date: c.date })));
    }, [allHabits]);

    const dataTracker = useMemo(() => {
        if (loadingAll || !profile) return {};
        return calculateYearlyStats(selectedYear, profile.profileHistory || [], allHabits, allCompletions, profiles);
    }, [selectedYear, loadingAll, profile, allHabits, allCompletions, profiles]);

    const weeks = useMemo(() => {
        const w = [];
        let currentWeek = [];
        let cursor = new Date(startDate);
        
        for (let i = 0; i < cursor.getDay(); i++) currentWeek.push(null);
        
        while (cursor <= endDate) {
            currentWeek.push(new Date(cursor));
            const nextDay = new Date(cursor);
            nextDay.setDate(cursor.getDate() + 1);
            
            if (currentWeek.length === 7 || cursor.getMonth() !== nextDay.getMonth()) {
                while (currentWeek.length < 7) currentWeek.push(null);
                w.push(currentWeek);
                currentWeek = [];
                if (nextDay <= endDate && cursor.getMonth() !== nextDay.getMonth()) {
                    for (let i = 0; i < nextDay.getDay(); i++) currentWeek.push(null);
                }
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) currentWeek.push(null);
            w.push(currentWeek);
        }
        return w;
    }, [startDate, endDate]);

    const todayStr = formatLocalDate(new Date());

    const getColorLevel = (scoreObj, dateStr) => {
        if (!scoreObj) return 'inactive';
        if (dateStr > todayStr) return 'level-predict';
        if (scoreObj.rate === 0) return 'level-0';
        if (scoreObj.rate < 0.25) return 'level-1';
        if (scoreObj.rate < 0.5) return 'level-2';
        if (scoreObj.rate < 0.75) return 'level-3';
        return 'level-4';
    };

    const handleMouseEnter = (e, dateObj, scoreObj) => {
        if (!dateObj) return;
        const rect = e.target.getBoundingClientRect();
        setTooltipPos({ x: rect.left + window.scrollX + rect.width / 2, y: rect.top + window.scrollY - 10 });
        setHoveredCell({ 
            date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 
            scoreObj 
        });
    };

    if (habitsLoading || loadingAll) return <div className="leetcode-graph-skeleton skeleton-pulse"></div>;

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
                        if (wIdx === 0) isStartOfMonth = true;
                        else {
                            const hasFirstDay = week.some(d => d !== null && d.getDate() === 1);
                            if (hasFirstDay) isStartOfMonth = true;
                        }
                        return (
                            <div key={wIdx} className={`leetcode-col ${isStartOfMonth ? 'month-start' : ''}`}>
                                {week.map((day, dIdx) => {
                                    if (!day) return <div key={dIdx} className="leetcode-cell empty"></div>;
                                    const dateStr = formatLocalDate(day);
                                    const scoreObj = dataTracker[dateStr];
                                    const colorClass = getColorLevel(scoreObj, dateStr);
                                    
                                    return (
                                        <div key={dIdx} className="leetcode-cell-wrapper">
                                            <div
                                                className={`leetcode-cell ${colorClass}`}
                                                onMouseEnter={e => handleMouseEnter(e, day, scoreObj)}
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
                            if (hasFirstDay) m = hasFirstDay.getMonth();
                            else if (lastMonth === -1) {
                                const fvd = week.find(d => d !== null);
                                if (fvd) m = fvd.getMonth();
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
                    <div style={{ marginBottom: '4px', opacity: 0.8 }}>{hoveredCell.date}</div>
                    {hoveredCell.scoreObj ? (
                        <>
                            <div><strong>{hoveredCell.scoreObj.completed} of {hoveredCell.scoreObj.total}</strong> habits</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '2px' }}>
                                Profile: {profiles.find(p => p._id === hoveredCell.scoreObj.activeProfileId)?.name || 'Default'}
                            </div>
                        </>
                    ) : (
                        <div>No profile scheduled</div>
                    )}
                </div>
            )}
            <style>{`
                .leetcode-cell.level-predict { 
                    background: rgba(99, 102, 241, 0.08); 
                    border: 1px dashed rgba(99, 102, 241, 0.3); 
                }
                .leetcode-cell.inactive { 
                    background: rgba(255, 255, 255, 0.02); 
                    border: 1px solid rgba(255, 255, 255, 0.05); 
                }
            `}</style>
        </div>
    );
}
