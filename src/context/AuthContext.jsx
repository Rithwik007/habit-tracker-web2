import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile as firebaseUpdateProfile,
    getAdditionalUserInfo,
    sendEmailVerification,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';
import { userApi } from '../api';

const AuthContext = createContext(null);
const ADMIN_EMAIL = 'rithwikracharla@gmail.com';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.email === ADMIN_EMAIL;

    const fetchProfile = useCallback(async (firebaseUser) => {
        try {
            // First, use the data from Firebase (fastest)
            setProfile(prev => ({
                id: firebaseUser.uid,
                display_name: firebaseUser.displayName || 'User',
                email: firebaseUser.email,
                onboardingCompleted: prev?.onboardingCompleted ?? false // Preserve if already known
            }));

            // Then try to get extra info from our MongoDB backend
            const { data } = await userApi.getProfile(firebaseUser.uid);
            if (data) {
                setProfile(prev => ({ ...prev, ...data }));
            }
        } catch (err) {
            console.warn('Backend profile fetch failed, using firebase data instead');
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // Fetch full profile first to check onboarding status
                await fetchProfile(firebaseUser);
                
                // Then sync basic info to MongoDB if needed (don't overwrite name)
                try {
                    await userApi.updateProfile({
                        firebaseId: firebaseUser.uid,
                        email: firebaseUser.email,
                        // Only send display name if Firebase has one (e.g. Google login)
                        ...(firebaseUser.displayName ? { display_name: firebaseUser.displayName } : {})
                    });
                } catch (err) {
                    console.warn('Profile sync failed');
                }
            } else {
                setUser(null);
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [fetchProfile]);

    const signUp = async (email, password) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(result.user);
            await firebaseSignOut(auth); // Prevent auto-login before verification
            return { user: result.user, error: null };
        } catch (error) {
            return { error };
        }
    };

    const signIn = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            if (!result.user.emailVerified) {
                await firebaseSignOut(auth);
                throw new Error('Please verify your email address before logging in.');
            }
            return { user: result.user, error: null };
        } catch (error) {
            return { error };
        }
    };

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const additionalInfo = getAdditionalUserInfo(result);
            return { user: result.user, isNewUser: additionalInfo?.isNewUser, error: null };
        } catch (error) {
            console.error('Google Sign-In Error:', error);
            return { error };
        }
    };

    const signOut = async () => {
        return firebaseSignOut(auth);
    };

    const updateProfile = async (displayName, photoURL, onboardingCompleted) => {
        if (!auth.currentUser) return { error: { message: 'Not authenticated' } };
        try {
            // Update Firebase Profile (name only — photo is stored in MongoDB)
            if (displayName) {
                await firebaseUpdateProfile(auth.currentUser, { displayName });
            }

            // Update MongoDB Backend (includes photoURL and onboarding status)
            await userApi.updateProfile({
                firebaseId: auth.currentUser.uid,
                email: auth.currentUser.email,
                display_name: displayName || (profile?.display_name || ''),
                photoURL: photoURL !== undefined ? photoURL : (profile?.photoURL || ''),
                onboardingCompleted: onboardingCompleted !== undefined ? onboardingCompleted : (profile?.onboardingCompleted || false)
            });

            setProfile(prev => ({
                ...prev,
                display_name: displayName || prev?.display_name,
                photoURL: photoURL !== undefined ? photoURL : prev?.photoURL,
                onboardingCompleted: onboardingCompleted !== undefined ? onboardingCompleted : prev?.onboardingCompleted
            }));
            return { error: null };
        } catch (err) {
            console.error('Profile update failed:', err);
            return { error: err };
        }
    };

    const deleteUser = async (userId) => {
        try {
            // Scrub data from MongoDB backend
            await userApi.deleteUser(userId);
            
            // If the user is deleting themselves, remove from Firebase Auth
            // (Admins cannot do this via client SDK, so this step only runs if currentUser.uid === userId)
            if (auth.currentUser && auth.currentUser.uid === userId) {
                await auth.currentUser.delete();
            }
            
            return { error: null };
        } catch (err) {
            console.error('User deletion failed:', err);
            return { error: err };
        }
    };

    const resetPassword = async (email) => {
        try {
            await sendPasswordResetEmail(auth, email);
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            profile, 
            loading, 
            isAdmin, 
            signUp, 
            signIn, 
            signInWithGoogle, 
            signOut, 
            updateProfile, 
            deleteUser,
            resetPassword
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
