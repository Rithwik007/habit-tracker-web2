import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { habitApi } from '../api';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_HABITS = [
    { name: "Wake up at 8:00 AM", icon: "⏰", color: "#F59E0B" },
    { name: "Oat Meal", icon: "🥣", color: "#10B981" },
    { name: "Gym", icon: "🏋️", color: "#EF4444" },
    { name: "Dsa", icon: "💻", color: "#6366F1" },
    { name: "web development", icon: "🌍", color: "#3B82F6" },
    { name: "no wasting money", icon: "💰", color: "#10B981" },
    { name: "Apply Sunscreen", icon: "☀️", color: "#FBBF24" },
    { name: "No Junk Food", icon: "🍔", color: "#F43F5E" },
    { name: "less Screen time (5 hrs)", icon: "📱", color: "#8B5CF6" },
    { name: "Parents", icon: "👪", color: "#EC4899" },
    { name: "Bathing", icon: "🚿", color: "#06B6D4" },
    { name: "Bread Peanut Butter", icon: "🍞", color: "#D97706" },
    { name: "Eggs or chicken", icon: "🍗", color: "#B45309" },
    { name: "College Work", icon: "🎓", color: "#4F46E5" },
    { name: "sleep at 11 PM", icon: "🌙", color: "#1E293B" },
    { name: "8 hours sleep", icon: "💤", color: "#475569" }
];

export default function SetupPage() {
    const { user, profile, updateProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [step, setStep] = useState(profile?.display_name && profile.display_name !== 'User' ? 2 : 1);
    const [displayName, setDisplayName] = useState(profile?.display_name || user?.displayName || '');
    const [selectedHabits, setSelectedHabits] = useState([]);
    const [customHabits, setCustomHabits] = useState([]);
    const [customInput, setCustomInput] = useState('');
    const [loading, setLoading] = useState(false);

    const toggleDefault = (habit) => {
        if (selectedHabits.find(h => h.name === habit.name)) {
            setSelectedHabits(prev => prev.filter(h => h.name !== habit.name));
        } else {
            setSelectedHabits(prev => [...prev, habit]);
        }
    };

    const addCustom = () => {
        if (!customInput.trim()) return;
        if (customHabits.find(h => h.name.toLowerCase() === customInput.trim().toLowerCase())) {
            addToast('Habit already added', 'warning');
            return;
        }
        const newHabit = { name: customInput.trim(), icon: '⭐', color: '#6366F1' };
        setCustomHabits(prev => [...prev, newHabit]);
        setCustomInput('');
    };

    const removeCustom = (name) => {
        setCustomHabits(prev => prev.filter(h => h.name !== name));
    };

    const handleFinish = async () => {
        if (!displayName.trim()) {
            addToast('Please enter your name', 'error');
            setStep(1);
            return;
        }

        const allHabits = [...selectedHabits, ...customHabits];
        if (allHabits.length === 0) {
            addToast('Please select or add at least one habit to track', 'warning');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Habits first (to ensure they are there when the user lands on home)
            for (const h of allHabits) {
                await habitApi.create({
                    userId: user.uid,
                    name: h.name,
                    icon: h.icon,
                    color: h.color
                });
            }

            // 2. Update Profile & Mark Onboarding Complete
            const { error } = await updateProfile(displayName.trim(), undefined, true);
            if (error) throw error;

            addToast('Welcome to Habit Mastery! 🎉');
            navigate('/', { replace: true });
        } catch (err) {
            console.error(err);
            addToast(err.message || 'Setup failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ maxWidth: '540px', width: '95%' }}>
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ height: '4px', flex: 1, background: 'var(--primary)', borderRadius: '2px' }} />
                        <div style={{ height: '4px', flex: 1, background: step === 2 ? 'var(--primary)' : 'rgba(255,255,255,0.1)', borderRadius: '2px', transition: 'all 0.3s' }} />
                    </div>
                    <h1 className="auth-title">Welcome to Mastery!</h1>
                    <p className="auth-subtitle">
                        {step === 1 ? "Let's start with the basics" : "Choose your first disciplines"}
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div 
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="fade-in"
                        >
                            <div className="form-group">
                                <label>What should we call you?</label>
                                <input
                                    type="text"
                                    className="manage-input"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    placeholder="Your name"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && displayName.trim() && setStep(2)}
                                />
                            </div>
                            <button 
                                className="add-btn" 
                                style={{ width: '100%', marginTop: '8px' }}
                                disabled={!displayName.trim()}
                                onClick={() => setStep(2)}
                            >
                                Next Step →
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="fade-in"
                        >
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '12px', display: 'block' }}>
                                Select habits to start tracking (or add your own)
                            </label>
                            
                            <div style={{ 
                                maxHeight: '280px', 
                                overflowY: 'auto', 
                                marginBottom: '20px', 
                                padding: '12px',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {DEFAULT_HABITS.map(h => {
                                        const isSelected = selectedHabits.find(s => s.name === h.name);
                                        return (
                                            <button 
                                                key={h.name}
                                                type="button"
                                                onClick={() => toggleDefault(h)}
                                                style={{
                                                    padding: '8px 14px',
                                                    borderRadius: '20px',
                                                    background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                    color: isSelected ? 'white' : 'var(--text-dim)',
                                                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <span>{h.icon}</span> {h.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Add Custom Discipline</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        className="manage-input"
                                        value={customInput}
                                        onChange={e => setCustomInput(e.target.value)}
                                        placeholder="e.g. Morning Walk"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addCustom();
                                            }
                                        }}
                                    />
                                    <button type="button" className="add-btn" onClick={addCustom} style={{ padding: '0 15px' }}>+</button>
                                </div>
                            </div>

                            {customHabits.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                                    {customHabits.map(h => (
                                        <div 
                                            key={h.name}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                background: 'rgba(99,102,241,0.1)',
                                                border: '1px solid var(--primary)',
                                                fontSize: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                color: 'var(--primary-light)'
                                            }}
                                        >
                                            {h.name}
                                            <span 
                                                style={{ cursor: 'pointer', opacity: 0.6 }}
                                                onClick={() => removeCustom(h.name)}
                                            >✕</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button 
                                    type="button"
                                    className="delete-btn" 
                                    style={{ flex: 1, padding: '12px' }} 
                                    onClick={() => setStep(1)} 
                                    disabled={loading}
                                >
                                    Back
                                </button>
                                <button 
                                    type="button"
                                    className="add-btn" 
                                    style={{ flex: 2, padding: '12px' }} 
                                    onClick={handleFinish} 
                                    disabled={loading}
                                >
                                    {loading ? 'Finalizing...' : 'Start Tracking 🚀'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
