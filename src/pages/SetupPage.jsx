import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SetupPage() {
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const { updateProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!displayName.trim()) {
            addToast('Please enter your name', 'error');
            return;
        }
        setLoading(true);
        const { error } = await updateProfile(displayName.trim());
        if (error) {
            addToast(error.message, 'error');
            setLoading(false);
        } else {
            addToast('Welcome to Habit Mastery!');
            navigate('/', { replace: true });
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Welcome!</h1>
                <p className="auth-subtitle">Set up your profile to get started</p>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="displayName">What should we call you?</label>
                        <input
                            id="displayName"
                            type="text"
                            className="manage-input"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your name"
                            required
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="add-btn" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Setting up...' : 'Start Tracking'}
                    </button>
                </form>
            </div>
        </div>
    );
}
