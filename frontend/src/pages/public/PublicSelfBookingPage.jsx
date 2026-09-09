import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Building2, CheckCircle2, ShieldCheck, ArrowRight, ArrowLeft,
  CreditCard, Sparkles, Printer, Download, MapPin, User,
  FileText, Lock, QrCode, AlertCircle
} from 'lucide-react';
import api from '../../services/api';

export default function PublicSelfBookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const preselectedUnitId = searchParams.get('unitId');
  const preselectedProjectId = searchParams.get('projectId');

  // Checkout Step: 1 = Unit Selection, 2 = Buyer KYC, 3 = Payment & Token, 4 = Confirmation
  const [step, setStep] = useState(preselectedUnitId ? 2 : 1);

  // Available Projects & Units
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId || '');
  const [availableUnits, setAvailableUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Step 2: Buyer KYC Form
  const [kycForm, setKycForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    panNumber: '',
    aadharNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    hasCoApplicant: false,
    coApplicantName: '',
    coApplicantPhone: '',
    coApplicantRelation: 'Spouse',
    coApplicantPan: '',
  });

  // Step 3: Payment
  const [tokenAmount, setTokenAmount] = useState(50000); // Standard ₹50,000 token advance
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking' | 'dd'
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 4: Final Confirmed Booking
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const res = await api.get('/public/projects?limit=50');
      if (res.data?.projects) {
        setProjects(res.data.projects);

        if (preselectedProjectId) {
          loadUnitsForProject(preselectedProjectId);
        } else if (res.data.projects.length > 0 && !preselectedUnitId) {
          setSelectedProjectId(res.data.projects[0]._id);
          loadUnitsForProject(res.data.projects[0]._id);
        }
      }

      if (preselectedUnitId) {
        loadSpecificUnit(preselectedUnitId);
      }
    } catch (err) {
      console.warn('Error loading initial projects:', err);
    }
  };

  const loadSpecificUnit = async (unitId) => {
    try {
      setLoadingUnits(true);
      // We can fetch project units or find matching unit
      const projRes = await api.get('/public/projects?limit=50');
      for (const p of projRes.data?.projects || []) {
        const uRes = await api.get(`/public/projects/${p._id}/units`);
        const found = (uRes.data?.units || []).find(u => u._id === unitId);
        if (found) {
          setSelectedUnit({ ...found, project: p });
          setSelectedProjectId(p._id);
          setStep(2);
          break;
        }
      }
    } catch (e) {
      console.warn('Could not locate unit:', e);
    } finally {
      setLoadingUnits(false);
    }
  };

  const loadUnitsForProject = async (projId) => {
    try {
      setLoadingUnits(true);
      const res = await api.get(`/public/projects/${projId}/units`);
      const list = res.data?.units || [];
      setAvailableUnits(list);
      if (list.length > 0 && !selectedUnit) {
        const proj = projects.find(p => p._id === projId);
        setSelectedUnit({ ...list[0], project: proj });
      }
    } catch (err) {
      console.warn('Error loading units:', err);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleProjectChange = (e) => {
    const pId = e.target.value;
    setSelectedProjectId(pId);
    setSelectedUnit(null);
    loadUnitsForProject(pId);
  };

  const handleSelectUnitCard = (unit) => {
    const proj = projects.find(p => p._id === selectedProjectId);
    setSelectedUnit({ ...unit, project: proj });
  };

  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!kycForm.customerName || !kycForm.customerPhone) {
      alert('Please fill in your Full Name and Mobile Number.');
      return;
    }
    setStep(3);
  };

  const handleConfirmFinalBooking = async () => {
    if (!termsAccepted) {
      alert('Please accept the booking terms and RERA reservation declaration.');
      return;
    }
    if (!selectedUnit?._id) {
      alert('No property unit selected.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        unitId: selectedUnit._id,
        customerName: kycForm.customerName,
        customerPhone: kycForm.customerPhone,
        customerEmail: kycForm.customerEmail,
        panNumber: kycForm.panNumber,
        aadharNumber: kycForm.aadharNumber,
        address: kycForm.address,
        city: kycForm.city,
        state: kycForm.state,
        pincode: kycForm.pincode,
        coApplicants: kycForm.hasCoApplicant ? [{
          name: kycForm.coApplicantName,
          phone: kycForm.coApplicantPhone,
          relation: kycForm.coApplicantRelation,
          panNumber: kycForm.coApplicantPan
        }] : [],
        tokenAmount: Number(tokenAmount),
        paymentMethod,
        notes: `Online Self-Service Token Reservation via Customer Web Portal. Method: ${paymentMethod.toUpperCase()}`
      };

      const res = await api.post('/public/booking', payload);

      if (res.data?.success) {
        setConfirmedBooking(res.data.booking);
        setStep(4);
      } else {
        alert(res.data?.message || 'Failed to complete booking.');
      }
    } catch (err) {
      alert(err.message || 'Error occurred while processing booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const totalUnitPrice = selectedUnit?.pricing?.totalPrice || selectedUnit?.pricing?.basePrice || 0;
  const balanceAfterToken = Math.max(0, totalUnitPrice - tokenAmount);

  return (
    <div className="pub-checkout-container">
      {/* Page Title */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="pub-section-tag" style={{ justifyContent: 'center' }}>
          <ShieldCheck size={14} color="var(--pub-emerald)" /> Official Digital Reservation
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--pub-primary)', margin: '4px 0 8px' }}>
          Direct Property Unit Self-Booking
        </h1>
        <p style={{ color: 'var(--pub-text-muted)', fontSize: 14, margin: 0 }}>
          Reserve your selected property unit directly with instant digital token hold and official CRM synchronization.
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="pub-stepper">
        <div className="pub-stepper-line" />

        <div className={`pub-step-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="pub-step-circle">{step > 1 ? '✓' : '1'}</div>
          <div className="pub-step-label">Select Unit</div>
        </div>

        <div className={`pub-step-item ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="pub-step-circle">{step > 2 ? '✓' : '2'}</div>
          <div className="pub-step-label">Buyer KYC</div>
        </div>

        <div className={`pub-step-item ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
          <div className="pub-step-circle">{step > 3 ? '✓' : '3'}</div>
          <div className="pub-step-label">Token Advance</div>
        </div>

        <div className={`pub-step-item ${step >= 4 ? 'active' : ''}`}>
          <div className="pub-step-circle">4</div>
          <div className="pub-step-label">Confirmation</div>
        </div>
      </div>

      {/* ── STEP 1: UNIT SELECTION ── */}
      {step === 1 && (
        <div className="pub-booking-card">
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px', color: 'var(--pub-primary)' }}>
            Step 1: Choose Project &amp; Available Unit
          </h2>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
              Select Real Estate Project *
            </label>
            <select
              value={selectedProjectId}
              onChange={handleProjectChange}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1.5px solid #cbd5e1',
                fontSize: 14,
                fontWeight: 600,
                background: '#f8fafc'
              }}
            >
              {projects.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.city}) — {p.type}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
            Available Units in Selected Project:
          </div>

          {loadingUnits ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              Loading available inventory units...
            </div>
          ) : availableUnits.length === 0 ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 20, borderRadius: 12, textAlign: 'center', color: '#dc2626' }}>
              No units currently available for online reservation in this project. Please select another project.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, marginBottom: 28 }}>
              {availableUnits.map(unit => {
                const isSelected = selectedUnit?._id === unit._id;
                const price = unit.pricing?.totalPrice || unit.pricing?.basePrice || 0;
                return (
                  <div
                    key={unit._id}
                    onClick={() => handleSelectUnitCard(unit)}
                    style={{
                      border: isSelected ? '2px solid var(--pub-accent)' : '1px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      borderRadius: 12,
                      padding: 16,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 4px 14px rgba(37,99,235,0.12)' : 'none'
                    }}
                  >
                    {/* Plot / Unit Image Preview */}
                    {(unit.image || unit.images?.[0] || unit.floorPlan) && (
                      <div style={{ height: 90, width: '100%', borderRadius: 8, overflow: 'hidden', marginBottom: 10, background: '#f1f5f9' }}>
                        <img
                          src={unit.image || unit.images?.[0] || unit.floorPlan}
                          alt={`Plot ${unit.unitNumber}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                        Unit {unit.unitNumber}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: 4 }}>
                        Available
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                      Tower {unit.tower} · Floor {unit.floor} · {unit.bedrooms ? `${unit.bedrooms} BHK` : unit.type}
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--pub-accent)' }}>
                      {formatCurrency(price)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedUnit && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
              <button
                onClick={() => setStep(2)}
                className="pub-btn-book"
                style={{ padding: '12px 28px', fontSize: 14 }}
              >
                Proceed to Buyer Details <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: BUYER KYC DETAILS ── */}
      {step === 2 && (
        <form onSubmit={handleProceedToPayment} className="pub-booking-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: 'var(--pub-primary)' }}>
                Step 2: Primary Buyer &amp; KYC Information
              </h2>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                Reserving Unit <strong>{selectedUnit?.unitNumber}</strong> ({selectedUnit?.project?.name || 'Project'})
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Change Unit
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Primary Applicant Full Name (as per PAN) *
              </label>
              <input
                required
                placeholder="e.g. Anand Sharma"
                value={kycForm.customerName}
                onChange={e => setKycForm(p => ({ ...p, customerName: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Mobile Number (for SMS &amp; OTP Alerts) *
              </label>
              <input
                required
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={kycForm.customerPhone}
                onChange={e => setKycForm(p => ({ ...p, customerPhone: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. anand@gmail.com"
                value={kycForm.customerEmail}
                onChange={e => setKycForm(p => ({ ...p, customerEmail: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                PAN Number
              </label>
              <input
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                value={kycForm.panNumber}
                onChange={e => setKycForm(p => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Aadhaar / National ID
              </label>
              <input
                placeholder="e.g. 1234 5678 9012"
                maxLength={14}
                value={kycForm.aadharNumber}
                onChange={e => setKycForm(p => ({ ...p, aadharNumber: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Permanent Communication Address
            </label>
            <input
              placeholder="Flat / House No., Street, Landmark"
              value={kycForm.address}
              onChange={e => setKycForm(p => ({ ...p, address: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <input
                placeholder="City"
                value={kycForm.city}
                onChange={e => setKycForm(p => ({ ...p, city: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
              />
              <input
                placeholder="State"
                value={kycForm.state}
                onChange={e => setKycForm(p => ({ ...p, state: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
              />
              <input
                placeholder="Pincode"
                value={kycForm.pincode}
                onChange={e => setKycForm(p => ({ ...p, pincode: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Co-Applicant Optional Toggle */}
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={kycForm.hasCoApplicant}
                onChange={e => setKycForm(p => ({ ...p, hasCoApplicant: e.target.checked }))}
              />
              <span>Add Co-Applicant / Joint Buyer (Spouse / Parent / Partner)</span>
            </label>

            {kycForm.hasCoApplicant && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                <input
                  placeholder="Co-Applicant Name"
                  value={kycForm.coApplicantName}
                  onChange={e => setKycForm(p => ({ ...p, coApplicantName: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                />
                <input
                  placeholder="Relationship (e.g. Spouse)"
                  value={kycForm.coApplicantRelation}
                  onChange={e => setKycForm(p => ({ ...p, coApplicantRelation: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
            >
              ← Back to Unit Selection
            </button>

            <button
              type="submit"
              className="pub-btn-book"
              style={{ padding: '12px 28px', fontSize: 14 }}
            >
              Proceed to Payment &amp; Hold <ArrowRight size={16} />
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 3: PAYMENT & TOKEN ADVANCE ── */}
      {step === 3 && (
        <div className="pub-booking-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: 'var(--pub-primary)' }}>
                Step 3: Token Advance &amp; Reservation Hold
              </h2>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                Review transparent cost sheet and confirm token deposit.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Edit KYC
            </button>
          </div>

          {/* Cost Sheet Summary Card */}
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pub-accent)', textTransform: 'uppercase' }}>
              Cost Sheet Breakdown
            </div>
            <table className="pub-cost-table">
              <tbody>
                <tr>
                  <td style={{ color: '#475569' }}>Selected Property Unit:</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    Unit {selectedUnit?.unitNumber} ({selectedUnit?.project?.name})
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#475569' }}>Unit Carpet / Super Built-up Area:</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {selectedUnit?.area?.carpetArea || selectedUnit?.area?.sqft || selectedUnit?.area?.extent} {selectedUnit?.area?.unit || 'Sq.Ft'}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#475569' }}>Total Unit Package Value:</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatCurrency(totalUnitPrice)}
                  </td>
                </tr>
                <tr style={{ background: 'var(--pub-emerald-light)' }}>
                  <td style={{ color: 'var(--pub-accent)', fontWeight: 700, paddingLeft: 8 }}>
                    Token Advance Payable Now (Lock Deposit):
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--pub-accent)', fontWeight: 800, fontSize: 18, paddingRight: 8 }}>
                    {formatCurrency(tokenAmount)}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b' }}>Balance Payable at Agreement / Milestone:</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                    {formatCurrency(balanceAfterToken)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Method Selector */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
              Select Token Payment Method:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div
                onClick={() => setPaymentMethod('upi')}
                style={{
                  border: paymentMethod === 'upi' ? '2px solid var(--pub-accent)' : '1px solid #cbd5e1',
                  background: paymentMethod === 'upi' ? 'var(--pub-emerald-light)' : '#ffffff',
                  padding: 16,
                  borderRadius: 12,
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                  <QrCode size={18} color="var(--pub-accent)" /> Instant UPI / QR
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                  GPay, PhonePe, Paytm, BHIM UPI
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod('netbanking')}
                style={{
                  border: paymentMethod === 'netbanking' ? '2px solid var(--pub-accent)' : '1px solid #cbd5e1',
                  background: paymentMethod === 'netbanking' ? 'var(--pub-emerald-light)' : '#ffffff',
                  padding: 16,
                  borderRadius: 12,
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                  <CreditCard size={18} color="var(--pub-accent)" /> NetBanking / Cards
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                  All Major Banks &amp; Credit Cards
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod('neft')}
                style={{
                  border: paymentMethod === 'neft' ? '2px solid var(--pub-accent)' : '1px solid #cbd5e1',
                  background: paymentMethod === 'neft' ? 'var(--pub-emerald-light)' : '#ffffff',
                  padding: 16,
                  borderRadius: 12,
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                  <Building2 size={18} color="var(--pub-gold)" /> Bank Wire / Hold
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                  NEFT / RTGS Escrow Account
                </div>
              </div>
            </div>
          </div>

          {/* Legal Terms Acceptance Checkbox */}
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: '#334155', cursor: 'pointer', lineHeight: 1.5 }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span>
                I hereby declare that the KYC information submitted is true. I agree to reserve Unit <strong>{selectedUnit?.unitNumber}</strong> and pay the token advance of <strong>{formatCurrency(tokenAmount)}</strong>. I understand this generates an official digital booking application under RERA guidelines.
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
            >
              ← Back to KYC Details
            </button>

            <button
              type="button"
              disabled={submitting || !termsAccepted}
              onClick={handleConfirmFinalBooking}
              className="pub-btn-book"
              style={{
                padding: '14px 32px',
                fontSize: 15,
                background: termsAccepted ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : '#94a3b8',
                cursor: termsAccepted ? 'pointer' : 'not-allowed'
              }}
            >
              {submitting ? 'Confirming Digital Booking...' : `Pay ${formatCurrency(tokenAmount)} & Reserve Unit Now`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: DIGITAL BOOKING CONFIRMATION CERTIFICATE ── */}
      {step === 4 && confirmedBooking && (
        <div className="pub-receipt-card">
          <div className="pub-receipt-badge">
            ✓
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pub-emerald)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Official Booking Docket Generated
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--pub-primary)', margin: '4px 0 10px' }}>
            Congratulations, {confirmedBooking.customerName}!
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 540, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Your property unit reservation has been officially submitted and synchronized into the CRM master ledger.
          </p>

          {/* Official Certificate Card Box */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #bfdbfe',
            borderRadius: 16,
            padding: '24px 28px',
            maxWidth: 600,
            margin: '0 auto 28px',
            textAlign: 'left',
            boxShadow: '0 8px 24px rgba(37,99,235,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #f1f5f9', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Booking Number</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--pub-accent)' }}>
                  {confirmedBooking.bookingNumber}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Reservation Status</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: 6, display: 'inline-block', marginTop: 2 }}>
                  CONFIRMED &amp; LOCKED
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13 }}>
              <div>
                <span style={{ color: '#64748b' }}>Project:</span><br />
                <strong>{confirmedBooking.projectName}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Reserved Unit:</span><br />
                <strong style={{ color: 'var(--pub-accent)' }}>Unit {confirmedBooking.unitNumber}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Total Unit Value:</span><br />
                <strong>{formatCurrency(confirmedBooking.totalAmount)}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Token Advance Paid:</span><br />
                <strong style={{ color: '#059669' }}>{formatCurrency(confirmedBooking.tokenAmountPaid)}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Buyer Name:</span><br />
                <strong>{confirmedBooking.customerName}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Buyer Phone:</span><br />
                <strong>{confirmedBooking.customerPhone}</strong>
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
              <span>Verified under RERA Real Estate Act 2016</span>
              <span>Timestamp: {new Date().toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                padding: '10px 20px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Printer size={15} /> Print / Save Confirmation PDF
            </button>

            <Link
              to="/explore"
              className="pub-btn-book"
              style={{ padding: '10px 22px' }}
            >
              Explore More Properties
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
