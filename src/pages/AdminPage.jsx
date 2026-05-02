import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatLocalDate = (date) => {
    const d = new Date(date);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
};

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function UserPerformanceChart({ habits, selectedMonth, selectedYear }) {
    if (!habits || habits.length === 0) return <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>No habits found for this user.</div>;

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const today = new Date();

    const dailyData = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(selectedYear, selectedMonth, i);
        if (d > today) break;
        const dateStr = formatLocalDate(d);
        const completedCount = habits.filter(h =>
            (h.completions || []).some(c => c.date === dateStr)
        ).length;
        const pct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;
        dailyData.push({
            name: `${i} ${months[selectedMonth]}`,
            completed: completedCount,
            pct
        });
    }

    return (
        <div style={{ width: '100%', height: 200, marginTop: '12px' }}>
            <ResponsiveContainer>
                <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" fontSize={9} tickMargin={8} stroke="var(--text-dim)" interval={4} />
                    <YAxis domain={[0, 100]} fontSize={9} stroke="var(--text-dim)" tickFormatter={v => `${v}%`} />
                    <Tooltip
                        contentStyle={{ background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, fontSize: 11 }}
                        formatter={(v, n) => [n === 'pct' ? `${v}%` : v, n === 'pct' ? 'Performance' : 'Habits Done']}
                    />
                    <Line type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="completed" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function AdminPage() {
    const { user, isAdmin } = useAuth();
    const { addToast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState(null);
    const [userHabits, setUserHabits] = useState({});
    const [loadingHabits, setLoadingHabits] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [notifTitle, setNotifTitle] = useState('');
    const [notifMessage, setNotifMessage] = useState('');
    const [sendingNotif, setSendingNotif] = useState(false);

    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    const fetchUsers = useCallback(async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const { data } = await adminApi.getAllUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            addToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    }, [isAdmin, addToast]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleExpand = async (uid) => {
        if (expandedUser === uid) { setExpandedUser(null); return; }
        setExpandedUser(uid);
        if (!userHabits[uid]) {
            setLoadingHabits(uid);
            try {
                const { data } = await adminApi.getUserHabits(uid);
                const safeHabits = Array.isArray(data) ? data : [];
                setUserHabits(prev => ({ ...prev, [uid]: safeHabits }));
            } catch {
                addToast('Failed to load habits for this user', 'error');
                setUserHabits(prev => ({ ...prev, [uid]: [] }));
            } finally {
                setLoadingHabits(null);
            }
        }
    };

    const handleDeleteUser = async (uid, displayName) => {
        if (uid === user.uid) { addToast('You cannot delete yourself', 'error'); return; }
        if (!confirm(`Delete user "${displayName}" and all their data? This cannot be undone.`)) return;
        setDeleting(uid);
        try {
            await adminApi.deleteUser(uid);
            addToast('User deleted successfully');
            await fetchUsers();
        } catch (e) {
            addToast('Delete failed: ' + e.message, 'error');
        } finally {
            setDeleting(null);
        }
    };

    const handleToggleUser = (uid) => {
        setSelectedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
    };

    const handleSelectAll = () => {
        if (selectedUsers.length === users.length) setSelectedUsers([]);
        else setSelectedUsers(users.map(u => u.firebaseId));
    };

    const handleSendBroadcast = async () => {
        if (selectedUsers.length === 0) return addToast('Select at least one user', 'error');
        if (!notifTitle.trim() || !notifMessage.trim()) return addToast('Title and message are required', 'error');
        
        setSendingNotif(true);
        try {
            const { data } = await adminApi.notifyUsers({ userIds: selectedUsers, title: notifTitle, message: notifMessage });
            addToast(data.message);
            setNotifTitle('');
            setNotifMessage('');
            setSelectedUsers([]);
        } catch (e) {
            addToast(e.response?.data?.message || 'Failed to send notifications', 'error');
        } finally {
            setSendingNotif(false);
        }
    };

    if (!isAdmin) return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="card" style={{ borderColor: 'var(--danger)' }}>
                <h2 style={{ color: 'var(--danger)' }}>🛡️ Access Denied</h2>
                <p style={{ marginTop: '12px', color: 'var(--text-dim)' }}>Only the system administrator can access this panel.</p>
                <button className="add-btn" style={{ marginTop: '20px' }} onClick={() => window.location.href = '/'}>Return Home</button>
            </div>
        </div>
    );

    if (loading) return <div className="loading-screen">Loading users...</div>;

    const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

    return (
        <div className="fade-in">
            <h1 className="page-title">🛡️ Admin Panel</h1>

            {/* Broadcast Card */}
            <div className="card" style={{ marginBottom: '24px', borderColor: 'var(--primary)' }}>
                <div className="card-header">
                    <span className="card-title">📢 Broadcast Notification</span>
                    <span className="badge badge-primary">{selectedUsers.length} selected</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                        className="manage-input"
                        placeholder="Notification Title (e.g., App Update)"
                        value={notifTitle}
                        onChange={e => setNotifTitle(e.target.value)}
                    />
                    <textarea
                        className="manage-input"
                        placeholder="Message body..."
                        value={notifMessage}
                        onChange={e => setNotifMessage(e.target.value)}
                        style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <button 
                        className="add-btn" 
                        onClick={handleSendBroadcast} 
                        disabled={sendingNotif || selectedUsers.length === 0}
                        style={{ opacity: (sendingNotif || selectedUsers.length === 0) ? 0.5 : 1 }}
                    >
                        {sendingNotif ? 'Sending...' : '🚀 Send Push Notification'}
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="card-title">Registered Users</span>
                        <span className="badge badge-primary">{users.length} users</span>
                    </div>
                    <button className="add-btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={handleSelectAll}>
                        {selectedUsers.length > 0 && selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '8px 0 16px' }}>
                    Click any user to view their monthly performance trend.
                </p>

                {/* Month/Year Selector for charts */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <select className="manage-input" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ padding: '6px 12px' }}>
                        {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select className="manage-input" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: '6px 12px' }}>
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {users.map(u => {
                        const isExpanded = expandedUser === u.firebaseId;
                        const isCurrentUser = u.firebaseId === user.uid;
                        const habits = userHabits[u.firebaseId];

                        return (
                            <div key={u._id} style={{
                                border: `1px solid ${isExpanded ? 'var(--primary)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius)',
                                overflow: 'hidden',
                                transition: 'border-color 0.2s'
                            }}>
                                {/* User Row */}
                                <div
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '16px 20px',
                                        cursor: 'pointer',
                                        background: isExpanded ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                                        transition: 'background 0.2s'
                                    }}
                                    onClick={() => handleExpand(u.firebaseId)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedUsers.includes(u.firebaseId)}
                                                onChange={() => handleToggleUser(u.firebaseId)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                            />
                                        </div>
                                        {/* Avatar */}
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, fontSize: '1rem', color: 'white', overflow: 'hidden'
                                        }}>
                                            {u.photoURL
                                                ? <img src={u.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : (u.display_name || u.email || 'U')[0].toUpperCase()
                                            }
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {u.display_name || 'No name set'}
                                                {isCurrentUser && <span style={{ fontSize: '0.7rem', color: 'var(--success)', background: 'var(--success-bg)', padding: '2px 8px', borderRadius: '20px' }}>You (Admin)</span>}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>{u.email}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                ID: {u.firebaseId?.slice(0, 12)}... · Joined {new Date(u.createdAt).toLocaleDateString('en-IN')}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                            {isExpanded ? '▲ Hide Chart' : '▼ View Chart'}
                                        </span>
                                        {!isCurrentUser && (
                                            <button
                                                className="delete-btn"
                                                onClick={e => { e.stopPropagation(); handleDeleteUser(u.firebaseId, u.display_name || u.email); }}
                                                disabled={deleting === u.firebaseId}
                                                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                                            >
                                                {deleting === u.firebaseId ? 'Deleting...' : 'Delete'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Chart Area */}
                                {isExpanded && (
                                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                                            📈 Daily Performance — {months[selectedMonth]} {selectedYear}
                                            {habits && <span style={{ color: 'var(--primary-light)', marginLeft: '8px' }}>({habits.length} habits)</span>}
                                        </div>
                                        {loadingHabits === u.firebaseId ? (
                                            <div style={{ color: 'var(--text-dim)', padding: '20px', textAlign: 'center' }}>Loading...</div>
                                        ) : (
                                            <UserPerformanceChart
                                                habits={habits}
                                                selectedMonth={selectedMonth}
                                                selectedYear={selectedYear}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {users.length === 0 && <p style={{ color: 'var(--text-dim)', padding: '20px 0' }}>No users found.</p>}
                </div>
            </div>
        </div>
    );
}
