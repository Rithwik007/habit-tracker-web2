import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { habitApi } from '../api';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const CACHE_TTL_MS = 60 * 1000; // 1 minute — re-fetch from DB after this

export function DataProvider({ children }) {
    const { user, profile } = useAuth();
    const [habits, setHabits] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [habitsLoading, setHabitsLoading] = useState(true);
    const lastFetchedAt = useRef(null);
    const isFetching = useRef(false);

    const activeProfile = profiles.find(p => p._id === profile?.activeProfileId) || null;

    const fetchHabits = useCallback(async (force = false) => {
        if (!user?.uid) return;
        // Skip if already fetching or cache is fresh
        if (isFetching.current) return;
        const now = Date.now();
        if (!force && lastFetchedAt.current && now - lastFetchedAt.current < CACHE_TTL_MS) return;

        isFetching.current = true;
        try {
            const { data } = await habitApi.getAll(user.uid);
            console.log(`[DataContext] Fetched ${data?.length || 0} habits for user ${user.uid}`);
            setHabits(Array.isArray(data) ? data : []);
            lastFetchedAt.current = Date.now();
        } catch (e) {
            console.error('DataContext fetch error:', e);
        } finally {
            isFetching.current = false;
            setHabitsLoading(false);
        }
    }, [user?.uid]);

    const fetchProfiles = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/profiles?userId=${user.uid}`);
            if (res.ok) {
                const data = await res.json();
                setProfiles(data);
            }
        } catch (e) { console.error('Error fetching profiles', e); }
    }, [user?.uid]);

    // Fetch immediately when user logs in
    useEffect(() => {
        if (user?.uid) {
            setHabitsLoading(true);
            fetchProfiles().then(() => fetchHabits(true));
        } else {
            setHabits([]);
            setProfiles([]);
            setHabitsLoading(false);
            lastFetchedAt.current = null;
        }
    }, [user?.uid, fetchHabits, fetchProfiles]);

    // Keep Render backend alive — ping every 4 minutes to prevent cold start
    useEffect(() => {
        if (!user?.uid) return;
        const interval = setInterval(() => {
            fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ping`)
                .catch(() => {}); // silent ping
        }, 4 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user?.uid]);

    // Force refresh (call after toggle, add, delete)
    const refreshHabits = useCallback(() => fetchHabits(true), [fetchHabits]);
    const refreshProfiles = useCallback(() => fetchProfiles(), [fetchProfiles]);

    return (
        <DataContext.Provider value={{ habits, habitsLoading, refreshHabits, setHabits, profiles, activeProfile, refreshProfiles }}>
            {children}
        </DataContext.Provider>
    );
}

export const useData = () => {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be used within DataProvider');
    return ctx;
};
