import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            addToast('Passwords do not match', 'error');
            return;
        }
        if (password.length < 6) {
            addToast('Password must be at least 6 characters', 'error');
            return;
        }
        setLoading(true);
        const { error } = await signUp(email, password);
        if (error) {
            addToast(error.message, 'error');
            setLoading(false);
        } else {
            addToast('Account created! Please check your email to confirm, then sign in.');
            navigate('/login');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Join Habit Mastery</h1>
                <p className="auth-subtitle">Create your account</p>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="manage-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="manage-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            required
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            className="manage-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat your password"
                            required
                            autoComplete="new-password"
                        />
                    </div>
                    <button type="submit" className="add-btn" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>
                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
                <p className="auth-footer" style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '8px' }}>
                    Maximum 10 users allowed. Contact admin if you need access.
                </p>
            </div>
        </div>
    );
}
