import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2, Search, MapPin, CheckCircle2, ArrowRight,
  ShieldCheck, Calculator, Star, Sparkles, Phone, Download,
  Heart, Compass, Award, Calendar, Eye, ChevronDown, ChevronUp,
  Car, MessageCircle, X, Clock, HelpCircle, Layers, Check
} from 'lucide-react';
import api from '../../services/api';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

const CATEGORY_TABS = [
  { id: 'all', label: '✨ All Properties', icon: '🌟' },
  { id: 'residential', label: '🏡 Residential Apartments', icon: '🏢' },
  { id: 'farmland', label: '🌾 Farmlands & Agro Plots', icon: '🌱' },
  { id: 'plots', label: '📐 Layout Plots', icon: '📐' },
  { id: 'villa', label: '🏰 Luxury Villas', icon: '🏰' },
  { id: 'industrial_warehouse', label: '🏭 Commercial & Warehouses', icon: '🏭' },
];

const TESTIMONIALS = [
  {
    name: 'Dr. Meenakshi Sundaram',
    role: 'Plot Owner, MRP Green Valley',
    avatar: 'MS',
    rating: 5,
    quote: 'The direct developer booking process was completely transparent. We checked the DTCP layout online, verified the RERA documentation, and booked Plot 14 without paying a single rupee in brokerage!'
  },
  {
    name: 'Rajesh Vardhan & Family',
    role: 'Apartment Owner, Metro Elegance',
    avatar: 'RV',
    rating: 5,
    quote: 'The complimentary chauffeur site visit was fantastic. The project coordinator showed us the exact construction quality, sunlight facing, and floor plans. The digital token hold gave us total peace of mind.'
  },
  {
    name: 'Col. K. Anand Kumar (Retd.)',
    role: 'Farmland Investor, Agro Orchard Estate',
    avatar: 'AK',
    rating: 5,
    quote: 'MRP Real Estate has the cleanest documentation in the region. Clear patta chitta, fertile soil with drip irrigation setup, and zero middleman hassle. Truly professional service.'
  }
];

const FAQS = [
  {
    q: 'Can I legally reserve a plot or flat online directly through this website?',
    a: 'Yes, absolutely. MRP Real Estate operates as the master developer portal. When you book online, an official digital token receipt and plot reservation docket are instantly generated, holding your chosen unit exclusively for 48 hours.'
  },
  {
    q: 'Are all projects approved by RERA and local planning authorities (DTCP / CMDA)?',
    a: 'Every single development listed on this platform is 100% verified with RERA registration and local town planning clearance. Title deeds, parent documents, and encumbrance certificates (EC) are open for buyer inspection.'
  },
  {
    q: 'How does the Free VIP Site Visit with Chauffeur Cab work?',
    a: 'We provide complimentary door-to-door AC cab pickup and drop from your home or office for you and your family. A dedicated project architect accompanies you to explain dimensions, boundaries, and amenities.'
  },
  {
    q: 'Which banks provide pre-approved home loans for MRP Real Estate projects?',
    a: 'Our developments are pre-approved by leading nationalized and private banks including SBI, HDFC, ICICI, Axis Bank, and Bank of Baroda, with fast-track loan disbursements up to 80%.'
  },
  {
    q: 'What is the token booking amount and cancellation policy?',
    a: 'The token advance starts from ₹50,000 to hold a unit. We offer a 100% hassle-free refund window within 7 days if you decide not to proceed after physical site verification.'
  }
];

export default function PublicHomePage() {
  const navigate = useNavigate();

  // Search State
  const [searchCity, setSearchCity] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchBhk, setSearchBhk] = useState('');

  // Selected Category Pill State
  const [selectedCategory, setSelectedCategory] = useState('all');

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

  // VIP Cab Modal State
  const [showCabModal, setShowCabModal] = useState(false);
  const [cabForm, setCabForm] = useState({ name: '', phone: '', pickupLocation: '', visitDate: '', project: '' });
  const [cabSuccess, setCabSuccess] = useState(false);
  const [cabSubmitting, setCabSubmitting] = useState(false);

  // Restrict background scroll while VIP Cab popup is open
  useBodyScrollLock(showCabModal);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/public/projects?limit=12');
      if (res.data?.projects) {
        setProjects(res.data.projects);
      }
    } catch (err) {
      console.warn('Could not fetch public projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'all') return projects;
    return projects.filter(p => p.type === selectedCategory || p.propertyType === selectedCategory);
  }, [projects, selectedCategory]);

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

  const handleCabBooking = async (e) => {
    e.preventDefault();
    if (!cabForm.name || !cabForm.phone || !cabForm.pickupLocation) return;
    try {
      setCabSubmitting(true);
      await api.post('/public/site-visits', {
        customerName: cabForm.name,
        customerPhone: cabForm.phone,
        preferredDate: cabForm.visitDate || new Date().toISOString(),
        preferredTime: '10:30 AM',
        pickupLocation: cabForm.pickupLocation,
        project: cabForm.project || projects[0]?._id,
        transportRequired: true,
        notes: `Complimentary VIP Cab Requested. Pickup: ${cabForm.pickupLocation}`
      });
      setCabSuccess(true);
      setCabForm({ name: '', phone: '', pickupLocation: '', visitDate: '', project: '' });
    } catch (err) {
      alert(err.message || 'Could not schedule site visit cab. Please call us directly.');
    } finally {
      setCabSubmitting(false);
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
            <Sparkles size={14} color="var(--pub-accent)" /> Direct Developer Booking Portal · 0% Brokerage
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

      {/* ── FEATURED PROJECTS SHOWCASE WITH LIVE CATEGORY FILTER ── */}
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

        {/* Category Filter Pills */}
        <div className="pub-cat-filters">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`pub-cat-pill ${selectedCategory === tab.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id !== 'all' && (
                <span style={{ fontSize: 11, opacity: 0.85, background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: 10 }}>
                  {projects.filter(p => p.type === tab.id || p.propertyType === tab.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--pub-text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>
            <div>Loading active real estate projects...</div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{
            background: '#ffffff',
            border: '1.5px dashed #cbd5e1',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <Building2 size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 18, color: '#0f172a', margin: '0 0 6px' }}>No Projects in this Category Yet</h3>
            <p style={{ color: '#64748b', fontSize: 13, maxWidth: 460, margin: '0 auto 16px' }}>
              We are releasing new master layouts shortly. You can still schedule an early advisory consultation or view all developments.
            </p>
            <button
              type="button"
              className="pub-btn-book"
              onClick={() => setSelectedCategory('all')}
              style={{ display: 'inline-flex' }}
            >
              Show All Properties
            </button>
          </div>
        ) : (
          <div className="pub-projects-grid">
            {filteredProjects.map((proj) => {
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
                      {proj.fmbSketch && (
                        <span className="pub-card-chip" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#86efac', fontWeight: 600 }}>
                          📐 FMB Sketch Available
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

        {/* ── COMPLIMENTARY VIP CAB BANNER ── */}
        <div className="pub-cab-banner">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
              <Car size={15} color="#86efac" /> Complimentary Buyer Privilege
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', color: '#ffffff', letterSpacing: '-0.02em' }}>
              Want to Visit the Site in Person? Get a Free AC Cab Pickup
            </h3>
            <p style={{ fontSize: 14, color: '#d1e7cb', margin: 0, maxWidth: 580, lineHeight: 1.5 }}>
              Experience our master layout on ground with your family. We arrange private, sanitized AC cab pick-up &amp; drop right from your home, complete with guided plot walk-throughs.
            </p>
          </div>

          <button
            type="button"
            className="pub-cab-btn"
            onClick={() => setShowCabModal(true)}
          >
            <Car size={18} /> Schedule Free VIP Cab
          </button>
        </div>
      </section>

      {/* ── WHY BUY DIRECTLY FROM MRP REAL ESTATE (4 PILLARS) ── */}
      <section style={{ background: '#ffffff', padding: '60px 24px', borderTop: '1px solid var(--pub-border)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 12px' }}>
            <div className="pub-section-tag">
              <ShieldCheck size={13} /> The Direct Buyer Advantage
            </div>
            <h2 className="pub-section-title">Why Buyers Trust MRP Real Estate</h2>
            <p className="pub-section-subtitle">
              We cut out unnecessary intermediaries and deliver direct developer transparency from booking to deed handover.
            </p>
          </div>

          <div className="pub-why-grid">
            <div className="pub-why-card">
              <div className="pub-why-icon-wrap">🛡️</div>
              <div className="pub-why-title">100% Legal &amp; RERA Cleared</div>
              <p className="pub-why-desc">
                Every layout is approved by DTCP/RERA with crystal-clear legal titles, mother deeds, and revenue records open for lawyer verification.
              </p>
            </div>

            <div className="pub-why-card">
              <div className="pub-why-icon-wrap">💰</div>
              <div className="pub-why-title">Zero Brokerage Guarantee</div>
              <p className="pub-why-desc">
                Deal directly with the master developer at official baseline rates. Save lakhs with absolutely ₹0 middleman commission or hidden charges.
              </p>
            </div>

            <div className="pub-why-card">
              <div className="pub-why-icon-wrap">⚡</div>
              <div className="pub-why-title">Real-Time Unit Reservation</div>
              <p className="pub-why-desc">
                Choose your exact plot or flat on our interactive grid and hold it online in 60 seconds with an instant digital booking confirmation docket.
              </p>
            </div>

            <div className="pub-why-card">
              <div className="pub-why-icon-wrap">🤝</div>
              <div className="pub-why-title">Doorstep Deed Handover</div>
              <p className="pub-why-desc">
                Our in-house legal team handles bank loan approvals, registration slot booking at the Sub-Registrar office, and seamless Patta transfer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE EMI & LOAN CALCULATOR ── */}
      <section style={{ background: 'var(--pub-bg)', padding: '70px 24px', borderTop: '1px solid var(--pub-border)', borderBottom: '1px solid var(--pub-border)' }}>
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
            background: '#ffffff',
            border: '1.5px solid #e2ece0',
            borderRadius: 20,
            padding: 32,
            boxShadow: '0 8px 24px rgba(69, 133, 34, 0.05)'
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
                    const newPrice = Number(e.target.value);
                    setCalcPrice(newPrice);
                    setCalcDownPayment(Math.round(newPrice * 0.2));
                  }}
                  style={{ width: '100%', accentColor: 'var(--pub-accent)' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 700, fontSize: 14 }}>
                  <span>Down Payment (₹):</span>
                  <span style={{ color: 'var(--pub-accent)' }}>₹{(calcDownPayment / 100000).toFixed(1)} Lakhs ({Math.round((calcDownPayment / calcPrice) * 100)}%)</span>
                </div>
                <input
                  type="range"
                  min="200000"
                  max={calcPrice * 0.8}
                  step="100000"
                  value={calcDownPayment}
                  onChange={e => setCalcDownPayment(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--pub-accent)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 700, fontSize: 13 }}>
                    <span>Tenure:</span>
                    <span style={{ color: 'var(--pub-accent)' }}>{calcTenure} Years</span>
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
                    <span style={{ color: 'var(--pub-accent)' }}>{calcRate}%</span>
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
              background: '#fcfdfa',
              border: '1.5px solid #dcebda',
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

              <div style={{ fontSize: 13, borderTop: '1px solid #edf5ea', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
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

      {/* ── VERIFIED CUSTOMER REVIEWS & TESTIMONIALS ── */}
      <section className="pub-section">
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 10px' }}>
          <div className="pub-section-tag">
            <Star size={13} fill="#eab308" color="#eab308" /> Customer Satisfaction
          </div>
          <h2 className="pub-section-title">Stories From Verified Homeowners</h2>
          <p className="pub-section-subtitle">
            See how over 1,200 families secured their dream plots and residences directly with MRP Real Estate.
          </p>
        </div>

        <div className="pub-reviews-grid">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="pub-review-card">
              <div>
                <div className="pub-review-stars">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={16} fill="#eab308" color="#eab308" />
                  ))}
                </div>
                <p className="pub-review-text">"{t.quote}"</p>
              </div>

              <div className="pub-review-author">
                <div className="pub-review-avatar">{t.avatar}</div>
                <div>
                  <div className="pub-review-name">{t.name}</div>
                  <div className="pub-review-prop">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS (FAQ) ── */}
      <section style={{ background: '#ffffff', padding: '60px 24px', borderTop: '1px solid var(--pub-border)' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className="pub-section-tag">
              <HelpCircle size={13} /> Clear Answers
            </div>
            <h2 className="pub-section-title">Frequently Asked Questions</h2>
            <p className="pub-section-subtitle">
              Everything you need to know about purchasing and reserving directly online.
            </p>
          </div>

          <div className="pub-faq-grid">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`pub-faq-item ${isOpen ? 'open' : ''}`}>
                  <div className="pub-faq-question" onClick={() => setOpenFaq(isOpen ? null : idx)}>
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} color="#458522" /> : <ChevronDown size={18} color="#94a3b8" />}
                  </div>
                  {isOpen && (
                    <div className="pub-faq-answer">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── VIP BROCHURE DOWNLOAD FORM SECTION ── */}
      <section className="pub-section">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 48,
          alignItems: 'center'
        }}>
          <div>
            <div className="pub-section-tag">
              <ShieldCheck size={13} /> Official Document Access
            </div>
            <h2 className="pub-section-title" style={{ marginBottom: 16 }}>
              Receive Layout Blueprints &amp; Transparent Cost Sheets
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#536b4e', marginBottom: 24 }}>
              Get the complete master plan layout, unit dimensions, payment milestones, and legal approvals directly delivered to your phone or inbox.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#edf7e8', color: '#458522', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#172a11' }}>Full DTCP Master Plans</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>High-resolution survey layout sketches with road widths &amp; park areas.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#edf7e8', color: '#458522', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#172a11' }}>Price Breakdown</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Complete cost calculation including stamp duty, registration, and development.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick VIP Lead Capture Card */}
          <div style={{
            background: 'linear-gradient(135deg, #172a11 0%, #25441b 100%)',
            border: '1px solid #366d1a',
            color: '#ffffff',
            borderRadius: 20,
            padding: '36px 30px',
            boxShadow: '0 20px 45px rgba(23, 42, 17, 0.25)'
          }}>
            <div style={{ fontSize: 12, color: '#86efac', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              VIP Brochure &amp; Price List
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '6px 0 10px', color: '#ffffff' }}>
              Download Master Plans &amp; Cost Sheets
            </h3>
            <p style={{ fontSize: 13, color: '#d1e7cb', lineHeight: 1.5, marginBottom: 24 }}>
              Get detailed layout plans, unit dimensions, and special pre-launch pricing directly on WhatsApp or Email.
            </p>

            {inquirySuccess ? (
              <div style={{ background: 'rgba(69, 133, 34, 0.25)', border: '1px solid #458522', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <CheckCircle2 size={36} color="#86efac" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, fontSize: 16 }}>Request Received!</div>
                <div style={{ fontSize: 12.5, color: '#e2f0dc', marginTop: 4 }}>
                  Our senior property specialist will send over the customized cost sheet and reach out shortly.
                </div>
              </div>
            ) : (
              <form onSubmit={handleBrochureInquiry} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#b9dbb3', display: 'block', marginBottom: 4 }}>
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
                      border: '1px solid #366d1a',
                      background: '#11220c',
                      color: '#ffffff',
                      fontSize: 13.5,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#b9dbb3', display: 'block', marginBottom: 4 }}>
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
                      border: '1px solid #366d1a',
                      background: '#11220c',
                      color: '#ffffff',
                      fontSize: 13.5,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#b9dbb3', display: 'block', marginBottom: 4 }}>
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
                      border: '1px solid #366d1a',
                      background: '#11220c',
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
                    background: '#458522',
                    color: '#ffffff',
                    border: '1px solid #529928',
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

      {/* ── FLOATING QUICK CONNECT BUTTONS ── */}
      <div className="pub-floating-actions">
        <button
          type="button"
          onClick={() => setShowCabModal(true)}
          className="pub-float-btn pub-float-visit"
          title="Schedule Free AC Cab Site Visit"
        >
          <Car size={16} color="#86efac" /> Free Cab Visit
        </button>

        <a
          href="https://wa.me/919876543210?text=Hi%20MRP%20Real%20Estate,%20I%20am%20interested%20in%20exploring%20your%20verified%20properties!"
          target="_blank"
          rel="noopener noreferrer"
          className="pub-float-btn pub-float-wa"
          title="Chat with Us on WhatsApp"
        >
          <MessageCircle size={17} /> WhatsApp Us
        </a>
      </div>

      {/* ── POPUP MODAL: SCHEDULE FREE VIP CAB SITE VISIT ── */}
      {/* Notice: Background scroll is restricted while this popup is open! */}
      {showCabModal && (
        <div
          className="pub-modal-overlay modal-overlay"
          onClick={() => setShowCabModal(false)}
        >
          <div
            className="pub-modal-card"
            onClick={e => e.stopPropagation()}
            style={{ padding: '28px 26px' }}
          >
            <button
              type="button"
              onClick={() => setShowCabModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: '#f1f5f9',
                border: 'none',
                width: 32,
                height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b'
              }}
            >
              <X size={16} />
            </button>

            {cabSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 8px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#edf7e8', color: '#458522', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>
                  ✓
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#172a11', margin: '0 0 8px' }}>
                  VIP Cab Visit Confirmed!
                </h3>
                <p style={{ fontSize: 13.5, color: '#536b4e', lineHeight: 1.55, margin: '0 0 20px' }}>
                  Our guest relations officer will contact you to confirm the exact driver details and pickup timing. We look forward to hosting you!
                </p>
                <button
                  type="button"
                  className="pub-btn-book"
                  onClick={() => { setShowCabModal(false); setCabSuccess(false); }}
                  style={{ margin: '0 auto' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#edf7e8', color: '#458522', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#172a11', margin: 0 }}>
                      Book Complimentary VIP Cab
                    </h3>
                    <div style={{ fontSize: 12, color: '#536b4e' }}>
                      Doorstep AC Cab Pickup &amp; Drop · 100% Free
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCabBooking} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                      Your Name *
                    </label>
                    <input
                      required
                      className="form-input"
                      placeholder="e.g. Anand Kumar"
                      value={cabForm.name}
                      onChange={e => setCabForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                      Mobile / WhatsApp Number *
                    </label>
                    <input
                      required
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 9876543210"
                      value={cabForm.phone}
                      onChange={e => setCabForm(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                      Pickup Address / Landmark *
                    </label>
                    <input
                      required
                      className="form-input"
                      placeholder="e.g. Near HSR Layout BDA Complex, Bengaluru"
                      value={cabForm.pickupLocation}
                      onChange={e => setCabForm(p => ({ ...p, pickupLocation: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                        Preferred Date *
                      </label>
                      <input
                        required
                        type="date"
                        className="form-input"
                        value={cabForm.visitDate}
                        onChange={e => setCabForm(p => ({ ...p, visitDate: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                        Select Project
                      </label>
                      <select
                        className="form-input"
                        value={cabForm.project}
                        onChange={e => setCabForm(p => ({ ...p, project: e.target.value }))}
                      >
                        {projects.map(p => (
                          <option key={p._id} value={p._id}>{p.name} ({p.city})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={cabSubmitting}
                    className="pub-btn-book"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12 }}
                  >
                    <Car size={16} /> {cabSubmitting ? 'Confirming Cab...' : 'Confirm Free VIP Cab Booking'}
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
