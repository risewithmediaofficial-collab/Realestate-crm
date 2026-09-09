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
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              border: '1.5px solid #d4e8cb',
              background: '#ffffff',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 3px 12px rgba(69, 133, 34, 0.14)'
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
              <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--pub-primary)', letterSpacing: '-0.01em' }}>
                MRP Real Estate
              </span>
              <span className="pub-brand-tag">Verified</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--pub-text-muted)', fontWeight: 500, letterSpacing: '0.01em' }}>
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
          {/* Book Online Primary CTA */}
          <Link to="/explore" className="pub-btn-book">
            <Sparkles size={14} /> Book Online
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            className="pub-mobile-toggle"
            onClick={() => setMobileOpen(p => !p)}
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 24px 24px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
        }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {navLinks.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'block',
                    fontSize: 15,
                    fontWeight: 700,
                    color: isActive(item.path) ? 'var(--pub-accent)' : 'var(--pub-text)',
                    textDecoration: 'none',
                    padding: '6px 0'
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <Link
              to="/explore"
              className="pub-btn-book"
              onClick={() => setMobileOpen(false)}
              style={{ justifyContent: 'center' }}
            >
              <Sparkles size={15} /> Browse &amp; Book Units
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
