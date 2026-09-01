import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, KeyRound, Sparkles, ArrowLeft, Terminal, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState('superadmin@crm.com');
  const [password, setPassword] = useState('SuperAdmin@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, loading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'super_admin') {
      const destination = location.state?.from?.pathname || '/superadmin';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (res.success) {
      const destination = location.state?.from?.pathname || '/superadmin';
      navigate(destination, { replace: true });
    } else {
      setError(res.message || 'Invalid Super Admin credentials');
    }
  };

  const handleQuickSuperAdmin = async () => {
    setEmail('superadmin@crm.com');
    setPassword('SuperAdmin@2026');
    setError('');
    const res = await login('superadmin@crm.com', 'SuperAdmin@2026');
    if (res.success) {
      const destination = location.state?.from?.pathname || '/superadmin';
      navigate(destination, { replace: true });
    } else {
      setError(res.message || 'Quick login failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      color: '#0f172a',
      boxSizing: 'border-box'
    }}>
      {/* Background Decorative Blur Spheres */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '20%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(59, 130, 246, 0.06) 60%, transparent 80%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1), 0 0 20px -5px rgba(245, 158, 11, 0.15)',
        borderRadius: '20px',
        padding: '36px 32px',
        position: 'relative',
        zIndex: 1,
        margin: 'auto',
        boxSizing: 'border-box'
      }}>
        {/* Top Header Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#b45309',
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            <Terminal size={13} /> Super Admin Root Console
          </div>

          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '12px',
              color: '#64748b',
              textDecoration: 'none',
              fontWeight: 600,
              transition: 'color 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.color = '#2563eb'}
            onMouseOut={e => e.currentTarget.style.color = '#64748b'}
          >
            <ArrowLeft size={13} /> Back to CRM Login
          </Link>
        </div>

        {/* Shield Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <ShieldCheck size={34} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Super Admin Authentication
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Master Module Access & Global System Permissions
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Master Admin Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  color: '#0f172a',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s'
                }}
                onFocus={e => { e.target.style.borderColor = '#f59e0b'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.15)'; }}
                onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                placeholder="superadmin@crm.com"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Root Security Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 40px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  color: '#0f172a',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s'
                }}
                onFocus={e => { e.target.style.borderColor = '#f59e0b'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.15)'; }}
                onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '46px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '14px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.05)'}
            onMouseOut={e => e.currentTarget.style.filter = 'brightness(1)'}
          >
            {loading ? 'Authenticating Root Access…' : (
              <>
                Unlock Super Admin Console <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Super Admin Quick Access */}
        <div style={{
          marginTop: '22px',
          padding: '14px',
          background: '#fffbeb',
          border: '1px dashed #fde68a',
          borderRadius: '12px'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#b45309',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Sparkles size={13} color="#d97706" /> 1-Click Super Admin Master Login
          </div>

          <button
            type="button"
            onClick={handleQuickSuperAdmin}
            style={{
              width: '100%',
              padding: '9px 14px',
              background: '#ffffff',
              border: '1px solid #fde68a',
              color: '#92400e',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#fef3c7'}
            onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
          >
            <KeyRound size={15} color="#d97706" />
            Sign in as Super Admin (Master Root)
          </button>
        </div>

        {/* System Footer Note */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
          🔒 Real Estate CRM Security Architecture • Root Permission Engine
        </div>
      </div>
    </div>
  );
}
