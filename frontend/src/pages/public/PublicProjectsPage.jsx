import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2, Search, MapPin, Filter, ArrowRight,
  Sparkles, CheckCircle2, ShieldCheck, Eye, Compass, X
} from 'lucide-react';
import api from '../../services/api';

export default function PublicProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters State from URL query or defaults
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('type') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  useEffect(() => {
    fetchProjects();
  }, [city, propertyType, status, searchQuery]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (propertyType) params.set('type', propertyType);
      if (status) params.set('status', status);
      if (searchQuery) params.set('search', searchQuery);

      const res = await api.get(`/public/projects?${params.toString()}`);
      if (res.data) {
        setProjects(res.data.projects || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.warn('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setCity('');
    setPropertyType('');
    setStatus('');
    setSearchQuery('');
    setSearchParams({});
  };

  const formatCurrency = (val) => {
    if (!val) return 'Price on Request';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakhs`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 24px 80px' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: 32 }}>
        <div className="pub-section-tag">
          <Building2 size={13} /> Verified Portfolio
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 800, color: 'var(--pub-primary)', margin: '4px 0 8px' }}>
          Explore Real Estate Developments
        </h1>
        <p style={{ color: 'var(--pub-text-muted)', fontSize: 15, margin: 0 }}>
          Showing {total} active RERA-registered master projects with live inventory and direct buyer booking.
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '16px 20px',
        marginBottom: 36,
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto',
        gap: 12,
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <Search size={15} color="var(--pub-text-muted)" />
          <input
            placeholder="Search project name, landmark, city..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13 }}
          />
          {searchQuery && (
            <X size={14} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
          )}
        </div>

        {/* City Filter */}
        <div>
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--pub-text)'
            }}
          >
            <option value="">All Locations</option>
            <option value="Mathur">Mathur</option>
            <option value="Krishnagiri">Krishnagiri</option>
            <option value="Hosur">Hosur</option>
            <option value="Bangalore">Bangalore</option>
          </select>
        </div>

        {/* Property Type */}
        <div>
          <select
            value={propertyType}
            onChange={e => setPropertyType(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--pub-text)'
            }}
          >
            <option value="">All Categories</option>
            <option value="residential">Residential</option>
            <option value="farmland">Farmland &amp; Agro</option>
            <option value="plots">Layout Plots</option>
            <option value="villa">Villas</option>
            <option value="industrial_warehouse">Industrial &amp; Warehouse</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--pub-text)'
            }}
          >
            <option value="">All Construction Status</option>
            <option value="launched">Newly Launched</option>
            <option value="under_construction">Under Construction</option>
            <option value="ready_to_move">Ready to Move</option>
          </select>
        </div>

        {/* Clear Filters */}
        {(city || propertyType || status || searchQuery) && (
          <button
            onClick={handleResetFilters}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--pub-text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Filtering active real estate developments...</div>
        </div>
      ) : projects.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1.5px dashed #cbd5e1',
          borderRadius: 20,
          padding: '60px 24px',
          textAlign: 'center'
        }}>
          <Building2 size={44} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 20, color: '#0f172a', margin: '0 0 6px' }}>No projects match your filter criteria</h3>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 460, margin: '0 auto 20px' }}>
            Try clearing one or more filters or search terms to see all available properties.
          </p>
          <button onClick={handleResetFilters} className="pub-btn-book">
            Clear Filters &amp; Show All
          </button>
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
                    {proj.status?.replace(/_/g, ' ') || 'Active'}
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

                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {proj.description || 'Master planned community with top-tier infrastructure, lush green environment, and clear title deed documentation.'}
                  </p>

                  <div className="pub-card-features">
                    <span className="pub-card-chip">
                      🏷️ {proj.type?.replace(/_/g, ' ')}
                    </span>
                    {proj.availableUnitsCount > 0 ? (
                      <span className="pub-card-chip" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                        ✓ {proj.availableUnitsCount} Units Available
                      </span>
                    ) : (
                      <span className="pub-card-chip">
                        📦 Inventory Available
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
    </div>
  );
}
