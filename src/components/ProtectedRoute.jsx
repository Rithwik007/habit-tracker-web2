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

    // Redirect to setup if profile hasn't completed onboarding wizard
    const needsSetup = profile && !profile.hasCompletedSetup;
    if (needsSetup && location.pathname !== '/setup') {
        return <Navigate to="/setup" replace />;
    }

    return children;
}
