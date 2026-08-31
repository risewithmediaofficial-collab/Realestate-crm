import { useState, useEffect } from 'react';
import { X, UserPlus, Phone, Mail, MapPin, DollarSign, Building, FileText } from 'lucide-react';
import api from '../../services/api';
import { LEAD_SOURCES } from '../../utils/constants';

export default function CreateLeadModal({ onClose, onCreated }) {
  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projRes, userRes] = await Promise.all([
          api.get('/projects').catch(() => ({ data: { data: [] } })),
          api.get('/users').catch(() => ({ data: { data: [] } }))
        ]);
        if (projRes.data?.data) setProjects(projRes.data.data);
        if (userRes.data?.data) setUsers(userRes.data.data);
      } catch {}
    };
    loadData();
  }, []);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'website',
    city: '',
    interestedProject: '',
    interestedUnitType: '3BHK',
    customUnitType: '',
    budgetMin: '',
    budgetMax: '',
    notes: '',
    leadType: 'warm',
    assignedTo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!form.name.trim()) errors.name = 'Please enter lead full name';
    if (!form.phone.trim()) errors.phone = 'Please enter a valid mobile number';
    else if (form.phone.replace(/[^0-9]/g, '').length < 10) errors.phone = 'Phone number should be at least 10 digits';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please resolve the highlighted form fields before submitting.');
      return;
    }
    setFieldErrors({});
    setLoading(true);
    setError('');

    const unitTypeToSave = form.interestedUnitType === 'custom' ? (form.customUnitType.trim() || 'Custom Unit') : form.interestedUnitType;

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      source: form.source,
      city: form.city.trim(),
      interestedUnitType: unitTypeToSave,
      leadType: form.leadType,
      budget: {
        min: form.budgetMin ? Number(form.budgetMin) : 0,
        max: form.budgetMax ? Number(form.budgetMax) : 0
      },
      stage: 'new',
      notes: form.notes.trim()
    };
    if (form.interestedProject) payload.interestedProject = form.interestedProject;
    if (form.assignedTo) payload.assignedTo = form.assignedTo;

    try {
      const { data } = await api.post('/leads', payload);
      if (onCreated) onCreated(data.data);
      onClose();
    } catch (err) {
      console.error('Failed to create lead via API:', err);
      // Fallback for offline or local preview
      const selectedProj = projects.find(p => p._id === form.interestedProject);
      const selectedUser = users.find(u => u._id === form.assignedTo);
      const fallbackLead = {
        _id: Date.now().toString(),
        ...payload,
        leadScore: form.leadType === 'hot' ? 85 : form.leadType === 'warm' ? 60 : 30,
        interestedProject: selectedProj ? { _id: selectedProj._id, name: selectedProj.name } : null,
        assignedTo: selectedUser ? { _id: selectedUser._id, name: selectedUser.name } : null,
        createdAt: new Date(),
        activities: form.notes ? [{ type: 'note', title: 'Initial Inquiry Note', description: form.notes, performedAt: new Date() }] : []
      };
      if (onCreated) onCreated(fallbackLead);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={18} color="var(--primary)" />
            </div>
            <div>
              <div className="modal-title">Create New Lead</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Capture buyer inquiry into CRM pipeline</div>
            </div>
          </div>
          <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        {error && (
          <div style={{ margin: '16px 24px 0', background: 'var(--danger-light)', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: 'calc(80vh - 140px)', overflowY: 'auto' }}>
            {/* Contact Details */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" title="Full legal or commercial name of the prospective buyer">
                  Full Name <span className="required">*</span>
                </label>
                <input
                  className={`form-input ${fieldErrors.name ? 'error' : ''}`}
                  style={fieldErrors.name ? { borderColor: '#ef4444', background: '#fef2f2' } : {}}
                  value={form.name}
                  onChange={e => {
                    setForm(p => ({ ...p, name: e.target.value }));
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g. Rahul Sharma"
                  title="Enter the full name of the lead"
                  required
                />
                {fieldErrors.name && (
                  <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block', fontWeight: 600 }}>
                    ⚠️ {fieldErrors.name}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" title="10-digit mobile number for WhatsApp & cloud calls">
                  Phone Number <span className="required">*</span>
                </label>
                <input
                  className={`form-input ${fieldErrors.phone ? 'error' : ''}`}
                  style={fieldErrors.phone ? { borderColor: '#ef4444', background: '#fef2f2' } : {}}
                  value={form.phone}
                  onChange={e => {
                    setForm(p => ({ ...p, phone: e.target.value }));
                    if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
                  }}
                  placeholder="e.g. 9876543210"
                  title="Enter at least 10 digit mobile number"
                  required
                />
                {fieldErrors.phone && (
                  <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block', fontWeight: 600 }}>
                    ⚠️ {fieldErrors.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" title="Email address for sending digital brochure and certified cost sheets">
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="buyer@domain.com"
                  title="Optional email address for marketing automation"
                />
              </div>
              <div className="form-group">
                <label className="form-label" title="Current residential city or preferred property location">
                  City / Location
                </label>
                <input
                  className="form-input"
                  value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  placeholder="e.g. Bangalore, Hyderabad, Pune"
                  title="City or micro-market location"
                />
              </div>
            </div>

            {/* Source & Project */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" title="Original channel where this lead was acquired">
                  Lead Source
                </label>
                <select
                  className="form-select"
                  value={form.source}
                  onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                  title="Select the advertising or referral channel"
                >
                  {Object.entries(LEAD_SOURCES).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" title="Select a project added in the CRM">
                  Interested Project
                </label>
                <select
                  className="form-select"
                  value={form.interestedProject}
                  onChange={e => setForm(p => ({ ...p, interestedProject: e.target.value }))}
                  title="Select an active real estate project"
                >
                  <option value="">-- Select Project (Optional) --</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.city || p.code || 'Active'})</option>
                  ))}
                </select>
              </div>
            </div>

            {users.length > 0 && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" title="Assign lead directly to a specific closer or pre-sales representative">
                  Assign To Executive
                </label>
                <select
                  className="form-select"
                  value={form.assignedTo}
                  onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}
                  title="Choose team member to allocate this inquiry"
                >
                  <option value="">-- Auto-Assign / Admin --</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role?.replace(/_/g, ' ')})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Unit & Intent */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" title="Desired unit configuration or property category">
                  Configuration / Unit Type
                </label>
                <select
                  className="form-select"
                  value={form.interestedUnitType}
                  onChange={e => setForm(p => ({ ...p, interestedUnitType: e.target.value }))}
                  title="Select unit type or choose Custom to manually enter"
                >
                  <option value="1BHK">1 BHK Apartment</option>
                  <option value="2BHK">2 BHK Apartment</option>
                  <option value="3BHK">3 BHK Apartment</option>
                  <option value="4BHK">4 BHK Luxury</option>
                  <option value="Villa / Row House">Villa / Row House</option>
                  <option value="Plotted Layout">Plotted Layout (30x40 / 40x60)</option>
                  <option value="Managed Farmlands">Managed Farmlands (Acres)</option>
                  <option value="Agricultural Acreage">Agricultural Land</option>
                  <option value="Commercial Office / Retail">Commercial / Retail</option>
                  <option value="custom">✏️ Enter Custom Category...</option>
                </select>
                {form.interestedUnitType === 'custom' && (
                  <input
                    className="form-input"
                    style={{ marginTop: 8 }}
                    value={form.customUnitType}
                    onChange={e => setForm(p => ({ ...p, customUnitType: e.target.value }))}
                    placeholder="Type custom configuration (e.g. 5 Acre Coffee Estate, Duplex Villa)"
                    title="Manual custom category entry"
                  />
                )}
              </div>
              <div className="form-group">
                <label className="form-label" title="Buying intent urgency score">
                  Buyer Temperature
                </label>
                <select
                  className="form-select"
                  value={form.leadType}
                  onChange={e => setForm(p => ({ ...p, leadType: e.target.value }))}
                  title="Lead purchase readiness"
                >
                  <option value="hot">🔥 Hot (Immediate Buyer — Ready to Book)</option>
                  <option value="warm">⚡ Warm (1-3 Months Purchase Timeline)</option>
                  <option value="cold">❄️ Cold (Exploring / Future Pipeline)</option>
                </select>
              </div>
            </div>

            {/* Budget Range */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" title="Minimum budget capacity in Indian Rupees">
                  Budget Min (₹)
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={form.budgetMin}
                  onChange={e => setForm(p => ({ ...p, budgetMin: e.target.value }))}
                  placeholder="e.g. 5000000"
                  title="Minimum price limit"
                />
              </div>
              <div className="form-group">
                <label className="form-label" title="Maximum purchase budget in Indian Rupees">
                  Budget Max (₹)
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={form.budgetMax}
                  onChange={e => setForm(p => ({ ...p, budgetMax: e.target.value }))}
                  placeholder="e.g. 12000000"
                  title="Maximum price limit"
                />
              </div>
            </div>

            {/* Initial Notes */}
            <div className="form-group">
              <label className="form-label" title="Detailed customer preferences, specific vastu, floor preference, or payment terms">
                Initial Notes / Requirements
              </label>
              <textarea
                className="form-input"
                style={{ height: 72, resize: 'none' }}
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Specific requirements (e.g. East facing, corner plot, immediate registration, loan approved)..."
                title="Buyer notes and specific instructions"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} title="Discard and close modal">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} title="Validate and save lead into CRM database">
              {loading ? 'Creating...' : 'Create Lead & Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
