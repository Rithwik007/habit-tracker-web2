import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const { signUp } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            addToast('Passwords do not match', 'error');
            return;
        }

        const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            addToast('Password must be at least 8 characters long, contain one uppercase letter, and one number.', 'error');
            return;
        }

        setLoading(true);
        const { error } = await signUp(email, password);
        if (error) {
            if (error.code === 'auth/email-already-in-use') {
                addToast('Email already exists, please login or reset password.', 'error');
            } else {
                addToast(error.message, 'error');
            }
            setLoading(false);
        } else {
            addToast('Account created successfully!');
            setLoading(false);
            setVerificationSent(true);
        }
    };

    if (verificationSent) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <h1 className="auth-title">Verify Your Email</h1>
                    <p className="auth-subtitle" style={{ marginBottom: '24px' }}>
                        We've sent a confirmation link to <strong>{email}</strong>. 
                        Please click the link to verify your account.
                    </p>
                    <button 
                        className="add-btn" 
                        onClick={() => navigate('/login')} 
                        style={{ width: '100%', marginBottom: '16px' }}
                    >
                        I have verified my email
                    </button>
                    <p className="auth-footer" style={{ fontSize: '0.85rem' }}>
                        Didn't receive it? Check your spam folder.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Join Habit Mastery</h1>
                <p className="auth-subtitle">Create your account</p>
                <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
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
                            autoComplete="new-password"
                            name="new_email_field"
                            readOnly
                            onFocus={(e) => e.target.removeAttribute('readOnly')}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className="manage-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="1 Uppercase, 1 Number, Min 8 chars"
                                required
                                autoComplete="new-password"
                                name="new_password_field"
                                style={{ width: '100%', paddingRight: '40px' }}
                                readOnly
                                onFocus={(e) => e.target.removeAttribute('readOnly')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-dim)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                className="manage-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat your password"
                                required
                                autoComplete="new-password"
                                name="confirm_password_field"
                                style={{ width: '100%', paddingRight: '40px' }}
                                readOnly
                                onFocus={(e) => e.target.removeAttribute('readOnly')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-dim)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
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
