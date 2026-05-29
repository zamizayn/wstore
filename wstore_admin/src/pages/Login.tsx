import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, Sparkles, Layers, Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react';
import { API_ENDPOINTS } from '../apiConfig';
import logo from '../assets/logo.png';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    // Forgot Password States
    const [view, setView] = useState('login'); // 'login', 'forgot_username', 'verify_otp', 'reset_password'
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(API_ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminRole', data.role);
                localStorage.setItem('branchId', data.branchId || '');
                localStorage.setItem('branchName', data.branchName || 'Superadmin');
                localStorage.setItem('tenantName', data.tenantName || 'Friska');
                localStorage.setItem('tenantId', data.tenantId || '');
                if (data.tenantLogo) {
                    localStorage.setItem('tenantLogo', data.tenantLogo);
                } else {
                    localStorage.removeItem('tenantLogo');
                }
                navigate('/admin');
            } else {
                setError(data.error || 'Login failed');
            }
        } catch(err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch(API_ENDPOINTS.FORGOT_PASSWORD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                setMaskedEmail(data.email);
                setSuccess(data.message || 'OTP sent successfully');
                setTimeout(() => {
                    setView('verify_otp');
                    setSuccess('');
                }, 1500);
            } else {
                setError(data.error || 'Failed to request OTP');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(API_ENDPOINTS.VERIFY_OTP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();
            if (res.ok) {
                setView('reset_password');
            } else {
                setError(data.error || 'Verification failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(API_ENDPOINTS.RESET_PASSWORD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                try {
                    const loginRes = await fetch(API_ENDPOINTS.LOGIN, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: data.username, password: newPassword })
                    });
                    const loginData = await loginRes.json();
                    if (loginRes.ok && loginData.token) {
                        localStorage.setItem('adminToken', loginData.token);
                        localStorage.setItem('adminRole', loginData.role);
                        localStorage.setItem('branchId', loginData.branchId || '');
                        localStorage.setItem('branchName', loginData.branchName || 'Superadmin');
                        localStorage.setItem('tenantName', loginData.tenantName || 'Friska');
                        localStorage.setItem('tenantId', loginData.tenantId || '');
                        if (loginData.tenantLogo) {
                            localStorage.setItem('tenantLogo', loginData.tenantLogo);
                        } else {
                            localStorage.removeItem('tenantLogo');
                        }
                        navigate('/admin');
                    } else {
                        setView('login');
                        setPassword('');
                        setError('Password reset successfully. Please log in.');
                    }
                } catch (loginErr) {
                    setView('login');
                    setError('Password reset successfully. Please log in.');
                }
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-split-body">
            <div className="login-left-panel">
                <div className="hero-gradient-overlay"></div>
                <div className="left-content">
                    <img src={logo} alt="Friska Logo" style={{ width: '120px', height: '120px', marginBottom: '32px', objectFit: 'contain' }} />
                    <h1>Elevate Your<br/>Commerce Workspace</h1>
                    <p>Experience a next-generation dashboard built for speed, robust analytics, and seamless content control across your entire catalog.</p>
                    <div className="features-list">
                        <div className="feature-item"><ShieldCheck size={20} /> Enterprise-grade token security</div>
                        <div className="feature-item"><Sparkles size={20} /> Beautiful, responsive interface</div>
                        <div className="feature-item"><Layers size={20} /> Seamless category & product handling</div>
                    </div>
                </div>
            </div>

            <div className="login-right-panel">
                <div className="auth-card">
                    {view === 'login' && (
                        <>
                            <div className="login-header text-left">
                                <h2>Welcome back.</h2>
                                <p>Sign in to your admin workspace</p>
                            </div>

                            <form onSubmit={handleLogin} className="auth-form">
                                <div className="input-group has-icon auth-input">
                                    <label>Username</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={18} />
                                        <input type="text" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="input-group has-icon auth-input">
                                    <label>Password</label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <Lock className="input-icon" size={18} />
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="Enter your password" 
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)} 
                                            required 
                                            style={{ paddingRight: '48px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 10
                                            }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setView('forgot_username'); setError(''); setSuccess(''); }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#4f46e5',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            padding: 0
                                        }}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                {error && <div className="error-msg">{error}</div>}
                                
                                <button type="submit" className="btn-primary auth-btn" disabled={loading}>
                                    {loading ? 'Authenticating...' : 'Sign In To Dashboard'}
                                    {!loading && <ArrowRight className="btn-icon" size={18} />}
                                </button>
                            </form>
                        </>
                    )}

                    {view === 'forgot_username' && (
                        <form onSubmit={handleRequestOtp} className="auth-form">
                            <div className="login-header text-left" style={{ marginBottom: '24px' }}>
                                <h2>Recover Password</h2>
                                <p>Enter your registered email address to receive a verification code.</p>
                            </div>
                            
                            <div className="input-group has-icon auth-input">
                                <label>Email Address</label>
                                <div className="input-wrapper">
                                    <Mail className="input-icon" size={18} />
                                    <input 
                                        type="email" 
                                        placeholder="Enter your email" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>

                            {error && <div className="error-msg">{error}</div>}
                            {success && <div className="success-msg" style={{ color: '#10b981', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

                            <button type="submit" className="btn-primary auth-btn" disabled={loading}>
                                {loading ? 'Sending OTP...' : 'Send Verification Code'}
                                {!loading && <ArrowRight className="btn-icon" size={18} />}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <ArrowLeft size={16} /> Back to Sign In
                                </button>
                            </div>
                        </form>
                    )}

                    {view === 'verify_otp' && (
                        <form onSubmit={handleVerifyOtp} className="auth-form">
                            <div className="login-header text-left" style={{ marginBottom: '24px' }}>
                                <h2>Enter Code</h2>
                                <p>We sent a 6-digit verification code to <strong>{maskedEmail}</strong>.</p>
                            </div>
                            
                            <div className="input-group has-icon auth-input">
                                <label>Verification Code (OTP)</label>
                                <div className="input-wrapper">
                                    <Lock className="input-icon" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Enter 6-digit OTP" 
                                        value={otp} 
                                        onChange={e => setOtp(e.target.value)} 
                                        required 
                                        maxLength={6}
                                        style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                                    />
                                </div>
                            </div>

                            {error && <div className="error-msg">{error}</div>}

                            <button type="submit" className="btn-primary auth-btn" disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify Code'}
                                {!loading && <ArrowRight className="btn-icon" size={18} />}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={() => { setView('forgot_username'); setError(''); setSuccess(''); }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <ArrowLeft size={16} /> Back
                                </button>
                            </div>
                        </form>
                    )}

                    {view === 'reset_password' && (
                        <form onSubmit={handleResetPassword} className="auth-form">
                            <div className="login-header text-left" style={{ marginBottom: '24px' }}>
                                <h2>New Password</h2>
                                <p>Set a secure new password for your account.</p>
                            </div>
                            
                            <div className="input-group has-icon auth-input">
                                <label>New Password</label>
                                <div className="input-wrapper" style={{ position: 'relative' }}>
                                    <Lock className="input-icon" size={18} />
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="Enter new password" 
                                        value={newPassword} 
                                        onChange={e => setNewPassword(e.target.value)} 
                                        required 
                                        style={{ paddingRight: '48px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 10
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="input-group has-icon auth-input">
                                <label>Confirm New Password</label>
                                <div className="input-wrapper" style={{ position: 'relative' }}>
                                    <Lock className="input-icon" size={18} />
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="Confirm new password" 
                                        value={confirmPassword} 
                                        onChange={e => setConfirmPassword(e.target.value)} 
                                        required 
                                        style={{ paddingRight: '48px' }}
                                    />
                                </div>
                            </div>

                            {error && <div className="error-msg">{error}</div>}

                            <button type="submit" className="btn-primary auth-btn" disabled={loading}>
                                {loading ? 'Resetting Password...' : 'Reset & Sign In'}
                                {!loading && <ArrowRight className="btn-icon" size={18} />}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <ArrowLeft size={16} /> Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
