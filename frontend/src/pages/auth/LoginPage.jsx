import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Building2, Lock, User, Mail, Phone, MapPin, Briefcase, ArrowRight, AlertCircle, CheckCircle2, Clock, ShieldCheck, HelpCircle, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  
  // Login Form States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register Form States
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    organization: '',
    city: '',
    role: 'admin',
    password: '',
    confirmPassword: ''
  });
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Pending approval state after successful registration submission
  const [pendingApprovalSuccess, setPendingApprovalSuccess] = useState(false);
  const [registeredOrg, setRegisteredOrg] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { login, register, loading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'super_admin') {
        const dest = location.state?.from?.pathname || '/superadmin';
        navigate(dest, { replace: true });
      } else {
        const dest = location.state?.from?.pathname || '/';
        navigate(dest, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setError('Please enter your username or email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    const res = await login(identifier.trim(), password);
    if (res.success) {
      if (res.user?.role === 'super_admin') {
        navigate('/superadmin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } else {
      if (res.pendingApproval) {
        setError('⏳ Account Approval Pending: Your registration request for this workspace is currently awaiting approval in the Super Admin Console. You will be able to log in once approved.');
      } else if (res.rejected) {
        setError(res.message || 'Your account registration was rejected by Super Admin. Please contact administrator.');
      } else {
        setError(res.message || 'Invalid username or password');
      }
    }
  };

  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regForm.name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!regForm.email.trim()) {
      setError('Please enter your work email address');
      return;
    }
    if (!regForm.organization.trim()) {
      setError('Please enter your organization or agency name');
      return;
    }
    if (!regForm.password || regForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (regForm.password !== regForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const orgName = regForm.organization.trim() || 'RealtyHub Organization';
    const userEmail = regForm.email.trim();

    const res = await register({
      name: regForm.name.trim(),
      email: userEmail,
      username: regForm.username.trim() || userEmail.split('@')[0],
      phone: regForm.phone.trim(),
      organization: orgName,
      city: regForm.city.trim(),
      role: regForm.role,
      password: regForm.password
    });

    if (res.success) {
      if (res.pendingApproval) {
        setRegisteredOrg(orgName);
        setRegisteredEmail(userEmail);
        setPendingApprovalSuccess(true);
        setIdentifier(userEmail);
        setRegForm({
          name: '',
          email: '',
          username: '',
          phone: '',
          organization: '',
          city: '',
          role: 'admin',
          password: '',
          confirmPassword: ''
        });
      } else {
        setSuccessMsg('RealtyHub account created successfully! Redirecting...');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
      }
    } else {
      setError(res.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="auth-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#0b132b', padding: '24px 16px' }}>
      {/* Decorative floating background elements */}
      <div style={{
        position: 'absolute', top: '10%', left: '8%',
        width: 100, height: 100,
        background: 'rgba(37,99,235,0.12)',
        borderRadius: '24px',
        transform: 'rotate(20deg)',
        animation: 'float 6s ease-in-out infinite',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '12%', right: '8%',
        width: 80, height: 80,
        background: 'rgba(249,115,22,0.12)',
        borderRadius: '20px',
        transform: 'rotate(-15deg)',
        animation: 'float 8s ease-in-out infinite 1s',
        pointerEvents: 'none'
      }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(20deg); }
          50% { transform: translateY(-20px) rotate(20deg); }
        }
      `}</style>

      <div className="auth-card" style={{ maxWidth: mode === 'register' ? 540 : 440, width: '100%', padding: '32px 30px', background: '#ffffff', borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Logo */}
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="auth-logo-icon" style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div className="auth-logo-text" style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Rise With RealtyHub</div>
            <div className="auth-logo-sub" style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Real Estate Operating System</div>
          </div>
        </div>

        {/* Tab switcher: Login / Register */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          borderRadius: 10,
          padding: 4,
          marginBottom: 24,
          gap: 4
        }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: mode === 'login' ? 700 : 500,
              background: mode === 'login' ? '#ffffff' : 'transparent',
              color: mode === 'login' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: mode === 'register' ? 700 : 500,
              background: mode === 'register' ? '#ffffff' : 'transparent',
              color: mode === 'register' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Register Your RealtyHub
          </button>
        </div>

        {/* Pending Approval Success Notice */}
        {pendingApprovalSuccess ? (
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: 14,
            padding: '24px 20px',
            textAlign: 'center',
            marginBottom: 20
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#fef3c7', border: '2px solid #fde68a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', color: '#d97706'
            }}>
              <Clock size={28} />
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Registration Submitted!
            </h2>
            <div style={{
              display: 'inline-block',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              fontSize: 12,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 20,
              marginBottom: 12
            }}>
              🏢 {registeredOrg}
            </div>

            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>
              Your workspace registration for <strong>{registeredOrg}</strong> is now pending <strong>Super Admin</strong> approval. Once the Super Admin reviews and approves your account, you will be able to log in with your email (<strong>{registeredEmail}</strong>) and password.
            </p>

            <div style={{
              background: '#fffbeb',
              border: '1px dashed #fde68a',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12,
              color: '#92400e',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}>
              <ShieldCheck size={16} color="#d97706" /> Super Admin approval is required for all new workspaces.
            </div>

            <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setPendingApprovalSuccess(false);
                  setMode('login');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{
                  width: '100%',
                  height: 42,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Go to Sign In <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingApprovalSuccess(false);
                  setMode('register');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px'
                }}
              >
                Register another workspace
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <h1 className="auth-title" style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                {mode === 'login' ? 'Welcome back' : 'Register Your RealtyHub'}
              </h1>
              <p className="auth-subtitle" style={{ fontSize: 13, color: '#64748b' }}>
                {mode === 'login' ? 'Enter your credentials to access your CRM workspace' : 'Create an organization workspace to manage leads, inventory & bookings (Requires Super Admin approval)'}
              </p>
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: error.includes('Pending') ? '#fffbeb' : '#fef2f2',
                color: error.includes('Pending') ? '#92400e' : '#991b1b',
                padding: '12px 14px', borderRadius: 8,
                fontSize: '13px', marginBottom: 18,
                border: error.includes('Pending') ? '1px solid #fde68a' : '1px solid #fecaca',
                lineHeight: 1.45
              }}>
                {error.includes('Pending') ? <Clock size={18} style={{ flexShrink: 0, marginTop: 2, color: '#d97706' }} /> : <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
                <div>{error}</div>
              </div>
            )}

            {successMsg && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#f0fdf4', color: '#166534',
                padding: '10px 14px', borderRadius: 8,
                fontSize: '13px', marginBottom: 18,
                border: '1px solid #bbf7d0'
              }}>
                <CheckCircle2 size={16} />
                {successMsg}
              </div>
            )}

            {/* ─── Mode 1: Clean Username & Password Login ──────────────── */}
            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Username or Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  id="identifier"
                  type="text"
                  className="form-input"
                  style={{ width: '100%', height: 42, paddingLeft: 38, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Username or email"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ width: '100%', height: 42, paddingLeft: 38, paddingRight: 40, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#2563eb' }}
                />
                <span>Remember me</span>
              </label>
              <a href="#" onClick={(e) => { e.preventDefault(); alert('Password reset instructions will be sent to your registered email address.'); }} style={{ fontSize: 13, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                Forgot password?
              </a>
            </div>

            <button
              id="login-btn"
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={loading}
              style={{
                width: '100%',
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 8,
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In to RealtyHub <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
              Don't have a workspace yet?{' '}
              <span
                onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                style={{ color: '#2563eb', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Register Your RealtyHub
              </span>
            </div>
          </form>
        ) : (
          /* ─── Mode 2: Register Your RealtyHub Workspace ────────── */
          <form onSubmit={handleRegisterSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', height: 38, paddingLeft: 32, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    value={regForm.name}
                    onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Vikram Rao"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Work Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ width: '100%', height: 38, paddingLeft: 32, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    value={regForm.email}
                    onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Organization / Agency Name
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', height: 38, paddingLeft: 32, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    value={regForm.organization}
                    onChange={e => setRegForm(p => ({ ...p, organization: e.target.value }))}
                    placeholder="e.g. Skyline Realty"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="tel"
                    className="form-input"
                    style={{ width: '100%', height: 38, paddingLeft: 32, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    value={regForm.phone}
                    onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Business / Role Type
                </label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <select
                    className="form-select"
                    style={{ width: '100%', height: 38, paddingLeft: 32, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    value={regForm.role}
                    onChange={e => setRegForm(p => ({ ...p, role: e.target.value }))}
                  >
                    <option value="admin">Developer / Builder Admin</option>
                    <option value="channel_partner">Channel Partner / Brokerage</option>
                    <option value="sales_head">Sales Director / Agency Head</option>
                    <option value="sales_manager">Sales & Closing Manager</option>
                    <option value="telecaller">Telecaller & Pre-Sales Rep</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  City / Location
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', height: 38, paddingLeft: 32, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    value={regForm.city}
                    onChange={e => setRegForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="e.g. Bangalore, India"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Create Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ width: '100%', height: 38, paddingLeft: 32, paddingRight: 32, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    value={regForm.password}
                    onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(p => !p)}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Confirm Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ width: '100%', height: 38, paddingLeft: 32, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    value={regForm.confirmPassword}
                    onChange={e => setRegForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Repeat password"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              id="register-btn"
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={loading}
              style={{
                width: '100%',
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 8,
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Creating RealtyHub Workspace…
                </>
              ) : (
                <>
                  Create RealtyHub Account <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
              Already registered with RealtyHub?{' '}
              <span
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                style={{ color: '#2563eb', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign In to Workspace
              </span>
            </div>
          </form>
        )}
        </>
        )}
      </div>
    </div>
  );
}
