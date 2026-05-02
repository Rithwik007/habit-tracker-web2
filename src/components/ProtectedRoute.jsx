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

    // Only show setup if the DB has confirmed this user hasn't onboarded yet.
    // We wait for profileConfirmed so we don't redirect before the DB data arrives.
    // All existing users have been migrated to have onboardingCompleted: true.
    const needsSetup = profile?.profileConfirmed === true && profile?.onboardingCompleted !== true;
    if (needsSetup && location.pathname !== '/setup') {
        return <Navigate to="/setup" replace />;
    }

    return children;
}
