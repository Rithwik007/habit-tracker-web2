import { useState, useEffect, useCallback } from 'react';
import { noteApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatLocalDate } from '../hooks/useMidnightRefresh';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotesPage() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [notes, setNotes] = useState([]);
    const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load all notes list
    const fetchNotes = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await noteApi.getAll(user.uid);
            setNotes(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Load content for the selected date
    useEffect(() => {
        async function loadNote() {
            if (!user) return;
            try {
                const { data } = await noteApi.getByDate(user.uid, selectedDate);
                setContent(data?.content || '');
            } catch (e) {
                setContent('');
            }
        }
        loadNote();
    }, [selectedDate, user]);

    useEffect(() => { fetchNotes(); }, [fetchNotes]);

    const handleSave = async () => {
        if (!content.trim()) return;
        if (!user?.uid) { addToast('Not logged in', 'error'); return; }
        setSaving(true);
        try {
            const res = await noteApi.save(user.uid, selectedDate, content);
            console.log('Note saved response:', res);
            addToast('Note saved!');
            fetchNotes();
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || 'Unknown error';
            console.error('Note save failed:', msg, e);
            addToast(`Save failed: ${msg}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (date) => {
        if (!confirm('Delete this note?')) return;
        try {
            await noteApi.delete(user.uid, date);
            addToast('Note deleted');
            if (date === selectedDate) setContent('');
            fetchNotes();
        } catch (e) {
            addToast('Error deleting note', 'error');
        }
    };

    const formatDisplayDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div className="fade-in">
            <h1 className="page-title">📝 Daily Notes</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
                {/* Editor */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Write a Note</span>
                        <input
                            type="date"
                            className="manage-input"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            style={{ padding: '6px 12px', width: 'auto' }}
                        />
                    </div>

                    <div style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-dim)',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        📅 {formatDisplayDate(selectedDate)}
                    </div>

                    <textarea
                        className="daily-note-area"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Reflect on your day... What did you accomplish? What could be better? Any thoughts or goals?"
                        style={{ minHeight: '280px' }}
                    />

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <button
                            className="add-btn"
                            onClick={handleSave}
                            disabled={saving || !content.trim()}
                            style={{ flex: 1 }}
                        >
                            {saving ? '💾 Saving...' : '💾 Save Note'}
                        </button>
                        {content && (
                            <button
                                className="delete-btn"
                                onClick={() => handleDelete(selectedDate)}
                                style={{ padding: '10px 16px' }}
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </div>

                {/* Notes History */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Past Notes ({notes.length})</span>
                    </div>

                    {loading ? (
                        <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>Loading...</div>
                    ) : notes.length === 0 ? (
                        <div className="empty-state" style={{ padding: '24px 0' }}>No notes yet. Write your first one!</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                            <AnimatePresence>
                                {notes.map(note => (
                                    <motion.div
                                        key={note._id}
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        onClick={() => setSelectedDate(note.date)}
                                        style={{
                                            padding: '12px 14px',
                                            background: selectedDate === note.date ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${selectedDate === note.date ? 'var(--primary)' : 'var(--border)'}`,
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-light)', marginBottom: '4px' }}>
                                            {formatDisplayDate(note.date)}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {note.content}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
