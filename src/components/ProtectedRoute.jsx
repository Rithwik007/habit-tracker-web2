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

    // Redirect to setup ONLY if it's a brand new account (default name 'User') 
    // AND they haven't finished the onboarding wizard yet.
    const isBrandNew = !profile.display_name || profile.display_name === 'User';
    const needsSetup = profile && profile.hasCompletedSetup === false && isBrandNew;
    
    if (needsSetup && location.pathname !== '/setup') {
        return <Navigate to="/setup" replace />;
    }

    return children;
}
