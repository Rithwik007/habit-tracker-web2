import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Formats a Date object to 'YYYY-MM-DD' in local time 
 * to strictly prevent UTC offset bugs.
 */
export function formatLocalDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Returns the current date as 'YYYY-MM-DD' string.
 */
function getToday() {
    return formatLocalDate(new Date());
}

/**
 * Calculates milliseconds remaining until the next midnight.
 */
function msUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    return midnight - now;
}

/**
 * Custom hook that provides a reactive `today` string (YYYY-MM-DD)
 * and automatically refreshes at midnight. Any component using this
 * hook will re-render when the day changes, and the optional
 * `onDayChange` callback will fire.
 *
 * @param {Function} [onDayChange] - Optional callback when the day rolls over
 * @returns {string} today - Current date string in YYYY-MM-DD format
 */
export default function useMidnightRefresh(onDayChange) {
    const [today, setToday] = useState(getToday);
    const onDayChangeRef = useRef(onDayChange);

    // Keep callback ref current without causing re-subscriptions
    useEffect(() => {
        onDayChangeRef.current = onDayChange;
    }, [onDayChange]);

    useEffect(() => {
        let timerId;

        function scheduleMidnightCheck() {
            // Add 100ms buffer to ensure we're past midnight
            const delay = msUntilMidnight() + 100;

            timerId = setTimeout(() => {
                const newToday = getToday();
                setToday((prev) => {
                    if (prev !== newToday) {
                        // Day has changed — fire the callback
                        if (onDayChangeRef.current) {
                            onDayChangeRef.current(newToday);
                        }
                        return newToday;
                    }
                    return prev;
                });
                // Re-schedule for the next midnight
                scheduleMidnightCheck();
            }, delay);
        }

        scheduleMidnightCheck();

        return () => clearTimeout(timerId);
    }, []);

    return today;
}
