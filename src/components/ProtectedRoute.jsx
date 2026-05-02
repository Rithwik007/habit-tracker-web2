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

    // Redirect to setup if onboarding hasn't been completed yet
    // We only evaluate this once we're sure we have the backend profile data (profileConfirmed)
    // We also check habitCount - if they already have habits, they don't need initial setup.
    const isNewUser = !profile.display_name || profile.display_name === 'User';
    const hasNoHabits = (profile.habitCount || 0) === 0;
    const needsSetup = profile && profile.profileConfirmed && !profile.onboardingCompleted && hasNoHabits && isNewUser;
    if (needsSetup && location.pathname !== '/setup') {
        return <Navigate to="/setup" replace />;
    }

    return children;
}
