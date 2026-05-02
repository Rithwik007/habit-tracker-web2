import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    // Phase 1: Firebase auth is still initializing
    if (loading) {
        return <div className="loading-screen">Verifying session...</div>;
    }

    // Phase 2: Not logged in
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Phase 3: Logged in but still waiting for MongoDB profile (max ~3s)
    // profileConfirmed is set to true once the DB responds (or fails gracefully)
    if (!profile?.profileConfirmed) {
        return <div className="loading-screen">Loading your profile...</div>;
    }

    // Phase 4: Check if this is a brand new user who needs onboarding
    // All existing users have been migrated with onboardingCompleted: true
    const needsSetup = profile.onboardingCompleted !== true;
    if (needsSetup && location.pathname !== '/setup') {
        return <Navigate to="/setup" replace />;
    }

    // Phase 5: Prevent an already-onboarded user from revisiting /setup
    if (!needsSetup && location.pathname === '/setup') {
        return <Navigate to="/" replace />;
    }

    return children;
}
