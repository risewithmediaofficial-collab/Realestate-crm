import { useState, useEffect } from 'react';
import {
  GitBranch, Filter, Plus, Phone, MessageSquare,
  Calendar, DollarSign, ChevronRight, ArrowRight, Clock,
  AlertCircle, CheckCircle, Search
} from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { LEAD_STAGES, PIPELINE_STAGES } from '../../utils/constants';
import { formatCurrency, timeAgo, getInitials } from '../../utils/formatters';
import CustomSelect from '../../components/ui/CustomSelect';

const mockPipelineLeads = [];

export default function SalesPipelinePage() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Fetch real leads from API if available
  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/leads');
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          setLeads(data.data.map(l => ({
            _id: l._id,
            name: l.name,
            phone: l.phone,
            stage: l.stage || 'new',
            project: l.interestedProject?.name || '—',
            budgetVal: l.budget?.max || 9500000,
            daysInStage: 1,
            agent: l.assignedTo?.name || 'Unassigned',
            score: l.leadScore || 50,
            type: l.leadType || 'warm'
          })));
        } else {
          setLeads([]);
        }
      } catch (err) {
        console.error('Failed to fetch pipeline leads:', err);
        setLeads([]);
      }
    };
    fetch();
  }, []);

  const [draggedId, setDraggedId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const { openCreateLead, showNotification } = useUI();

  const moveStage = async (leadId, nextStage) => {
    const lead = leads.find(l => l._id === leadId);
    const nextStageConf = LEAD_STAGES[nextStage] || { label: nextStage };
    try {
      await api.put(`/leads/${leadId}/stage`, { stage: nextStage });
    } catch {}
    setLeads(prev => prev.map(l => l._id === leadId ? { ...l, stage: nextStage } : l));
    showNotification(`Deal "${lead?.name || 'Lead'}" moved to ${nextStageConf.label}!`);
  };

  const handleDragStart = (e, lead) => {
    e.dataTransfer.setData('text/plain', lead._id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(lead._id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stage) {
      setDragOverStage(stage);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e, stage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedId;
    if (leadId) {
      moveStage(leadId, stage);
    }
    setDraggedId(null);
    setDragOverStage(null);
  };

  const filtered = leads.filter(l => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (projectFilter && !l.project.includes(projectFilter)) return false;
    return true;
  });

  const totalPipelineValue = filtered.reduce((acc, l) => acc + (l.budgetVal || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Sales</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Deal Pipeline</span>
          </div>
          <h1 className="page-title">Sales Pipeline & Opportunity Stages</h1>
          <p className="page-subtitle">Drag and drop deal cards to instantly advance pipeline stages with weighted forecasting</p>
        </div>
        <div className="page-actions">
          <div style={{ textAlign: 'right', marginRight: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pipeline Value</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(totalPipelineValue)}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="filter-search" style={{ flex: 1 }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            placeholder="Search deals, buyer name, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <CustomSelect
          variant="filter"
          value={projectFilter}
          onChange={val => setProjectFilter(val)}
          options={[
            { value: '', label: 'All Projects', icon: '🏢' },
            { value: 'Green Valley', label: 'Green Valley Residences', icon: '🏡' },
            { value: 'Skyline', label: 'Skyline Tower Commercial', icon: '🏢' }
          ]}
        />
      </div>

      {/* Full Kanban Stages */}
      <div className="kanban-board" style={{ height: 'calc(100vh - 250px)', overflowX: 'auto', display: 'flex', gap: 14 }}>
        {PIPELINE_STAGES.map((stageKey, idx) => {
          const stageConf = LEAD_STAGES[stageKey] || { label: stageKey };
          const stageLeads = filtered.filter(l => l.stage === stageKey);
          const stageValue = stageLeads.reduce((acc, l) => acc + (l.budgetVal || 0), 0);
          const nextStageKey = PIPELINE_STAGES[idx + 1];
          const isOver = dragOverStage === stageKey;

          return (
            <div
              key={stageKey}
              className={`kanban-column ${isOver ? 'drag-over' : ''}`}
              style={{ minWidth: 280, maxWidth: 300 }}
              onDragOver={(e) => handleDragOver(e, stageKey)}
              onDragEnter={(e) => handleDragOver(e, stageKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stageKey)}
            >
              <div className="kanban-col-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="kanban-col-title" style={{ fontSize: 13, fontWeight: 700 }}>
                    {stageConf.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatCurrency(stageValue)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="kanban-col-count">{stageLeads.length}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ width: 22, height: 22, padding: 0, color: 'var(--primary)', borderRadius: 4, background: '#f1f5f9' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openCreateLead();
                    }}
                    title={`Add deal to ${stageConf.label}`}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              <div className="kanban-col-body">
                {stageLeads.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '24px 12px',
                    color: isOver ? 'var(--primary)' : 'var(--text-muted)',
                    fontSize: 12,
                    border: isOver ? '1.5px dashed var(--primary)' : '1.5px dashed #cbd5e1',
                    borderRadius: 10,
                    background: isOver ? 'rgba(37, 99, 235, 0.05)' : 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    margin: '4px 0',
                    transition: 'all 0.2s ease'
                  }}>
                    <span>{isOver ? '🎯 Drop deal here' : `No active deals in ${stageConf.label}`}</span>
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
                        openCreateLead();
                      }}
                    >
                      <Plus size={13} /> Add Deal
                    </button>
                  </div>
                ) : (
                  <>
                    {stageLeads.map(lead => {
                      const isDragging = draggedId === lead._id;
                      return (
                        <div
                          key={lead._id}
                          className={`kanban-card ${isDragging ? 'dragging' : ''}`}
                          style={{ padding: 14 }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead)}
                          onDragEnd={handleDragEnd}
                          title="Drag and drop to advance deal stage"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{lead.name}</div>
                            <span className={`badge ${lead.type === 'hot' ? 'badge-danger' : lead.type === 'warm' ? 'badge-warning' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                              {lead.type.toUpperCase()} ({lead.score})
                            </span>
                          </div>

                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                            {lead.project}
                          </div>

                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
                            {formatCurrency(lead.budgetVal)}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                            <span>👤 {lead.agent}</span>
                            <span>⏱️ {lead.daysInStage}d in stage</span>
                          </div>

                          {/* Advance Stage Button */}
                          {nextStageKey && (
                            <button
                              className="btn btn-secondary btn-sm w-full"
                              style={{ marginTop: 10, justifyContent: 'center', fontSize: 11, padding: '4px 8px' }}
                              onClick={() => moveStage(lead._id, nextStageKey)}
                            >
                              Advance to {LEAD_STAGES[nextStageKey]?.label} <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
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
                        openCreateLead();
                      }}
                    >
                      <Plus size={12} /> Add Deal
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
