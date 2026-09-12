import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Calendar, MapPin, CheckCircle2, ShieldCheck,
  Building2, Phone, Sparkles, ArrowRight
} from 'lucide-react';
import api from '../../services/api';

export default function PublicSiteVisitPage() {
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get('projectId');

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId || '');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    scheduledTime: '11:00 AM',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/public/projects?limit=50');
      if (res.data?.projects) {
        setProjects(res.data.projects);
        if (!preselectedProjectId && res.data.projects.length > 0) {
          setSelectedProjectId(res.data.projects[0]._id);
        }
      }
    } catch (e) {
      console.warn('Could not fetch projects:', e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !selectedProjectId) {
      alert('Please fill in your Name, Phone Number, and select a Project.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/public/site-visits', {
        name: form.name,
        phone: form.phone,
        email: form.email,
        projectId: selectedProjectId,
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
        notes: form.notes
      });

      if (res.data?.success) {
        setSuccess(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to schedule site visit');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProjectDoc = projects.find(p => p._id === selectedProjectId);

  return (
    <div style={{ maxWidth: 800, margin: '40px auto 80px', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="pub-section-tag" style={{ justifyContent: 'center' }}>
          <Calendar size={14} /> VIP On-Site Experience
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--pub-primary)', margin: '4px 0 8px' }}>
          Schedule a Free VIP Site Visit
        </h1>
        <p style={{ color: 'var(--pub-text-muted)', fontSize: 14, margin: 0 }}>
          Experience the location, road connectivity, and sample unit architecture in person with complimentary AC cab assistance.
        </p>
      </div>

      <div className="pub-booking-card" style={{ maxWidth: 800, margin: '0 auto' }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>
              ✓
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
              Your VIP Site Visit is Confirmed!
            </h2>
            <p style={{ color: '#475569', fontSize: 15, maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
              We have reserved your slot for <strong>{selectedProjectDoc?.name}</strong> on <strong>{form.scheduledDate} at {form.scheduledTime}</strong>. Our senior relationship manager will call you shortly to confirm pickup details.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/explore" className="pub-btn-book">
                Explore More Projects
              </Link>
              <button
                onClick={() => setSuccess(false)}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Book Another Visit
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                Select Property Development *
              </label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 600, background: '#f8fafc' }}
              >
                {projects.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.city}) — {p.type}
                  </option>
                ))}
              </select>
            </div>

            <div className="pub-form-grid-2">
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Full Name *
                </label>
                <input
                  required
                  placeholder="e.g. Ramesh Babu"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Mobile Number *
                </label>
                <input
                  required
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div className="pub-form-grid-3">
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@gmail.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Preferred Date *
                </label>
                <input
                  required
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.scheduledDate}
                  onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Preferred Time
                </label>
                <select
                  value={form.scheduledTime}
                  onChange={e => setForm(p => ({ ...p, scheduledTime: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                >
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:30 PM">04:30 PM</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                Special Requirements / Cab Pickup Location
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Please arrange cab pickup from Mathur junction for 3 family members"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="pub-btn-book"
              style={{ padding: '14px', fontSize: 15, justifyContent: 'center', marginTop: 8 }}
            >
              <Calendar size={16} /> {submitting ? 'Scheduling Visit...' : 'Confirm Free VIP Site Visit'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
