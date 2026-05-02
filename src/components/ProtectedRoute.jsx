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
    const needsSetup = profile && !profile.onboardingCompleted;
    if (needsSetup && location.pathname !== '/setup') {
        return <Navigate to="/setup" replace />;
    }

    return children;
}
