import { useState, useEffect } from 'react';
import { X, DollarSign, Target, Calendar, Layers, Tag, FileText, CheckCircle2, Megaphone } from 'lucide-react';

const CAMPAIGN_TYPES = {
  meta_ads: { label: 'Meta Ads (Facebook & Instagram)', icon: '📘' },
  google_ads: { label: 'Google Search & Display Ads', icon: '🔍' },
  portal: { label: 'Property Portals (99acres, MagicBricks, Housing)', icon: '🏢' },
  whatsapp: { label: 'WhatsApp Broadcast & Direct Chat Ads', icon: '💬' },
  website: { label: 'Developer Website Landing Page Forms', icon: '🌐' },
  email: { label: 'Email Marketing & Nurturing Blast', icon: '📧' },
  sms: { label: 'SMS Blast & Bulk Messaging', icon: '📱' },
  hoarding: { label: 'Outdoor Billboards & Hoardings', icon: '🏙️' },
  newspaper: { label: 'Print Media & Newspaper Inserts', icon: '📰' },
  other: { label: 'Other Custom Marketing Channel', icon: '📢' },
};

export default function CampaignModal({
  isOpen,
  onClose,
  onSave,
  campaign = null,
  projects = [],
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'meta_ads',
    project: '',
    status: 'active',
    startDate: '',
    endDate: '',
    budget: '350000',
    spent: '0',
    revenue: '0',
    impressions: '0',
    clicks: '0',
    leads: '0',
    conversions: '0',
    externalCampaignId: '',
    description: '',
    tagsString: '',
  });

  const [saving, setSaving] = useState(false);

  // Initialize or reset form when modal opens or campaign changes
  useEffect(() => {
    if (campaign) {
      // Format dates to YYYY-MM-DD for input[type="date"]
      const formatForInput = (d) => {
        if (!d) return '';
        try {
          const dateObj = new Date(d);
          if (isNaN(dateObj.getTime())) return '';
          return dateObj.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setFormData({
        name: campaign.name || '',
        type: campaign.type || 'meta_ads',
        project: campaign.project?._id || campaign.project || '',
        status: campaign.status || 'active',
        startDate: formatForInput(campaign.startDate),
        endDate: formatForInput(campaign.endDate),
        budget: campaign.budget?.toString() || '0',
        spent: campaign.spent?.toString() || '0',
        revenue: campaign.revenue?.toString() || '0',
        impressions: campaign.impressions?.toString() || '0',
        clicks: campaign.clicks?.toString() || '0',
        leads: campaign.leads?.toString() || '0',
        conversions: campaign.conversions?.toString() || '0',
        externalCampaignId: campaign.externalCampaignId || '',
        description: campaign.description || '',
        tagsString: Array.isArray(campaign.tags) ? campaign.tags.join(', ') : (campaign.tags || ''),
      });
    } else {
      setFormData({
        name: '',
        type: 'meta_ads',
        project: projects.length > 0 ? projects[0]._id : '',
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0],
        budget: '350000',
        spent: '0',
        revenue: '0',
        impressions: '0',
        clicks: '0',
        leads: '0',
        conversions: '0',
        externalCampaignId: '',
        description: '',
        tagsString: 'Luxury, NRI, HighIntent',
      });
    }
  }, [campaign, isOpen, projects]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const tags = formData.tagsString
      ? formData.tagsString.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
      : [];

    const payload = {
      name: formData.name.trim(),
      type: formData.type,
      status: formData.status,
      budget: Number(formData.budget) || 0,
      spent: Number(formData.spent) || 0,
      revenue: Number(formData.revenue) || 0,
      impressions: Number(formData.impressions) || 0,
      clicks: Number(formData.clicks) || 0,
      leads: Number(formData.leads) || 0,
      conversions: Number(formData.conversions) || 0,
      externalCampaignId: formData.externalCampaignId.trim(),
      description: formData.description.trim(),
      tags,
    };

    if (formData.project && formData.project !== 'none') {
      payload.project = formData.project;
    } else {
      payload.project = null;
    }

    if (formData.startDate) payload.startDate = formData.startDate;
    if (formData.endDate) payload.endDate = formData.endDate;

    try {
      await onSave(payload, campaign?._id);
      onClose();
    } catch (err) {
      console.error('Save campaign failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 720, maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header" style={{ padding: '18px 24px', background: '#f8fafc', borderBottom: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Megaphone size={18} />
            </div>
            <div>
              <div className="modal-title" style={{ fontSize: 16, fontWeight: 800 }}>
                {campaign ? `Edit Campaign: ${campaign.name}` : 'Launch Performance Ad Campaign'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {campaign ? 'Update campaign parameters, budget allocation, and live metrics' : 'Setup target audience, budget, schedule, and attribution channels'}
              </div>
            </div>
          </div>
          <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* Section 1: General Info */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={13} color="var(--primary)" /> 1. Campaign Identity & Channel
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Campaign Name <span className="required">*</span></label>
                <input
                  className="form-input"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Pune West Launch Meta Ads - Q3 2026"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Marketing Platform Channel <span className="required">*</span></label>
                  <select className="form-select" name="type" value={formData.type} onChange={handleChange} required>
                    {Object.entries(CAMPAIGN_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Real Estate Project</label>
                  <select className="form-select" name="project" value={formData.project} onChange={handleChange}>
                    <option value="none">— All Projects (Universal / Portfolio) —</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} {p.city ? `(${p.city})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Campaign Delivery Status</label>
                  <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                    <option value="active">Active (Delivering)</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="draft">Draft / Planning</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">External AdSet / Campaign ID</label>
                  <input
                    className="form-input"
                    name="externalCampaignId"
                    value={formData.externalCampaignId}
                    onChange={handleChange}
                    placeholder="e.g. act_829374921_adset_90"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Schedule & Timeline */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} color="var(--primary)" /> 2. Schedule & Duration
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Campaign Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Campaign End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Financial Budget & Revenue Target */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <DollarSign size={13} color="#16a34a" /> 3. Financials & Revenue Target
              </div>

              <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="form-group">
                  <label className="form-label">Allocated Budget (₹) <span className="required">*</span></label>
                  <input
                    type="number"
                    className="form-input"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Actual Spent (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    name="spent"
                    value={formData.spent}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Attributed Revenue (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    name="revenue"
                    value={formData.revenue}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Performance & Conversion Metrics */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={13} color="#8b5cf6" /> 4. Live Ad Metrics & Lead Output
              </div>

              <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="form-group">
                  <label className="form-label">Impressions</label>
                  <input
                    type="number"
                    className="form-input"
                    name="impressions"
                    value={formData.impressions}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Clicks / Visits</label>
                  <input
                    type="number"
                    className="form-input"
                    name="clicks"
                    value={formData.clicks}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Leads Ingested</label>
                  <input
                    type="number"
                    className="form-input"
                    name="leads"
                    value={formData.leads}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deals Closed</label>
                  <input
                    type="number"
                    className="form-input"
                    name="conversions"
                    value={formData.conversions}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Audience Tags & Strategy Notes */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag size={13} color="var(--text-primary)" /> 5. Targeting Tags & Strategy Notes
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Audience Targeting Tags (comma separated)</label>
                <input
                  className="form-input"
                  name="tagsString"
                  value={formData.tagsString}
                  onChange={handleChange}
                  placeholder="e.g. HNI, 3BHK, NRI, Pune West, IT Professionals"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Campaign Description & Creative Strategy</label>
                <textarea
                  className="form-input"
                  rows={2}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Briefly describe key USP highlights, ad hook, targeting angles, or offer details..."
                />
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid var(--card-border)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving Changes...' : campaign ? 'Save & Update Campaign' : '🚀 Launch Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
