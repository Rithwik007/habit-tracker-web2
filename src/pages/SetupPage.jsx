import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { habitApi } from '../api';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_HABITS = [
    { name: "Wake up at 8:00 AM", icon: "⏰" },
    { name: "Gym", icon: "💪" },
    { name: "Oat Meal", icon: "🥣" },
    { name: "Apply Sunscreen", icon: "☀️" },
    { name: "DSA Practice", icon: "💻" },
    { name: "Web Development", icon: "🌐" },
    { name: "No Junk Food", icon: "🥦" },
    { name: "No Wasting Money", icon: "💰" },
    { name: "Less Screen Time", icon: "📱" },
    { name: "Call Parents", icon: "📞" },
    { name: "Bathing", icon: "🚿" },
    { name: "Eggs or Chicken", icon: "🍗" },
    { name: "College Work", icon: "📚" },
    { name: "Sleep at 11 PM", icon: "🌙" },
    { name: "8 Hours Sleep", icon: "💤" },
    { name: "Reading", icon: "📖" }
];

export default function SetupPage() {
    const { user, updateProfile } = useAuth();
    const { refreshHabits } = useData();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [selectedDefaults, setSelectedDefaults] = useState([]);
    const [customHabits, setCustomHabits] = useState([]);
    const [newCustom, setNewCustom] = useState('');
    const [loading, setLoading] = useState(false);

    const toggleDefault = (name) => {
        setSelectedDefaults(prev => 
            prev.includes(name) ? prev.filter(h => h !== name) : [...prev, name]
        );
    };

    const addCustom = () => {
        if (!newCustom.trim()) return;
        if (customHabits.includes(newCustom.trim())) {
            addToast('Habit already added', 'warning');
            return;
        }
        setCustomHabits([...customHabits, newCustom.trim()]);
        setNewCustom('');
    };

    const removeCustom = (name) => {
        setCustomHabits(customHabits.filter(h => h !== name));
    };

    const handleFinish = async () => {
        if (!displayName.trim()) return addToast('Please enter your name', 'error');
        setLoading(true);
        try {
            // 1. Update Profile & Mark Setup Done
            const { error } = await updateProfile(displayName.trim(), undefined, true);
            if (error) throw error;

            // 2. Create Selected Habits
            const habitsToCreate = [
                ...selectedDefaults,
                ...customHabits
            ];

            // Create them sequentially to avoid rate limiting or race conditions
            for (const hName of habitsToCreate) {
                await habitApi.create({ name: hName, userId: user.uid });
            }

            // 3. Refresh Data Context before navigating
            await refreshHabits();

            addToast('Welcome to Habit Mastery!');
            navigate('/', { replace: true });
        } catch (err) {
            console.error(err);
            addToast('Setup failed. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page" style={{ padding: '20px' }}>
            <motion.div 
                className="auth-card" 
                style={{ maxWidth: '600px', width: '100%', minHeight: '500px', display: 'flex', flexDirection: 'column' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                        {[1, 2, 3].map(s => (
                            <div key={s} style={{ 
                                width: '40px', height: '4px', borderRadius: '2px',
                                background: step >= s ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                transition: '0.3s'
                            }} />
                        ))}
                    </div>
                    <h1 className="auth-title">
                        {step === 1 && "What's your name?"}
                        {step === 2 && "Choose your habits"}
                        {step === 3 && "Final touches"}
                    </h1>
                    <p className="auth-subtitle">
                        {step === 1 && "Let's personalize your experience"}
                        {step === 2 && "Select the disciplines you want to start with"}
                        {step === 3 && "Add any custom habits you have in mind"}
                    </p>
                </div>

                <div style={{ flex: 1 }}>
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            >
                                <input
                                    className="manage-input"
                                    style={{ width: '100%', fontSize: '1.2rem', padding: '16px' }}
                                    placeholder="Enter your name..."
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && setStep(2)}
                                />
                                <button 
                                    className="add-btn" 
                                    style={{ width: '100%', marginTop: '24px', padding: '16px' }}
                                    onClick={() => setStep(2)}
                                    disabled={!displayName.trim()}
                                >Next Step →</button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            >
                                <div style={{ 
                                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                                    gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' 
                                }} className="custom-scrollbar">
                                    {DEFAULT_HABITS.map(h => (
                                        <div 
                                            key={h.name}
                                            onClick={() => toggleDefault(h.name)}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '12px',
                                                border: `2px solid ${selectedDefaults.includes(h.name) ? 'var(--primary)' : 'var(--border)'}`,
                                                background: selectedDefaults.includes(h.name) ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                                                cursor: 'pointer',
                                                transition: '0.2s',
                                                textAlign: 'center'
                                            }}
                                        >
                                            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{h.icon}</div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: selectedDefaults.includes(h.name) ? 'var(--text-main)' : 'var(--text-dim)' }}>{h.name}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                    <button className="add-btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setStep(1)}>Back</button>
                                    <button className="add-btn" style={{ flex: 2 }} onClick={() => setStep(3)}>Next Step →</button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            >
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                                    <input
                                        className="manage-input"
                                        style={{ flex: 1 }}
                                        placeholder="Add a custom habit..."
                                        value={newCustom}
                                        onChange={e => setNewCustom(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addCustom()}
                                    />
                                    <button className="add-btn" onClick={addCustom}>Add</button>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                                    {customHabits.map(h => (
                                        <div key={h} style={{ 
                                            background: 'rgba(99,102,241,0.1)', border: '1px solid var(--primary)', 
                                            padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}>
                                            {h}
                                            <span onClick={() => removeCustom(h)} style={{ cursor: 'pointer', opacity: 0.7 }}>×</span>
                                        </div>
                                    ))}
                                    {customHabits.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', textAlign: 'center', width: '100%' }}>No custom habits added yet.</p>}
                                </div>

                                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                    <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                                        Total habits to be created: <strong>{selectedDefaults.length + customHabits.length}</strong>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button className="add-btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setStep(2)}>Back</button>
                                        <button 
                                            className="add-btn" 
                                            style={{ flex: 2, background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)' }} 
                                            onClick={handleFinish}
                                            disabled={loading}
                                        >
                                            {loading ? '🚀 Setting up...' : '🔥 Start My Journey'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
