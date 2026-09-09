import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2, Search, MapPin, CheckCircle2, ArrowRight,
  ShieldCheck, Calculator, Star, Sparkles, Phone, Download,
  Heart, Compass, Award, Calendar, Eye
} from 'lucide-react';
import api from '../../services/api';

export default function PublicHomePage() {
  const navigate = useNavigate();

  // Search State
  const [searchCity, setSearchCity] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchBhk, setSearchBhk] = useState('');

  // Projects State
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // EMI Calculator State
  const [calcPrice, setCalcPrice] = useState(4500000); // 45 Lakhs
  const [calcDownPayment, setCalcDownPayment] = useState(900000); // 20%
  const [calcTenure, setCalcTenure] = useState(20); // 20 years
  const [calcRate, setCalcRate] = useState(8.5); // 8.5%

  // Quick Brochure Ingestion Form State
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [inquirySubmitting, setInquirySubmitting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/public/projects?limit=6');
      if (res.data?.projects) {
        setProjects(res.data.projects);
      }
    } catch (err) {
      console.warn('Could not fetch public projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCity) params.set('city', searchCity);
    if (searchType) params.set('type', searchType);
    if (searchBhk) params.set('bhk', searchBhk);
    navigate(`/explore?${params.toString()}`);
  };

  // EMI Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
  const calculateEMI = () => {
    const principal = Math.max(0, calcPrice - calcDownPayment);
    const monthlyRate = calcRate / 12 / 100;
    const totalMonths = calcTenure * 12;
    if (principal <= 0 || monthlyRate <= 0) return 0;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    return Math.round(emi);
  };

  const handleBrochureInquiry = async (e) => {
    e.preventDefault();
    if (!inquiryName || !inquiryPhone) return;
    try {
      setInquirySubmitting(true);
      await api.post('/public/inquiry', {
        name: inquiryName,
        phone: inquiryPhone,
        email: inquiryEmail,
        notes: 'VIP Brochure & Pricing Sheet Download Request from Homepage'
      });
      setInquirySuccess(true);
      setInquiryName('');
      setInquiryPhone('');
      setInquiryEmail('');
    } catch (err) {
      alert(err.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setInquirySubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    if (!val) return 'Price on Request';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakhs`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  return (
    <div>
      {/* ── HERO SECTION ── */}
      <section className="pub-hero">
        <div className="pub-hero-bg-glow" />
        <div className="pub-hero-container">
          <div className="pub-hero-badge">
            <Sparkles size={14} color="#60a5fa" /> Direct Developer Booking Portal · 0% Brokerage
          </div>

          <h1 className="pub-hero-title">
            Find &amp; Book Your Dream <span>Property Directly Online</span>
          </h1>

          <p className="pub-hero-subtitle">
            Explore verified master layouts, luxury apartments, premium farmlands, and commercial plots. Real-time unit availability, transparent cost sheets, and instant digital booking reservations.
          </p>

          {/* Hero Search Box */}
          <form className="pub-hero-search" onSubmit={handleHeroSearch}>
            <div className="pub-search-col">
              <label className="pub-search-label">
                <MapPin size={12} color="var(--pub-accent)" /> Location / City
              </label>
              <input
                className="pub-search-input"
                placeholder="e.g. Krishnagiri, Mathur, Hosur..."
                value={searchCity}
                onChange={e => setSearchCity(e.target.value)}
              />
            </div>

            <div className="pub-search-col">
              <label className="pub-search-label">
                <Building2 size={12} color="var(--pub-accent)" /> Property Type
              </label>
              <select
                className="pub-search-select"
                value={searchType}
                onChange={e => setSearchType(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="residential">Residential Apartments</option>
                <option value="farmland">Farmlands &amp; Agro Plots</option>
                <option value="plots">Residential Layout Plots</option>
                <option value="villa">Luxury Villas</option>
                <option value="industrial_warehouse">Industrial &amp; Warehouses</option>
              </select>
            </div>

            <div className="pub-search-col">
              <label className="pub-search-label">
                <Compass size={12} color="var(--pub-accent)" /> Configuration
              </label>
              <select
                className="pub-search-select"
                value={searchBhk}
                onChange={e => setSearchBhk(e.target.value)}
              >
                <option value="">Any BHK / Size</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4+ BHK / Villa</option>
              </select>
            </div>

            <button type="submit" className="pub-search-btn">
              <Search size={16} /> Search Properties
            </button>
          </form>
        </div>
      </section>

      {/* ── TRUST STATS STRIP ── */}
      <section className="pub-stats-strip">
        <div className="pub-stats-container">
          <div>
            <div className="pub-stat-number">25+ Lakhs</div>
            <div className="pub-stat-label">Sq.Ft Developed &amp; Handed Over</div>
          </div>
          <div>
            <div className="pub-stat-number">1,200+</div>
            <div className="pub-stat-label">Happy Families &amp; Investors</div>
          </div>
          <div>
            <div className="pub-stat-number">100%</div>
            <div className="pub-stat-label">RERA &amp; DTCP Clear Titles</div>
          </div>
          <div>
            <div className="pub-stat-number">₹0</div>
            <div className="pub-stat-label">Direct Buyer Brokerage Fee</div>
          </div>
        </div>
      </section>

      {/* ── FEATURED PROJECTS SHOWCASE ── */}
      <section className="pub-section">
        <div className="pub-section-header">
          <div>
            <div className="pub-section-tag">
              <Award size={13} /> Prime Developer Portfolio
            </div>
            <h2 className="pub-section-title">Featured Real Estate Projects</h2>
            <p className="pub-section-subtitle">
              Handpicked premium residential, agro farm layouts, and industrial assets ready for immediate site visit or digital booking.
            </p>
          </div>

          <Link to="/explore" className="pub-card-btn-view" style={{ padding: '10px 18px' }}>
            View All Projects <ArrowRight size={15} />
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--pub-text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>
            <div>Loading active real estate projects...</div>
          </div>
        ) : projects.length === 0 ? (
          <div style={{
            background: '#ffffff',
            border: '1.5px dashed #cbd5e1',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <Building2 size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 18, color: '#0f172a', margin: '0 0 6px' }}>Projects Launching Soon</h3>
            <p style={{ color: '#64748b', fontSize: 13, maxWidth: 460, margin: '0 auto 16px' }}>
              We are curating high-return developments. You can still schedule an advisory consultation or explore upcoming releases.
            </p>
            <Link to="/site-visit-booking" className="pub-btn-book" style={{ display: 'inline-flex' }}>
              Schedule Early Consultation
            </Link>
          </div>
        ) : (
          <div className="pub-projects-grid">
            {projects.map((proj) => {
              const defaultImg = proj.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
              const lowestPrice = proj.lowestAvailablePrice || proj.priceRange?.min || 0;

              return (
                <div key={proj._id} className="pub-project-card">
                  <div className="pub-card-image-wrap">
                    <img
                      src={defaultImg}
                      alt={proj.name}
                      className="pub-card-image"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'; }}
                    />
                    <span className={`pub-card-status-badge ${proj.status}`}>
                      {proj.status?.replace(/_/g, ' ') || 'Launched'}
                    </span>
                    {proj.reraNumber && (
                      <span className="pub-card-rera">RERA: {proj.reraNumber}</span>
                    )}
                  </div>

                  <div className="pub-card-body">
                    <Link to={`/project/${proj._id}`} className="pub-card-title">
                      {proj.name}
                    </Link>

                    <div className="pub-card-location">
                      <MapPin size={13} color="var(--pub-accent)" />
                      <span>{proj.address ? `${proj.address}, ` : ''}{proj.city}</span>
                    </div>

                    <div className="pub-card-features">
                      <span className="pub-card-chip">
                        🏷️ {proj.type?.replace(/_/g, ' ')}
                      </span>
                      {proj.availableUnitsCount > 0 && (
                        <span className="pub-card-chip" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                          ✓ {proj.availableUnitsCount} Units Available
                        </span>
                      )}
                      {proj.totalArea && (
                        <span className="pub-card-chip">
                          📐 {proj.totalArea} Acres
                        </span>
                      )}
                    </div>

                    <div className="pub-card-divider" />

                    <div className="pub-card-footer">
                      <div>
                        <div className="pub-card-price-label">Starting From</div>
                        <div className="pub-card-price-val">
                          {formatCurrency(lowestPrice)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link to={`/project/${proj._id}`} className="pub-card-btn-view">
                          <Eye size={13} /> View Units
                        </Link>
                        <Link
                          to={`/self-booking?projectId=${proj._id}`}
                          className="pub-btn-book"
                          style={{ padding: '8px 12px', fontSize: 12 }}
                        >
                          Book Unit
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── INTERACTIVE EMI & LOAN CALCULATOR ── */}
      <section style={{ background: '#ffffff', padding: '70px 24px', borderTop: '1px solid var(--pub-border)', borderBottom: '1px solid var(--pub-border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="pub-section-tag">
              <Calculator size={13} /> Financial Planning Made Easy
            </div>
            <h2 className="pub-section-title">Home Loan &amp; EMI Estimator</h2>
            <p className="pub-section-subtitle" style={{ margin: '8px auto 0' }}>
              Calculate your exact monthly commitment and plan your investment before reserving your unit online.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: 40,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            padding: 32
          }}>
            {/* Sliders */}
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 700, fontSize: 14 }}>
                  <span>Property Cost:</span>
                  <span style={{ color: 'var(--pub-accent)' }}>₹{(calcPrice / 100000).toFixed(1)} Lakhs</span>
                </div>
                <input
                  type="range"
                  min="1000000"
                  max="30000000"
                  step="250000"
                  value={calcPrice}
                  onChange={e => {
                    const p = Number(e.target.value);
                    setCalcPrice(p);
                    if (calcDownPayment > p * 0.8) setCalcDownPayment(Math.round(p * 0.2));
                  }}
                  style={{ width: '100%', accentColor: 'var(--pub-accent)' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 700, fontSize: 14 }}>
                  <span>Down Payment (₹):</span>
                  <span style={{ color: 'var(--pub-emerald)' }}>₹{(calcDownPayment / 100000).toFixed(1)} Lakhs ({Math.round((calcDownPayment / calcPrice) * 100)}%)</span>
                </div>
                <input
                  type="range"
                  min="200000"
                  max={calcPrice * 0.8}
                  step="100000"
                  value={calcDownPayment}
                  onChange={e => setCalcDownPayment(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--pub-emerald)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 700, fontSize: 13 }}>
                    <span>Loan Tenure:</span>
                    <span>{calcTenure} Years</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={calcTenure}
                    onChange={e => setCalcTenure(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--pub-accent)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 700, fontSize: 13 }}>
                    <span>Interest Rate:</span>
                    <span>{calcRate}% p.a.</span>
                  </div>
                  <input
                    type="range"
                    min="6.5"
                    max="14.0"
                    step="0.1"
                    value={calcRate}
                    onChange={e => setCalcRate(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--pub-accent)' }}
                  />
                </div>
              </div>
            </div>

            {/* Calculated Breakdown Card */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
            }}>
              <div style={{ fontSize: 12, color: 'var(--pub-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Estimated Monthly EMI
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--pub-accent)', margin: '4px 0 16px' }}>
                ₹{calculateEMI().toLocaleString('en-IN')}<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--pub-text-muted)' }}>/month</span>
              </div>

              <div style={{ fontSize: 13, borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Principal Loan Amount:</span>
                  <strong style={{ color: '#0f172a' }}>₹{((calcPrice - calcDownPayment) / 100000).toFixed(1)} Lakhs</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Down Payment Provided:</span>
                  <strong style={{ color: '#0f172a' }}>₹{(calcDownPayment / 100000).toFixed(1)} Lakhs</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Estimated Total Interest:</span>
                  <strong style={{ color: '#0f172a' }}>₹{(((calculateEMI() * calcTenure * 12) - (calcPrice - calcDownPayment)) / 100000).toFixed(1)} Lakhs</strong>
                </div>
              </div>

              <Link
                to="/explore"
                className="pub-btn-book"
                style={{ marginTop: 20, justifyContent: 'center' }}
              >
                Match Properties In My Budget →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US & LEAD CAPTURE ── */}
      <section className="pub-section">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 48,
          alignItems: 'center'
        }}>
          <div>
            <div className="pub-section-tag">
              <ShieldCheck size={13} /> The Direct Buyer Advantage
            </div>
            <h2 className="pub-section-title" style={{ marginBottom: 16 }}>
              Why Hundreds of Homeowners Trust MRP Real Estate
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#64748b', marginBottom: 24 }}>
              Say goodbye to middlemen commissions and misleading claims. We provide complete digital visibility into available units, RERA legal approvals, and official direct booking with instant token advances.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>100% RERA Approved</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Strict regulatory compliance and bank loan approved master layouts.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Real-Time Inventory</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>View exact vacant units with floor, facing, and live transparent pricing.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Free VIP Site Visit</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Complimentary AC cab pickup &amp; guided tour with senior project architect.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Instant Token Hold</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Lock your favorite unit online with official digital booking agreement.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick VIP Lead Capture Card */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            borderRadius: 20,
            padding: '36px 30px',
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.25)'
          }}>
            <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              VIP Brochure &amp; Price List
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '6px 0 10px', color: '#ffffff' }}>
              Download Master Plans &amp; Cost Sheets
            </h3>
            <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 24 }}>
              Get detailed layout plans, unit dimensions, and special pre-launch pricing directly on WhatsApp or Email.
            </p>

            {inquirySuccess ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, fontSize: 16 }}>Request Received!</div>
                <div style={{ fontSize: 12.5, color: '#e2e8f0', marginTop: 4 }}>
                  Our senior property specialist will send over the customized cost sheet and reach out shortly.
                </div>
              </div>
            ) : (
              <form onSubmit={handleBrochureInquiry} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Your Full Name *
                  </label>
                  <input
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={inquiryName}
                    onChange={e => setInquiryName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 9,
                      border: '1px solid #334155',
                      background: '#0f172a',
                      color: '#ffffff',
                      fontSize: 13.5,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    WhatsApp Mobile Number *
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={inquiryPhone}
                    onChange={e => setInquiryPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 9,
                      border: '1px solid #334155',
                      background: '#0f172a',
                      color: '#ffffff',
                      fontSize: 13.5,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@gmail.com"
                    value={inquiryEmail}
                    onChange={e => setInquiryEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 9,
                      border: '1px solid #334155',
                      background: '#0f172a',
                      color: '#ffffff',
                      fontSize: 13.5,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={inquirySubmitting}
                  style={{
                    marginTop: 8,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Download size={15} /> {inquirySubmitting ? 'Sending Request...' : 'Get Instant Brochure & Pricing'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
