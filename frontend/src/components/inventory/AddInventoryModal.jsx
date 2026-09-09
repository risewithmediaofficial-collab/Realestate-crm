import React, { useState, useMemo } from 'react';
import { X, Sparkles, Plus, Image as ImageIcon, ChevronDown, ChevronUp, Layers, Check, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { formatCurrency } from '../../utils/formatters';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

const FACING_OPTIONS = [
  { value: 'east', label: '🌅 East Facing' },
  { value: 'north', label: '🧭 North Facing' },
  { value: 'west', label: '🌇 West Facing' },
  { value: 'south', label: '☀️ South Facing' },
  { value: 'north-east', label: '✨ North-East (Ishan)' },
  { value: 'north-west', label: '🌬️ North-West' },
  { value: 'south-east', label: '🔥 South-East (Agni)' },
  { value: 'south-west', label: '⛰️ South-West' },
];

const STATUS_OPTIONS = [
  { value: 'available', label: '🟢 Available' },
  { value: 'on_hold', label: '🟡 On Hold (48h)' },
  { value: 'booked', label: '🟣 Booked' },
  { value: 'blocked', label: '🔴 Blocked' },
];

export default function AddInventoryModal({ project, onClose, onUnitAdded }) {
  useBodyScrollLock(true);
  const { showNotification } = useUI();
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Property categorization
  const projectType = project?.type || 'plots';
  const isAgriOrFarm = ['agricultural_land', 'farmland', 'resort_plots'].includes(projectType);
  const isPlot = ['plots', 'layouts'].includes(projectType);
  const isApartment = ['residential_apartment', 'commercial_office', 'retail_shop', 'industrial_warehouse'].includes(projectType);
  const isVilla = projectType === 'villa';

  const unitNoun = isApartment ? 'Flat / Unit' : isVilla ? 'Villa' : isAgriOrFarm ? 'Farm Plot' : 'Plot';

  // ----------------------------------------------------
  // SINGLE UNIT FORM STATE (Simple & Intuitive)
  // ----------------------------------------------------
  const [singleForm, setSingleForm] = useState({
    unitNumber: '',
    block: '',
    extent: '1200',
    unit: 'sqft',
    facing: 'east',
    ratePerSqFt: '2000',
    totalPrice: '2400000',
    status: 'available',
    isCorner: false,
    image: '',
    // Optional advanced fields
    roadWidth: '30',
    waterSource: 'borewell',
    electricity: 'available',
    soilType: 'red_soil',
    treesCount: '',
    otherCharges: '0',
    remarks: ''
  });

  // Calculate Sq.Ft from extent & unit
  const calculatedSqFt = useMemo(() => {
    const num = parseFloat(singleForm.extent) || 0;
    if (singleForm.unit === 'cent') return Math.round(num * 435.6);
    if (singleForm.unit === 'acre') return Math.round(num * 43560);
    if (singleForm.unit === 'sqyard') return Math.round(num * 9);
    if (singleForm.unit === 'ground') return Math.round(num * 2400);
    return num;
  }, [singleForm.extent, singleForm.unit]);

  // Handle extent or rate change for auto price
  const handleSingleFieldChange = (field, value) => {
    setSingleForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'extent' || field === 'unit' || field === 'ratePerSqFt') {
        const ext = parseFloat(field === 'extent' ? value : next.extent) || 0;
        const u = field === 'unit' ? value : next.unit;
        let sqft = ext;
        if (u === 'cent') sqft = ext * 435.6;
        else if (u === 'acre') sqft = ext * 43560;
        else if (u === 'sqyard') sqft = ext * 9;
        else if (u === 'ground') sqft = ext * 2400;

        const rate = parseFloat(field === 'ratePerSqFt' ? value : next.ratePerSqFt) || 0;
        next.totalPrice = Math.round(sqft * rate).toString();
      }
      return next;
    });
    if (error) setError('');
  };

  // ----------------------------------------------------
  // BULK GENERATOR FORM STATE (1-Click Generation)
  // ----------------------------------------------------
  const [bulkForm, setBulkForm] = useState({
    prefix: isApartment ? 'Flat-' : 'Plot-',
    fromNum: '1',
    toNum: '20',
    block: 'Phase 1',
    extent: '1200',
    unit: 'sqft',
    facing: 'east',
    ratePerSqFt: '2000',
    status: 'available'
  });

  const bulkCount = useMemo(() => {
    const from = parseInt(bulkForm.fromNum, 10) || 0;
    const to = parseInt(bulkForm.toNum, 10) || 0;
    return to >= from ? to - from + 1 : 0;
  }, [bulkForm.fromNum, bulkForm.toNum]);

  const bulkCalculatedSqFt = useMemo(() => {
    const num = parseFloat(bulkForm.extent) || 0;
    if (bulkForm.unit === 'cent') return Math.round(num * 435.6);
    if (bulkForm.unit === 'acre') return Math.round(num * 43560);
    return num;
  }, [bulkForm.extent, bulkForm.unit]);

  const bulkPricePerUnit = useMemo(() => {
    const rate = parseFloat(bulkForm.ratePerSqFt) || 0;
    return Math.round(bulkCalculatedSqFt * rate);
  }, [bulkCalculatedSqFt, bulkForm.ratePerSqFt]);

  // ----------------------------------------------------
  // SUBMIT HANDLERS
  // ----------------------------------------------------
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!singleForm.unitNumber.trim()) {
      setError(`Please enter a ${unitNoun} number (e.g. Plot 101).`);
      return;
    }
    if (!singleForm.extent || parseFloat(singleForm.extent) <= 0) {
      setError('Please enter a valid area / size.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        project: project._id,
        unitNumber: singleForm.unitNumber.trim(),
        block: singleForm.block.trim() || 'Main',
        tower: singleForm.block.trim() || 'Main',
        propertyType: projectType,
        type: isApartment ? 'Flat' : isVilla ? 'Villa' : 'Plot',
        facing: singleForm.facing,
        status: singleForm.status,
        isCorner: singleForm.isCorner,
        area: {
          extent: parseFloat(singleForm.extent),
          unit: singleForm.unit,
          sqft: calculatedSqFt,
          plotArea: calculatedSqFt,
          superBuiltUp: calculatedSqFt
        },
        pricing: {
          baseRate: parseFloat(singleForm.ratePerSqFt) || 0,
          rateType: 'per_sqft',
          basePrice: parseFloat(singleForm.totalPrice) || 0,
          totalPrice: parseFloat(singleForm.totalPrice) || 0,
          totalPackagePrice: parseFloat(singleForm.totalPrice) || 0
        },
        image: singleForm.image || '',
        images: singleForm.image ? [singleForm.image] : [],
        physicalDetails: {
          facing: singleForm.facing,
          roadWidth: parseFloat(singleForm.roadWidth) || 30,
          isCorner: singleForm.isCorner,
          waterSource: singleForm.waterSource,
          electricity: singleForm.electricity
        },
        agriculturalDetails: isAgriOrFarm ? {
          soilType: singleForm.soilType,
          treesCount: parseInt(singleForm.treesCount, 10) || 0
        } : undefined
      };

      const { data } = await api.post('/inventory', payload);
      showNotification(`✅ ${unitNoun} "${payload.unitNumber}" added successfully!`, 'success');
      if (onUnitAdded) onUnitAdded(data.data || data);
      onClose();
    } catch (err) {
      console.error('Failed to create unit:', err);
      setError(err.response?.data?.message || err.message || 'Failed to add inventory unit.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const from = parseInt(bulkForm.fromNum, 10);
    const to = parseInt(bulkForm.toNum, 10);

    if (isNaN(from) || isNaN(to) || to < from) {
      setError('Please enter a valid "From" and "To" range (e.g. 1 to 20).');
      return;
    }
    if (bulkCount > 100) {
      setError('Bulk creation is capped at 100 plots per batch for safety.');
      return;
    }

    setSaving(true);
    try {
      const units = [];
      const prefix = bulkForm.prefix.trim();

      for (let i = from; i <= to; i++) {
        const uNum = `${prefix}${i}`;
        units.push({
          unitNumber: uNum,
          block: bulkForm.block.trim() || 'Main',
          tower: bulkForm.block.trim() || 'Main',
          propertyType: projectType,
          type: isApartment ? 'Flat' : isVilla ? 'Villa' : 'Plot',
          facing: bulkForm.facing,
          status: bulkForm.status,
          area: {
            extent: parseFloat(bulkForm.extent),
            unit: bulkForm.unit,
            sqft: bulkCalculatedSqFt,
            plotArea: bulkCalculatedSqFt,
            superBuiltUp: bulkCalculatedSqFt
          },
          pricing: {
            baseRate: parseFloat(bulkForm.ratePerSqFt) || 0,
            rateType: 'per_sqft',
            totalPrice: bulkPricePerUnit,
            totalPackagePrice: bulkPricePerUnit
          }
        });
      }

      const { data } = await api.post('/inventory/bulk', {
        project: project._id,
        units
      });

      showNotification(`🚀 ${data.message || `Created ${units.length} plots successfully!`}`, 'success');
      if (onUnitAdded) onUnitAdded(data.data?.[0] || { project: project._id });
      onClose();
    } catch (err) {
      console.error('Failed bulk unit creation:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create bulk inventory.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 680,
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          background: '#ffffff',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid #edf2f7',
          background: '#fcfdfa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#172a11', letterSpacing: '-0.01em' }}>
                Add {unitNoun} Inventory
              </span>
              <span style={{
                background: '#edf7e8',
                color: '#326518',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
                border: '1px solid #d4e8cb'
              }}>
                {project?.name || 'Project'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Quick &amp; simple inventory setup for your project
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            style={{ borderRadius: '50%', color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Tabs: Single vs Bulk */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '4px 16px 0',
          gap: 8
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: 13,
              border: 'none',
              background: 'transparent',
              color: activeTab === 'single' ? '#326518' : '#64748b',
              borderBottom: activeTab === 'single' ? '2.5px solid #458522' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={15} /> Single {unitNoun}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: 13,
              border: 'none',
              background: 'transparent',
              color: activeTab === 'bulk' ? '#326518' : '#64748b',
              borderBottom: activeTab === 'bulk' ? '2.5px solid #458522' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Sparkles size={15} /> ⚡ Bulk Generate ({unitNoun}s 1 to 20+)
          </button>
        </div>

        {/* Error Notice */}
        {error && (
          <div style={{
            margin: '12px 20px 0',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'single' ? (
            /* ==================================================== */
            /* SINGLE UNIT FORM (Simple & Fast)                     */
            /* ==================================================== */
            <form id="single-inventory-form" onSubmit={handleSingleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Row 1: Number & Block */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    {unitNoun} Number <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={singleForm.unitNumber}
                    onChange={e => handleSingleFieldChange('unitNumber', e.target.value)}
                    placeholder={isApartment ? 'e.g. Flat 302, A-401' : 'e.g. Plot 12, Site 105'}
                    required
                    autoFocus
                    style={{ fontSize: 13.5, fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    Block / Sector / Phase <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    className="form-input"
                    value={singleForm.block}
                    onChange={e => handleSingleFieldChange('block', e.target.value)}
                    placeholder="e.g. Phase 1, Sector A, East Block"
                    style={{ fontSize: 13.5 }}
                  />
                </div>
              </div>

              {/* Row 2: Area Size, Unit, Facing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    Area Size <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    className="form-input"
                    value={singleForm.extent}
                    onChange={e => handleSingleFieldChange('extent', e.target.value)}
                    placeholder="e.g. 1200"
                    required
                    style={{ fontSize: 13.5, fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    Unit
                  </label>
                  <select
                    className="form-input"
                    value={singleForm.unit}
                    onChange={e => handleSingleFieldChange('unit', e.target.value)}
                    style={{ fontSize: 13, cursor: 'pointer', background: '#ffffff' }}
                  >
                    <option value="sqft">Sq.Ft</option>
                    <option value="cent">Cents (435.6 sq.ft)</option>
                    <option value="acre">Acres (43,560 sq.ft)</option>
                    <option value="sqyard">Sq.Yards</option>
                    <option value="ground">Grounds (2,400 sq.ft)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    Facing Direction
                  </label>
                  <select
                    className="form-input"
                    value={singleForm.facing}
                    onChange={e => handleSingleFieldChange('facing', e.target.value)}
                    style={{ fontSize: 13, cursor: 'pointer', background: '#ffffff' }}
                  >
                    {FACING_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Helper badge for total sq.ft */}
              {singleForm.unit !== 'sqft' && (
                <div style={{ fontSize: 12, color: '#458522', fontWeight: 600, background: '#f2f9ed', padding: '5px 10px', borderRadius: 6 }}>
                  📐 Equivalent Total Area: <strong>{calculatedSqFt.toLocaleString('en-IN')} Sq.Ft</strong>
                </div>
              )}

              {/* Row 3: Pricing (Rate & Total) */}
              <div style={{
                background: '#f9fbf8',
                border: '1px solid #dcebda',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1.3fr',
                gap: 14,
                alignItems: 'center'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#172a11', marginBottom: 5 }}>
                    Base Rate (₹ / sq.ft) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="form-input"
                    value={singleForm.ratePerSqFt}
                    onChange={e => handleSingleFieldChange('ratePerSqFt', e.target.value)}
                    placeholder="e.g. 2000"
                    required
                    style={{ fontSize: 14, fontWeight: 700, background: '#ffffff' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 800, color: '#15803d' }}>
                      Total Price (₹)
                    </label>
                    <span style={{ fontSize: 11, color: '#64748b' }}>⚡ Auto-calculated</span>
                  </div>
                  <input
                    type="number"
                    className="form-input"
                    value={singleForm.totalPrice}
                    onChange={e => handleSingleFieldChange('totalPrice', e.target.value)}
                    placeholder="Total price"
                    required
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#15803d',
                      background: '#ffffff',
                      border: '1.5px solid #86efac'
                    }}
                  />
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                    In words: <strong>{formatCurrency(parseFloat(singleForm.totalPrice) || 0)}</strong>
                  </div>
                </div>
              </div>

              {/* Row 4: Status & Corner Plot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    Status
                  </label>
                  <select
                    className="form-input"
                    value={singleForm.status}
                    onChange={e => handleSingleFieldChange('status', e.target.value)}
                    style={{ fontSize: 13, background: '#ffffff', cursor: 'pointer' }}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <input
                    type="checkbox"
                    id="cornerPlotCheckbox"
                    checked={singleForm.isCorner}
                    onChange={e => handleSingleFieldChange('isCorner', e.target.checked)}
                    style={{ width: 17, height: 17, accentColor: '#458522', cursor: 'pointer' }}
                  />
                  <label htmlFor="cornerPlotCheckbox" style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                    🚩 Corner Plot / Dual Road Frontage
                  </label>
                </div>
              </div>

              {/* Row 5: Plot Photo Upload / URL (Simple) */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                  Plot / Unit Photo <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0, fontSize: 12 }}>
                    <ImageIcon size={14} /> Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = ev => handleSingleFieldChange('image', ev.target.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <input
                    className="form-input"
                    value={singleForm.image}
                    onChange={e => handleSingleFieldChange('image', e.target.value)}
                    placeholder="Or paste image URL (https://...)"
                    style={{ fontSize: 12, flex: 1 }}
                  />

                  {singleForm.image && (
                    <div style={{ position: 'relative', width: 42, height: 38, borderRadius: 6, overflow: 'hidden', border: '1px solid #458522' }}>
                      <img src={singleForm.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => handleSingleFieldChange('image', '')}
                        style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.65)', color: 'white', border: 'none', width: 16, height: 16, fontSize: 10, cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible More Options */}
              <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#458522',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: 0
                  }}
                >
                  {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showAdvanced ? 'Hide Additional Details' : '+ More Details (Road width, soil, water - Optional)'}
                </button>

                {showAdvanced && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12, background: '#f8fafc', padding: 14, borderRadius: 10 }}>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>Road Width (ft)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={singleForm.roadWidth}
                        onChange={e => handleSingleFieldChange('roadWidth', e.target.value)}
                        placeholder="e.g. 30, 40"
                        style={{ fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>Water Supply</label>
                      <select
                        className="form-input"
                        value={singleForm.waterSource}
                        onChange={e => handleSingleFieldChange('waterSource', e.target.value)}
                        style={{ fontSize: 12 }}
                      >
                        <option value="borewell">Borewell</option>
                        <option value="municipal">Municipal / Panchayat</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>Electricity</label>
                      <select
                        className="form-input"
                        value={singleForm.electricity}
                        onChange={e => handleSingleFieldChange('electricity', e.target.value)}
                        style={{ fontSize: 12 }}
                      >
                        <option value="available">Available (EB)</option>
                        <option value="underground">Underground Cabling</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                    {isAgriOrFarm && (
                      <div>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>Trees Count</label>
                        <input
                          type="number"
                          className="form-input"
                          value={singleForm.treesCount}
                          onChange={e => handleSingleFieldChange('treesCount', e.target.value)}
                          placeholder="e.g. 50"
                          style={{ fontSize: 12 }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          ) : (
            /* ==================================================== */
            /* BULK GENERATOR FORM (The 1-Click Gamechanger)        */
            /* ==================================================== */
            <form id="bulk-inventory-form" onSubmit={handleBulkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: '#f2f9ed',
                border: '1px solid #d4e8cb',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <Sparkles size={20} color="#458522" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 12.5, color: '#275214', lineHeight: 1.4 }}>
                  <strong>Bulk Plot Generator:</strong> Instantly create a batch of sequentially numbered plots (e.g. Plot-1 to Plot-20) with consistent sizing and pricing in 1 click!
                </div>
              </div>

              {/* Row 1: Prefix & Number Range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    Plot Prefix
                  </label>
                  <input
                    className="form-input"
                    value={bulkForm.prefix}
                    onChange={e => setBulkForm(p => ({ ...p, prefix: e.target.value }))}
                    placeholder="e.g. Plot-, Site-, A-"
                    required
                    style={{ fontSize: 13.5, fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    From Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={bulkForm.fromNum}
                    onChange={e => setBulkForm(p => ({ ...p, fromNum: e.target.value }))}
                    required
                    style={{ fontSize: 13.5, fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    To Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={bulkForm.toNum}
                    onChange={e => setBulkForm(p => ({ ...p, toNum: e.target.value }))}
                    required
                    style={{ fontSize: 13.5, fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Row 2: Block & Sizing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    Phase / Sector
                  </label>
                  <input
                    className="form-input"
                    value={bulkForm.block}
                    onChange={e => setBulkForm(p => ({ ...p, block: e.target.value }))}
                    placeholder="e.g. Phase 1"
                    style={{ fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    Size / Extent
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    className="form-input"
                    value={bulkForm.extent}
                    onChange={e => setBulkForm(p => ({ ...p, extent: e.target.value }))}
                    placeholder="1200"
                    required
                    style={{ fontSize: 13, fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    Unit
                  </label>
                  <select
                    className="form-input"
                    value={bulkForm.unit}
                    onChange={e => setBulkForm(p => ({ ...p, unit: e.target.value }))}
                    style={{ fontSize: 13 }}
                  >
                    <option value="sqft">Sq.Ft</option>
                    <option value="cent">Cents (435.6 sq.ft)</option>
                    <option value="acre">Acres</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Rate & Facing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    Base Rate (₹ / sq.ft)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={bulkForm.ratePerSqFt}
                    onChange={e => setBulkForm(p => ({ ...p, ratePerSqFt: e.target.value }))}
                    placeholder="2000"
                    required
                    style={{ fontSize: 13.5, fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                    Default Facing
                  </label>
                  <select
                    className="form-input"
                    value={bulkForm.facing}
                    onChange={e => setBulkForm(p => ({ ...p, facing: e.target.value }))}
                    style={{ fontSize: 13 }}
                  >
                    {FACING_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary Card */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #bbf7d0',
                borderRadius: 10,
                padding: '14px 16px'
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ⚡ Generation Summary
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#172a11', marginTop: 4 }}>
                  Will create {bulkCount} Plots ({bulkForm.prefix}{bulkForm.fromNum} to {bulkForm.prefix}{bulkForm.toNum})
                </div>
                <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <span>Size: <strong>{bulkCalculatedSqFt.toLocaleString('en-IN')} Sq.Ft</strong></span>
                  <span>Price: <strong>{formatCurrency(bulkPricePerUnit)} each</strong></span>
                  <span>Status: <strong>Available</strong></span>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid #e2e8f0',
          background: '#fcfdfa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          {activeTab === 'single' ? (
            <button
              type="submit"
              form="single-inventory-form"
              className="btn btn-primary"
              disabled={saving}
              style={{
                background: '#458522',
                borderColor: '#326518',
                color: 'white',
                fontWeight: 700,
                padding: '9px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {saving ? 'Adding Plot...' : `✓ Add ${unitNoun}`}
            </button>
          ) : (
            <button
              type="submit"
              form="bulk-inventory-form"
              className="btn btn-primary"
              disabled={saving || bulkCount <= 0}
              style={{
                background: '#458522',
                borderColor: '#326518',
                color: 'white',
                fontWeight: 700,
                padding: '9px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {saving ? 'Generating Plots...' : `🚀 Generate ${bulkCount} Plots in 1-Click`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
