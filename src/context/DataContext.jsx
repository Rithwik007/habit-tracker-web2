import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { habitApi } from '../api';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const CACHE_TTL_MS = 60 * 1000; // 1 minute — re-fetch from DB after this

export function DataProvider({ children }) {
    const { user } = useAuth();
    const [habits, setHabits] = useState([]);
    const [habitsLoading, setHabitsLoading] = useState(true);
    const lastFetchedAt = useRef(null);
    const isFetching = useRef(false);

    const fetchHabits = useCallback(async (force = false) => {
        if (!user?.uid) return;
        // Skip if already fetching or cache is fresh
        if (isFetching.current) return;
        const now = Date.now();
        if (!force && lastFetchedAt.current && now - lastFetchedAt.current < CACHE_TTL_MS) return;

        isFetching.current = true;
        setHabitsLoading(prev => prev); // don't flash loading if we already have data
        try {
            const { data } = await habitApi.getAll(user.uid);
            setHabits(Array.isArray(data) ? data : []);
            lastFetchedAt.current = Date.now();
        } catch (e) {
            console.error('DataContext fetch error:', e);
        } finally {
            isFetching.current = false;
            setHabitsLoading(false);
        }
    }, [user?.uid]);

    // Fetch immediately when user logs in
    useEffect(() => {
        if (user?.uid) {
            setHabitsLoading(true);
            fetchHabits(true);
        } else {
            setHabits([]);
            setHabitsLoading(false);
            lastFetchedAt.current = null;
        }
    }, [user?.uid, fetchHabits]);

    // Keep Atlas alive — ping every 4 minutes to prevent cold start
    useEffect(() => {
        if (!user?.uid) return;
        const interval = setInterval(() => {
            habitApi.getAll(user.uid).catch(() => {}); // silent ping
        }, 4 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user?.uid]);

    // Force refresh (call after toggle, add, delete)
    const refreshHabits = useCallback(() => fetchHabits(true), [fetchHabits]);

    return (
        <DataContext.Provider value={{ habits, habitsLoading, refreshHabits, setHabits }}>
            {children}
        </DataContext.Provider>
    );
}

export const useData = () => {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be used within DataProvider');
    return ctx;
};
