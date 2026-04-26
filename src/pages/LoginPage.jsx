import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { signIn, signInWithGoogle, resetPassword } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await signIn(email, password);
        if (error) {
            addToast(error.message, 'error');
            setLoading(false);
        } else {
            addToast('Welcome back!');
            navigate(from, { replace: true });
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        const { error, isNewUser } = await signInWithGoogle();
        if (error) {
            addToast(error.message, 'error');
            setLoading(false);
        } else {
            addToast('Welcome!');
            if (isNewUser) {
                navigate('/setup', { replace: true });
            } else {
                navigate(from, { replace: true });
            }
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            addToast('Please enter your email address first', 'error');
            return;
        }
        setLoading(true);
        const { error } = await resetPassword(email);
        if (error) {
            addToast(error.message, 'error');
        } else {
            addToast('Password reset link sent to your email!');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Habit Mastery</h1>
                <p className="auth-subtitle">Sign in to your account</p>
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
                            name="login_email_field"
                            readOnly
                            onFocus={(e) => e.target.removeAttribute('readOnly')}
                        />
                    </div>
                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                            <button 
                                type="button" 
                                onClick={handleForgotPassword}
                                style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                            >
                                Forgot?
                            </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className="manage-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Your password"
                                required
                                autoComplete="new-password"
                                name="login_password_field"
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
                    <button type="submit" className="add-btn" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                <button 
                    onClick={handleGoogleSignIn} 
                    className="add-btn" 
                    style={{ 
                        width: '100%', 
                        background: 'white', 
                        color: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18" alt="G" />
                    Sign in with Google
                </button>

                <p className="auth-footer" style={{ marginTop: '24px' }}>
                    Don't have an account? <Link to="/register">Create one</Link>
                </p>
            </div>
        </div>
    );
}
