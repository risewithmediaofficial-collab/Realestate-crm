import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Phone, Mail, MapPin, ShieldCheck,
  Calendar, CheckCircle, ExternalLink
} from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="pub-footer">
      <div className="pub-footer-grid">
        {/* Brand & About */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 58,
              height: 58,
              borderRadius: 12,
              background: '#ffffff',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
              flexShrink: 0
            }}>
              <img
                src="/mrp-logo-trimmed.png"
                alt="MRP Real Estate"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#ffffff' }}>MRP Real Estate</span>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#94a3b8', margin: '0 0 16px', maxWidth: 360 }}>
            Premium residential, farmland, and commercial developments. Transparent pricing, RERA-approved master layouts, and seamless direct buyer self-service bookings with 0% brokerage.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#86efac', fontSize: 12, fontWeight: 600 }}>
            <ShieldCheck size={16} /> 100% RERA &amp; Title Deed Verified
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <div className="pub-footer-title">Browse Properties</div>
          <ul className="pub-footer-links">
            <li><Link to="/explore">All Active Projects</Link></li>
            <li><Link to="/explore?type=residential">Residential Apartments</Link></li>
            <li><Link to="/explore?type=farmland">Farmlands &amp; Agro Plots</Link></li>
            <li><Link to="/explore?type=industrial_warehouse">Industrial &amp; Warehouses</Link></li>
            <li><Link to="/explore?status=ready_to_move">Ready to Move</Link></li>
          </ul>
        </div>

        {/* Self-Service Portals */}
        <div>
          <div className="pub-footer-title">Buyer Services</div>
          <ul className="pub-footer-links">
            <li><Link to="/self-booking">Direct Online Booking</Link></li>
            <li><Link to="/site-visit-booking">Schedule Free VIP Site Visit</Link></li>
            <li><Link to="/explore">Cost Sheet &amp; EMI Breakdown</Link></li>
          </ul>
        </div>

        {/* Contact & Support */}
        <div>
          <div className="pub-footer-title">Sales Experience Center</div>
          <ul className="pub-footer-links" style={{ gap: 12 }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <MapPin size={16} color="var(--pub-accent)" style={{ flexShrink: 0, marginTop: 3 }} />
              <span>Rayakottai Byepass, Mathur Highway, Krishnagiri 635001</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={16} color="var(--pub-accent)" style={{ flexShrink: 0 }} />
              <a href="tel:+919811111111">+91 98111 11111 / +91 80000 00000</a>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={16} color="var(--pub-accent)" style={{ flexShrink: 0 }} />
              <a href="mailto:sales@mrprealty.com">sales@mrprealty.com</a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="pub-footer-bottom">
        <div>
          © {new Date().getFullYear()} MRP Real Estate Developments. All Rights Reserved.
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/explore">Privacy Policy</Link>
          <Link to="/explore">Terms of Booking</Link>
          <Link to="/explore">RERA Disclosures</Link>
        </div>
      </div>
    </footer>
  );
}
