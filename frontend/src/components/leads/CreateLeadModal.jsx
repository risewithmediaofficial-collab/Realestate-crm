import { useState, useEffect } from 'react';
import { X, UserPlus, Phone, Mail, MapPin, DollarSign, Building, FileText } from 'lucide-react';
import api from '../../services/api';
import { LEAD_SOURCES } from '../../utils/constants';
import CustomSelect from '../ui/CustomSelect';

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

        const projectList = Array.isArray(projRes.data?.data)
          ? projRes.data.data
          : Array.isArray(projRes.data)
            ? projRes.data
            : [];

        const userList = Array.isArray(userRes.data?.data)
          ? userRes.data.data
          : Array.isArray(userRes.data)
            ? userRes.data
            : [];

        setProjects(projectList.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        setUsers(userList.filter(Boolean));
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
    assignedTo: '',

    // Direct Site Visit Scheduling
    scheduleSiteVisit: false,
    visitDate: '',
    visitTime: '11:00 AM',
    visitProject: '',
    visitExecutive: '',
    pickupRequired: false,
    pickupLocation: '',
    visitNotes: ''
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

    if (form.scheduleSiteVisit && !form.visitDate) {
      errors.visitDate = 'Please select a visit date to schedule site visit.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please resolve the highlighted form fields before submitting.');
      return;
    }
    setFieldErrors({});
    setLoading(true);
    setError('');

    const unitTypeToSave = form.interestedUnitType === 'custom' ? (form.customUnitType.trim() || 'Custom Unit') : form.interestedUnitType;

    const isVisitScheduled = form.scheduleSiteVisit && Boolean(form.visitDate);

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
      stage: 'new', // Always save newly created leads in 'new' stage
      notes: form.notes.trim()
    };
    if (form.interestedProject) payload.interestedProject = form.interestedProject;
    if (form.assignedTo) payload.assignedTo = form.assignedTo;

    try {
      const { data } = await api.post('/leads', payload);
      const createdLead = data.data;

      // Automatically create the linked Site Visit in backend
      if (isVisitScheduled && createdLead?._id) {
        try {
          const targetProj = form.visitProject || form.interestedProject || (projects[0]?._id);
          await api.post('/site-visits', {
            lead: createdLead._id,
            project: targetProj,
            scheduledDate: new Date(form.visitDate),
            scheduledTime: form.visitTime || '11:00 AM',
            assignedTo: form.visitExecutive || form.assignedTo,
            pickupRequired: form.pickupRequired,
            pickupLocation: form.pickupLocation,
            notes: form.visitNotes || 'Site visit scheduled directly during lead creation',
            preserveLeadStage: true
          });
        } catch (svErr) {
          console.warn('Could not auto-create site visit:', svErr);
        }
      }

      if (onCreated) onCreated(createdLead);
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
            <div className="form-row" style={{ marginBottom: 14 }}>
              <CustomSelect
                label="Lead Source"
                value={form.source}
                onChange={val => setForm(p => ({ ...p, source: val }))}
                options={Object.entries(LEAD_SOURCES).map(([k, v]) => ({
                  value: k,
                  label: v.label,
                  icon: v.icon
                }))}
              />
              <CustomSelect
                label="Interested Project"
                value={form.interestedProject}
                onChange={val => setForm(p => ({ ...p, interestedProject: val }))}
                searchable={true}
                placeholder="-- Select Project (Optional) --"
                options={[
                  { value: '', label: '-- None / Undecided --' },
                  ...projects.map(p => ({
                    value: p._id,
                    label: p.name,
                    subtext: p.city || p.code || 'Active Project',
                    icon: '🏢'
                  }))
                ]}
              />
            </div>

            {users.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <CustomSelect
                  label="Assign To Executive"
                  value={form.assignedTo}
                  onChange={val => setForm(p => ({ ...p, assignedTo: val }))}
                  searchable={true}
                  placeholder="-- Auto-Assign / Admin --"
                  options={[
                    { value: '', label: '-- Auto-Assign / Admin --', icon: '⚡' },
                    ...users.map(u => ({
                      value: u._id,
                      label: u.name,
                      subtext: u.role?.replace(/_/g, ' '),
                      avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=4f46e5&color=fff&size=64`
                    }))
                  ]}
                />
              </div>
            )}

            {/* Unit & Intent */}
            <div className="form-row" style={{ marginBottom: 14 }}>
              <div>
                <CustomSelect
                  label="Configuration / Unit Type"
                  value={form.interestedUnitType}
                  onChange={val => setForm(p => ({ ...p, interestedUnitType: val }))}
                  options={[
                    { value: '1BHK', label: '1 BHK Apartment', icon: '🏠' },
                    { value: '2BHK', label: '2 BHK Apartment', icon: '🏡' },
                    { value: '3BHK', label: '3 BHK Apartment', icon: '🏢' },
                    { value: '4BHK', label: '4 BHK Luxury', icon: '🏰' },
                    { value: 'Villa / Row House', label: 'Villa / Row House', icon: '🏘️' },
                    { value: 'Plotted Layout', label: 'Plotted Layout (30x40 / 40x60)', icon: '📐' },
                    { value: 'Managed Farmlands', label: 'Managed Farmlands (Acres)', icon: '🌳' },
                    { value: 'Agricultural Acreage', label: 'Agricultural Land', icon: '🌾' },
                    { value: 'Commercial Office / Retail', label: 'Commercial / Retail', icon: '🏬' },
                    { value: 'custom', label: '✏️ Enter Custom Category...', icon: '✏️' }
                  ]}
                />
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

              <CustomSelect
                label="Buyer Temperature"
                value={form.leadType}
                onChange={val => setForm(p => ({ ...p, leadType: val }))}
                options={[
                  { value: 'hot', label: 'Hot (Immediate Buyer — Ready to Book)', icon: '🔥', badge: 'HOT', badgeClass: 'badge-danger' },
                  { value: 'warm', label: 'Warm (1-3 Months Timeline)', icon: '⚡', badge: 'WARM', badgeClass: 'badge-warning' },
                  { value: 'cold', label: 'Cold (Exploring Pipeline)', icon: '❄️', badge: 'COLD', badgeClass: 'badge-gray' }
                ]}
              />
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
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" title="Detailed customer preferences, specific vastu, floor preference, or payment terms">
                Initial Notes / Requirements
              </label>
              <textarea
                className="form-input"
                style={{ height: 60, resize: 'none' }}
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Specific requirements (e.g. East facing, corner plot, immediate registration, loan approved)..."
                title="Buyer notes and specific instructions"
              />
            </div>

            {/* Assign Executive / Telecaller */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <CustomSelect
                label="Assign Executive / Telecaller"
                value={form.assignedTo}
                onChange={val => setForm(p => ({ ...p, assignedTo: val }))}
                options={[
                  { value: '', label: '-- Auto-Assign / None --', icon: '⚡' },
                  ...users
                    .filter(u => u.isActive !== false)
                    .map(u => ({
                      value: u._id,
                      label: u.name || u.email || 'Staff Member',
                      subtext: `${u.role ? u.role.replace(/_/g, ' ') : 'User'}${u.phone ? ' · ' + u.phone : ''}`,
                      avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=4f46e5&color=fff&size=64`
                    }))
                ]}
              />
            </div>

            {/* Direct Site Visit Scheduling Section */}
            <div style={{
              background: form.scheduleSiteVisit ? '#f0fdf4' : '#f8fafc',
              border: form.scheduleSiteVisit ? '1.5px solid #86efac' : '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 16,
              transition: 'all 0.2s ease'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
                color: form.scheduleSiteVisit ? '#15803d' : 'var(--text-primary)',
                userSelect: 'none'
              }}>
                <input
                  type="checkbox"
                  checked={form.scheduleSiteVisit}
                  onChange={e => setForm(p => ({ ...p, scheduleSiteVisit: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#16a34a', cursor: 'pointer' }}
                />
                <span>📅 Schedule Site Visit Directly (No need to add in another page)</span>
              </label>

              {form.scheduleSiteVisit && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #bbf7d0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>
                        Visit Date <span className="required">*</span>
                      </label>
                      <input
                        type="date"
                        className={`form-input ${fieldErrors.visitDate ? 'input-error' : ''}`}
                        style={{ height: 36, background: '#fff', fontSize: 12 }}
                        value={form.visitDate}
                        onChange={e => {
                          setForm(p => ({ ...p, visitDate: e.target.value }));
                          if (fieldErrors.visitDate) setFieldErrors(p => ({ ...p, visitDate: undefined }));
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                      {fieldErrors.visitDate && (
                        <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>{fieldErrors.visitDate}</div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>
                        Visit Time Slot
                      </label>
                      <CustomSelect
                        value={form.visitTime}
                        onChange={val => setForm(p => ({ ...p, visitTime: val }))}
                        options={[
                          { value: '09:30 AM', label: '09:30 AM (Morning Slot)' },
                          { value: '11:00 AM', label: '11:00 AM (Pre-Noon Slot)' },
                          { value: '02:00 PM', label: '02:00 PM (Afternoon Slot)' },
                          { value: '04:00 PM', label: '04:00 PM (Evening Golden Hour)' },
                          { value: '05:30 PM', label: '05:30 PM (Sunset Slot)' }
                        ]}
                      />
                    </div>
                  </div>

                  {projects.length > 0 && (
                    <div>
                      <CustomSelect
                        label="Project Location to Visit"
                        value={form.visitProject || form.interestedProject}
                        onChange={val => setForm(p => ({ ...p, visitProject: val }))}
                        options={[
                          { value: '', label: '-- Same as Interested Project --' },
                          ...projects.map(p => ({ value: p._id, label: p.name, icon: '📍' }))
                        ]}
                      />
                    </div>
                  )}

                  {users.length > 0 && (
                    <div>
                      <CustomSelect
                        label="Site Visit Executive / Telecaller"
                        value={form.visitExecutive}
                        onChange={val => setForm(p => ({ ...p, visitExecutive: val }))}
                        options={[
                          { value: '', label: '-- Use Lead Assigned Executive --', icon: '👤' },
                          ...users
                            .filter(u => u.isActive !== false)
                            .map(u => ({
                              value: u._id,
                              label: u.name || u.email || 'Staff Member',
                              subtext: `${u.role ? u.role.replace(/_/g, ' ') : 'User'}${u.phone ? ' · ' + u.phone : ''}`,
                              avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=16a34a&color=fff&size=64`
                            }))
                        ]}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={form.pickupRequired}
                        onChange={e => setForm(p => ({ ...p, pickupRequired: e.target.checked }))}
                        style={{ accentColor: '#16a34a' }}
                      />
                      <span>🚗 Company Cab / Pickup Required</span>
                    </label>
                  </div>

                  {form.pickupRequired && (
                    <input
                      className="form-input"
                      style={{ fontSize: 12, background: '#fff' }}
                      value={form.pickupLocation}
                      onChange={e => setForm(p => ({ ...p, pickupLocation: e.target.value }))}
                      placeholder="Enter pickup address / landmark (e.g. Near Metro Station / Airport)..."
                    />
                  )}

                  <input
                    className="form-input"
                    style={{ fontSize: 12, background: '#fff' }}
                    value={form.visitNotes}
                    onChange={e => setForm(p => ({ ...p, visitNotes: e.target.value }))}
                    placeholder="Site visit special instructions (e.g. Coming with family, interested in corner plot)..."
                  />
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} title="Discard and close modal">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} title="Validate and save lead into CRM database">
              {loading ? 'Creating...' : form.scheduleSiteVisit ? 'Create Lead & Schedule Visit' : 'Create Lead & Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
