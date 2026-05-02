import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="loading-screen">Verifying session...</div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Strict check for new users only:
    // 1. Must have confirmed profile data from DB
    // 2. Must NOT have completed onboarding flag
    // 3. Must have NO habits created yet
    // 4. Must still have the default/empty display name
    const isDefaultName = !profile.display_name || profile.display_name === 'User';
    const hasNoHabits = (profile.habitCount || 0) === 0;
    const needsSetup = profile?.profileConfirmed && !profile.onboardingCompleted && hasNoHabits && isDefaultName;
    if (needsSetup && location.pathname !== '/setup') {
        return <Navigate to="/setup" replace />;
    }

    return children;
}
