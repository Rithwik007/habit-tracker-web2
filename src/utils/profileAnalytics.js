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

export function calculateStreakForHabit(habit, profileHistory, completions) {
    if (!profileHistory || profileHistory.length === 0) return { currentStreak: 0, longestStreak: 0 };
    
    const uniqueDates = [...new Set((completions || []).map(c => c.date).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    const completionsSet = new Set(uniqueDates);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    let cursorDate = new Date(todayStr + 'T12:00:00');
    
    // We walk backward to calculate the streak. We also need to determine the longest streak.
    // To find the longest streak, we should walk backward indefinitely or at least until the first activation.
    // Let's just walk backward from today up to the habit's earliest activation date (or 365 days max for safety).
    
    // Find the first time this profile was activated to limit the loop
    const profileEntries = profileHistory.filter(h => h.profileId === habit.profileId);
    if (profileEntries.length === 0) return { currentStreak: 0, longestStreak: 0 };
    
    const firstActivation = profileEntries.reduce((min, h) => h.activatedAt < min ? h.activatedAt : min, profileEntries[0].activatedAt);
    const firstActivationDate = new Date(firstActivation + 'T12:00:00');
    
    let isCurrentStreakActive = true;

    while (cursorDate >= firstActivationDate) {
        const dStr = formatLocalDate(cursorDate);
        
        if (isHabitActiveOnDate(habit, dStr, profileHistory)) {
            if (completionsSet.has(dStr)) {
                tempStreak++;
                if (isCurrentStreakActive) currentStreak++;
            } else {
                // If it's today and we haven't completed it, we don't break the streak immediately
                if (dStr !== todayStr) {
                    isCurrentStreakActive = false;
                    tempStreak = 0; // reset
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
            if (pHabits.length > 0) {
                const doneOnDate = Array.from(completionsByDate[dateStr] || []).filter(hId => pHabits.some(ph => ph._id === hId));
                stats[dateStr] = {
                    rate: doneOnDate.length / pHabits.length,
                    completed: doneOnDate.length,
                    total: pHabits.length,
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
