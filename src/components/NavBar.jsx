import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';

const links = [
    { to: '/', icon: '✅', label: "Today's Habits" },
    { to: '/monthly', icon: '📅', label: 'Monthly Tracker' },
    { to: '/analytics', icon: '📊', label: 'Analytics' },
    { to: '/progress', icon: '🏆', label: 'Progress' },
    { to: '/notes', icon: '📝', label: 'Add Note' },
    { to: '/manage', icon: '⚙️', label: 'Manage Habits' },
    { to: '/admin', icon: '🛡️', label: 'Admin' },
];

export default function NavBar() {
    const { user, profile, isAdmin } = useAuth();
    const [expanded, setExpanded] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const displayName = profile?.display_name || user?.displayName || user?.email?.split('@')[0] || 'User';
    const photoURL = profile?.photoURL || user?.photoURL || null;
    const initial = (displayName || 'U')[0].toUpperCase();

    return (
        <>
            <nav
                className={`navbar ${expanded ? 'navbar-expanded' : 'navbar-collapsed'}`}
                onMouseEnter={() => setExpanded(true)}
                onMouseLeave={() => setExpanded(false)}
            >
                {/* Brand */}
                <div className="nav-brand">
                    <span className="nav-brand-icon">🏋️</span>
                    <span className="nav-brand-text">Habit Mastery</span>
                </div>

                {/* Links */}
                <div className="nav-links">
                    {links.filter(link => link.to !== '/admin' || isAdmin).map(({ to, icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                            title={label}
                        >
                            <span className="nav-icon">{icon}</span>
                            <span className="nav-label">{label}</span>
                        </NavLink>
                    ))}
                </div>

                {/* Profile at Bottom */}
                <div className="nav-profile" onClick={() => setShowProfile(true)}>
                    <div className="nav-avatar">
                        {photoURL
                            ? <img src={photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{initial}</span>
                        }
                    </div>
                    <div className="nav-profile-info">
                        <span className="nav-profile-name">{displayName}</span>
                        <span className="nav-profile-sub">View Profile</span>
                    </div>
                </div>
            </nav>

            {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
        </>
    );
}
