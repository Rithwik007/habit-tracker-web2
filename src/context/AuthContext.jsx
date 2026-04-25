import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async (userId) => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        setProfile(data);
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    const signUp = async (email, password) => {
        // TODO: re-enable 10-user limit after verifying user_count view exists
        return supabase.auth.signUp({ email, password });
    };

    const signIn = async (email, password) => {
        return supabase.auth.signInWithPassword({ email, password });
    };

    const signOut = async () => {
        return supabase.auth.signOut();
    };

    const updateProfile = async (displayName) => {
        if (!user) return { error: { message: 'Not authenticated' } };
        const { data, error } = await supabase
            .from('profiles')
            .update({ display_name: displayName, updated_at: new Date().toISOString() })
            .eq('id', user.id)
            .select()
            .single();
        if (!error) setProfile(prev => ({ ...prev, display_name: displayName }));
        return { data, error };
    };

    const deleteUser = async (userId) => {
        const { error } = await supabase.rpc('delete_user_account', { target_user_id: userId });
        return { error };
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, updateProfile, deleteUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
