import { useState } from 'react';
import {
  Eye, Edit, Play, Pause, Trash2, Building, DollarSign,
  Users, Target, TrendingUp, Calendar, ArrowRight, Plus
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/formatters';

const CAMPAIGN_KANBAN_COLUMNS = [
  { id: 'active', title: 'Active Campaigns', badge: 'badge-success', color: '#16a34a', bg: '#ecfdf5', icon: '🟢' },
  { id: 'paused', title: 'Paused / Standby', badge: 'badge-warning', color: '#d97706', bg: '#fffbeb', icon: '🟡' },
  { id: 'completed', title: 'Completed', badge: 'badge-gray', color: '#64748b', bg: '#f8fafc', icon: '⚪' },
  { id: 'draft', title: 'Draft / Planning', badge: 'badge-primary', color: '#2563eb', bg: '#eff6ff', icon: '🔵' },
];

const CAMPAIGN_TYPES = {
  meta_ads: { label: 'Meta Ads', icon: '📘' },
  google_ads: { label: 'Google Ads', icon: '🔍' },
  portal: { label: 'Portals', icon: '🏢' },
  property_portal: { label: 'Portals', icon: '🏢' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  website: { label: 'Website', icon: '🌐' },
  email: { label: 'Email', icon: '📧' },
  email_campaign: { label: 'Email', icon: '📧' },
  sms: { label: 'SMS', icon: '📱' },
  sms_campaign: { label: 'SMS', icon: '📱' },
  hoarding: { label: 'Outdoor', icon: '🏙️' },
  newspaper: { label: 'Print', icon: '📰' },
  other: { label: 'Other', icon: '📢' },
};

export default function CampaignKanbanView({
  campaigns,
  onCampaignClick,
  onEditCampaign,
  onToggleStatus,
  onDeleteCampaign,
  onStatusChange,
  onAddCampaign,
}) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = (e, colId) => {
    if (dragOverCol === colId) {
      setDragOverCol(null);
    }
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    setDragOverCol(null);
    setDraggedId(null);
    if (id && onStatusChange) {
      onStatusChange(id, targetStatus);
    }
  };

  return (
    <div className="kanban-board" style={{ gap: 16, height: 'calc(100vh - 240px)', paddingBottom: 10 }}>
      {CAMPAIGN_KANBAN_COLUMNS.map(col => {
        const colCampaigns = campaigns.filter(c => (c.status || 'active') === col.id);
        const colSpent = colCampaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
        const colRevenue = colCampaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);
        const isOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            className={`kanban-column ${isOver ? 'drag-over' : ''}`}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={e => handleDragLeave(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
            style={{
              flex: '0 0 320px',
              background: '#f8fafc',
              borderRadius: 10,
              border: isOver ? `2px dashed ${col.color}` : '1px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isOver ? `0 0 0 4px ${col.color}20` : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Column Header */}
            <div
              className="kanban-col-header"
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--card-border)',
                background: 'white',
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{col.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {col.title}
                </span>
                <span className="kanban-col-count" style={{ fontSize: 11, fontWeight: 700 }}>
                  {colCampaigns.length}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {colCampaigns.length > 0 && (
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                    {formatCurrency(colSpent)}
                  </div>
                )}
                {onAddCampaign && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ width: 22, height: 22, padding: 0, color: 'var(--primary)', borderRadius: 4, background: '#f1f5f9' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddCampaign(col.id);
                    }}
                    title={`Create campaign in ${col.title}`}
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Column Body */}
            <div
              className="kanban-col-body"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: isOver ? col.bg : 'transparent'
              }}
            >
              {colCampaigns.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px 12px',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    border: '1.5px dashed #cbd5e1',
                    borderRadius: 10,
                    background: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    margin: '4px 0'
                  }}
                >
                  <span>No campaigns in {col.title}</span>
                  {onAddCampaign && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: 11.5,
                        padding: '4px 10px',
                        height: 28,
                        gap: 4,
                        background: '#f8fafc',
                        borderColor: '#cbd5e1',
                        color: 'var(--primary)',
                        fontWeight: 600,
                        borderRadius: 8
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddCampaign(col.id);
                      }}
                    >
                      <Plus size={13} /> Add Campaign
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {colCampaigns.map(c => {
                    const typeConf = CAMPAIGN_TYPES[c.type] || { label: c.type || 'Campaign', icon: '📢' };
                    const spentPct = c.budget ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;
                    const isDragging = draggedId === c._id;

                  return (
                    <div
                      key={c._id}
                      className={`kanban-card ${isDragging ? 'dragging' : ''}`}
                      draggable={true}
                      onDragStart={e => handleDragStart(e, c._id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onCampaignClick(c)}
                      style={{
                        background: 'white',
                        border: '1px solid var(--card-border)',
                        borderRadius: 8,
                        padding: 14,
                        cursor: 'grab',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        opacity: isDragging ? 0.4 : 1,
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                      }}
                    >
                      {/* Top row: Type & Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#f1f5f9',
                            padding: '2px 7px',
                            borderRadius: 4,
                            color: '#334155'
                          }}
                        >
                          <span>{typeConf.icon}</span>
                          <span>{typeConf.label}</span>
                        </span>

                        <div
                          style={{ display: 'flex', gap: 4 }}
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ padding: 2, height: 22, width: 22, color: 'var(--primary)' }}
                            title="View Campaign Details"
                            onClick={() => onCampaignClick(c)}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ padding: 2, height: 22, width: 22, color: '#0284c7' }}
                            title="Edit Campaign"
                            onClick={() => onEditCampaign(c)}
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ padding: 2, height: 22, width: 22, color: 'var(--danger)' }}
                            title="Delete Campaign"
                            onClick={() => onDeleteCampaign(c._id, c.name)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Campaign Title */}
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>
                        {c.name}
                      </div>

                      {/* Project */}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                        <Building size={11} /> {c.project?.name || 'All Projects'}
                      </div>

                      {/* Budget vs Spent Progress */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>
                          <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(c.spent)}</span>
                          <span style={{ color: 'var(--text-muted)' }}>/ {formatCurrency(c.budget)} ({spentPct}%)</span>
                        </div>
                        <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${spentPct}%`, background: spentPct > 90 ? '#ef4444' : '#2563eb' }} />
                        </div>
                      </div>

                      {/* Metrics Footer */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 4,
                          paddingTop: 8,
                          borderTop: '1px solid #f1f5f9',
                          textAlign: 'center',
                          fontSize: 10
                        }}
                      >
                        <div style={{ background: '#f8fafc', padding: '4px 2px', borderRadius: 4 }}>
                          <div style={{ color: 'var(--text-muted)' }}>Leads</div>
                          <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-primary)' }}>{c.leads || 0}</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '4px 2px', borderRadius: 4 }}>
                          <div style={{ color: 'var(--text-muted)' }}>Bookings</div>
                          <div style={{ fontWeight: 800, fontSize: 12, color: '#16a34a' }}>{c.conversions || 0}</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '4px 2px', borderRadius: 4 }}>
                          <div style={{ color: 'var(--text-muted)' }}>Revenue</div>
                          <div style={{ fontWeight: 800, fontSize: 11, color: 'var(--primary)' }}>
                            {c.revenue >= 10000000 ? `₹${(c.revenue / 10000000).toFixed(1)}Cr` : c.revenue >= 100000 ? `₹${(c.revenue / 100000).toFixed(0)}L` : formatCurrency(c.revenue)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {onAddCampaign && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{
                      width: '100%',
                      fontSize: 11.5,
                      padding: '6px',
                      gap: 4,
                      color: 'var(--text-muted)',
                      border: '1px dashed #cbd5e1',
                      borderRadius: 8,
                      marginTop: 4,
                      background: '#fafbfc'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddCampaign(col.id);
                    }}
                  >
                    <Plus size={12} /> Add Campaign
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      );
    })}
    </div>
  );
}
