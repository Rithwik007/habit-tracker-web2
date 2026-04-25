import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';


const links = [
    { to: '/', icon: '✅', label: "Today's Habits" },
    { to: '/monthly', icon: '📅', label: 'Monthly Tracker' },
    { to: '/analytics', icon: '📊', label: 'Analytics' },
    { to: '/progress', icon: '🏆', label: 'Progress' },
    { to: '/timer', icon: '⏱️', label: 'Timer' },
    { to: '/manage', icon: '⚙️', label: 'Manage Habits' },
    { to: '/admin', icon: '🛡️', label: 'Admin' },
];


export default function NavBar() {
    const { user, profile, signOut } = useAuth();
    const { addToast } = useToast();

    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

    const handleSignOut = async () => {
        await signOut();
        addToast('Signed out successfully');
    };

    return (
        <nav className="navbar">
            <div className="nav-brand">
                <h2>Habit Mastery</h2>
                <p>{displayName}</p>
            </div>
            <div className="nav-links">
                {links.map(({ to, icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    >
                        <span className="nav-icon">{icon}</span>
                        {label}
                    </NavLink>
                ))}
            </div>
            <div style={{ marginTop: 'auto', padding: '20px' }}>
                <button className="logout-btn" onClick={handleSignOut} style={{ width: '100%' }}>
                    Sign Out
                </button>
            </div>
        </nav>
    );
}
