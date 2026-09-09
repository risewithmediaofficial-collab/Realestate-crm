import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Building2, MapPin, Calendar, CheckCircle2, ShieldCheck,
  Phone, Mail, ArrowLeft, Download, Sparkles, Filter,
  Share2, Heart, ExternalLink, ChevronRight, Layers, Home
} from 'lucide-react';
import api from '../../services/api';

export default function PublicProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('units'); // 'units' | 'overview' | 'amenities' | 'location'

  // Unit filter state
  const [bhkFilter, setBhkFilter] = useState('');
  const [towerFilter, setTowerFilter] = useState('');

  // Site Visit Modal
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState({
    name: '',
    phone: '',
    email: '',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '11:00 AM',
    notes: ''
  });
  const [visitSuccess, setVisitSuccess] = useState(false);
  const [visitSubmitting, setVisitSubmitting] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
    fetchUnits();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/public/projects/${id}`);
      if (res.data?.project) {
        setProject(res.data.project);
      }
    } catch (err) {
      console.warn('Failed to fetch project:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await api.get(`/public/projects/${id}/units`);
      if (res.data?.units) {
        setUnits(res.data.units);
      }
    } catch (err) {
      console.warn('Failed to fetch units:', err);
    }
  };

  const handleScheduleVisit = async (e) => {
    e.preventDefault();
    if (!visitForm.name || !visitForm.phone) return;
    try {
      setVisitSubmitting(true);
      await api.post('/public/site-visits', {
        name: visitForm.name,
        phone: visitForm.phone,
        email: visitForm.email,
        projectId: id,
        scheduledDate: visitForm.date,
        scheduledTime: visitForm.time,
        notes: visitForm.notes
      });
      setVisitSuccess(true);
    } catch (err) {
      alert(err.message || 'Failed to schedule site visit');
    } finally {
      setVisitSubmitting(false);
    }
  };

  const filteredUnits = units.filter(u => {
    if (bhkFilter && u.bedrooms !== Number(bhkFilter)) return false;
    if (towerFilter && u.tower !== towerFilter) return false;
    return true;
  });

  const towersList = Array.from(new Set(units.map(u => u.tower).filter(Boolean)));

  const formatCurrency = (val) => {
    if (!val) return 'Price on Request';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakhs`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--pub-text-muted)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Loading project master details...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2 style={{ fontSize: 24 }}>Project Not Found</h2>
        <p style={{ color: '#64748b' }}>The requested development could not be located.</p>
        <Link to="/explore" className="pub-btn-book" style={{ display: 'inline-flex', marginTop: 16 }}>
          ← Back to All Projects
        </Link>
      </div>
    );
  }

  const defaultImg = project.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 100px' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
        <ChevronRight size={13} />
        <Link to="/explore" style={{ color: '#64748b', textDecoration: 'none' }}>Projects</Link>
        <ChevronRight size={13} />
        <span style={{ color: 'var(--pub-primary)', fontWeight: 700 }}>{project.name}</span>
      </div>

      {/* Hero Header Area */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        marginBottom: 32
      }}>
        {/* Main Cover Image */}
        <div style={{ position: 'relative', height: 380, background: '#1e293b' }}>
          <img
            src={defaultImg}
            alt={project.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'; }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.2) 60%, transparent 100%)'
          }} />

          {/* Overlaid Badges */}
          <div style={{ position: 'absolute', top: 20, left: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: '#10b981', color: '#ffffff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              {project.status?.replace(/_/g, ' ')?.toUpperCase() || 'LAUNCHED'}
            </span>
            {project.reraNumber && (
              <span style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', color: '#93c5fd', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                🛡️ RERA: {project.reraNumber}
              </span>
            )}
          </div>

          {/* Overlaid Bottom Title & Highlights */}
          <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 34, fontWeight: 800, color: '#ffffff', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                {project.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1', fontSize: 14 }}>
                <MapPin size={16} color="#60a5fa" />
                <span>{project.address ? `${project.address}, ` : ''}{project.city}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => { setShowVisitModal(true); setVisitSuccess(false); }}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: 'var(--pub-primary)',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Calendar size={15} color="var(--pub-accent)" /> Book Site Visit
              </button>

              <a
                href="#available-units"
                className="pub-btn-book"
                style={{ padding: '10px 20px', fontSize: 13 }}
              >
                <Sparkles size={15} /> Select &amp; Book Unit
              </a>
            </div>
          </div>
        </div>

        {/* Quick Spec Metrics Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          padding: '20px 24px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          gap: 16
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Property Category</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2, textTransform: 'capitalize' }}>
              {project.type?.replace(/_/g, ' ') || 'Residential'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Project Extent</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
              {project.totalArea ? `${project.totalArea} Acres` : 'Master Layout'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Available Units</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#059669', marginTop: 2 }}>
              {units.length} Units Ready to Book
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Price Range</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--pub-accent)', marginTop: 2 }}>
              {formatCurrency(project.priceRange?.min || (units[0]?.pricing?.basePrice))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: 10,
        borderBottom: '2px solid #e2e8f0',
        marginBottom: 28,
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('units')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'units' ? '3px solid var(--pub-accent)' : '3px solid transparent',
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'units' ? 'var(--pub-accent)' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Sparkles size={16} /> Available Units ({units.length})
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '3px solid var(--pub-accent)' : '3px solid transparent',
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'overview' ? 'var(--pub-accent)' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Building2 size={16} /> Project Overview
        </button>

        <button
          onClick={() => setActiveTab('amenities')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'amenities' ? '3px solid var(--pub-accent)' : '3px solid transparent',
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'amenities' ? 'var(--pub-accent)' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ShieldCheck size={16} /> Amenities &amp; Approvals
        </button>
      </div>

      {/* ── TAB 1: LIVE AVAILABLE UNITS MATRIX ── */}
      {activeTab === 'units' && (
        <div id="available-units">
          {/* Unit Filter Strip */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            background: '#ffffff',
            padding: '14px 20px',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
              <Filter size={15} color="var(--pub-accent)" />
              <span>Filter Available Inventory ({filteredUnits.length} matches):</span>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select
                value={bhkFilter}
                onChange={e => setBhkFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 12.5,
                  fontWeight: 600
                }}
              >
                <option value="">All BHK / Types</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4+ BHK</option>
              </select>

              {towersList.length > 1 && (
                <select
                  value={towerFilter}
                  onChange={e => setTowerFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: 12.5,
                    fontWeight: 600
                  }}
                >
                  <option value="">All Towers / Blocks</option>
                  {towersList.map(t => (
                    <option key={t} value={t}>Tower {t}</option>
                  ))}
                </select>
              )}

              {(bhkFilter || towerFilter) && (
                <button
                  onClick={() => { setBhkFilter(''); setTowerFilter(''); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {filteredUnits.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1.5px dashed #cbd5e1',
              borderRadius: 16,
              padding: '48px 24px',
              textAlign: 'center'
            }}>
              <Building2 size={36} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>No units available matching your filter</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Try clearing the BHK or tower filters above to view other units.</div>
            </div>
          ) : (
            <div className="pub-unit-grid">
              {filteredUnits.map((unit) => {
                const price = unit.pricing?.totalPrice || unit.pricing?.basePrice || 0;
                const carpet = unit.area?.carpetArea || unit.area?.sqft || unit.area?.extent;

                return (
                  <div key={unit._id} className="pub-unit-card">
                    <div className="pub-unit-header">
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--pub-primary)' }}>
                          Unit {unit.unitNumber}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Tower {unit.tower || 'A'} · Floor {unit.floor || 1}
                        </div>
                      </div>

                      <span className="pub-unit-badge-avail">
                        ✓ Available
                      </span>
                    </div>

                    <div className="pub-unit-specs">
                      <div>
                        <span style={{ color: '#94a3b8' }}>Configuration:</span><br />
                        <strong style={{ color: '#1e293b' }}>{unit.bedrooms ? `${unit.bedrooms} BHK` : unit.type}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Carpet Area:</span><br />
                        <strong style={{ color: '#1e293b' }}>{carpet ? `${carpet} ${unit.area?.unit || 'Sq.Ft'}` : 'Contact for plan'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Facing:</span><br />
                        <strong style={{ color: '#1e293b', textTransform: 'capitalize' }}>{unit.facing || 'East'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Category:</span><br />
                        <strong style={{ color: '#1e293b', textTransform: 'capitalize' }}>{unit.propertyType?.replace(/_/g, ' ') || 'Plot'}</strong>
                      </div>
                    </div>

                    <div className="pub-unit-price-row">
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Price</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--pub-accent)' }}>
                        {formatCurrency(price)}
                      </span>
                    </div>

                    <Link
                      to={`/self-booking?unitId=${unit._id}`}
                      className="pub-unit-btn-book"
                    >
                      <Sparkles size={14} /> Book This Unit Online
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 32 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px' }}>About {project.name}</h3>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: '#475569', marginBottom: 24 }}>
            {project.description || 'Welcome to a master-planned community crafted for modern living and high appreciation. Situated in a prime growth corridor with wide arterial access, reliable electricity and water infrastructure, and transparent title documentation approved by leading financial institutions.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Launch Date</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>
                {project.launchDate ? new Date(project.launchDate).toLocaleDateString() : 'Active Development'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Possession Timeline</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>
                {project.possessionDate ? new Date(project.possessionDate).toLocaleDateString() : 'Immediate / Scheduled'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>RERA Registration</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3, color: '#059669' }}>
                {project.reraNumber || 'Applied & Compliant'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Developer Authority</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>
                {project.organization || 'MRP Real Estate Group'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: AMENITIES & APPROVALS ── */}
      {activeTab === 'amenities' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 32 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>Community Amenities &amp; Approvals</h3>

          {project.amenities && project.amenities.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {project.amenities.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <CheckCircle2 size={18} color="#059669" />
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {['24/7 Gated Security & CCTV', 'Blacktop Wide Internal Roads', 'Underground Drainage & Water Lines', 'Children Play Arena', 'Lush Avenue Tree Plantations', 'Grand Entrance Archway', 'Solar Street Lighting', 'Rainwater Harvesting Pit'].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <CheckCircle2 size={18} color="#059669" />
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SITE VISIT SCHEDULER POPUP MODAL ── */}
      {showVisitModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 20,
            maxWidth: 480,
            width: '100%',
            padding: 30,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowVisitModal(false)}
              style={{ position: 'absolute', top: 18, right: 18, background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: 16, cursor: 'pointer', fontSize: 16 }}
            >
              ✕
            </button>

            {visitSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
                  ✓
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>VIP Site Visit Scheduled!</h3>
                <p style={{ color: '#64748b', fontSize: 13.5, lineHeight: 1.5 }}>
                  We have reserved your VIP tour for <strong>{project.name}</strong> on <strong>{visitForm.date} ({visitForm.time})</strong>. Our client relationship manager will call you to confirm cab pickup details.
                </p>
                <button
                  onClick={() => setShowVisitModal(false)}
                  className="pub-btn-book"
                  style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pub-accent)', textTransform: 'uppercase' }}>
                  Complimentary VIP Tour
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 16px', color: '#0f172a' }}>
                  Schedule Site Visit to {project.name}
                </h3>

                <form onSubmit={handleScheduleVisit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Full Name *</label>
                    <input
                      required
                      placeholder="e.g. Anand Sharma"
                      value={visitForm.name}
                      onChange={e => setVisitForm(p => ({ ...p, name: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Mobile Number *</label>
                    <input
                      required
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={visitForm.phone}
                      onChange={e => setVisitForm(p => ({ ...p, phone: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Visit Date *</label>
                      <input
                        required
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={visitForm.date}
                        onChange={e => setVisitForm(p => ({ ...p, date: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Time Slot</label>
                      <select
                        value={visitForm.time}
                        onChange={e => setVisitForm(p => ({ ...p, time: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                      >
                        <option value="10:00 AM">10:00 AM</option>
                        <option value="11:30 AM">11:30 AM</option>
                        <option value="02:00 PM">02:00 PM</option>
                        <option value="04:30 PM">04:30 PM</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Pickup Location / Special Notes</label>
                    <input
                      placeholder="e.g. Require cab pickup from Krishnagiri bus station"
                      value={visitForm.notes}
                      onChange={e => setVisitForm(p => ({ ...p, notes: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={visitSubmitting}
                    className="pub-btn-book"
                    style={{ marginTop: 8, justifyContent: 'center', padding: '12px' }}
                  >
                    <Calendar size={15} /> {visitSubmitting ? 'Confirming Visit...' : 'Confirm Free VIP Site Visit'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
