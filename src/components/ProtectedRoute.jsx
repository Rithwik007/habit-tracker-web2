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

    // New User Check:
    // We only force setup if:
    // 1. Profile is confirmed by DB
    // 2. onboardingCompleted flag is false
    // 3. AND they have EXACTLY ZERO habits (not undefined)
    const hasNoHabits = profile.habitCount === 0; 
    const needsSetup = profile?.profileConfirmed && !profile.onboardingCompleted && hasNoHabits;
    if (needsSetup && location.pathname !== '/setup') {
        return <Navigate to="/setup" replace />;
    }

    return children;
}
