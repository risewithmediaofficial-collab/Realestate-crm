import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DollarSign, Calculator, Download, Printer, CheckCircle,
  FileText, ShieldCheck, HelpCircle, Layers, RefreshCw, MessageSquare,
  Share2, Send, X, Building2, Sparkles, User, Award, Check
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatCurrency, formatArea, formatDate } from '../../utils/formatters';
import CustomSelect from '../../components/ui/CustomSelect';
import { exportPricingCostSheetCSV } from '../../utils/exportTemplates';

export default function PricingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showNotification } = useUI();
  const { user } = useAuth();

  const getTabFromPath = () => {
    if (location.pathname.includes('/rules')) return 'rules';
    if (location.pathname.includes('/plans')) return 'plans';
    return 'calculator';
  };

  const [tab, setTab] = useState(getTabFromPath());

  // Cost sheet calculator state
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState('1');
  const [unitType, setUnitType] = useState('3BHK');
  const [superArea, setSuperArea] = useState(1350);
  const [floorNumber, setFloorNumber] = useState(5);
  const [baseRate, setBaseRate] = useState(7200); // ₹/sq.ft
  const [plcRate, setPlcRate] = useState(250); // ₹/sq.ft for East Facing + Corner
  const [carParkingCount, setCarParkingCount] = useState(1);
  const [carParkingRate, setCarParkingRate] = useState(350000);
  const [clubhouseRate, setClubhouseRate] = useState(250000);
  const [infraDevRate, setInfraDevRate] = useState(150); // ₹/sq.ft
  const [paymentPlan, setPaymentPlan] = useState('clp'); // 'clp' | 'dp' | 'subvention'

  // Modals
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showReraQuoteModal, setShowReraQuoteModal] = useState(false);
  const [buyerName, setBuyerName] = useState('Prospective Buyer');
  const [buyerPhone, setBuyerPhone] = useState('');

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data } = await api.get('/projects');
        if (data.data?.length) {
          setProjects(data.data);
          setProject(data.data[0]._id);
        }
      } catch {}
    };
    loadProjects();
  }, []);

  useEffect(() => {
    setTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    setTab(tabId);
    navigate(`/pricing/${tabId}`);
  };

  // Calculations
  const baseCost = superArea * baseRate;
  const floorRiseRate = Math.max(0, floorNumber - 2) * 50; // ₹50/sq.ft per floor above 2nd
  const floorRiseCost = superArea * floorRiseRate;
  const plcCost = superArea * plcRate;
  const infraCost = superArea * infraDevRate;
  const totalParkingCost = carParkingCount * carParkingRate;

  // Basic Agreement Value (AV)
  const agreementValue = baseCost + floorRiseCost + plcCost + infraCost + clubhouseRate + totalParkingCost;

  // Statutory / Taxes
  const gstRate = 0.05; // 5% GST on residential under construction
  const stampDutyRate = 0.06; // 6% Stamp Duty
  const regCharge = 30000; // ₹30,000 flat registration or 1%
  const legalAdvocateFees = 15000;

  const gstAmount = agreementValue * gstRate;
  const stampDutyAmount = agreementValue * stampDutyRate;
  const totalTaxes = gstAmount + stampDutyAmount + regCharge + legalAdvocateFees;

  // Final Total Package Value
  const totalPackageValue = agreementValue + totalTaxes;

  // Milestone schedule breakdown
  const milestones = [
    { name: '1. Token Booking Amount', pct: 10, amount: agreementValue * 0.10, due: 'At Booking' },
    { name: '2. Execution of Agreement (within 30 days)', pct: 10, amount: agreementValue * 0.10, due: '30 Days from Booking' },
    { name: '3. Completion of Plinth / Foundation', pct: 15, amount: agreementValue * 0.15, due: 'Milestone 1' },
    { name: '4. Completion of 5th Floor Slab', pct: 20, amount: agreementValue * 0.20, due: 'Milestone 2' },
    { name: '5. Completion of Brickwork & Internal Plaster', pct: 20, amount: agreementValue * 0.20, due: 'Milestone 3' },
    { name: '6. Completion of Flooring & Plumbing', pct: 15, amount: agreementValue * 0.15, due: 'Milestone 4' },
    { name: '7. On Notice of Possession & Key Handover', pct: 10, amount: agreementValue * 0.10, due: 'Possession' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>Projects & Inventory</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {tab === 'calculator' ? 'Cost Sheet Calculator' : tab === 'rules' ? 'Base Rates & PLC Rules' : 'Payment Schemes'}
            </span>
          </div>
          <h1 className="page-title">Pricing Engine & Cost Sheet Generator</h1>
          <p className="page-subtitle">Accurate RERA-compliant cost sheets, PLC calculations, statutory taxes and payment schedules</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const selectedPrjObj = projects.find(p => p._id === project);
              exportPricingCostSheetCSV({
                projectName: selectedPrjObj?.name || 'Project Cost Sheet',
                unitType,
                superArea,
                floorNumber,
                baseRate,
                baseCost,
                floorRiseCost,
                plcCost,
                infraCost,
                clubhouseRate,
                totalParkingCost,
                agreementValue,
                gstAmount,
                stampDutyAmount,
                regCharge,
                legalAdvocateFees,
                totalPackageValue,
                milestones
              }, user?.organization || 'MRP REAL ESTATE');
              showNotification(`Exported Cost Sheet CSV for ${unitType} (${superArea} sq.ft)!`);
            }}
            title="Download detailed RERA cost sheet calculations CSV"
          >
            <Download size={14} /> Export Cost Sheet CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowWhatsAppModal(true)}>
            <MessageSquare size={14} color="#16a34a" /> WhatsApp Quote
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowReraQuoteModal(true)}>
            <Award size={14} color="var(--primary)" /> Official Developer Quote
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <Printer size={14} /> Print Cost Sheet
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'calculator', label: 'Instant Cost Sheet Calculator' },
          { id: 'rules', label: 'Base Pricing & PLC Matrix' },
          { id: 'plans', label: 'Payment Scheme Configurations' },
        ].map(t => (
          <div
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, height: 'calc(100vh - 195px)', maxHeight: 'calc(100vh - 195px)', overflow: 'hidden' }}>
          {/* Controls Column */}
          <div className="card" style={{ padding: 20, height: '100%', maxHeight: '100%', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calculator size={16} color="var(--primary)" /> Unit Parameters
            </div>

            <div className="form-group">
              <CustomSelect
                label="Project"
                value={project}
                onChange={val => setProject(val)}
                searchable={true}
                placeholder="Select Project"
                options={projects.length > 0
                  ? projects.map(p => ({ value: p._id, label: p.name, subtext: p.city || p.code, icon: '🏢' }))
                  : [{ value: '1', label: 'Primary Project', icon: '🏢' }]
                }
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Unit Type</label>
              <CustomSelect
                label="Unit Type"
                value={unitType}
                onChange={val => {
                  setUnitType(val);
                  if (val === '2BHK') setSuperArea(950);
                  if (val === '3BHK') setSuperArea(1350);
                  if (val === '4BHK') setSuperArea(1850);
                }}
                options={[
                  { value: '2BHK', label: '2 BHK (950 sq.ft)', icon: '🏠' },
                  { value: '3BHK', label: '3 BHK (1,350 sq.ft)', icon: '🏠' },
                  { value: '4BHK', label: '4 BHK (1,850 sq.ft)', icon: '🏠' }
                ]}
              />
              </div>
              <div className="form-group">
                <label className="form-label">Floor Number</label>
                <input
                  type="number"
                  className="form-input"
                  min="1" max="30"
                  value={floorNumber}
                  onChange={e => setFloorNumber(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Base Rate (₹ / sq.ft)</label>
              <input
                type="number"
                className="form-input"
                value={baseRate}
                onChange={e => setBaseRate(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">PLC (Corner / Premium Facing)</label>
              <CustomSelect
                label="PLC (Corner / Premium Facing)"
                value={String(plcRate)}
                onChange={val => setPlcRate(Number(val))}
                options={[
                  { value: '0', label: 'Standard / No PLC (₹0/sq.ft)', icon: '⬡' },
                  { value: '150', label: 'Garden Facing (+₹150/sq.ft)', icon: '🌿' },
                  { value: '250', label: 'East Facing + Corner (+₹250/sq.ft)', icon: '🦭' },
                  { value: '400', label: 'Top Floor Sky Penthouse (+₹400/sq.ft)', icon: '⭐' }
                ]}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Covered Car Parkings</label>
              <CustomSelect
                label="Covered Car Parkings"
                value={String(carParkingCount)}
                onChange={val => setCarParkingCount(Number(val))}
                options={[
                  { value: '1', label: '1 Covered Slot', icon: '🚗' },
                  { value: '2', label: '2 Covered Slots', icon: '🚗' },
                  { value: '0', label: 'No Slot', icon: '✘' }
                ]}
              />
              <CustomSelect
                label="Payment Scheme"
                value={paymentPlan}
                onChange={val => setPaymentPlan(val)}
                options={[
                  { value: 'clp', label: 'Construction Linked', icon: '🚧' },
                  { value: 'dp', label: 'Down Payment (5% Disc)', icon: '💰' },
                  { value: 'subvention', label: '20:80 Subvention', icon: '🏦' }
                ]}
              />
              </div>
            </div>
          </div>

          {/* Generated Cost Sheet Quote Sheet */}
          <div className="card" style={{ padding: 24, height: '100%', maxHeight: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>ESTIMATED UNIT COST SHEET</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Green Valley Residences • Tower A, Floor {floorNumber} • Unit Type {unitType}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-success" style={{ fontSize: 12 }}>RERA Reg: P52100024567</span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Date: {new Date().toLocaleDateString('en-IN')}</div>
              </div>
            </div>

            {/* Price Table 1: Agreement Value Breakdown */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', marginBottom: 10 }}>
                A. Agreement Value Components (AV)
              </div>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 0' }}>Base Selling Price ({superArea} sq.ft @ ₹{baseRate}/sq.ft)</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(baseCost)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 0' }}>Floor Rise Charges (Floor {floorNumber} @ ₹{floorRiseRate}/sq.ft)</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(floorRiseCost)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 0' }}>Preferential Location Charges (PLC @ ₹{plcRate}/sq.ft)</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(plcCost)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 0' }}>Infrastructure & Development Charges (@ ₹{infraDevRate}/sq.ft)</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(infraCost)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 0' }}>Clubhouse & Lifestyle Amenities Membership</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(clubhouseRate)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 0' }}>Covered Car Parking ({carParkingCount} Allocated Slot)</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(totalParkingCost)}</td>
                  </tr>
                  <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                    <td style={{ padding: '10px 8px', color: 'var(--text-primary)' }}>Total Agreement Value (AV)</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--primary)', fontSize: 15 }}>{formatCurrency(agreementValue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Price Table 2: Statutory Govt Taxes */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', marginBottom: 10 }}>
                B. Statutory Government Duties & Taxes (Estimates)
              </div>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 0' }}>GST @ 5% on Agreement Value</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(gstAmount)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 0' }}>Stamp Duty @ 6% on Agreement Value</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(stampDutyAmount)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 0' }}>Registration & Documentation Charges</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(regCharge)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 0' }}>Legal & Scrutiny Charges</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(legalAdvocateFees)}</td>
                  </tr>
                  <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                    <td style={{ padding: '10px 8px' }}>Total Statutory & Taxes</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 14 }}>{formatCurrency(totalTaxes)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Grand Total Highlight Box */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)', color: 'white', borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Final All-Inclusive Package Cost</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Includes Unit + Parking + Club + Taxes + Stamp Duty</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#38bdf8' }}>
                {formatCurrency(totalPackageValue)}
              </div>
            </div>

            {/* Payment Schedule Milestones */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', marginBottom: 12 }}>
                C. Construction Linked Payment (CLP) Schedule
              </div>
              <div className="table-wrapper" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Milestone Stage</th>
                      <th>Percentage</th>
                      <th>Payable Amount (₹)</th>
                      <th>Timeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</td>
                        <td><span className="badge badge-primary">{m.pct}%</span></td>
                        <td><strong>{formatCurrency(m.amount)}</strong></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.due}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'rules' && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Project Pricing Rules & PLC Matrix</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Base Rate (₹/sq.ft)</th>
                  <th>Floor Rise Rule</th>
                  <th>Corner PLC</th>
                  <th>Garden PLC</th>
                  <th>Covered Parking</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>Green Valley Residences</td>
                  <td>₹7,200</td>
                  <td>+₹50/sq.ft per floor from 3rd floor</td>
                  <td>+₹250/sq.ft</td>
                  <td>+₹150/sq.ft</td>
                  <td>₹3,50,000</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Skyline Tower Commercial</td>
                  <td>₹18,500</td>
                  <td>+₹100/sq.ft per floor from 5th floor</td>
                  <td>+₹500/sq.ft</td>
                  <td>N/A</td>
                  <td>₹7,50,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'plans' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {[
            { name: 'Construction Linked Plan (CLP)', desc: 'Standard 7-milestone plan aligned with RERA construction progress certificates', discount: '0%', badge: 'Most Popular' },
            { name: 'Down Payment Scheme (10:90)', desc: '10% at booking, 90% within 45 days. Buyer receives an upfront discount on Base Price.', discount: '5% Base Discount', badge: 'Fast Cashflow' },
            { name: 'Bank Subvention Scheme (20:80)', desc: 'Customer pays 20%, Bank funds 80% with No EMI till Possession. Developer bears interest.', discount: 'No Pre-EMI', badge: 'High Conversion' },
          ].map((p, i) => (
            <div key={i} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                <span className="badge badge-primary">{p.badge}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>{p.desc}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>Benefit: {p.discount}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => showNotification(`Configured Scheme: ${p.name}`)}>Configure</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WhatsApp Share Modal */}
      {showWhatsAppModal && (
        <div className="modal-overlay" onClick={() => setShowWhatsAppModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} color="#16a34a" /> Instant WhatsApp Cost Sheet
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowWhatsAppModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Recipient Buyer Name</label>
                <input className="form-input" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Buyer Name" />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp Mobile Number</label>
                <input className="form-input" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="e.g. +91 98000 00000" />
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#166534' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ Automated Real Estate Message Preview:</div>
                <div style={{ fontStyle: 'italic', lineHeight: 1.4, color: '#15803d' }}>
                  "Hello {buyerName || 'Valued Customer'}, here is the official cost sheet for {unitType} ({superArea} sq.ft) at {projects.find(p => p._id === project)?.name || 'Selected Project'}. Agreement Value: {formatCurrency(agreementValue)} | All-Inclusive Total: {formatCurrency(totalPackageValue)}. Click link to view certified PDF breakdown."
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowWhatsAppModal(false)}>Cancel</button>
              <button
                className="btn btn-success btn-sm"
                onClick={() => {
                  showNotification(`WhatsApp quotation dispatched to ${buyerName} (${buyerPhone})!`);
                  setShowWhatsAppModal(false);
                }}
              >
                <Send size={13} /> Dispatch WhatsApp Quote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Developer RERA Quotation Modal */}
      {showReraQuoteModal && (
        <div className="modal-overlay" onClick={() => setShowReraQuoteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={18} color="var(--primary)" /> Developer Stamp-Certified RERA Quotation
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowReraQuoteModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ background: '#ffffff', padding: 24, border: '1px solid #e2e8f0', borderRadius: 8, margin: 12 }}>
              {/* Header Letterhead */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 14, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)' }}>RISE WITH REALTYHUB DEVELOPERS</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>MahaRERA Reg. No: P52100024891 | ISO 9001:2015 Certified</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Corporate HQ: Sky Vista Towers, Viman Nagar, Pune - 411014</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>QUOTATION #{Math.floor(100000 + Math.random() * 900000)}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>VALID FOR 7 DAYS</div>
                </div>
              </div>

              {/* Customer and Unit Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
                <div>
                  <div><strong>Customer Name:</strong> {buyerName}</div>
                  <div><strong>Contact:</strong> +91 {buyerPhone}</div>
                  <div><strong>Executive:</strong> Amit Singh (Senior Relationship Manager)</div>
                </div>
                <div>
                  <div><strong>Project:</strong> {project === '1' ? 'Green Valley Residences (Pune)' : 'Skyline Commercial'}</div>
                  <div><strong>Unit Configuration:</strong> {unitType} · Floor {floorNumber}</div>
                  <div><strong>Super Built-Up Area:</strong> {superArea} sq.ft</div>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Component Description</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Rate / Units</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px' }}>Base Selling Price (BSP)</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>₹{baseRate}/sq.ft</td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>{formatCurrency(baseCost)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px' }}>Floor Rise Charges (Floor {floorNumber})</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>+₹{floorRiseRate}/sq.ft</td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>{formatCurrency(floorRiseCost)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px' }}>Premium Location Charges (PLC - East / Corner)</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>₹{plcRate}/sq.ft</td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>{formatCurrency(plcCost)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px' }}>Reserved Covered Car Parking</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>{carParkingCount} Slot</td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>{formatCurrency(totalParkingCost)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px' }}>Clubhouse & Infrastructure Dev (IDC)</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>Fixed</td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>{formatCurrency(clubhouseRate + infraCost)}</td>
                  </tr>
                  <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                    <td style={{ padding: '8px 6px' }}>Total Agreement Value (AV)</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px' }}>—</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--primary)', fontSize: 13 }}>{formatCurrency(agreementValue)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px' }}>GST (5%) + Stamp Duty (6%) + Registration + Legal</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>Statutory</td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>{formatCurrency(totalTaxes)}</td>
                  </tr>
                  <tr style={{ background: '#eff6ff', fontWeight: 900, borderTop: '2px solid var(--primary)' }}>
                    <td style={{ padding: '10px 6px', fontSize: 14 }}>FINAL ALL-INCLUSIVE PACKAGE</td>
                    <td style={{ textAlign: 'right', padding: '10px 6px' }}>—</td>
                    <td style={{ textAlign: 'right', padding: '10px 6px', fontSize: 16, color: 'var(--primary)' }}>{formatCurrency(totalPackageValue)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Developer Seal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', maxWidth: 320, lineHeight: 1.4 }}>
                  * This cost sheet is an indicative estimate as per prevailing RERA norms. Stamp duty and GST are subject to change as per statutory amendments.
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 140, height: 40, borderBottom: '1px solid #0f172a', marginBottom: 4 }} />
                  <div style={{ fontSize: 11, fontWeight: 700 }}>Authorized Signatory</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Rise With RealtyHub</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReraQuoteModal(false)}>Close</button>
              <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                <Printer size={13} /> Print Certified Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
