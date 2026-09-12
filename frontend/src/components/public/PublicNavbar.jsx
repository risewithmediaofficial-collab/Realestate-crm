import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Building2, Home, MapPin, Calendar, CheckCircle2,
  Menu, X, Sparkles, PhoneCall, ShieldCheck
} from 'lucide-react';

export default function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Explore Projects', path: '/explore' },
    { label: 'Schedule Site Visit', path: '/site-visit-booking' },
    { label: 'Online Unit Booking', path: '/self-booking' },
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="pub-navbar">
      <div className="pub-nav-container">
        {/* Brand Logo */}
        <Link to="/" className="pub-brand" onClick={() => setMobileOpen(false)}>
          <div
            className="pub-brand-logo-box"
            style={{
              width: 54,
              height: 54,
              borderRadius: 12,
              border: '1.5px solid #d4e8cb',
              background: '#ffffff',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 3px 10px rgba(69, 133, 34, 0.12)'
            }}
          >
            <img
              src="/mrp-logo-trimmed.png"
              alt="MRP Real Estate"
              className="pub-brand-logo-img"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pub-brand-title" style={{ fontWeight: 800, fontSize: 17, color: 'var(--pub-primary)', letterSpacing: '-0.01em' }}>
                MRP Real Estate
              </span>
              <span className="pub-brand-tag">Verified</span>
            </div>
            <div className="pub-brand-sub" style={{ fontSize: 11, color: 'var(--pub-text-muted)', fontWeight: 500, letterSpacing: '0.01em' }}>
              Direct Buyer Portal &amp; Self-Booking
            </div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <ul className="pub-nav-links">
          {navLinks.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`pub-nav-link ${isActive(item.path) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Action Buttons */}
        <div className="pub-nav-actions">
          {/* Book Online Primary CTA (Desktop) */}
          <Link to="/explore" className="pub-btn-book">
            <Sparkles size={14} /> Book Online
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            className="pub-mobile-toggle"
            onClick={() => setMobileOpen(p => !p)}
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div style={{
          background: '#ffffff',
          borderBottom: '1.5px solid #dbead4',
          padding: '16px 20px 24px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.1)',
          animation: 'pubFadeIn 0.2s ease-out'
        }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {navLinks.map((item) => {
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 15,
                      fontWeight: active ? 800 : 600,
                      color: active ? 'var(--pub-accent)' : 'var(--pub-text)',
                      textDecoration: 'none',
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: active ? '#edf7e8' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <span>{item.label}</span>
                    {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pub-accent)' }} />}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid #edf2eb' }}>
            <Link
              to="/explore"
              className="pub-btn-book"
              onClick={() => setMobileOpen(false)}
              style={{ justifyContent: 'center', padding: '12px 18px', fontSize: 14 }}
            >
              <Sparkles size={15} /> Browse &amp; Book Units Online
            </Link>

            <a
              href="tel:+919811111111"
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 13.5,
                fontWeight: 700,
                color: 'var(--pub-primary)',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '11px 18px',
                borderRadius: 10,
                textDecoration: 'none'
              }}
            >
              <PhoneCall size={15} color="var(--pub-accent)" /> Call Sales: +91 98111 11111
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
