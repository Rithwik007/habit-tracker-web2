import { formatLocalDate } from '../hooks/useMidnightRefresh';

export function getActiveProfileOnDate(dateStr, profileHistory) {
    if (!profileHistory || !Array.isArray(profileHistory) || profileHistory.length === 0) return null;

    // If the date we're checking is BEFORE the earliest known date, the user didn't exist yet!
    const earliestActivation = profileHistory.reduce((min, h) => h.activatedAt < min ? h.activatedAt : min, profileHistory[0].activatedAt);
    if (dateStr < earliestActivation) return null;

    // Find entry where activatedAt <= dateStr and (deactivatedAt is null or >= dateStr)
    // Reverse first to find the LAST activation of the day in case of multiple switches
    const entry = [...profileHistory].reverse().find(h => {
        const isAfterStart = h.activatedAt <= dateStr;
        const isBeforeEnd = h.deactivatedAt === null || h.deactivatedAt >= dateStr;
        return isAfterStart && isBeforeEnd;
    });
    
    return entry ? entry.profileId : null;
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
