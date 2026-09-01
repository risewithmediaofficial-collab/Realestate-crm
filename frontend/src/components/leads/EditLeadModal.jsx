import { useState, useEffect } from 'react';
import { X, UserCheck, Sparkles, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { LEAD_STAGES, LEAD_SOURCES, LEAD_TYPES } from '../../utils/constants';
import CustomSelect from '../ui/CustomSelect';

export default function EditLeadModal({ lead, onClose, onUpdated }) {
  const { showNotification } = useUI();

  const [form, setForm] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    city: lead?.city || '',
    source: lead?.source || 'meta_ads',
    stage: lead?.stage || 'new',
    leadScore: lead?.leadScore || 50,
    leadType: lead?.leadType || 'warm',
    interestedProject: lead?.interestedProject?._id || lead?.interestedProject || '',
    interestedUnitType: lead?.interestedUnitType || '3BHK',
    budgetMin: lead?.budget?.min || 0,
    budgetMax: lead?.budget?.max || 0,
    assignedTo: lead?.assignedTo?._id || lead?.assignedTo || '',
    qualificationNotes: lead?.qualificationNotes || '',
    qualificationCriteria: {
      budgetConfirmed: true,
      timelineMonths: 'Within 30 Days',
      loanPreApproved: true,
      decisionMakerConfirmed: true
    }
  });

  const [projectsList, setProjectsList] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data } = await api.get('/projects');
        setProjectsList(data.data || []);
      } catch {}
    };
    loadProjects();
  }, []);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  const handleScoreChange = (score) => {
    let type = 'cold';
    if (score >= 70) type = 'hot';
    else if (score >= 40) type = 'warm';
    setForm(p => ({ ...p, leadScore: score, leadType: type }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const updatedLeadData = {
      ...lead,
      name: form.name,
      phone: form.phone,
      email: form.email,
      city: form.city,
      source: form.source,
      stage: form.stage,
      leadScore: Number(form.leadScore),
      leadType: form.leadType,
      interestedProject: { name: form.interestedProject },
      interestedUnitType: form.interestedUnitType,
      budget: { min: Number(form.budgetMin), max: Number(form.budgetMax) },
      assignedTo: { name: form.assignedTo },
      qualificationNotes: form.qualificationNotes,
      qualificationCriteria: form.qualificationCriteria,
      lastActivityAt: new Date()
    };

    try {
      await api.put(`/leads/${lead._id}`, updatedLeadData);
    } catch {}

    setSaving(false);
    onUpdated(updatedLeadData);
    showNotification(`Lead "${form.name}" updated successfully!`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Edit Lead Details & Disposition</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lead ID: #{lead._id}</div>
          </div>
          <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Primary Details */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number <span className="required">*</span></label>
                <input
                  className="form-input"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  className="form-input"
                  value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                />
              </div>
            </div>

            {/* Pipeline Stage & Assigned To */}
            <div className="form-row" style={{ marginBottom: 14 }}>
              <CustomSelect
                label="Lead Pipeline Stage"
                required={true}
                value={form.stage}
                onChange={val => setForm(p => ({ ...p, stage: val }))}
                options={Object.entries(LEAD_STAGES).map(([k, v]) => ({
                  value: k,
                  label: v.label,
                  icon: '📊'
                }))}
              />
              <CustomSelect
                label="Assigned Sales Executive"
                value={form.assignedTo}
                onChange={val => setForm(p => ({ ...p, assignedTo: val }))}
                options={[
                  { value: '', label: '-- Auto-Assign / None --', icon: '⚡' },
                  { value: 'Amit Singh', label: 'Amit Singh', avatar: 'https://ui-avatars.com/api/?name=Amit+Singh&background=4f46e5&color=fff&size=64' },
                  { value: 'Neha Patel', label: 'Neha Patel', avatar: 'https://ui-avatars.com/api/?name=Neha+Patel&background=ec4899&color=fff&size=64' },
                  { value: 'Ravi Verma', label: 'Ravi Verma', avatar: 'https://ui-avatars.com/api/?name=Ravi+Verma&background=0284c7&color=fff&size=64' },
                  { value: 'Priya Sharma', label: 'Priya Sharma', avatar: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=10b981&color=fff&size=64' }
                ]}
              />
            </div>

            {/* If Stage is Qualified or being qualified */}
            {form.stage === 'qualified' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                  <UserCheck size={16} /> Qualified Opportunity Details & Criteria
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12, marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.qualificationCriteria.budgetConfirmed}
                      onChange={e => setForm(p => ({ ...p, qualificationCriteria: { ...p.qualificationCriteria, budgetConfirmed: e.target.checked } }))}
                      style={{ accentColor: 'var(--success)' }}
                    />
                    <span>Budget Verified & Matches</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.qualificationCriteria.loanPreApproved}
                      onChange={e => setForm(p => ({ ...p, qualificationCriteria: { ...p.qualificationCriteria, loanPreApproved: e.target.checked } }))}
                      style={{ accentColor: 'var(--success)' }}
                    />
                    <span>Home Loan Pre-Approved / Ready Funds</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.qualificationCriteria.decisionMakerConfirmed}
                      onChange={e => setForm(p => ({ ...p, qualificationCriteria: { ...p.qualificationCriteria, decisionMakerConfirmed: e.target.checked } }))}
                      style={{ accentColor: 'var(--success)' }}
                    />
                    <span>Decision Maker Engaged</span>
                  </label>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Purchase Timeline:</span>
                    <CustomSelect
                      size="sm"
                      value={form.qualificationCriteria.timelineMonths}
                      onChange={val => setForm(p => ({ ...p, qualificationCriteria: { ...p.qualificationCriteria, timelineMonths: val } }))}
                      options={[
                        { value: 'Immediate / Within 15 Days', label: 'Immediate / Within 15 Days', icon: '🔥' },
                        { value: 'Within 30 Days', label: 'Within 30 Days', icon: '⚡' },
                        { value: '1 - 3 Months', label: '1 - 3 Months', icon: '📅' },
                        { value: 'Planning / 6+ Months', label: 'Planning / 6+ Months', icon: '⏳' }
                      ]}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>Qualification Notes & Client Requirements</label>
                  <textarea
                    className="form-input"
                    style={{ height: 60, resize: 'none', fontSize: 12 }}
                    placeholder="Enter buyer requirements, family preferences, preferred floor / facing..."
                    value={form.qualificationNotes}
                    onChange={e => setForm(p => ({ ...p, qualificationNotes: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Score & Category */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Lead Score & Priority:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: form.leadScore >= 70 ? 'var(--danger)' : form.leadScore >= 40 ? 'var(--warning)' : 'var(--info)' }}>
                    {form.leadScore} / 100
                  </span>
                  <span className={`badge ${form.leadType === 'hot' ? 'badge-hot' : form.leadType === 'warm' ? 'badge-warm' : 'badge-cold'}`}>
                    {form.leadType.toUpperCase()}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={form.leadScore}
                onChange={e => handleScoreChange(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: form.leadScore >= 70 ? '#ef4444' : form.leadScore >= 40 ? '#f59e0b' : '#3b82f6' }}
              />
            </div>

            {/* Project & Unit Type */}
            <div className="form-row" style={{ marginBottom: 14 }}>
              <CustomSelect
                label="Interested Project"
                value={form.interestedProject}
                onChange={val => setForm(p => ({ ...p, interestedProject: val }))}
                searchable={true}
                placeholder="-- Select Project (Optional) --"
                options={[
                  { value: '', label: '-- Select Project (Optional) --' },
                  ...projectsList.map(p => ({
                    value: p._id,
                    label: p.name,
                    subtext: p.city || p.code || 'Active Project',
                    icon: '🏢'
                  }))
                ]}
              />
              <CustomSelect
                label="Unit Configuration"
                value={form.interestedUnitType}
                onChange={val => setForm(p => ({ ...p, interestedUnitType: val }))}
                options={[
                  { value: '1BHK', label: '1 BHK Apartment', icon: '🏠' },
                  { value: '2BHK', label: '2 BHK Apartment', icon: '🏡' },
                  { value: '3BHK', label: '3 BHK Apartment', icon: '🏢' },
                  { value: '4BHK', label: '4 BHK Luxury', icon: '🏰' },
                  { value: 'Penthouse', label: 'Sky Penthouse', icon: '✨' },
                  { value: 'Office Suite', label: 'Commercial Office Suite', icon: '🏬' }
                ]}
              />
            </div>

            {/* Budget Range */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Budget Min (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.budgetMin}
                  onChange={e => setForm(p => ({ ...p, budgetMin: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Budget Max (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.budgetMax}
                  onChange={e => setForm(p => ({ ...p, budgetMax: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving Changes...' : 'Save & Update Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
