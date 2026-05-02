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
    // For legacy users, we also check if they already have a custom display name to avoid bothering them.
    const isNewUser = !profile.display_name || profile.display_name === 'User';
    const needsSetup = profile && !profile.onboardingCompleted && isNewUser;
    if (needsSetup && location.pathname !== '/setup') {
        return <Navigate to="/setup" replace />;
    }

    return children;
}
