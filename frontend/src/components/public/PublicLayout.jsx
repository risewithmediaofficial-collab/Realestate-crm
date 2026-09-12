import React from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import { MessageSquare, PhoneCall } from 'lucide-react';
import '../../styles/publicPortal.css';

export default function PublicLayout({ children }) {
  return (
    <div className="pub-layout">
      {/* Top Banner Notice */}
      <div style={{
        background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)',
        color: '#ffffff',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '4px 8px',
        lineHeight: 1.4
      }}>
        <span>🎉 Special Festive Launch Offer: Instant ₹50,000 Token Hold Guarantee &amp; Zero Brokerage.</span>
        <a href="/explore" style={{ color: '#fef08a', textDecoration: 'underline', fontWeight: 700, whiteSpace: 'nowrap' }}>
          Browse Available Units →
        </a>
      </div>

      <PublicNavbar />

      <main className="pub-main">
        {children}
      </main>

      <PublicFooter />

      {/* Floating Instant Inquiry / WhatsApp Button */}
      <a
        href="https://wa.me/919811111111?text=Hi%20MRP%20Real%20Estate,%20I%20am%20interested%20in%20exploring%20available%20properties"
        target="_blank"
        rel="noopener noreferrer"
        title="Chat with Property Expert on WhatsApp"
        className="pub-layout-float-wa"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 899,
          background: '#25D366',
          color: '#ffffff',
          width: 50,
          height: 50,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(37, 211, 102, 0.45)',
          transition: 'transform 0.2s ease',
          textDecoration: 'none'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageSquare size={24} />
      </a>
    </div>
  );
}
