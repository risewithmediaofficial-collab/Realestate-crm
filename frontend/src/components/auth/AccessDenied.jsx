import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react';
import { USER_ROLES } from '../../utils/constants';

export default function AccessDenied({ userRole, path }) {
  const navigate = useNavigate();
  const roleName = USER_ROLES[userRole]?.label || userRole?.replace(/_/g, ' ') || 'User';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 160px)',
      padding: 24,
    }}>
      <div className="card" style={{
        maxWidth: 520,
        textAlign: 'center',
        padding: '40px 32px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
        border: '1px solid var(--card-border)',
        borderRadius: 16,
        background: '#ffffff',
      }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #fee2e2, #fef2f2)',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 16px rgba(220,38,38,0.12)',
        }}>
          <ShieldAlert size={36} />
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#f1f5f9',
          color: '#475569',
          padding: '4px 12px',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 12,
        }}>
          <Lock size={12} /> Access Restricted
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
          Module Not Authorized
        </h2>

        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
          Your role (<strong style={{ color: 'var(--primary)' }}>{roleName}</strong>) does not have access permissions for this section (<code style={{ background: '#f8fafc', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{path}</code>).
        </p>

        <div style={{
          background: '#f8fafc',
          border: '1px solid var(--card-border)',
          borderRadius: 10,
          padding: '14px 16px',
          fontSize: 13,
          color: '#475569',
          marginBottom: 28,
          textAlign: 'left',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>Need access to this module?</div>
          <div>Contact your <strong>Workspace Administrator</strong> to update your access permissions in <em>Users & Org</em>.</div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            style={{ gap: 6, padding: '10px 20px' }}
          >
            <ArrowLeft size={16} /> Go Back
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/')}
            style={{ gap: 6, padding: '10px 20px' }}
          >
            <Home size={16} /> Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
