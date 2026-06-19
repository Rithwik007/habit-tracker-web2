import { formatLocalDate } from '../hooks/useMidnightRefresh';

export function getActiveProfileOnDate(dateStr, profileHistory, profiles = []) {
    if (!profileHistory || !Array.isArray(profileHistory)) return null;

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    // Find entry where activatedAt <= dateStr and (deactivatedAt is null or >= dateStr)
    const entry = [...profileHistory].reverse().find(h => {
        const isAfterStart = h.activatedAt <= dateStr;
        let isBeforeEnd = h.deactivatedAt === null || h.deactivatedAt >= dateStr;

        // FIX: If this is the current active entry, check if it has a scheduled end date
        if (h.deactivatedAt === null && dateStr >= todayStr && profiles.length > 0) {
            const p = profiles.find(p => p._id.toString() === h.profileId.toString());
            if (p && p.endDate && dateStr > p.endDate) {
                isBeforeEnd = false;
            }
        }

        return isAfterStart && isBeforeEnd;
    });
    
    if (entry) return entry.profileId;

    // PREDICTION LOGIC for future dates or gaps
    if (dateStr >= todayStr && profiles.length > 0) {
        // Check for specifically scheduled profiles first
        const scheduled = profiles.filter(p => !p.isDefault && p.startDate)
            .sort((a, b) => a.startDate.localeCompare(b.startDate));
        
        for (const p of scheduled) {
            if (dateStr >= p.startDate && (!p.endDate || dateStr <= p.endDate)) {
                return p._id;
            }
        }

        return profiles.find(p => p.isDefault)?._id;
    }

    return null;
}

export function getDailyConsistencyScore(dateStr, profileHistory, allHabits, allCompletions) {
    const activeProfileId = getActiveProfileOnDate(dateStr, profileHistory);
    if (!activeProfileId) return null; // no profile was active

    const habitsForProfile = allHabits.filter(h => h.profileId === activeProfileId);
    if (habitsForProfile.length === 0) return null;

    const completedThatDay = allCompletions.filter(c => 
        c.date === dateStr && habitsForProfile.some(h => h._id === c.habitId)
    );

    return {
        rate: completedThatDay.length / habitsForProfile.length,
        completed: completedThatDay.length,
        total: habitsForProfile.length,
        activeProfileId
    };
}

export function isHabitActiveOnDate(habit, dateStr, profileHistory) {
    return getActiveProfileOnDate(dateStr, profileHistory) === habit.profileId;
}

export function getMondayOfDateString(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(date.setDate(diff));
    return [monday.getFullYear(), String(monday.getMonth() + 1).padStart(2, '0'), String(monday.getDate()).padStart(2, '0')].join('-');
}

export function getCompletionsForWeek(habit, completions, targetDateStr) {
    const mondayStr = getMondayOfDateString(targetDateStr);
    const mondayDate = new Date(mondayStr + 'T00:00:00');
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    
    const startStr = mondayStr;
    const endStr = [sundayDate.getFullYear(), String(sundayDate.getMonth() + 1).padStart(2, '0'), String(sundayDate.getDate()).padStart(2, '0')].join('-');
    
    return (completions || []).filter(c => c.date >= startStr && c.date <= endStr).length;
}

export function isHabitDueOnDate(habit, dateStr, completions) {
    let freq = habit.frequency || { type: 'daily' };
    if (typeof freq === 'string') {
        freq = { type: freq };
    }
    
    const type = freq.type || 'daily';
    
    if (type === 'daily') return true;
    
    if (type === 'specific_days') {
        const days = freq.days || [];
        const date = new Date(dateStr + 'T12:00:00');
        return days.includes(date.getDay());
    }
    
    if (type === 'every_n_days') {
        const everyN = freq.everyNDays || 2;
        const createdDate = habit.createdAt || new Date();
        const startStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(createdDate));
        
        const start = new Date(startStr + 'T12:00:00');
        const target = new Date(dateStr + 'T12:00:00');
        const diffTime = target.getTime() - start.getTime();
        if (diffTime < 0) return false;
        
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        return diffDays % everyN === 0;
    }
    
    if (type === 'times_per_week') {
        const completionsCount = getCompletionsForWeek(habit, completions, dateStr);
        const target = freq.timesPerWeek || 1;
        
        // If target is met:
        // Only show/due if completed TODAY.
        if (completionsCount >= target) {
            return (completions || []).some(c => c.date === dateStr);
        }
        
        return true;
    }
    
    return true;
}

export function calculateStreakForHabit(habit, profileHistory, completions) {
    if (!profileHistory || profileHistory.length === 0) return { currentStreak: 0, longestStreak: 0 };
    
    const uniqueDates = [...new Set((completions || []).map(c => c.date).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    const completionsSet = new Set(uniqueDates);

    let freq = habit.frequency || { type: 'daily' };
    if (typeof freq === 'string') {
        freq = { type: freq };
    }
    
    const type = freq.type || 'daily';
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    // Find the first time this profile was activated to limit the loop
    const profileEntries = profileHistory.filter(h => h.profileId === habit.profileId);
    if (profileEntries.length === 0) return { currentStreak: 0, longestStreak: 0 };
    
    const firstActivation = profileEntries.reduce((min, h) => h.activatedAt < min ? h.activatedAt : min, profileEntries[0].activatedAt);

    if (type === 'times_per_week') {
        const weeklyCompletions = {};
        for (const dStr of uniqueDates) {
            if (isHabitActiveOnDate(habit, dStr, profileHistory)) {
                const mon = getMondayOfDateString(dStr);
                weeklyCompletions[mon] = (weeklyCompletions[mon] || 0) + 1;
            }
        }
        
        const todayMon = getMondayOfDateString(todayStr);
        const firstActMon = getMondayOfDateString(firstActivation);

        let cursorDate = new Date(todayMon + 'T12:00:00');
        const endLimit = new Date(firstActMon + 'T12:00:00');

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        let isCurrentStreakActive = true;
        const targetCount = freq.timesPerWeek || 1;

        while (cursorDate >= endLimit) {
            const monStr = [cursorDate.getFullYear(), String(cursorDate.getMonth() + 1).padStart(2, '0'), String(cursorDate.getDate()).padStart(2, '0')].join('-');
            const completedCount = weeklyCompletions[monStr] || 0;
            const isTargetMet = completedCount >= targetCount;

            if (monStr === todayMon) {
                if (isTargetMet) {
                    tempStreak++;
                    currentStreak++;
                }
            } else {
                if (isTargetMet) {
                    tempStreak++;
                    if (isCurrentStreakActive) currentStreak++;
                } else {
                    isCurrentStreakActive = false;
                    tempStreak = 0;
                }
            }

            if (tempStreak > longestStreak) {
                longestStreak = tempStreak;
            }
            cursorDate.setDate(cursorDate.getDate() - 7);
        }

        return { currentStreak, longestStreak };
    } else {
        // Handles daily, specific_days, every_n_days
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;

        let cursorDate = new Date(todayStr + 'T12:00:00');
        const firstActivationDate = new Date(firstActivation + 'T12:00:00');
        let isCurrentStreakActive = true;

        while (cursorDate >= firstActivationDate) {
            const dStr = formatLocalDate(cursorDate);
            
            if (isHabitActiveOnDate(habit, dStr, profileHistory)) {
                const isScheduled = isHabitDueOnDate(habit, dStr, completions);
                if (isScheduled) {
                    if (completionsSet.has(dStr)) {
                        tempStreak++;
                        if (isCurrentStreakActive) currentStreak++;
                    } else {
                        if (dStr !== todayStr) {
                            isCurrentStreakActive = false;
                            tempStreak = 0;
                        }
                    }
                }
            }
            
            if (tempStreak > longestStreak) {
                longestStreak = tempStreak;
            }

            cursorDate.setDate(cursorDate.getDate() - 1);
        }

        return { currentStreak, longestStreak };
    }
}

export function calculateBatchConsistency(profileHistory, allHabits, allCompletions) {
    if (!profileHistory || profileHistory.length === 0) return { habitsByProfile: {}, completionsByDate: {} };

    // Index habits by profileId
    const habitsByProfile = allHabits.reduce((acc, h) => {
        const pId = h.profileId.toString();
        if (!acc[pId]) acc[pId] = [];
        acc[pId].push(h);
        return acc;
    }, {});

    // Index completions by date
    const completionsByDate = allCompletions.reduce((acc, c) => {
        if (!acc[c.date]) acc[c.date] = new Set();
        acc[c.date].add(c.habitId.toString());
        return acc;
    }, {});

    return { habitsByProfile, completionsByDate };
}

export function calculateYearlyStats(selectedYear, profileHistory, allHabits, allCompletions, profiles) {
    const { habitsByProfile, completionsByDate } = calculateBatchConsistency(profileHistory, allHabits, allCompletions);
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const stats = {};

    let cursor = new Date(selectedYear, 0, 1);
    const end = new Date(selectedYear, 11, 31);

    while (cursor <= end) {
        const dateStr = formatLocalDate(cursor);
        const activeProfileId = getActiveProfileOnDate(dateStr, profileHistory, profiles);
        
        if (activeProfileId) {
            const pHabits = habitsByProfile[activeProfileId.toString()] || [];
            
            // Filter habits scheduled for this specific dateStr
            const scheduledHabits = pHabits.filter(h => isHabitDueOnDate(h, dateStr, h.completions || []));
            
            if (scheduledHabits.length > 0) {
                const doneOnDate = Array.from(completionsByDate[dateStr] || []).filter(hId => scheduledHabits.some(ph => ph._id === hId));
                stats[dateStr] = {
                    rate: doneOnDate.length / scheduledHabits.length,
                    completed: doneOnDate.length,
                    total: scheduledHabits.length,
                    activeProfileId
                };
            } else {
                stats[dateStr] = { rate: 0, completed: 0, total: 0, activeProfileId };
            }
        } else {
            stats[dateStr] = null;
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return stats;
}
