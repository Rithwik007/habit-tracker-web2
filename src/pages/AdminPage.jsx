import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function AdminPage() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) {
            addToast('Failed to load users', 'error');
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    }, [addToast]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleDeleteUser = async (targetUserId) => {
        if (targetUserId === user.id) {
            addToast('You cannot delete yourself', 'error');
            return;
        }
        if (!window.confirm('Delete this user and all their data? This cannot be undone.')) return;

        setDeleting(targetUserId);
        try {
            const { error: habitError } = await supabase
                .from('habits')
                .delete()
                .eq('user_id', targetUserId);
            if (habitError) throw habitError;

            const { error: logsError } = await supabase
                .from('daily_logs')
                .delete()
                .eq('user_id', targetUserId);
            if (logsError) throw logsError;

            const { error: notesError } = await supabase
                .from('daily_notes')
                .delete()
                .eq('user_id', targetUserId);
            if (notesError) throw notesError;

            const { error: moodError } = await supabase
                .from('mood_logs')
                .delete()
                .eq('user_id', targetUserId);
            if (moodError) throw moodError;

            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', targetUserId);
            if (profileError) throw profileError;

            const { error: authError } = await supabase.rpc('delete_auth_user', { target_user_id: targetUserId });
            if (authError) {
                addToast('User data deleted. Auth deletion failed — delete manually from Supabase.', 'error');
            } else {
                addToast('User deleted successfully');
            }

            await fetchUsers();
        } catch (e) {
            addToast('Delete failed: ' + e.message, 'error');
        } finally {
            setDeleting(null);
        }
    };

    if (loading) return <div className="loading-screen">Loading users...</div>;

    return (
        <div className="fade-in">
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <span className="card-title">Admin Panel</span>
                    <span className="badge badge-primary">{users.length} / 10 users</span>
                </div>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '8px' }}>
                    Manage registered users. Deleting a user removes all their habits, logs, notes, and moods.
                </p>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Registered Users</span>
                </div>
                {users.length === 0 ? (
                    <p style={{ color: 'var(--text-dim)', padding: '20px 0' }}>No users found.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        {users.map(u => (
                            <div key={u.id} className="kpi-card" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 20px'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                        {u.display_name || 'No name set'}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                        {u.id}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        Created: {new Date(u.created_at).toLocaleDateString('en-IN')}
                                    </div>
                                </div>
                                {u.id !== user.id && (
                                    <button
                                        className="add-btn"
                                        style={{
                                            background: 'var(--danger)',
                                            padding: '8px 16px',
                                            fontSize: '0.85rem'
                                        }}
                                        onClick={() => handleDeleteUser(u.id)}
                                        disabled={deleting === u.id}
                                    >
                                        {deleting === u.id ? 'Deleting...' : 'Delete User'}
                                    </button>
                                )}
                                {u.id === user.id && (
                                    <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                                        (You - Admin)
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
