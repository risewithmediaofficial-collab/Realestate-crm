import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Building, MapPin, Compass, IndianRupee, Shield, CheckCircle2, AlertCircle, Info, Layers, Trees, Zap, Droplets } from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import {
  AREA_UNITS,
  RATE_TYPES,
  FACING_OPTIONS,
  WATER_SOURCES,
  ELECTRICITY_OPTIONS,
  IRRIGATION_SYSTEMS,
  FENCING_OPTIONS,
  LAND_TYPES,
  UNIT_STATUSES,
  REAL_ESTATE_CATEGORIES,
  CATEGORY_TYPOLOGIES
} from '../../utils/constants';
import { calculateTotalAreaSqFt, calculatePackagePrice, formatIndianCurrency } from '../../utils/inventoryCalculations';
import CustomSelect from '../ui/CustomSelect';

export default function AddInventoryModal({ project, onClose, onUnitAdded }) {
  const { showNotification } = useUI();

  // Determine property category
  const projectType = project?.type || 'plots';
  const isAgriOrFarm = ['agricultural_land', 'farmland', 'resort_plots'].includes(projectType);
  const isPlot = ['plots', 'layouts'].includes(projectType);
  const isApartment = ['residential_apartment', 'commercial_office', 'retail_shop', 'industrial_warehouse'].includes(projectType);
  const isVilla = projectType === 'villa';
  const isCommercial = ['commercial_office', 'retail_shop', 'industrial_warehouse'].includes(projectType);

  const categoryConf = REAL_ESTATE_CATEGORIES[projectType] || REAL_ESTATE_CATEGORIES.plots;

  // Title determination based on property type
  const modalTitle = isAgriOrFarm
    ? 'Add Land / Plot Inventory'
    : isPlot
    ? 'Add Plot Inventory'
    : isApartment
    ? 'Add Apartment / Flat Inventory'
    : isVilla
    ? 'Add Villa Inventory'
    : isCommercial
    ? 'Add Commercial Unit Inventory'
    : `Add ${categoryConf?.unitTerm || 'Inventory'}`;

  // Form State
  const [form, setForm] = useState({
    // Section 1: Basic Information
    block: '',
    unitNumber: '',
    landType: isAgriOrFarm ? 'Agricultural Land' : isPlot ? 'Residential Plot' : '',
    customLandType: '',
    isCustomLandType: false,
    tower: project?.towers?.[0]?.name || 'Main Tower',
    floor: '1',
    typology: '',
    customTypology: '',
    isCustomTypology: false,

    // Section 2: Land Area
    extent: '',
    unit: isAgriOrFarm ? 'acre' : isPlot ? 'sqft' : 'sqft',
    customUnitName: '',
    customSqFtPerUnit: '',
    carpetArea: '',
    builtUpArea: '',
    superBuiltUp: '',
    dimensions: '',

    // Section 3: Physical Features
    facing: 'east',
    customFacing: '',
    isCustomFacing: false,
    roadWidth: '30',
    isCorner: false,
    electricity: 'available',
    waterSource: 'borewell',
    customWaterSource: '',
    frontage: '',
    ceilingHeight: '',
    fitoutStatus: 'unspecified',
    suitableFor: '',

    // Section 4: Agricultural Specifications
    plantation: '',
    irrigation: 'drip',
    customIrrigation: '',
    fencing: 'none',
    customFencing: '',

    // Section 5: Pricing
    baseRate: '',
    rateType: isAgriOrFarm ? 'per_acre' : isPlot ? 'per_sqft' : 'per_sqft',
    developmentCharges: '',
    registrationCharges: '',
    otherCharges: '',
    totalPackagePrice: '',
    isManualPriceOverride: false,

    // Section 6: Inventory Status
    status: 'available'
  });

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  // Lock background scroll
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, []);

  // Live Auto-Calculation of Total Area (Sq.Ft)
  const computedTotalSqFt = useMemo(() => {
    if (isApartment || isCommercial) {
      return parseFloat(form.superBuiltUp || form.carpetArea || 0);
    }
    return calculateTotalAreaSqFt(form.extent, form.unit, form.customSqFtPerUnit);
  }, [form.extent, form.unit, form.customSqFtPerUnit, form.superBuiltUp, form.carpetArea, isApartment, isCommercial]);

  // Live Auto-Calculation of Total Package Price
  const computedPricing = useMemo(() => {
    return calculatePackagePrice({
      baseRate: form.baseRate,
      rateType: form.rateType,
      extent: form.extent,
      unit: form.unit,
      totalSqFt: computedTotalSqFt,
      developmentCharges: form.developmentCharges,
      registrationCharges: form.registrationCharges,
      otherCharges: form.otherCharges,
      customSqFtPerUnit: form.customSqFtPerUnit
    });
  }, [
    form.baseRate,
    form.rateType,
    form.extent,
    form.unit,
    computedTotalSqFt,
    form.developmentCharges,
    form.registrationCharges,
    form.otherCharges,
    form.customSqFtPerUnit
  ]);

  // Sync auto-calculated package price when not manually overridden
  useEffect(() => {
    if (!form.isManualPriceOverride && computedPricing.totalPackagePrice > 0) {
      setForm(p => ({ ...p, totalPackagePrice: computedPricing.totalPackagePrice }));
    }
  }, [computedPricing.totalPackagePrice, form.isManualPriceOverride]);

  // Validate form fields
  const validateForm = () => {
    const errors = {};
    if (!form.unitNumber || !form.unitNumber.trim()) {
      errors.unitNumber = 'Plot / Unit Number is required.';
    }

    if (isAgriOrFarm || isPlot) {
      if (!form.extent || parseFloat(form.extent) <= 0) {
        errors.extent = 'Land Extent must be greater than 0.';
      }
      if (form.unit === 'custom' && (!form.customSqFtPerUnit || parseFloat(form.customSqFtPerUnit) <= 0)) {
        errors.customSqFtPerUnit = 'Please enter valid Sq.Ft conversion multiplier.';
      }
    } else {
      if (!form.superBuiltUp && !form.carpetArea) {
        errors.superBuiltUp = 'Area (sq.ft) is required.';
      }
    }

    if (!form.baseRate || parseFloat(form.baseRate) <= 0) {
      errors.baseRate = 'Base Rate / Price must be greater than 0.';
    }

    if (form.developmentCharges && parseFloat(form.developmentCharges) < 0) {
      errors.developmentCharges = 'Charges cannot be negative.';
    }
    if (form.registrationCharges && parseFloat(form.registrationCharges) < 0) {
      errors.registrationCharges = 'Charges cannot be negative.';
    }
    if (form.otherCharges && parseFloat(form.otherCharges) < 0) {
      errors.otherCharges = 'Charges cannot be negative.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      setGeneralError('Please resolve the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      // Determine final typology / land type
      const finalLandType = form.isCustomLandType
        ? form.customLandType.trim() || 'Custom Land'
        : form.landType || categoryConf?.label || 'Residential Plot';

      const finalTypology = form.isCustomTypology
        ? form.customTypology.trim() || 'Custom Typology'
        : form.typology || finalLandType;

      const finalFacing = form.isCustomFacing
        ? (form.customFacing.trim() || 'custom')
        : form.facing;

      const finalWater = form.waterSource === 'other' && form.customWaterSource
        ? form.customWaterSource.trim()
        : form.waterSource;

      const finalIrrigation = form.irrigation === 'other' && form.customIrrigation
        ? form.customIrrigation.trim()
        : form.irrigation;

      const finalFencing = form.fencing === 'other' && form.customFencing
        ? form.customFencing.trim()
        : form.fencing;

      const finalTotalPackage = form.isManualPriceOverride
        ? parseFloat(form.totalPackagePrice) || computedPricing.totalPackagePrice
        : computedPricing.totalPackagePrice;

      const payload = {
        project: project._id,
        unitNumber: form.unitNumber.trim(),
        block: form.block.trim(),
        tower: isApartment || isCommercial ? form.tower : (form.block.trim() || 'Main'),
        floor: isApartment || isCommercial ? Number(form.floor) || 1 : 1,
        propertyType: projectType,
        type: isApartment || isCommercial || isVilla ? finalTypology : finalLandType,
        landType: finalLandType,
        facing: finalFacing,
        customFacing: form.isCustomFacing ? form.customFacing.trim() : undefined,
        area: {
          extent: parseFloat(form.extent) || undefined,
          unit: form.unit,
          sqft: computedTotalSqFt,
          customSqFtPerUnit: form.unit === 'custom' ? parseFloat(form.customSqFtPerUnit) : undefined,
          superBuiltUp: computedTotalSqFt,
          plotArea: isPlot || isAgriOrFarm ? computedTotalSqFt : undefined,
          carpet: parseFloat(form.carpetArea) || undefined,
          builtUp: parseFloat(form.builtUpArea) || undefined,
        },
        physicalDetails: {
          facing: finalFacing,
          roadWidth: parseFloat(form.roadWidth) || undefined,
          isCorner: form.isCorner,
          electricity: form.electricity,
          waterSource: finalWater,
          frontage: parseFloat(form.frontage) || undefined,
          ceilingHeight: parseFloat(form.ceilingHeight) || undefined,
          fitoutStatus: form.fitoutStatus,
          suitableFor: form.suitableFor ? form.suitableFor.trim() : undefined
        },
        agriculturalDetails: isAgriOrFarm ? {
          plantation: form.plantation.trim(),
          irrigation: finalIrrigation,
          fencing: finalFencing
        } : undefined,
        pricing: {
          baseRate: parseFloat(form.baseRate) || 0,
          rateType: form.rateType,
          basePrice: computedPricing.baseAmount,
          developmentCharges: parseFloat(form.developmentCharges) || 0,
          registrationCharges: parseFloat(form.registrationCharges) || 0,
          otherCharges: parseFloat(form.otherCharges) || 0,
          totalPackagePrice: finalTotalPackage,
          totalPrice: finalTotalPackage
        },
        status: form.status,
        isCorner: form.isCorner
      };

      const { data } = await api.post('/inventory', payload);
      showNotification(`✅ Inventory "${payload.unitNumber}" added successfully!`, 'success');
      if (onUnitAdded) onUnitAdded(data.data || data);
      onClose();
    } catch (err) {
      console.error('Failed to create inventory unit:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to add inventory unit. Please try again.';
      setGeneralError(errMsg);
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
          maxWidth: 760,
          maxHeight: 'min(92vh, 860px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          background: 'white'
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{categoryConf?.icon || '🌾'}</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{modalTitle}</div>
              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span>Project:</span>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{project?.name}</span>
                <span className="badge badge-gray" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                  {categoryConf?.shortLabel || projectType?.replace(/_/g, ' ')}
                </span>
              </div>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {generalError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} />
                <span>{generalError}</span>
              </div>
            )}

            {/* ================================================== */}
            {/* SECTION 1 — BASIC INFORMATION */}
            {/* ================================================== */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#ffffff' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#e0e7ff', color: '#4338ca', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>1</span>
                SECTION 1 — BASIC INFORMATION
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {/* 1. Project (Read-only) */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                    Project <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(Auto-populated)</span>
                  </label>
                  <input
                    className="form-input"
                    value={`${project?.name || ''} (${project?.city || project?.code || 'Active'})`}
                    disabled
                    readOnly
                    style={{ background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'not-allowed' }}
                  />
                </div>

                {/* 2. Block / Zone / Sector (Optional) */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                    Block / Zone / Sector <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    className="form-input"
                    value={form.block}
                    onChange={e => setForm(p => ({ ...p, block: e.target.value }))}
                    placeholder="e.g. Sector A, Block B, Zone 1, Phase 1"
                  />
                </div>

                {/* 3. Plot / Unit Number * (Required) */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                    Plot / Unit Number <span className="required">*</span>
                  </label>
                  <input
                    className={`form-input ${fieldErrors.unitNumber ? 'input-error' : ''}`}
                    value={form.unitNumber}
                    onChange={e => {
                      setForm(p => ({ ...p, unitNumber: e.target.value }));
                      if (fieldErrors.unitNumber) setFieldErrors(p => ({ ...p, unitNumber: undefined }));
                    }}
                    placeholder={
                      isAgriOrFarm ? 'e.g. A-05, Farm Plot 105, Parcel 12' :
                      isPlot ? 'e.g. Plot 108, Site 204' :
                      isVilla ? 'e.g. Villa 24, V-102' :
                      'e.g. A-502, Flat 301, Unit G-12'
                    }
                    required
                  />
                  {fieldErrors.unitNumber && (
                    <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>{fieldErrors.unitNumber}</div>
                  )}
                </div>

                {/* 4. Land Type / Plot Type * */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 0 }}>
                      {isApartment ? 'Apartment Typology' : isVilla ? 'Villa Configuration' : 'Land Type / Plot Type'} <span className="required">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, isCustomLandType: !p.isCustomLandType }))}
                      style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {form.isCustomLandType ? 'Standard Dropdown' : '✏️ Custom Type'}
                    </button>
                  </div>

                  {!form.isCustomLandType ? (
                    <CustomSelect
                      value={form.landType}
                      onChange={val => {
                        const actualVal = typeof val === 'object' && val.target ? val.target.value : val;
                        if (actualVal === 'other') {
                          setForm(p => ({ ...p, landType: actualVal, isCustomLandType: true }));
                        } else {
                          setForm(p => ({ ...p, landType: actualVal, isCustomLandType: false }));
                        }
                      }}
                      options={
                        isApartment ? (
                          (CATEGORY_TYPOLOGIES.residential_apartment || ['1BHK', '2BHK', '3BHK', '4BHK', 'Penthouse']).map(t => ({ value: t, label: t }))
                        ) : isVilla ? (
                          (CATEGORY_TYPOLOGIES.villa || ['3 BHK Luxury Villa', '4 BHK Duplex Villa', '5 BHK Grand Villa']).map(t => ({ value: t, label: t }))
                        ) : (
                          LAND_TYPES.map(lt => ({ value: lt.value, label: lt.label }))
                        )
                      }
                    />
                  ) : (
                    <input
                      className="form-input"
                      value={form.customLandType}
                      onChange={e => setForm(p => ({ ...p, customLandType: e.target.value }))}
                      placeholder="e.g. Organic Avocado Grove, Lakefront Plot, Resort Estate"
                      required
                    />
                  )}
                </div>
              </div>
            </div>

            {/* ================================================== */}
            {/* SECTION 2 — LAND AREA */}
            {/* ================================================== */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#ffffff' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#e0e7ff', color: '#4338ca', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>2</span>
                SECTION 2 — LAND AREA SPECIFICATIONS
              </div>

              {isAgriOrFarm || isPlot ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'start' }}>
                  {/* 5. Land Extent */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                      Land Extent <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.0001"
                      className={`form-input ${fieldErrors.extent ? 'input-error' : ''}`}
                      value={form.extent}
                      onChange={e => {
                        setForm(p => ({ ...p, extent: e.target.value }));
                        if (fieldErrors.extent) setFieldErrors(p => ({ ...p, extent: undefined }));
                      }}
                      placeholder="e.g. 0.5, 1.25, 2400"
                      required
                    />
                    {fieldErrors.extent && (
                      <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>{fieldErrors.extent}</div>
                    )}
                  </div>

                  {/* 6. Area Unit Dropdown */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                      Area Unit <span className="required">*</span>
                    </label>
                    <CustomSelect
                      value={form.unit}
                      onChange={val => setForm(p => ({ ...p, unit: typeof val === 'object' && val.target ? val.target.value : val }))}
                      options={AREA_UNITS.map(u => ({ value: u.id, label: u.label }))}
                    />
                  </div>

                  {/* Custom Multiplier if Custom Unit */}
                  {form.unit === 'custom' && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>
                        1 Unit = ? Sq.Ft <span className="required">*</span>
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        className={`form-input ${fieldErrors.customSqFtPerUnit ? 'input-error' : ''}`}
                        value={form.customSqFtPerUnit}
                        onChange={e => setForm(p => ({ ...p, customSqFtPerUnit: e.target.value }))}
                        placeholder="e.g. 14400"
                        required
                      />
                    </div>
                  )}

                  {/* 7. Total Area (Sq.Ft) - Auto Calculated */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 0 }}>
                        Total Area (Sq.Ft)
                      </label>
                      <span className="badge badge-success" style={{ fontSize: 10, padding: '1px 6px' }}>⚡ Auto Calc</span>
                    </div>
                    <input
                      className="form-input"
                      value={computedTotalSqFt ? `${computedTotalSqFt.toLocaleString('en-IN')} sq.ft` : '0 sq.ft'}
                      readOnly
                      disabled
                      style={{ background: '#f0fdf4', color: '#15803d', fontWeight: 800, border: '1px solid #bbf7d0', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
              ) : (
                /* Apartment / Villa / Commercial Built-Up Areas */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Super Built-Up Area (sq.ft) <span className="required">*</span></label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.superBuiltUp}
                      onChange={e => setForm(p => ({ ...p, superBuiltUp: e.target.value }))}
                      placeholder="e.g. 1650"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Carpet Area (sq.ft)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.carpetArea}
                      onChange={e => setForm(p => ({ ...p, carpetArea: e.target.value }))}
                      placeholder="e.g. 1250"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Built-Up Area (sq.ft)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.builtUpArea}
                      onChange={e => setForm(p => ({ ...p, builtUpArea: e.target.value }))}
                      placeholder="e.g. 1400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ================================================== */}
            {/* SECTION 3 — PHYSICAL / LOCATION FEATURES */}
            {/* ================================================== */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#ffffff' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#e0e7ff', color: '#4338ca', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>3</span>
                SECTION 3 — LOCATION & PHYSICAL FEATURES
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {/* 8. Facing */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Facing Orientation</label>
                  {!form.isCustomFacing ? (
                    <CustomSelect
                      value={form.facing}
                      onChange={val => {
                        const actualVal = typeof val === 'object' && val.target ? val.target.value : val;
                        if (actualVal === 'custom') {
                          setForm(p => ({ ...p, isCustomFacing: true }));
                        } else {
                          setForm(p => ({ ...p, facing: actualVal, isCustomFacing: false }));
                        }
                      }}
                      options={FACING_OPTIONS.map(f => ({ value: f.value, label: f.label }))}
                    />
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        className="form-input"
                        value={form.customFacing}
                        onChange={e => setForm(p => ({ ...p, customFacing: e.target.value }))}
                        placeholder="e.g. Valley / Lake Facing"
                      />
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, isCustomFacing: false }))}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0 8px' }}
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                {/* 9. Road Width */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Road Width (ft)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.roadWidth}
                    onChange={e => setForm(p => ({ ...p, roadWidth: e.target.value }))}
                    placeholder="e.g. 30, 40, 60"
                  />
                </div>

                {/* 10. Corner Plot Toggle */}
                <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Corner Plot / Dual Frontage</label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="isCorner"
                        checked={form.isCorner === true}
                        onChange={() => setForm(p => ({ ...p, isCorner: true }))}
                        style={{ accentColor: '#2563eb' }}
                      />
                      <span>Yes</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="isCorner"
                        checked={form.isCorner === false}
                        onChange={() => setForm(p => ({ ...p, isCorner: false }))}
                        style={{ accentColor: '#2563eb' }}
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {/* 11. Electricity */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Electricity Connection</label>
                  <CustomSelect
                    value={form.electricity}
                    onChange={val => setForm(p => ({ ...p, electricity: typeof val === 'object' && val.target ? val.target.value : val }))}
                    options={ELECTRICITY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                  />
                </div>

                {/* 12. Water Source */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Water Source</label>
                  <CustomSelect
                    value={form.waterSource}
                    onChange={val => setForm(p => ({ ...p, waterSource: typeof val === 'object' && val.target ? val.target.value : val }))}
                    options={WATER_SOURCES.map(w => ({ value: w.value, label: w.label }))}
                  />
                </div>
              </div>
            </div>

            {/* ================================================== */}
            {/* SECTION 4 — AGRICULTURAL SPECIFICATIONS */}
            {/* Show when project is Agricultural / Farm Land */}
            {/* ================================================== */}
            {isAgriOrFarm && (
              <div style={{ border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, background: '#f0fdf4' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#166534', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: '#dcfce7', color: '#15803d', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>4</span>
                  SECTION 4 — AGRICULTURAL & FARM SPECIFICATIONS
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {/* 13. Plantation / Tree Species */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>
                      Plantation / Tree Species
                    </label>
                    <input
                      className="form-input"
                      value={form.plantation}
                      onChange={e => setForm(p => ({ ...p, plantation: e.target.value }))}
                      placeholder="e.g. Alphonso Mango, Sandalwood, Teak, Avocado"
                      style={{ background: 'white' }}
                    />
                  </div>

                  {/* 14. Irrigation System */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>
                      Irrigation System
                    </label>
                    <CustomSelect
                      value={form.irrigation}
                      onChange={val => setForm(p => ({ ...p, irrigation: typeof val === 'object' && val.target ? val.target.value : val }))}
                      options={IRRIGATION_SYSTEMS.map(ir => ({ value: ir.value, label: ir.label }))}
                    />
                  </div>

                  {/* 15. Fencing */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>
                      Fencing & Boundary
                    </label>
                    <CustomSelect
                      value={form.fencing}
                      onChange={val => setForm(p => ({ ...p, fencing: typeof val === 'object' && val.target ? val.target.value : val }))}
                      options={FENCING_OPTIONS.map(fe => ({ value: fe.value, label: fe.label }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* SECTION 5 — PRICING */}
            {/* ================================================== */}
            <div style={{ border: '1px solid #fed7aa', borderRadius: 12, padding: 16, background: '#fffaf5' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#9a3412', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#ffedd5', color: '#c2410c', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>5</span>
                SECTION 5 — PRICING & COMMERCIAL STRUCTURE
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {/* 16. Base Rate / BSP * */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                    Base Rate / BSP (₹) <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className={`form-input ${fieldErrors.baseRate ? 'input-error' : ''}`}
                    value={form.baseRate}
                    onChange={e => {
                      setForm(p => ({ ...p, baseRate: e.target.value }));
                      if (fieldErrors.baseRate) setFieldErrors(p => ({ ...p, baseRate: undefined }));
                    }}
                    placeholder={
                      form.rateType === 'per_acre' ? 'e.g. 4500000' :
                      form.rateType === 'per_guntha' ? 'e.g. 120000' :
                      'e.g. 2500'
                    }
                    required
                    style={{ background: 'white' }}
                  />
                  {fieldErrors.baseRate && (
                    <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>{fieldErrors.baseRate}</div>
                  )}
                </div>

                {/* 17. Rate Type * */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                    Rate Calculation Unit <span className="required">*</span>
                  </label>
                  <CustomSelect
                    value={form.rateType}
                    onChange={val => setForm(p => ({ ...p, rateType: typeof val === 'object' && val.target ? val.target.value : val }))}
                    options={RATE_TYPES.map(rt => ({ value: rt.id, label: rt.label }))}
                  />
                </div>

                {/* 18. Development Charges */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Development Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={form.developmentCharges}
                    onChange={e => setForm(p => ({ ...p, developmentCharges: e.target.value }))}
                    placeholder="0"
                    style={{ background: 'white' }}
                  />
                </div>

                {/* 19. Registration Charges */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Registration Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={form.registrationCharges}
                    onChange={e => setForm(p => ({ ...p, registrationCharges: e.target.value }))}
                    placeholder="0"
                    style={{ background: 'white' }}
                  />
                </div>

                {/* 20. Other Charges */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Other / Legal Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={form.otherCharges}
                    onChange={e => setForm(p => ({ ...p, otherCharges: e.target.value }))}
                    placeholder="0"
                    style={{ background: 'white' }}
                  />
                </div>

                {/* 21. Total Package Price * (Auto Calculated with Manual Override Option) */}
                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 800, color: '#15803d', marginBottom: 0 }}>
                      Total All-Inclusive Package Price (₹) <span className="required">*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {!form.isManualPriceOverride ? (
                        <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 8px' }}>⚡ Auto Calculated (Base + Dev + Reg + Other)</span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: 10, padding: '2px 8px' }}>✏️ Manual Override Active</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, isManualPriceOverride: !p.isManualPriceOverride }))}
                        style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {form.isManualPriceOverride ? 'Restore Auto Calculation' : 'Override Manually'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="form-input"
                    value={form.totalPackagePrice || computedPricing.totalPackagePrice || ''}
                    onChange={e => setForm(p => ({ ...p, totalPackagePrice: e.target.value, isManualPriceOverride: true }))}
                    readOnly={!form.isManualPriceOverride}
                    required
                    style={{
                      background: form.isManualPriceOverride ? 'white' : '#f0fdf4',
                      color: '#15803d',
                      fontWeight: 800,
                      fontSize: 16,
                      border: '2px solid #86efac'
                    }}
                  />
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Breakdown: Base Price ({formatIndianCurrency(computedPricing.baseAmount)}) + Charges ({formatIndianCurrency(computedPricing.developmentCharges + computedPricing.registrationCharges + computedPricing.otherCharges)}) = <strong style={{ color: '#15803d' }}>{formatIndianCurrency(form.totalPackagePrice || computedPricing.totalPackagePrice)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* ================================================== */}
            {/* SECTION 6 — INVENTORY STATUS */}
            {/* ================================================== */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#ffffff' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#e0e7ff', color: '#4338ca', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>6</span>
                SECTION 6 — INVENTORY STATUS
              </div>

              <div style={{ maxWidth: 360 }}>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
                  Inventory Status <span className="required">*</span>
                </label>
                <CustomSelect
                  value={form.status}
                  onChange={val => setForm(p => ({ ...p, status: typeof val === 'object' && val.target ? val.target.value : val }))}
                  options={[
                    { value: 'available', label: 'Available', icon: '🟢', subtext: 'Open for Sale' },
                    { value: 'reserved', label: 'Reserved', icon: '🔵', subtext: 'Expression of Interest' },
                    { value: 'on_hold', label: 'On Hold', icon: '🟡', subtext: '48h Customer Reservation' },
                    { value: 'booked', label: 'Booked', icon: '🟣', subtext: 'Booking Token Paid' },
                    { value: 'sold', label: 'Sold', icon: '✅', subtext: 'Full Payment Completed' },
                    { value: 'blocked', label: 'Blocked', icon: '🔴', subtext: 'Management Reserve' },
                    { value: 'cancelled', label: 'Cancelled', icon: '⚪', subtext: 'Registration Cancelled' }
                  ]}
                />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Default is "Available" for newly added plots and units.
                </div>
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div
            className="modal-footer"
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Adding inventory to <strong style={{ color: '#0f172a' }}>{project?.name}</strong>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontWeight: 700 }}
              >
                {saving ? 'Adding Inventory...' : 'Add Inventory'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
