import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import ProfileModal from './ProfileModal';
import InboxModal from './InboxModal';
import { Bell } from 'lucide-react';

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
    const { unreadCount } = useNotification();
    const [expanded, setExpanded] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showInbox, setShowInbox] = useState(false);

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

                {/* Notification Bell */}
                <div 
                    className="nav-link" 
                    style={{ marginTop: 'auto', marginBottom: '10px', cursor: 'pointer', position: 'relative' }}
                    onClick={() => setShowInbox(true)}
                    title="Notifications"
                >
                    <span className="nav-icon"><Bell size={20} /></span>
                    <span className="nav-label">Notifications</span>
                    {unreadCount > 0 && (
                        <div style={{
                            position: 'absolute', top: '10px', left: '25px',
                            background: 'var(--danger)', color: 'white', fontSize: '0.65rem',
                            minWidth: '18px', height: '18px', borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, border: '2px solid var(--bg-dark)', padding: '0 4px'
                        }}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </div>
                    )}
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
            <AnimatePresence>
                {showInbox && <InboxModal onClose={() => setShowInbox(false)} />}
            </AnimatePresence>
        </>
    );
}
