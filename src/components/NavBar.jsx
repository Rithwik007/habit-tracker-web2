import { NavLink } from 'react-router-dom';


const links = [
    { to: '/', icon: '✅', label: "Today's Habits" },
    { to: '/monthly', icon: '📅', label: 'Monthly Tracker' },
    { to: '/analytics', icon: '📊', label: 'Analytics' },
    { to: '/progress', icon: '🏆', label: 'Progress' },
    { to: '/manage', icon: '⚙️', label: 'Manage Habits' },
];


export default function NavBar() {

    return (
        <nav className="navbar">
            <div className="nav-brand">
                <h2>Habit Mastery</h2>
                <p>Rithwik Racharla</p>
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
        </nav>
    );
}
