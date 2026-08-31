import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Search, Building, MapPin, Home, DollarSign, Users,
  MoreHorizontal, X, CheckCircle, Edit, Layers, ArrowRight,
  Grid, HelpCircle, Sparkles, ChevronRight, Check, FileText,
  AlertCircle, ArrowLeft, Trash2, SlidersHorizontal, ArrowUpDown,
  Compass, CheckSquare, ShieldCheck, TreePine, Warehouse, ShoppingBag, Eye,
  Clock, Phone, Mail, User, CreditCard, Receipt, FileCheck, Calendar, Info,
  UserCheck, Tag, Briefcase, Hash, Map, UserPlus
} from 'lucide-react';
import api from '../../services/api';
import { useUI } from '../../context/UIContext';
import { formatCurrency, formatDate, formatArea } from '../../utils/formatters';
import {
  PROJECT_STATUSES,
  UNIT_STATUSES,
  REAL_ESTATE_CATEGORIES,
  CATEGORY_TYPOLOGIES,
  FACING_OPTIONS,
  APPROVAL_BODIES,
  getCategoryMeta
} from '../../utils/constants';

const STANDARD_APPROVAL_OPTIONS = [
  { id: 'RERA Approved', label: 'RERA Approved', icon: '🏛️' },
  { id: 'DTCP Approved', label: 'DTCP Approved', icon: '📐' },
  { id: 'CMDA Approved', label: 'CMDA Approved', icon: '🏢' },
  { id: 'HMDA Approved', label: 'HMDA Approved', icon: '🌆' },
  { id: 'BDA / BMRDA Approved', label: 'BDA / BMRDA Approved', icon: '🏙️' },
  { id: 'PMRDA Approved', label: 'PMRDA Approved', icon: '🗺️' },
  { id: 'Town Planning / Municipal Sanctioned', label: 'Municipal / Town Planning', icon: '📋' },
  { id: 'Gram Panchayat Clear Title', label: 'Gram Panchayat Approved', icon: '🏡' },
  { id: 'Revenue / Patta Title Clear', label: 'Patta Land / Legal Clear', icon: '📜' },
  { id: 'Bank Loan Approved (SBI/HDFC/ICICI)', label: 'Bank Loan Approved (SBI/HDFC)', icon: '🏦' },
  { id: 'Environmental Clearance (EC)', label: 'Environment Clearance (EC)', icon: '🌿' },
  { id: 'Fire Safety NOC Clear', label: 'Fire NOC Approved', icon: '🚒' }
];

const StatusBadge = ({ status }) => {
  const conf = PROJECT_STATUSES[status] || { label: status?.replace(/_/g, ' '), badge: 'badge-gray' };
  return <span className={`badge ${conf.badge}`}>{conf.label}</span>;
};

// ─── Co-Applicant Relationships ─────────────────────────────
const CO_APPLICANT_RELATIONS = [
  { value: 'Spouse', label: '💍 Spouse (Wife / Husband)' },
  { value: 'Father', label: '👨 Father' },
  { value: 'Mother', label: '👩 Mother' },
  { value: 'Son', label: '👦 Son' },
  { value: 'Daughter', label: '👧 Daughter' },
  { value: 'Brother', label: '🧑 Brother' },
  { value: 'Sister', label: '👱‍♀️ Sister' },
  { value: 'Business Partner', label: '💼 Business Partner' },
  { value: 'Co-Owner / Investor', label: '🤝 Co-Owner / Co-Investor' },
  { value: 'Father-in-law', label: '👴 Father-in-law' },
  { value: 'Mother-in-law', label: '👵 Mother-in-law' },
  { value: 'Other Family Member', label: '👥 Other Family / Legal Entity' }
];

const defaultLeads = [];

// ─── Initial Projects (Empty Clean Slate) ───────────────────
const initialProjects = [];

export default function ProjectsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTypeFromPath = () => {
    if (location.pathname.includes('/residential')) return 'residential_apartment';
    if (location.pathname.includes('/plots')) return 'plots';
    if (location.pathname.includes('/commercial')) return 'commercial_office';
    if (location.pathname.includes('/villas')) return 'villa';
    if (location.pathname.includes('/retail')) return 'retail_shop';
    if (location.pathname.includes('/industrial')) return 'industrial_warehouse';
    if (location.pathname.includes('/farmland')) return 'farmland';
    if (location.pathname.includes('/agri') || location.pathname.includes('/agricultural')) return 'agricultural_land';
    if (location.pathname.includes('/layouts')) return 'layouts';
    if (location.pathname.includes('/resort')) return 'resort_plots';
    if (location.pathname.includes('/studio')) return 'studio_apartment';
    if (location.pathname.includes('/custom')) return 'custom';
    return '';
  };

  const [projects, setProjects] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(getTypeFromPath());
  const [statusFilter, setStatusFilter] = useState('');
  const [activeProjectView, setActiveProjectView] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(true);
  const { showNotification } = useUI();

  // Unit Filtering & Sorting State in Active Project View
  const [unitSearch, setUnitSearch] = useState('');
  const [unitFacingFilter, setUnitFacingFilter] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState('');
  const [unitStatusFilter, setUnitStatusFilter] = useState('');
  const [unitSortBy, setUnitSortBy] = useState('unitNumber');
  const [unitViewMode, setUnitViewMode] = useState('table');

  // Hold & Booking Modals State
  const [holdingUnit, setHoldingUnit] = useState(null);
  const [bookingUnit, setBookingUnit] = useState(null);
  const [viewingHoldDetails, setViewingHoldDetails] = useState(null);

  // Hold Customer Form
  const [holdForm, setHoldForm] = useState({
    selectedLeadId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    durationHours: '',
    holdReason: '',
    agentName: 'Sales Representative'
  });

  // Booking Customer Form
  const [bookingForm, setBookingForm] = useState({
    selectedLeadId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    panNumber: '',
    aadharNumber: '',
    address: '',
    coApplicantName: '',
    coApplicantPhone: '',
    coApplicantEmail: '',
    coApplicantPan: '',
    coApplicantAadhaar: '',
    coApplicantRelation: 'Spouse',
    tokenAmount: '',
    paymentMode: 'Cheque',
    transactionRef: '',
    bookingDate: new Date().toISOString().split('T')[0],
    agentName: 'Sales Representative',
    specialNotes: ''
  });

  // Project Form
  const [form, setForm] = useState({
    name: '',
    code: '',
    city: '',
    address: '',
    type: 'residential_apartment',
    customCategoryName: '',
    customUnitTerm: '',
    isCustomCategory: false,
    status: 'launched',
    totalUnits: '',
    minPrice: '',
    maxPrice: '',
    approvals: [],
    newCustomApproval: '',
    totalAcres: '',
    extentUnit: 'Acres'
  });

  // Dynamic Unit Form for Active Project
  const [unitForm, setUnitForm] = useState({
    unitNumber: '',
    tower: '',
    sector: '',
    phase: '',
    block: '',
    zone: '',
    floor: '',
    type: '',
    customType: '',
    isCustomType: false,
    area: '',
    carpetArea: '',
    dimensions: '',
    roadWidth: '',
    isCornerPlot: false,
    boundaryWall: true,
    levels: '',
    gardenArea: '',
    carParks: '',
    frontage: '',
    ceilingHeight: '',
    fitoutStatus: '',
    suitableFor: '',
    extentAcres: '',
    extentUnit: 'Acres',
    plantationType: '',
    waterSource: '',
    basePrice: '',
    totalPrice: '',
    facing: 'East',
    customFacing: '',
    isCustomFacing: false,
    status: 'available'
  });

  useEffect(() => {
    setTypeFilter(getTypeFromPath());
  }, [location.pathname]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showProjectModal || showAddUnitModal || holdingUnit || bookingUnit || viewingHoldDetails) {
      document.body.classList.add('no-scroll');
      return () => document.body.classList.remove('no-scroll');
    }
  }, [showProjectModal, showAddUnitModal, holdingUnit, bookingUnit, viewingHoldDetails]);

  const handleTypeChange = (type) => {
    setTypeFilter(type);
    navigate(`/projects/${type ? type : 'all'}`);
  };

  // Load Projects & Leads
  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/projects');
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          setProjects(data.data);
        } else {
          const saved = localStorage.getItem('crm_user_projects');
          setProjects(saved ? JSON.parse(saved) : []);
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
        const saved = localStorage.getItem('crm_user_projects');
        setProjects(saved ? JSON.parse(saved) : []);
      } finally { setLoading(false); }
    };
    fetch();

    // Fetch Leads for Auto-Populate Dropdown
    const fetchLeads = async () => {
      try {
        const { data } = await api.get('/leads?limit=200');
        if (data.data?.length > 0) {
          setLeadsList(data.data);
        } else {
          setLeadsList(defaultLeads);
        }
      } catch (err) {
        console.error('Failed to fetch leads:', err);
        setLeadsList(defaultLeads);
      }
    };
    fetchLeads();
  }, []);

  // When active project is opened, load its units from inventory API or fallback
  useEffect(() => {
    if (!activeProjectView?._id) return;
    let isMounted = true;
    const loadUnits = async () => {
      try {
        const { data } = await api.get(`/inventory?project=${activeProjectView._id}&limit=200`);
        if (isMounted) {
          if (data.data?.length > 0) {
            const mappedUnits = data.data.map(u => ({
              _id: u._id,
              unitNumber: u.unitNumber,
              tower: u.tower || activeProjectView.towers?.[0]?.name || 'Main Tower',
              sector: u.sector || 'Sector A',
              phase: u.phase || 'Phase 1',
              block: u.block || 'Block A',
              floor: u.floor || 1,
              type: u.type || '3 BHK',
              area: u.area?.superBuiltUp || u.area?.carpetArea || (typeof u.area === 'number' ? u.area : 1200),
              carpetArea: u.area?.carpet || Math.round((u.area?.superBuiltUp || 1200) * 0.75),
              dimensions: u.dimensions?.dimensionStr || u.plotDetails?.dimensionStr || '30 x 40 ft',
              roadWidth: u.plotDetails?.roadWidth || 40,
              isCornerPlot: u.plotDetails?.isCornerPlot || u.isCorner || false,
              boundaryWall: u.plotDetails?.boundaryWall || true,
              levels: u.villaDetails?.levels || 'G+1',
              gardenArea: u.villaDetails?.gardenArea || 400,
              frontage: u.commercialDetails?.frontage || 18,
              fitoutStatus: u.commercialDetails?.fitoutStatus || 'Bare Shell',
              suitableFor: u.commercialDetails?.suitableFor || 'Retail / Office',
              extentAcres: u.farmlandDetails?.extentAcres || 0.5,
              plantationType: u.farmlandDetails?.plantationType || 'Organic Orchard',
              basePrice: u.pricing?.basePrice || 5000000,
              totalPrice: u.pricing?.totalPrice || 6000000,
              facing: u.facing ? (u.facing.charAt(0).toUpperCase() + u.facing.slice(1)) : 'East',
              status: u.status || 'available',
              holdCustomer: u.holdCustomer || null,
              bookingCustomer: u.bookingCustomer || null
            }));
            setActiveProjectView(prev => ({ ...prev, unitsList: mappedUnits }));
          } else {
            const fallback = initialProjects.find(ip => ip.code === activeProjectView.code || ip._id === activeProjectView._id);
            if (fallback?.unitsList?.length > 0) {
              setActiveProjectView(prev => ({ ...prev, unitsList: fallback.unitsList }));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load project units:', err);
        const fallback = initialProjects.find(ip => ip.code === activeProjectView.code || ip._id === activeProjectView._id);
        if (isMounted && fallback?.unitsList?.length > 0) {
          setActiveProjectView(prev => ({ ...prev, unitsList: fallback.unitsList }));
        }
      }
    };
    loadUnits();
    return () => { isMounted = false; };
  }, [activeProjectView?._id]);

  const handleSaveProject = async (e) => {
    e.preventDefault();
    const finalType = form.isCustomCategory || form.type === 'custom' ? 'custom' : form.type;
    const selectedApprovals = Array.isArray(form.approvals) && form.approvals.length > 0
      ? form.approvals
      : ['RERA Approved'];

    const payload = {
      name: form.name,
      code: form.code?.toUpperCase() || 'PRJ',
      city: form.city,
      address: form.address || 'Prime City Location',
      type: finalType,
      status: form.status,
      totalUnits: Number(form.totalUnits),
      priceRange: { min: Number(form.minPrice), max: Number(form.maxPrice) },
      categoryDetails: {
        customCategoryName: form.customCategoryName || (form.isCustomCategory ? form.name + ' Category' : ''),
        customUnitTerm: form.customUnitTerm || 'Unit / Space',
        approvals: selectedApprovals,
        approvalBody: selectedApprovals.join(', '),
        totalAcres: Number(form.totalAcres),
        extentUnit: form.extentUnit || 'Acres'
      }
    };

    if (editingProject) {
      const updated = { ...editingProject, ...payload };
      setProjects(prev => {
        const next = prev.map(p => p._id === editingProject._id ? updated : p);
        try { localStorage.setItem('crm_user_projects', JSON.stringify(next)); } catch {}
        return next;
      });
      if (activeProjectView?._id === editingProject._id) setActiveProjectView(updated);
      try {
        const { data } = await api.put(`/projects/${editingProject._id}`, payload);
        if (data.data) {
          const fresh = data.data;
          setProjects(prev => {
            const next = prev.map(p => p._id === editingProject._id ? fresh : p);
            try { localStorage.setItem('crm_user_projects', JSON.stringify(next)); } catch {}
            return next;
          });
          if (activeProjectView?._id === editingProject._id) setActiveProjectView(fresh);
        }
      } catch {}
      showNotification(`Project "${form.name}" updated!`);
    } else {
      const newProj = {
        _id: `proj_${Date.now()}`,
        ...payload,
        unitStats: { available: 0, booked: 0, sold: 0, on_hold: 0, blocked: 0 },
        unitsList: []
      };
      setProjects(prev => {
        const next = [newProj, ...prev];
        try { localStorage.setItem('crm_user_projects', JSON.stringify(next)); } catch {}
        return next;
      });
      try {
        const { data } = await api.post('/projects', payload);
        if (data.data) {
          const fresh = data.data;
          setProjects(prev => {
            const next = prev.map(p => p._id === newProj._id ? fresh : p);
            try { localStorage.setItem('crm_user_projects', JSON.stringify(next)); } catch {}
            return next;
          });
        }
      } catch {}
      showNotification(`Project "${form.name}" created successfully!`);
    }
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const handleAddUnitToProject = async (e) => {
    e.preventDefault();
    if (!activeProjectView) return;

    const isPlot = ['plots', 'layouts', 'resort_plots'].includes(activeProjectView.type);
    const isFarmlandOrAgri = ['farmland', 'agricultural_land'].includes(activeProjectView.type);
    const finalUnitType = unitForm.isCustomType || unitForm.type === 'Custom Typology' || (unitForm.type && unitForm.type.includes('Custom'))
      ? (unitForm.customType || unitForm.type || 'Custom Unit')
      : unitForm.type;
    const finalFacing = unitForm.isCustomFacing || unitForm.facing === 'Custom'
      ? (unitForm.customFacing || unitForm.facing || 'East')
      : unitForm.facing;

    const unitPayload = {
      project: activeProjectView._id,
      unitNumber: unitForm.unitNumber || (isPlot ? `Plot ${Date.now().toString().slice(-3)}` : isFarmlandOrAgri ? `Parcel ${Date.now().toString().slice(-3)}` : `Unit ${Date.now().toString().slice(-3)}`),
      tower: unitForm.tower,
      sector: unitForm.sector,
      phase: unitForm.phase,
      block: unitForm.block,
      floor: Number(unitForm.floor || 1),
      type: finalUnitType,
      category: activeProjectView.type,
      area: {
        carpetArea: Number(unitForm.carpetArea || unitForm.area),
        superBuiltUp: Number(unitForm.area),
        plotArea: Number(unitForm.area)
      },
      pricing: { basePrice: Number(unitForm.basePrice), totalPrice: Number(unitForm.totalPrice) },
      facing: (finalFacing || 'East').toLowerCase(),
      status: unitForm.status || 'available',
      plotDetails: {
        dimensionStr: unitForm.dimensions,
        roadWidth: Number(unitForm.roadWidth || 40),
        isCornerPlot: Boolean(unitForm.isCornerPlot),
        boundaryWall: Boolean(unitForm.boundaryWall)
      },
      villaDetails: {
        levels: unitForm.levels,
        gardenArea: Number(unitForm.gardenArea || 0),
        coveredCarParks: Number(unitForm.carParks || 2)
      },
      commercialDetails: {
        frontage: Number(unitForm.frontage || 0),
        ceilingHeight: Number(unitForm.ceilingHeight || 12),
        fitoutStatus: unitForm.fitoutStatus,
        suitableFor: unitForm.suitableFor
      },
      farmlandDetails: {
        extentAcres: Number(unitForm.extentAcres || 0.5),
        extentUnit: unitForm.extentUnit || 'Acres',
        plantationType: unitForm.plantationType,
        waterSource: unitForm.waterSource
      }
    };

    let createdUnit = null;
    try {
      const { data } = await api.post('/inventory', unitPayload);
      if (data.data) {
        createdUnit = {
          _id: data.data._id,
          ...unitPayload,
          type: finalUnitType,
          area: Number(unitForm.area),
          carpetArea: Number(unitForm.carpetArea || unitForm.area),
          dimensions: unitForm.dimensions,
          roadWidth: Number(unitForm.roadWidth || 40),
          isCornerPlot: unitForm.isCornerPlot,
          boundaryWall: unitForm.boundaryWall,
          levels: unitForm.levels,
          gardenArea: Number(unitForm.gardenArea || 0),
          frontage: Number(unitForm.frontage || 0),
          fitoutStatus: unitForm.fitoutStatus,
          suitableFor: unitForm.suitableFor,
          extentAcres: Number(unitForm.extentAcres || 0.5),
          extentUnit: unitForm.extentUnit || 'Acres',
          facing: finalFacing,
          basePrice: Number(unitForm.basePrice),
          totalPrice: Number(unitForm.totalPrice)
        };
      }
    } catch {}

    if (!createdUnit) {
      createdUnit = {
        _id: `unit_${Date.now()}`,
        ...unitPayload,
        type: finalUnitType,
        area: Number(unitForm.area),
        carpetArea: Number(unitForm.carpetArea || unitForm.area),
        dimensions: unitForm.dimensions,
        roadWidth: Number(unitForm.roadWidth || 40),
        isCornerPlot: unitForm.isCornerPlot,
        boundaryWall: unitForm.boundaryWall,
        levels: unitForm.levels,
        gardenArea: Number(unitForm.gardenArea || 0),
        frontage: Number(unitForm.frontage || 0),
        fitoutStatus: unitForm.fitoutStatus,
        suitableFor: unitForm.suitableFor,
        extentAcres: Number(unitForm.extentAcres || 0.5),
        extentUnit: unitForm.extentUnit || 'Acres',
        facing: finalFacing,
        basePrice: Number(unitForm.basePrice),
        totalPrice: Number(unitForm.totalPrice)
      };
    }

    const updatedUnits = [createdUnit, ...(activeProjectView.unitsList || [])];
    const availCount = updatedUnits.filter(u => u.status === 'available').length;
    const bookedCount = updatedUnits.filter(u => u.status === 'booked').length;
    const soldCount = updatedUnits.filter(u => u.status === 'sold').length;
    const holdCount = updatedUnits.filter(u => u.status === 'on_hold').length;

    const updatedProj = {
      ...activeProjectView,
      unitsList: updatedUnits,
      totalUnits: updatedUnits.length,
      unitStats: { available: availCount, booked: bookedCount, sold: soldCount, on_hold: holdCount, blocked: 0 }
    };

    setActiveProjectView(updatedProj);
    setProjects(prev => prev.map(p => p._id === activeProjectView._id ? updatedProj : p));
    setShowAddUnitModal(false);
    showNotification(`Added ${createdUnit.unitNumber} to ${activeProjectView.name}!`);
  };

  // Open Hold Customer Modal
  const openHoldModal = (unit) => {
    setHoldingUnit(unit);
    setHoldForm({
      selectedLeadId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      durationHours: '',
      holdReason: '',
      agentName: 'Sales Representative'
    });
  };

  // Select Lead for Hold Modal
  const handleHoldLeadSelect = (leadId) => {
    if (!leadId) {
      setHoldForm(p => ({ ...p, selectedLeadId: '', customerName: '', customerPhone: '', customerEmail: '' }));
      return;
    }
    const lead = leadsList.find(l => l._id === leadId);
    if (lead) {
      setHoldForm(p => ({
        ...p,
        selectedLeadId: leadId,
        customerName: lead.name || '',
        customerPhone: lead.phone || '',
        customerEmail: lead.email || '',
        agentName: lead.assignedTo?.name || 'Sales Representative',
        holdReason: `Hold requested for active prospect (${lead.stage?.replace(/_/g, ' ') || 'Hot'})`
      }));
    }
  };

  // Confirm Hold Submission
  const handleConfirmHold = async (e) => {
    e.preventDefault();
    if (!holdingUnit || !activeProjectView) return;

    const expiresAt = new Date(Date.now() + Number(holdForm.durationHours) * 3600 * 1000);
    const holdPayload = {
      status: 'on_hold',
      holdCustomer: {
        leadId: holdForm.selectedLeadId || undefined,
        name: holdForm.customerName,
        phone: holdForm.customerPhone,
        email: holdForm.customerEmail,
        durationHours: Number(holdForm.durationHours),
        reason: holdForm.holdReason,
        agentName: holdForm.agentName,
        heldAt: new Date(),
        expiresAt
      }
    };

    try {
      await api.put(`/inventory/${holdingUnit._id}/status`, holdPayload);
    } catch {}

    const updatedUnits = (activeProjectView.unitsList || []).map(u =>
      u._id === holdingUnit._id ? { ...u, status: 'on_hold', holdCustomer: holdPayload.holdCustomer } : u
    );
    const availCount = updatedUnits.filter(u => u.status === 'available').length;
    const bookedCount = updatedUnits.filter(u => u.status === 'booked').length;
    const soldCount = updatedUnits.filter(u => u.status === 'sold').length;
    const holdCount = updatedUnits.filter(u => u.status === 'on_hold').length;

    const updatedProj = {
      ...activeProjectView,
      unitsList: updatedUnits,
      unitStats: { available: availCount, booked: bookedCount, sold: soldCount, on_hold: holdCount, blocked: 0 }
    };

    setActiveProjectView(updatedProj);
    setProjects(prev => prev.map(p => p._id === activeProjectView._id ? updatedProj : p));
    setHoldingUnit(null);
    showNotification(`Unit ${holdingUnit.unitNumber} held for ${holdForm.customerName} (${holdForm.durationHours} Hours)!`);
  };

  // Open Booking Customer Modal
  const openBookingModal = (unit) => {
    setBookingUnit(unit);

    // If unit was on hold, prefill customer info
    if (unit.holdCustomer?.name) {
      const matchedLead = leadsList.find(l => l.name?.toLowerCase() === unit.holdCustomer.name?.toLowerCase() || l.phone === unit.holdCustomer.phone);
      setBookingForm({
        selectedLeadId: matchedLead?._id || unit.holdCustomer.leadId || '',
        customerName: unit.holdCustomer.name || '',
        customerPhone: unit.holdCustomer.phone || '',
        customerEmail: unit.holdCustomer.email || '',
        panNumber: matchedLead?.panNumber || '',
        aadharNumber: matchedLead?.aadharNumber || '',
        address: matchedLead?.address || '',
        coApplicantName: '',
        coApplicantPhone: '',
        coApplicantEmail: '',
        coApplicantPan: '',
        coApplicantAadhaar: '',
        coApplicantRelation: 'Spouse',
        tokenAmount: '',
        paymentMode: 'Cheque',
        transactionRef: '',
        bookingDate: new Date().toISOString().split('T')[0],
        agentName: unit.holdCustomer.agentName || 'Sales Representative',
        specialNotes: unit.holdCustomer.reason || ''
      });
    } else {
      setBookingForm({
        selectedLeadId: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        panNumber: '',
        aadharNumber: '',
        address: '',
        coApplicantName: '',
        coApplicantPhone: '',
        coApplicantEmail: '',
        coApplicantPan: '',
        coApplicantAadhaar: '',
        coApplicantRelation: 'Spouse',
        tokenAmount: '',
        paymentMode: 'Cheque',
        transactionRef: '',
        bookingDate: new Date().toISOString().split('T')[0],
        agentName: 'Sales Representative',
        specialNotes: ''
      });
    }
  };

  // Select Lead for Booking Modal (Auto-Populates KYC & Contact Info)
  const handleBookingLeadSelect = (leadId) => {
    if (!leadId) {
      setBookingForm(p => ({
        ...p,
        selectedLeadId: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        panNumber: '',
        aadharNumber: '',
        address: ''
      }));
      return;
    }
    const lead = leadsList.find(l => l._id === leadId);
    if (lead) {
      setBookingForm(p => ({
        ...p,
        selectedLeadId: leadId,
        customerName: lead.name || '',
        customerPhone: lead.phone || '',
        customerEmail: lead.email || '',
        panNumber: lead.panNumber || (lead.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5).padEnd(5, 'A') + '1234' + (lead.name.slice(-1).toUpperCase() || 'F')),
        aadharNumber: lead.aadharNumber || '1234 5678 9012',
        address: lead.address || (lead.city ? `${lead.city}, State` : 'Pune, Maharashtra'),
        agentName: lead.assignedTo?.name || p.agentName || 'Sales Representative',
        specialNotes: `Sourced via ${lead.source || 'Direct Inquiry'} (${lead.stage?.replace(/_/g, ' ') || 'Active Lead'})`
      }));
      showNotification(`✓ Auto-populated KYC details for "${lead.name}"!`);
    }
  };

  // Confirm Booking Submission
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingUnit || !activeProjectView) return;

    const bookingPayload = {
      status: 'booked',
      bookingCustomer: {
        leadId: bookingForm.selectedLeadId || undefined,
        name: bookingForm.customerName,
        phone: bookingForm.customerPhone,
        email: bookingForm.customerEmail,
        panNumber: bookingForm.panNumber,
        aadharNumber: bookingForm.aadharNumber,
        address: bookingForm.address,
        coApplicantName: bookingForm.coApplicantName,
        coApplicantPhone: bookingForm.coApplicantPhone,
        coApplicantEmail: bookingForm.coApplicantEmail,
        coApplicantPan: bookingForm.coApplicantPan,
        coApplicantAadhaar: bookingForm.coApplicantAadhaar,
        coApplicantRelation: bookingForm.coApplicantRelation,
        tokenAmount: Number(bookingForm.tokenAmount),
        paymentMode: bookingForm.paymentMode,
        transactionRef: bookingForm.transactionRef,
        bookingDate: new Date(bookingForm.bookingDate)
      }
    };

    try {
      await api.put(`/inventory/${bookingUnit._id}/status`, bookingPayload);
    } catch {}

    // Also create official Booking record
    try {
      await api.post('/bookings', {
        lead: bookingForm.selectedLeadId || undefined,
        project: activeProjectView._id,
        unit: bookingUnit._id,
        customerName: bookingForm.customerName,
        customerPhone: bookingForm.customerPhone,
        customerEmail: bookingForm.customerEmail,
        panNumber: bookingForm.panNumber,
        aadharNumber: bookingForm.aadharNumber,
        coApplicants: bookingForm.coApplicantName ? [{
          name: bookingForm.coApplicantName,
          phone: bookingForm.coApplicantPhone,
          email: bookingForm.coApplicantEmail,
          relation: bookingForm.coApplicantRelation,
          panNumber: bookingForm.coApplicantPan,
          aadharNumber: bookingForm.coApplicantAadhaar
        }] : [],
        bookingAmount: Number(bookingForm.tokenAmount),
        bookingAmountMode: bookingForm.paymentMode?.toLowerCase(),
        totalAmount: bookingUnit.totalPrice,
        status: 'application_submitted'
      });
    } catch {}

    const updatedUnits = (activeProjectView.unitsList || []).map(u =>
      u._id === bookingUnit._id ? { ...u, status: 'booked', bookingCustomer: bookingPayload.bookingCustomer, holdCustomer: null } : u
    );
    const availCount = updatedUnits.filter(u => u.status === 'available').length;
    const bookedCount = updatedUnits.filter(u => u.status === 'booked').length;
    const soldCount = updatedUnits.filter(u => u.status === 'sold').length;
    const holdCount = updatedUnits.filter(u => u.status === 'on_hold').length;

    const updatedProj = {
      ...activeProjectView,
      unitsList: updatedUnits,
      unitStats: { available: availCount, booked: bookedCount, sold: soldCount, on_hold: holdCount, blocked: 0 }
    };

    setActiveProjectView(updatedProj);
    setProjects(prev => prev.map(p => p._id === activeProjectView._id ? updatedProj : p));
    setBookingUnit(null);
    showNotification(`🎉 Official Booking Application Confirmed for Unit ${bookingUnit.unitNumber}!`);
  };

  // Release Unit from Hold
  const handleReleaseHold = async (unitId, unitNumber) => {
    if (!activeProjectView) return;
    try {
      await api.put(`/inventory/${unitId}/status`, { status: 'available' });
    } catch {}
    const updatedUnits = (activeProjectView.unitsList || []).map(u =>
      u._id === unitId ? { ...u, status: 'available', holdCustomer: null } : u
    );
    const availCount = updatedUnits.filter(u => u.status === 'available').length;
    const bookedCount = updatedUnits.filter(u => u.status === 'booked').length;
    const soldCount = updatedUnits.filter(u => u.status === 'sold').length;
    const holdCount = updatedUnits.filter(u => u.status === 'on_hold').length;

    const updatedProj = {
      ...activeProjectView,
      unitsList: updatedUnits,
      unitStats: { available: availCount, booked: bookedCount, sold: soldCount, on_hold: holdCount, blocked: 0 }
    };
    setActiveProjectView(updatedProj);
    setProjects(prev => prev.map(p => p._id === activeProjectView._id ? updatedProj : p));
    setViewingHoldDetails(null);
    showNotification(`Unit ${unitNumber} released back to Available!`);
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to permanently delete project "${projectName}" and its inventory?`)) return;
    try {
      await api.delete(`/projects/${projectId}`);
    } catch {}
    setProjects(prev => {
      const next = prev.filter(p => p._id !== projectId);
      try { localStorage.setItem('crm_user_projects', JSON.stringify(next)); } catch {}
      return next;
    });
    if (activeProjectView?._id === projectId) setActiveProjectView(null);
    showNotification(`Project "${projectName}" deleted successfully!`);
  };

  const handleDeleteUnit = async (unitId, unitNumber) => {
    if (!window.confirm(`Are you sure you want to delete unit "${unitNumber}"?`)) return;
    try {
      await api.delete(`/inventory/${unitId}`);
    } catch {}
    if (activeProjectView) {
      const updatedUnits = (activeProjectView.unitsList || []).filter(u => u._id !== unitId);
      const availCount = updatedUnits.filter(u => u.status === 'available').length;
      const bookedCount = updatedUnits.filter(u => u.status === 'booked').length;
      const soldCount = updatedUnits.filter(u => u.status === 'sold').length;
      const holdCount = updatedUnits.filter(u => u.status === 'on_hold').length;

      const updatedProj = {
        ...activeProjectView,
        unitsList: updatedUnits,
        totalUnits: updatedUnits.length,
        unitStats: { available: availCount, booked: bookedCount, sold: soldCount, on_hold: holdCount, blocked: 0 }
      };
      setActiveProjectView(updatedProj);
      setProjects(prev => prev.map(p => p._id === activeProjectView._id ? updatedProj : p));
    }
    showNotification(`Unit "${unitNumber}" deleted!`);
  };

  const startEdit = (proj) => {
    setEditingProject(proj);
    const isCustomCat = proj.type === 'custom' || !REAL_ESTATE_CATEGORIES[proj.type];
    const existingApprovals = Array.isArray(proj.categoryDetails?.approvals) && proj.categoryDetails.approvals.length > 0
      ? proj.categoryDetails.approvals
      : (proj.categoryDetails?.approvalBody ? proj.categoryDetails.approvalBody.split(',').map(s => s.trim()).filter(Boolean) : ['RERA Approved']);

    setForm({
      name: proj.name,
      code: proj.code,
      city: proj.city,
      address: proj.address,
      type: isCustomCat ? 'custom' : proj.type,
      customCategoryName: proj.categoryDetails?.customCategoryName || '',
      customUnitTerm: proj.categoryDetails?.customUnitTerm || '',
      isCustomCategory: isCustomCat,
      status: proj.status,
      totalUnits: proj.totalUnits,
      minPrice: proj.priceRange?.min || '5000000',
      maxPrice: proj.priceRange?.max || '15000000',
      approvals: existingApprovals,
      newCustomApproval: '',
      totalAcres: proj.categoryDetails?.totalAcres || '10',
      extentUnit: proj.categoryDetails?.extentUnit || 'Acres'
    });
    setShowProjectModal(true);
  };

  const openAddUnitModal = () => {
    if (!activeProjectView) return;
    const cat = activeProjectView.type;
    const typologies = CATEGORY_TYPOLOGIES[cat] || CATEGORY_TYPOLOGIES.residential_apartment;
    setUnitForm({
      unitNumber: '',
      tower: activeProjectView.towers?.[0]?.name || 'Tower A',
      sector: 'Sector A',
      phase: 'Phase 1',
      block: 'Ground Floor',
      zone: 'Zone A',
      floor: '1',
      type: typologies[0] || 'Standard Unit',
      customType: '',
      isCustomType: false,
      area: ['plots', 'layouts', 'agricultural_land', 'farmland', 'resort_plots'].includes(cat) ? '21780' : cat === 'villa' ? '2800' : '1050',
      carpetArea: ['plots', 'layouts', 'agricultural_land', 'farmland'].includes(cat) ? '21780' : '780',
      dimensions: '30 x 40 ft',
      roadWidth: '40',
      isCornerPlot: false,
      boundaryWall: true,
      levels: 'G+1',
      gardenArea: '400',
      carParks: '2',
      frontage: '18',
      ceilingHeight: '14',
      fitoutStatus: 'Bare Shell',
      suitableFor: 'Retail / Office',
      extentAcres: '0.5',
      extentUnit: 'Acres',
      plantationType: 'Mango, Teakwood & Coconut',
      waterSource: 'Borewell + Drip System',
      basePrice: activeProjectView.priceRange?.min ? String(Math.round(activeProjectView.priceRange.min * 0.85)) : '5000000',
      totalPrice: activeProjectView.priceRange?.min ? String(activeProjectView.priceRange.min) : '6000000',
      facing: 'East',
      customFacing: '',
      isCustomFacing: false,
      status: 'available'
    });
    setShowAddUnitModal(true);
  };

  // Filtered Projects List
  const filtered = projects.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.city.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  // Filtered and Sorted Units in Active Project View
  const sortedAndFilteredUnits = useMemo(() => {
    if (!activeProjectView) return [];
    let list = (activeProjectView.unitsList || []).filter(u => {
      if (unitSearch) {
        const q = unitSearch.toLowerCase();
        const matchesNumber = u.unitNumber?.toLowerCase().includes(q);
        const matchesType = u.type?.toLowerCase().includes(q);
        const matchesFacing = u.facing?.toLowerCase().includes(q);
        const matchesSector = (u.sector || u.tower || u.phase)?.toLowerCase().includes(q);
        const matchesCustomer = u.holdCustomer?.name?.toLowerCase().includes(q) || u.bookingCustomer?.name?.toLowerCase().includes(q);
        if (!matchesNumber && !matchesType && !matchesFacing && !matchesSector && !matchesCustomer) return false;
      }
      if (unitFacingFilter && !u.facing?.toLowerCase().includes(unitFacingFilter.toLowerCase())) return false;
      if (unitTypeFilter && u.type !== unitTypeFilter) return false;
      if (unitStatusFilter && u.status !== unitStatusFilter) return false;
      return true;
    });

    list.sort((a, b) => {
      if (unitSortBy === 'priceAsc') return (a.totalPrice || 0) - (b.totalPrice || 0);
      if (unitSortBy === 'priceDesc') return (b.totalPrice || 0) - (a.totalPrice || 0);
      if (unitSortBy === 'areaAsc') return (a.area || 0) - (b.area || 0);
      if (unitSortBy === 'areaDesc') return (b.area || 0) - (a.area || 0);
      if (unitSortBy === 'facing') return (a.facing || '').localeCompare(b.facing || '');
      return (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true });
    });

    return list;
  }, [activeProjectView, unitSearch, unitFacingFilter, unitTypeFilter, unitStatusFilter, unitSortBy]);

  const activeCategoryConf = activeProjectView
    ? getCategoryMeta(activeProjectView.type, activeProjectView.categoryDetails?.customCategoryName)
    : null;

  return (
    <div>
      {/* Guided Tour Banner */}
      {showWorkflowGuide && (
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
          borderRadius: 12, padding: '16px 20px', color: 'white',
          marginBottom: 16, border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 14 }}>
              <Sparkles size={16} color="#38bdf8" /> Real Estate CRM: Leads Auto-Population & Official Booking Flow
            </div>
            <button
              onClick={() => setShowWorkflowGuide(false)}
              className="btn btn-ghost btn-icon btn-sm"
              style={{ color: 'rgba(255,255,255,0.6)', padding: 4 }}
              title="Dismiss Guide"
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid #38bdf8' }}>
              <div style={{ fontWeight: 700, color: '#38bdf8' }}>1. Select from Added Leads</div>
              <div style={{ opacity: 0.85, marginTop: 2 }}>Choose any added CRM Lead from the dropdown to instantly fill Name, Phone, Email & KYC.</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid #fbbf24' }}>
              <div style={{ fontWeight: 700, color: '#fbbf24' }}>2. Customer Hold (24h-72h)</div>
              <div style={{ opacity: 0.85, marginTop: 2 }}>Click "Hold" to reserve unit for a lead with duration window and sales reasons.</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid #34d399' }}>
              <div style={{ fontWeight: 700, color: '#34d399' }}>3. Co-Applicant Relationships</div>
              <div style={{ opacity: 0.85, marginTop: 2 }}>Full support for Spouse, Parents, Children, Siblings, Partners & Co-Investors with KYC.</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid #a78bfa' }}>
              <div style={{ fontWeight: 700, color: '#a78bfa' }}>4. Multi-Category Sorting</div>
              <div style={{ opacity: 0.85, marginTop: 2 }}>Live sorting by Unit/Plot #, Price range, Area & Facing direction with customer search.</div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: Master Projects Grid */}
      {!activeProjectView ? (
        <div>
          <div className="page-header">
            <div className="page-header-left">
              <div className="breadcrumb">
                <span>Portfolio</span>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">
                  {typeFilter ? REAL_ESTATE_CATEGORIES[typeFilter]?.label : 'All Real Estate Projects'}
                </span>
              </div>
              <h1 className="page-title">
                {typeFilter ? REAL_ESTATE_CATEGORIES[typeFilter]?.label : 'Real Estate Projects & Development Portfolio'}
              </h1>
              <p className="page-subtitle">{filtered.length} active developments across residential, plotted layouts, commercial, villas & farmlands</p>
            </div>
            <div className="page-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowWorkflowGuide(p => !p)}>
                <HelpCircle size={14} /> {showWorkflowGuide ? 'Hide Help' : 'Workflow Guide'}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditingProject(null);
                  setForm({
                    name: '',
                    code: '',
                    city: '',
                    address: '',
                    type: typeFilter || 'residential_apartment',
                    status: 'launched',
                    totalUnits: '',
                    minPrice: '',
                    maxPrice: '',
                    approvalBody: 'RERA Approved',
                    totalAcres: ''
                  });
                  setShowProjectModal(true);
                }}
              >
                <Plus size={14} /> New Project
              </button>
            </div>
          </div>

          {/* Real Estate Category Filter Tabs */}
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 16,
            borderBottom: '1px solid var(--card-border)'
          }}>
            <button
              className={`btn btn-sm ${!typeFilter ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => handleTypeChange('')}
              style={{ whiteSpace: 'nowrap', borderRadius: 20 }}
            >
              🏛️ All Categories ({projects.length})
            </button>
            {Object.entries(REAL_ESTATE_CATEGORIES).map(([catKey, catConf]) => {
              const count = projects.filter(p => p.type === catKey).length;
              const isActive = typeFilter === catKey;
              return (
                <button
                  key={catKey}
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handleTypeChange(catKey)}
                  style={{
                    whiteSpace: 'nowrap',
                    borderRadius: 20,
                    fontWeight: isActive ? 700 : 500
                  }}
                >
                  {catConf.icon} {catConf.shortLabel} {count > 0 && <span style={{ opacity: 0.7, fontSize: 11 }}>({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Filter & Search Bar */}
          <div className="filter-bar">
            <div className="filter-search" style={{ flex: 1 }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                placeholder="Search projects by name, city, location or code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="launched">Launched</option>
              <option value="under_construction">Under Construction</option>
              <option value="ready_to_move">Ready to Move</option>
              <option value="pre_launch">Pre-Launch</option>
            </select>
          </div>

          {/* Project Grid */}
          {loading ? (
            <div className="loading-overlay"><div className="spinner" style={{ width: 40, height: 40 }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ background: 'white', borderRadius: 16, padding: '48px 32px', textAlign: 'center', border: '1px solid #e2e8f0', marginTop: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div className="empty-state-icon" style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid #bfdbfe' }}>
                <Building size={32} color="var(--primary)" />
              </div>
              <div className="empty-state-title" style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {projects.length === 0 ? 'No Real Estate Projects Yet' : 'No Projects Found in this Filter'}
              </div>
              <div className="empty-state-desc" style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, maxWidth: 540, margin: '6px auto 20px', lineHeight: 1.5 }}>
                {projects.length === 0
                  ? 'Your project portfolio is clean and ready. Add your first development across Residential Apartments, Plots, Farmlands, Agri Lands, Villas, Commercial, or enter a Custom Category.'
                  : 'Try selecting "All Categories" or adjusting your search keyword to view your projects.'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
                <button
                  className="btn btn-primary"
                  style={{ gap: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700 }}
                  onClick={() => {
                    setEditingProject(null);
                    setForm({
                      name: '',
                      code: '',
                      city: '',
                      address: '',
                      type: typeFilter || 'residential_apartment',
                      status: 'launched',
                      totalUnits: '',
                      minPrice: '',
                      maxPrice: '',
                      approvalBody: 'RERA Approved',
                      totalAcres: '',
                      extentUnit: 'Acres',
                      customCategoryName: '',
                      customUnitTerm: '',
                      isCustomCategory: false,
                      customApprovalBody: ''
                    });
                    setShowProjectModal(true);
                  }}
                >
                  <Plus size={16} /> + Create New Project
                </button>
              </div>

              {projects.length === 0 && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                    ⚡ Quick Start by Category
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', maxWidth: 720, margin: '0 auto' }}>
                    {[
                      { type: 'residential_apartment', label: '🏢 Residential Flat', icon: '🏢' },
                      { type: 'layouts', label: '📐 Plotted Layout', icon: '📐' },
                      { type: 'farmland', label: '🌴 Managed Farmland', icon: '🌴' },
                      { type: 'agricultural_land', label: '🌾 Agricultural Acreage', icon: '🌾' },
                      { type: 'villa', label: '🏡 Luxury Villa', icon: '🏡' },
                      { type: 'commercial_office', label: '🏬 Commercial Office', icon: '🏬' },
                      { type: 'custom', label: '✨ Custom Category', icon: '✨', isCustom: true },
                    ].map(starter => (
                      <button
                        key={starter.type}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: 20, fontSize: 12, padding: '6px 14px', background: '#f8fafc' }}
                        onClick={() => {
                          setEditingProject(null);
                          setForm({
                            name: '',
                            code: '',
                            city: '',
                            address: '',
                            type: starter.type,
                            status: 'launched',
                            totalUnits: '',
                            minPrice: '',
                            maxPrice: '',
                            approvalBody: starter.type === 'agricultural_land' ? 'Revenue Patta / 7/12 Clear Title' : 'RERA Approved',
                            totalAcres: '',
                            extentUnit: 'Acres',
                            customCategoryName: '',
                            customUnitTerm: '',
                            isCustomCategory: starter.isCustom || false,
                            customApprovalBody: ''
                          });
                          setShowProjectModal(true);
                        }}
                      >
                        {starter.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="project-grid">
              {filtered.map(project => {
                const catConf = REAL_ESTATE_CATEGORIES[project.type] || REAL_ESTATE_CATEGORIES.residential_apartment;
                const stats = project.unitStats || { available: 0, booked: 0, sold: 0, on_hold: 0, blocked: 0 };
                const totalUnits = project.totalUnits || (stats.available + stats.booked + stats.sold + stats.on_hold);
                const availPct = totalUnits ? Math.round(((stats.available || 0) / totalUnits) * 100) : 0;

                return (
                  <div key={project._id} className="project-card" onClick={() => setActiveProjectView(project)}>
                    {/* Card Header / Banner */}
                    <div className="project-card-image" style={{ background: `linear-gradient(135deg, #0f172a, ${catConf.color}44, #1e3a5f)` }}>
                      <div className="project-card-overlay" />
                      <div style={{ position: 'relative', zIndex: 1, fontSize: 38 }}>{catConf.icon}</div>
                      <div className="project-card-badge">
                        <StatusBadge status={project.status} />
                      </div>
                      <div style={{
                        position: 'absolute', bottom: 12, left: 16,
                        background: 'rgba(255,255,255,0.18)',
                        backdropFilter: 'blur(8px)',
                        padding: '4px 10px', borderRadius: 6,
                        fontSize: 12, fontWeight: 700, color: 'white',
                      }}>
                        {project.code || 'PRJ'} • {catConf.shortLabel}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="project-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div className="project-card-name" style={{ fontSize: 16, fontWeight: 700 }}>{project.name}</div>
                          <div className="project-card-location">
                            <MapPin size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
                            {project.address || `${project.city}, Maharashtra`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(project);
                            }}
                            title="Edit Project Details"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project._id, project.name);
                            }}
                            title="Delete Project"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Category Tag & Multi-Approvals */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className={`badge ${catConf.badge}`} style={{ fontSize: 11 }}>
                          {catConf.icon} {catConf.label}
                        </span>
                        {(Array.isArray(project.categoryDetails?.approvals) && project.categoryDetails.approvals.length > 0
                          ? project.categoryDetails.approvals
                          : (project.categoryDetails?.approvalBody ? project.categoryDetails.approvalBody.split(',').map(s => s.trim()).filter(Boolean) : [])
                        ).map((appItem, aIdx) => (
                          <span key={aIdx} className="badge badge-info" style={{ fontSize: 11 }}>
                            🛡️ {appItem}
                          </span>
                        ))}
                      </div>

                      {/* Pricing Range */}
                      <div style={{ marginTop: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Price Range</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                          {formatCurrency(project.priceRange?.min || 5000000)} — {formatCurrency(project.priceRange?.max || 15000000)}
                        </div>
                      </div>

                      {/* Unit Stats Progress Bar */}
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: 'var(--text-muted)' }}>{catConf.unitTerm} Availability</span>
                          <span style={{ fontWeight: 600 }}>{stats.available || 0} of {totalUnits} {catConf.unitTerm}s ({availPct}%)</span>
                        </div>
                        <div className="progress-bar-wrap" style={{ height: 6 }}>
                          <div className="progress-bar-fill" style={{ width: `${availPct}%`, background: 'var(--success)' }} />
                        </div>
                      </div>

                      {/* Quick Stat Tags */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 12, textAlign: 'center' }}>
                        <div style={{ background: '#ecfdf5', borderRadius: 6, padding: '6px 4px' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>{stats.available || 0}</div>
                          <div style={{ fontSize: 10, color: '#15803d' }}>Avail</div>
                        </div>
                        <div style={{ background: '#eff6ff', borderRadius: 6, padding: '6px 4px' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#2563eb' }}>{stats.booked || 0}</div>
                          <div style={{ fontSize: 10, color: '#1d4ed8' }}>Booked</div>
                        </div>
                        <div style={{ background: '#f8fafc', borderRadius: 6, padding: '6px 4px' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#64748b' }}>{stats.sold || 0}</div>
                          <div style={{ fontSize: 10, color: '#475569' }}>Sold</div>
                        </div>
                        <div style={{ background: '#fffbeb', borderRadius: 6, padding: '6px 4px' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#d97706' }}>{stats.on_hold || 0}</div>
                          <div style={{ fontSize: 10, color: '#b45309' }}>Hold</div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        className="btn btn-secondary w-full"
                        style={{ marginTop: 14, justifyContent: 'center', gap: 6, fontWeight: 600 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveProjectView(project);
                        }}
                      >
                        <Eye size={14} /> View & Manage {catConf.unitTerm}s →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: Dynamic Category-Driven Active Project Inventory & Units Master */
        <div>
          {/* Back Navigation Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveProjectView(null)}
              style={{ gap: 6 }}
            >
              <ArrowLeft size={14} /> Back to All Projects
            </button>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Viewing: <strong>{activeProjectView.name}</strong> ({activeCategoryConf?.label})
            </div>
          </div>

          {/* Project Details Banner */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{activeCategoryConf?.icon}</span>
                  <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{activeProjectView.name}</h1>
                  <span className={`badge ${activeCategoryConf?.badge}`}>{activeCategoryConf?.label}</span>
                  <StatusBadge status={activeProjectView.status} />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
                  <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                  {activeProjectView.address} • Code: <strong>{activeProjectView.code}</strong>
                  {activeProjectView.categoryDetails?.approvalBody && ` • 🛡️ ${activeProjectView.categoryDetails.approvalBody}`}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={openAddUnitModal} style={{ gap: 6 }}>
                  <Plus size={14} /> Add {activeCategoryConf?.unitTerm}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => startEdit(activeProjectView)}>
                  <Edit size={14} /> Edit Project
                </button>
              </div>
            </div>

            {/* Inventory Status Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 16, borderTop: '1px solid var(--card-border)', paddingTop: 14 }}>
              <div style={{ background: '#ecfdf5', padding: '10px 14px', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Available for Sale</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>
                  {(activeProjectView.unitsList || []).filter(u => u.status === 'available').length}
                </div>
              </div>
              <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600 }}>Token Booked</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>
                  {(activeProjectView.unitsList || []).filter(u => u.status === 'booked').length}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Sold & Registered</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#64748b' }}>
                  {(activeProjectView.unitsList || []).filter(u => u.status === 'sold').length}
                </div>
              </div>
              <div style={{ background: '#fffbeb', padding: '10px 14px', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>On Customer Hold</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>
                  {(activeProjectView.unitsList || []).filter(u => u.status === 'on_hold').length}
                </div>
              </div>
              <div style={{ background: '#f5f3ff', padding: '10px 14px', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#6d28d9', fontWeight: 600 }}>Total Inventory</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed' }}>
                  {(activeProjectView.unitsList || []).length} {activeCategoryConf?.unitTerm}s
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Sorting & Filter Bar */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="filter-search" style={{ flex: 1, minWidth: 200 }}>
                <Search size={14} color="var(--text-muted)" />
                <input
                  placeholder={`Search ${activeCategoryConf?.unitTerm} #, customer name, facing, dimensions…`}
                  value={unitSearch}
                  onChange={e => setUnitSearch(e.target.value)}
                />
              </div>

              {/* Facing Filter */}
              <select
                className="filter-select"
                value={unitFacingFilter}
                onChange={e => setUnitFacingFilter(e.target.value)}
                style={{ minWidth: 140 }}
              >
                <option value="">All Facing</option>
                {FACING_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                className="filter-select"
                value={unitStatusFilter}
                onChange={e => setUnitStatusFilter(e.target.value)}
                style={{ minWidth: 130 }}
              >
                <option value="">All Statuses</option>
                <option value="available">🟢 Available</option>
                <option value="on_hold">🟡 On Hold</option>
                <option value="booked">🔵 Booked</option>
                <option value="sold">⚪ Sold</option>
                <option value="blocked">🔴 Blocked</option>
              </select>

              {/* Sort By Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowUpDown size={14} color="var(--text-muted)" />
                <select
                  className="filter-select"
                  value={unitSortBy}
                  onChange={e => setUnitSortBy(e.target.value)}
                  style={{ minWidth: 160 }}
                >
                  <option value="unitNumber">Sort: {activeCategoryConf?.unitTerm} #</option>
                  <option value="priceAsc">Price: Low to High</option>
                  <option value="priceDesc">Price: High to Low</option>
                  <option value="areaAsc">Area: Small to Large</option>
                  <option value="areaDesc">Area: Large to Small</option>
                  <option value="facing">Facing: A → Z</option>
                </select>
              </div>

              {/* View Switcher */}
              <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
                <button
                  className={`btn btn-sm ${unitViewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setUnitViewMode('table')}
                  style={{ padding: '4px 8px' }}
                  title="Table View"
                >
                  <Layers size={14} /> Table
                </button>
                <button
                  className={`btn btn-sm ${unitViewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setUnitViewMode('grid')}
                  style={{ padding: '4px 8px' }}
                  title="Card Grid View"
                >
                  <Grid size={14} /> Cards
                </button>
              </div>
            </div>
          </div>

          {/* Units Display: Table or Grid */}
          {sortedAndFilteredUnits.length === 0 ? (
            <div className="empty-state" style={{ background: 'white', borderRadius: 12, padding: '40px 24px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{activeCategoryConf?.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>No {activeCategoryConf?.unitTerm}s match your filters</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                Try adjusting your search criteria or add new {activeCategoryConf?.unitTerm}s to this project.
              </div>
              <button className="btn btn-primary" onClick={openAddUnitModal} style={{ marginTop: 14 }}>
                <Plus size={14} /> Add First {activeCategoryConf?.unitTerm}
              </button>
            </div>
          ) : unitViewMode === 'table' ? (
            /* Category-Aware Dynamic Table */
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrapper" style={{ margin: 0, border: 'none' }}>
                <table>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th>{activeCategoryConf?.unitTerm} #</th>
                      <th>Location / Zone</th>
                      <th>Configuration / Typology</th>
                      {activeProjectView.type === 'plots' ? (
                        <>
                          <th>Dimensions (L x W)</th>
                          <th>Road Width</th>
                        </>
                      ) : activeProjectView.type === 'retail_shop' ? (
                        <>
                          <th>Frontage (ft)</th>
                          <th>Suitable For</th>
                        </>
                      ) : activeProjectView.type === 'villa' ? (
                        <>
                          <th>Plot / Built-up</th>
                          <th>Levels & Garden</th>
                        </>
                      ) : (
                        <>
                          <th>Area (sq.ft)</th>
                          <th>Carpet Area</th>
                        </>
                      )}
                      <th>Orientation / Facing</th>
                      <th>Base Rate (₹)</th>
                      <th>Total Value (₹)</th>
                      <th>Status & Customer</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAndFilteredUnits.map(u => {
                      const statusConf = UNIT_STATUSES[u.status] || UNIT_STATUSES.available;
                      return (
                        <tr key={u._id}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>
                              {u.unitNumber}
                            </div>
                            {u.isCornerPlot && (
                              <span className="badge badge-warning" style={{ fontSize: 9, marginTop: 2 }}>
                                Corner Plot (+5% PLC)
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {u.sector || u.tower || u.phase || u.block || 'Main'}
                            {u.floor !== undefined && activeProjectView.type !== 'plots' && ` • Floor ${u.floor}`}
                          </td>
                          <td style={{ fontSize: 12, fontWeight: 600 }}>
                            {u.type}
                          </td>

                          {/* Category-Specific Columns */}
                          {activeProjectView.type === 'plots' ? (
                            <>
                              <td style={{ fontSize: 12 }}>
                                <strong>{u.dimensions || '30 x 40 ft'}</strong>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.area} sq.ft ({Math.round(u.area / 9)} sq.yd)</div>
                              </td>
                              <td style={{ fontSize: 12 }}>
                                🛣️ {u.roadWidth || 40} ft Road
                              </td>
                            </>
                          ) : activeProjectView.type === 'retail_shop' ? (
                            <>
                              <td style={{ fontSize: 12 }}>
                                🛍️ <strong>{u.frontage || 18} ft</strong> Frontage
                              </td>
                              <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {u.suitableFor || 'Retail / Outlet'}
                              </td>
                            </>
                          ) : activeProjectView.type === 'villa' ? (
                            <>
                              <td style={{ fontSize: 12 }}>
                                <div>Plot: <strong>{u.plotArea || 1800} sq.ft</strong></div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Built: {u.area} sq.ft</div>
                              </td>
                              <td style={{ fontSize: 12 }}>
                                <div>{u.levels || 'G+1'}</div>
                                <div style={{ fontSize: 11, color: '#16a34a' }}>🌳 {u.gardenArea || 400} sq.ft Lawn</div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ fontSize: 12, fontWeight: 600 }}>
                                {u.area} sq.ft
                              </td>
                              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {u.carpetArea || Math.round(u.area * 0.75)} sq.ft
                              </td>
                            </>
                          )}

                          <td style={{ fontSize: 12 }}>
                            🧭 {u.facing || 'East'}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {formatCurrency(u.basePrice || 5000000)}
                          </td>
                          <td style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                            {formatCurrency(u.totalPrice || 6000000)}
                          </td>
                          <td>
                            <span className={`badge ${statusConf.badge}`}>
                              {statusConf.label}
                            </span>
                            {/* On-Hold Customer Info Tag */}
                            {u.status === 'on_hold' && u.holdCustomer?.name && (
                              <div
                                style={{ fontSize: 11, color: '#b45309', marginTop: 3, cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => setViewingHoldDetails(u)}
                                title="Click to view full Hold Details"
                              >
                                👤 {u.holdCustomer.name} ({u.holdCustomer.durationHours || 48}h)
                              </div>
                            )}
                            {/* Booked Customer Info Tag */}
                            {u.status === 'booked' && u.bookingCustomer?.name && (
                              <div style={{ fontSize: 11, color: '#1d4ed8', marginTop: 3, fontWeight: 600 }}>
                                👤 {u.bookingCustomer.name}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                              {u.status === 'available' ? (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '3px 8px', fontSize: 11, gap: 4, background: '#fffbeb', borderColor: '#fde68a', color: '#b45309' }}
                                  onClick={() => openHoldModal(u)}
                                  title="Hold unit for customer with contact details"
                                >
                                  <Clock size={12} /> Hold
                                </button>
                              ) : u.status === 'on_hold' ? (
                                <>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '3px 8px', fontSize: 11, gap: 3 }}
                                    onClick={() => setViewingHoldDetails(u)}
                                    title="View Customer Hold Details"
                                  >
                                    <Info size={12} /> View
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '3px 6px', fontSize: 11, color: 'var(--text-muted)' }}
                                    onClick={() => handleReleaseHold(u._id, u.unitNumber)}
                                    title="Release Hold back to Available"
                                  >
                                    Release
                                  </button>
                                </>
                              ) : null}

                              {u.status !== 'booked' && u.status !== 'sold' && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '3px 8px', fontSize: 11, gap: 4 }}
                                  onClick={() => openBookingModal(u)}
                                  title="Book Property with Customer KYC & Token"
                                >
                                  <FileCheck size={12} /> Book
                                </button>
                              )}

                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                style={{ color: 'var(--danger)' }}
                                title="Delete Unit"
                                onClick={() => handleDeleteUnit(u._id, u.unitNumber)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Category-Aware Cards Grid View */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {sortedAndFilteredUnits.map(u => {
                const statusConf = UNIT_STATUSES[u.status] || UNIT_STATUSES.available;
                return (
                  <div
                    key={u._id}
                    className="card"
                    style={{
                      padding: 16,
                      border: `1.5px solid ${u.status === 'available' ? '#bbf7d0' : u.status === 'on_hold' ? '#fde68a' : u.status === 'booked' ? '#bfdbfe' : '#e2e8f0'}`,
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>{u.unitNumber}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.sector || u.tower || u.phase}</div>
                      </div>
                      <span className={`badge ${statusConf.badge}`} style={{ fontSize: 10 }}>
                        {statusConf.label}
                      </span>
                    </div>

                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{u.type}</div>
                      {activeProjectView.type === 'plots' ? (
                        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                          📐 {u.dimensions || '30 x 40 ft'} • 🛣️ {u.roadWidth || 40}ft Road
                        </div>
                      ) : activeProjectView.type === 'retail_shop' ? (
                        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                          🛍️ {u.frontage || 18}ft Frontage • {u.area} sq.ft
                        </div>
                      ) : activeProjectView.type === 'villa' ? (
                        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                          🏡 {u.levels || 'G+1'} • 🌳 {u.gardenArea || 400} sq.ft Lawn
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                          📏 {u.area} sq.ft (Carpet: {u.carpetArea || Math.round(u.area * 0.75)} sq.ft)
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#2563eb', marginTop: 4 }}>
                        🧭 {u.facing || 'East Facing'}
                      </div>
                    </div>

                    {/* Hold Customer Banner if on hold */}
                    {u.status === 'on_hold' && u.holdCustomer?.name && (
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 8px', marginBottom: 10, fontSize: 11 }}>
                        <div style={{ fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> Held for {u.holdCustomer.name}
                        </div>
                        <div style={{ color: '#92400e', marginTop: 2 }}>
                          📞 {u.holdCustomer.phone || 'No phone'} • Reason: {u.holdCustomer.reason || 'Token awaited'}
                        </div>
                      </div>
                    )}

                    {/* Booked Customer Banner if booked */}
                    {u.status === 'booked' && u.bookingCustomer?.name && (
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '6px 8px', marginBottom: 10, fontSize: 11 }}>
                        <div style={{ fontWeight: 700, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FileCheck size={12} /> Booked: {u.bookingCustomer.name}
                        </div>
                        <div style={{ color: '#1e40af', marginTop: 2 }}>
                          Token Paid: {formatCurrency(u.bookingCustomer.tokenAmount || 100000)} ({u.bookingCustomer.paymentMode || 'NEFT'})
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>All-In Price</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>
                        {formatCurrency(u.totalPrice || 6000000)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {u.status === 'available' ? (
                        <button
                          className="btn btn-secondary btn-sm flex-1"
                          style={{ fontSize: 11, justifyContent: 'center', gap: 4, background: '#fffbeb', borderColor: '#fde68a', color: '#b45309' }}
                          onClick={() => openHoldModal(u)}
                        >
                          <Clock size={12} /> Hold Unit
                        </button>
                      ) : u.status === 'on_hold' ? (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, justifyContent: 'center' }}
                            onClick={() => setViewingHoldDetails(u)}
                          >
                            Hold Info
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, justifyContent: 'center', color: 'var(--text-muted)' }}
                            onClick={() => handleReleaseHold(u._id, u.unitNumber)}
                          >
                            Release
                          </button>
                        </>
                      ) : null}

                      {u.status !== 'booked' && u.status !== 'sold' && (
                        <button
                          className="btn btn-primary btn-sm flex-1"
                          style={{ fontSize: 11, justifyContent: 'center', gap: 4 }}
                          onClick={() => openBookingModal(u)}
                        >
                          <FileCheck size={12} /> Book Unit
                        </button>
                      )}

                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleDeleteUnit(u._id, u.unitNumber)}
                        title="Delete Unit"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Hold Property & Customer Details Modal */}
      {holdingUnit && (
        <div className="modal-overlay" onClick={() => setHoldingUnit(null)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 580,
              width: '92%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 14,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              overflow: 'hidden'
            }}
          >
            <div className="modal-header" style={{ background: '#fffbeb', borderBottom: '1px solid #fef3c7', padding: '16px 20px', flexShrink: 0 }}>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e' }}>
                <Clock size={18} color="#d97706" /> Place Unit {holdingUnit.unitNumber} on Customer Hold
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setHoldingUnit(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleConfirmHold} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                {/* Unit Snapshot */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, marginBottom: 16, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{holdingUnit.unitNumber} • {holdingUnit.type}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeProjectView?.name} ({activeCategoryConf?.shortLabel}) • 🧭 {holdingUnit.facing}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>
                    {formatCurrency(holdingUnit.totalPrice || 5000000)}
                  </div>
                </div>

                {/* Section 1: Lead Auto-Populate Dropdown */}
                <div className="form-group" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <label className="form-label" style={{ color: '#1e40af', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <UserCheck size={14} color="#2563eb" /> Select Buyer / Prospect from Leads Database
                  </label>
                  <select
                    className="form-select"
                    value={holdForm.selectedLeadId}
                    onChange={e => handleHoldLeadSelect(e.target.value)}
                    style={{ background: 'white' }}
                  >
                    <option value="">-- ➕ Enter New Customer Manually --</option>
                    {leadsList.map(lead => (
                      <option key={lead._id} value={lead._id}>
                        {lead.name} ({lead.phone}) — {lead.stage ? lead.stage.replace(/_/g, ' ').toUpperCase() : 'LEAD'} • {lead.source || 'Direct'}
                      </option>
                    ))}
                  </select>
                  {holdForm.selectedLeadId && (
                    <div style={{ fontSize: 11, color: '#15803d', marginTop: 6, fontWeight: 600 }}>
                      ✓ Auto-filled prospect details from CRM database
                    </div>
                  )}
                </div>

                {/* Customer Details */}
                <div className="form-group">
                  <label className="form-label">Customer / Prospect Full Name <span className="required">*</span></label>
                  <input
                    className="form-input"
                    value={holdForm.customerName}
                    onChange={e => setHoldForm(p => ({ ...p, customerName: e.target.value }))}
                    placeholder="e.g. Vikram Malhotra / Sunita Sharma"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Mobile Number <span className="required">*</span></label>
                    <input
                      className="form-input"
                      value={holdForm.customerPhone}
                      onChange={e => setHoldForm(p => ({ ...p, customerPhone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={holdForm.customerEmail}
                      onChange={e => setHoldForm(p => ({ ...p, customerEmail: e.target.value }))}
                      placeholder="vikram@example.com"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Hold Duration (Reservation Window)</label>
                    <select
                      className="form-select"
                      value={holdForm.durationHours}
                      onChange={e => setHoldForm(p => ({ ...p, durationHours: e.target.value }))}
                    >
                      <option value="24">24 Hours (1 Day Priority)</option>
                      <option value="48">48 Hours (Standard Executive Hold)</option>
                      <option value="72">72 Hours (Weekend Window)</option>
                      <option value="168">7 Days (Management Approval Required)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sales Executive / Agent</label>
                    <input
                      className="form-input"
                      value={holdForm.agentName}
                      onChange={e => setHoldForm(p => ({ ...p, agentName: e.target.value }))}
                      placeholder="Agent Name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason / Sales Notes for Hold</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={holdForm.holdReason}
                    onChange={e => setHoldForm(p => ({ ...p, holdReason: e.target.value }))}
                    placeholder="e.g. Token cheque pickup scheduled for tomorrow 2 PM, floor selection confirmed by buyer family."
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setHoldingUnit(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#d97706', borderColor: '#d97706', gap: 6 }}>
                  <Clock size={14} /> Confirm Customer Hold
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Official Property Booking & Customer KYC Details Modal */}
      {bookingUnit && (
        <div className="modal-overlay" onClick={() => setBookingUnit(null)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 780,
              width: '95%',
              maxHeight: 'min(90vh, 760px)',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 14,
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.35)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              className="modal-header"
              style={{
                background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
                color: 'white',
                padding: '14px 20px',
                flexShrink: 0
              }}
            >
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white', fontSize: 16 }}>
                <FileCheck size={18} color="#38bdf8" /> Official Booking Application — {bookingUnit.unitNumber}
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" style={{ color: 'white' }} onClick={() => setBookingUnit(null)}><X size={16} /></button>
            </div>

            <form onSubmit={handleConfirmBooking} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
                {/* Financial & Unit Snapshot */}
                <div style={{ background: '#eff6ff', padding: '10px 16px', borderRadius: 8, marginBottom: 12, border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1e40af' }}>{bookingUnit.unitNumber} • {bookingUnit.type}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {activeProjectView?.name} ({activeCategoryConf?.shortLabel}) • 🧭 {bookingUnit.facing} • {bookingUnit.dimensions || `${bookingUnit.area} sq.ft`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Agreement Value</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>
                      {formatCurrency(bookingUnit.totalPrice || 6000000)}
                    </div>
                  </div>
                </div>

                {/* Section 1: Lead Auto-Population Dropdown */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserCheck size={14} color="#2563eb" /> 1. Select Buyer / Prospect from Leads Database
                  </div>
                  <select
                    className="form-select"
                    value={bookingForm.selectedLeadId}
                    onChange={e => handleBookingLeadSelect(e.target.value)}
                    style={{ background: 'white', fontWeight: 600, padding: '7px 12px', fontSize: 13 }}
                  >
                    <option value="">-- ➕ Enter New Customer (Manual KYC) --</option>
                    {leadsList.map(lead => (
                      <option key={lead._id} value={lead._id}>
                        {lead.name} ({lead.phone}) — {lead.stage ? lead.stage.replace(/_/g, ' ').toUpperCase() : 'LEAD'} • {lead.source || 'Direct'}
                      </option>
                    ))}
                  </select>
                  {bookingForm.selectedLeadId && (
                    <div style={{ fontSize: 11, color: '#15803d', marginTop: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={13} /> Sourced & auto-populated from CRM Lead Database
                    </div>
                  )}
                </div>

                {/* Section 2: Primary Applicant KYC */}
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={15} /> 2. Primary Applicant Legal Information
                </div>

                <div className="form-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Full Legal Name (As per PAN / Aadhaar) <span className="required">*</span></label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.customerName}
                      onChange={e => setBookingForm(p => ({ ...p, customerName: e.target.value }))}
                      placeholder="e.g. Rajesh S. Kulkarni"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Mobile Number <span className="required">*</span></label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.customerPhone}
                      onChange={e => setBookingForm(p => ({ ...p, customerPhone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Email Address <span className="required">*</span></label>
                    <input
                      type="email"
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.customerEmail}
                      onChange={e => setBookingForm(p => ({ ...p, customerEmail: e.target.value }))}
                      placeholder="rajesh.k@gmail.com"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>PAN Number <span className="required">*</span></label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.panNumber}
                      onChange={e => setBookingForm(p => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Aadhaar / National ID No.</label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.aadharNumber}
                      onChange={e => setBookingForm(p => ({ ...p, aadharNumber: e.target.value }))}
                      placeholder="1234 5678 9012"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Permanent Residential Address</label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.address}
                      onChange={e => setBookingForm(p => ({ ...p, address: e.target.value }))}
                      placeholder="Flat 402, Royal Palms, Baner Road, Pune"
                    />
                  </div>
                </div>

                {/* Section 3: Co-Applicant Details with Full Relationships */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', margin: '12px 0' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} /> 3. Co-Applicant / Joint Ownership (Optional)
                  </div>

                  <div className="form-row" style={{ marginBottom: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Co-Applicant Full Name</label>
                      <input
                        className="form-input"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        value={bookingForm.coApplicantName}
                        onChange={e => setBookingForm(p => ({ ...p, coApplicantName: e.target.value }))}
                        placeholder="e.g. Sneha R. Kulkarni"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Relationship to Primary Buyer</label>
                      <select
                        className="form-select"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        value={bookingForm.coApplicantRelation}
                        onChange={e => setBookingForm(p => ({ ...p, coApplicantRelation: e.target.value }))}
                      >
                        {CO_APPLICANT_RELATIONS.map(rel => (
                          <option key={rel.value} value={rel.value}>{rel.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Co-Applicant Phone</label>
                      <input
                        className="form-input"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        value={bookingForm.coApplicantPhone}
                        onChange={e => setBookingForm(p => ({ ...p, coApplicantPhone: e.target.value }))}
                        placeholder="+91 98765 00000"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Co-Applicant Email</label>
                      <input
                        type="email"
                        className="form-input"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        value={bookingForm.coApplicantEmail}
                        onChange={e => setBookingForm(p => ({ ...p, coApplicantEmail: e.target.value }))}
                        placeholder="sneha.k@gmail.com"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Co-Applicant PAN Number</label>
                      <input
                        className="form-input"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        value={bookingForm.coApplicantPan}
                        onChange={e => setBookingForm(p => ({ ...p, coApplicantPan: e.target.value.toUpperCase() }))}
                        placeholder="e.g. XYZPQ5678M"
                        maxLength={10}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Co-Applicant Aadhaar Number</label>
                      <input
                        className="form-input"
                        style={{ padding: '7px 12px', fontSize: 13 }}
                        value={bookingForm.coApplicantAadhaar}
                        onChange={e => setBookingForm(p => ({ ...p, coApplicantAadhaar: e.target.value }))}
                        placeholder="e.g. 9876 5432 1098"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Commercial & Token Payment */}
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', margin: '12px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={15} /> 4. Commercials & Token Payment Instrument
                </div>

                <div className="form-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Booking Token Amount (₹) <span className="required">*</span></label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.tokenAmount}
                      onChange={e => setBookingForm(p => ({ ...p, tokenAmount: e.target.value }))}
                      placeholder="e.g. 500000"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Payment Instrument Mode</label>
                    <select
                      className="form-select"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.paymentMode}
                      onChange={e => setBookingForm(p => ({ ...p, paymentMode: e.target.value }))}
                    >
                      <option value="Cheque">Cheque / Demand Draft</option>
                      <option value="NEFT/RTGS">NEFT / RTGS Bank Transfer</option>
                      <option value="UPI">UPI / QR Payment</option>
                      <option value="Debit/Credit Card">Debit / Credit Card</option>
                      <option value="Bank Transfer">Direct Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Cheque / UTR Transaction Ref No.</label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.transactionRef}
                      onChange={e => setBookingForm(p => ({ ...p, transactionRef: e.target.value }))}
                      placeholder="e.g. HDFC-CHK-894210"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Booking Date</label>
                    <input
                      type="date"
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.bookingDate}
                      onChange={e => setBookingForm(p => ({ ...p, bookingDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Sales Executive / Handled By</label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.agentName}
                      onChange={e => setBookingForm(p => ({ ...p, agentName: e.target.value }))}
                      placeholder="e.g. Priya Sharma"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Special Sales Remarks / Notes</label>
                    <input
                      className="form-input"
                      style={{ padding: '7px 12px', fontSize: 13 }}
                      value={bookingForm.specialNotes}
                      onChange={e => setBookingForm(p => ({ ...p, specialNotes: e.target.value }))}
                      placeholder="e.g. Parking allocated, 10% milestone due"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="modal-footer" style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setBookingUnit(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ gap: 6 }}>
                  <FileCheck size={14} /> Confirm Official Booking & Issue Token Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: View Customer Hold Details Modal */}
      {viewingHoldDetails && (
        <div className="modal-overlay" onClick={() => setViewingHoldDetails(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header" style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e' }}>
                <Clock size={18} color="#d97706" /> Customer Hold Details — {viewingHoldDetails.unitNumber}
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setViewingHoldDetails(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>{viewingHoldDetails.unitNumber} ({viewingHoldDetails.type})</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{activeProjectView?.name} • Total Value: {formatCurrency(viewingHoldDetails.totalPrice)}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Customer Name</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{viewingHoldDetails.holdCustomer?.name || 'Prospective Buyer'}</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phone Number</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{viewingHoldDetails.holdCustomer?.phone || 'Not provided'}</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hold Duration</div>
                  <div style={{ fontWeight: 700, marginTop: 2, color: '#d97706' }}>{viewingHoldDetails.holdCustomer?.durationHours || 48} Hours Window</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sales Executive</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{viewingHoldDetails.holdCustomer?.agentName || 'Sales Team'}</div>
                </div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8, padding: 12, marginTop: 12, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#b45309' }}>Reason for Reservation:</div>
                <div style={{ color: '#92400e', marginTop: 3 }}>{viewingHoldDetails.holdCustomer?.reason || 'Evaluation in progress.'}</div>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleReleaseHold(viewingHoldDetails._id, viewingHoldDetails.unitNumber)}
              >
                Release Hold (Make Available)
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ gap: 6 }}
                onClick={() => {
                  const u = viewingHoldDetails;
                  setViewingHoldDetails(null);
                  openBookingModal(u);
                }}
              >
                <FileCheck size={14} /> Convert to Official Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Real Estate Project */}
      {showProjectModal && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 660, maxHeight: 'min(90vh, 800px)', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingProject ? `Edit Project — ${editingProject.name}` : 'Create Real Estate Project'}
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowProjectModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveProject} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                {/* Step 1: Real Estate Category Selector + Custom Manual Option */}
                <div className="form-group" style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ fontWeight: 700, marginBottom: 0 }}>
                      Real Estate Development Category <span className="required">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({
                        ...p,
                        isCustomCategory: !p.isCustomCategory,
                        type: !p.isCustomCategory ? 'custom' : 'residential_apartment'
                      }))}
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: form.isCustomCategory ? '#7c3aed' : '#2563eb',
                        background: form.isCustomCategory ? '#f3e8ff' : '#eff6ff',
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {form.isCustomCategory ? '✓ Using Custom Category' : '✏️ Or Type Custom Category Manually'}
                    </button>
                  </div>

                  {!form.isCustomCategory && form.type !== 'custom' ? (
                    <select
                      className="form-select"
                      value={form.type}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setForm(p => ({ ...p, type: 'custom', isCustomCategory: true }));
                        } else {
                          setForm(p => ({ ...p, type: val, isCustomCategory: false }));
                        }
                      }}
                    >
                      {Object.entries(REAL_ESTATE_CATEGORIES).map(([catKey, catConf]) => (
                        <option key={catKey} value={catKey}>
                          {catConf.icon} {catConf.label} — {catConf.description}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10, marginTop: 6 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                          Custom Category / Land Name <span className="required">*</span>
                        </label>
                        <input
                          className="form-input"
                          value={form.customCategoryName}
                          onChange={e => setForm(p => ({ ...p, customCategoryName: e.target.value }))}
                          placeholder="e.g. Farmlands, Agri Lands, Weekend Estates, Resort Plots"
                          required={form.isCustomCategory || form.type === 'custom'}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                          Unit Naming Term
                        </label>
                        <input
                          className="form-input"
                          value={form.customUnitTerm}
                          onChange={e => setForm(p => ({ ...p, customUnitTerm: e.target.value }))}
                          placeholder="e.g. Farm Lot, Acre Parcel, Site No"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Project Name <span className="required">*</span></label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Grand Palms Palm Meadows / Serene Valley Farmlands / Green Valley Residences"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Project Code</label>
                    <input
                      className="form-input"
                      value={form.code}
                      onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                      placeholder="e.g. GPP / SVF / GVR"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project Stage</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    >
                      <option value="launched">Launched</option>
                      <option value="under_construction">Under Construction / Development</option>
                      <option value="ready_to_move">Ready for Possession / Registration</option>
                      <option value="pre_launch">Pre-Launch</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City / Region <span className="required">*</span></label>
                    <input
                      className="form-input"
                      value={form.city}
                      onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                      placeholder="e.g. Pune, Hyderabad, Bangalore Outskirts"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Total Planned Units / Sites <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.totalUnits}
                      onChange={e => setForm(p => ({ ...p, totalUnits: e.target.value }))}
                      placeholder="e.g. 50"
                      required
                    />
                  </div>
                </div>

                {/* Approvals Multi-Select & Land Title Section */}
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, margin: '12px 0', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ fontWeight: 700, marginBottom: 0 }}>
                      Government & Authority Approvals (Multi-Select)
                    </label>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Select all approvals that apply</span>
                  </div>

                  {/* Selectable Standard Approval Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {STANDARD_APPROVAL_OPTIONS.map(opt => {
                      const isSelected = form.approvals?.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setForm(p => {
                              const current = p.approvals || [];
                              const updated = current.includes(opt.id)
                                ? current.filter(a => a !== opt.id)
                                : [...current, opt.id];
                              return { ...p, approvals: updated };
                            });
                          }}
                          style={{
                            fontSize: 12,
                            padding: '5px 10px',
                            borderRadius: 20,
                            border: isSelected ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                            background: isSelected ? '#eff6ff' : 'white',
                            color: isSelected ? '#1d4ed8' : '#334155',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                          {isSelected && <Check size={13} style={{ strokeWidth: 3 }} />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Manual Approval Add Input */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <input
                      className="form-input"
                      style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
                      value={form.newCustomApproval || ''}
                      onChange={e => setForm(p => ({ ...p, newCustomApproval: e.target.value }))}
                      placeholder="✏️ Type custom approval (e.g. TIDCO Approved, Gram Panchayat NOC, Patta Clear)..."
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (form.newCustomApproval?.trim()) {
                            const val = form.newCustomApproval.trim();
                            setForm(p => ({
                              ...p,
                              approvals: (p.approvals || []).includes(val) ? p.approvals : [...(p.approvals || []), val],
                              newCustomApproval: ''
                            }));
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }}
                      onClick={() => {
                        if (form.newCustomApproval?.trim()) {
                          const val = form.newCustomApproval.trim();
                          setForm(p => ({
                            ...p,
                            approvals: (p.approvals || []).includes(val) ? p.approvals : [...(p.approvals || []), val],
                            newCustomApproval: ''
                          }));
                        }
                      }}
                    >
                      + Add Approval
                    </button>
                  </div>

                  {/* Selected Active Approvals Summary */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Active Approvals ({form.approvals?.length || 0}):</span>
                    {(form.approvals || []).length === 0 ? (
                      <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>None selected</span>
                    ) : (
                      form.approvals.map((appItem, idx) => (
                        <span
                          key={idx}
                          className="badge badge-info"
                          style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          🛡️ {appItem}
                          <button
                            type="button"
                            onClick={() => setForm(p => ({ ...p, approvals: p.approvals.filter(a => a !== appItem) }))}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center' }}
                            title="Remove approval"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Total Land Extent */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontSize: 11, marginBottom: 2 }}>Total Land Extent</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="number"
                          className="form-input"
                          value={form.totalAcres}
                          onChange={e => setForm(p => ({ ...p, totalAcres: e.target.value }))}
                          placeholder="e.g. 25"
                          style={{ flex: 1 }}
                        />
                        <select
                          className="form-select"
                          value={form.extentUnit}
                          onChange={e => setForm(p => ({ ...p, extentUnit: e.target.value }))}
                          style={{ width: 105 }}
                        >
                          <option value="Acres">Acres</option>
                          <option value="Gunthas">Gunthas</option>
                          <option value="Bighas">Bighas</option>
                          <option value="Sq.Yards">Sq.Yds</option>
                          <option value="Cents">Cents</option>
                          <option value="Sq.Ft">Sq.Ft</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Location Address & Access Road</label>
                  <input
                    className="form-input"
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="e.g. Shankarpally - Mokila Highway, Hyderabad / Kanakapura Road"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Minimum Price (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.minPrice}
                      onChange={e => setForm(p => ({ ...p, minPrice: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maximum Price (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.maxPrice}
                      onChange={e => setForm(p => ({ ...p, maxPrice: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingProject ? 'Save & Update Project' : 'Create Real Estate Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dynamic Add Unit / Plot / Villa / Office / Farmland Modal */}
      {showAddUnitModal && (
        <div className="modal-overlay" onClick={() => setShowAddUnitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 660, maxHeight: 'min(90vh, 780px)', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{activeCategoryConf?.icon}</span>
                Add {activeCategoryConf?.unitTerm} to {activeProjectView?.name}
              </div>
              <button className="modal-close btn btn-ghost btn-icon btn-sm" onClick={() => setShowAddUnitModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAddUnitToProject} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                {/* 1. Category Indicator */}
                <div style={{ background: activeCategoryConf?.bg, padding: '10px 14px', borderRadius: 8, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{activeCategoryConf?.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: activeCategoryConf?.color }}>{activeCategoryConf?.label} Specifications</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Filling required fields tailored for {activeCategoryConf?.shortLabel}</div>
                  </div>
                </div>

                {/* 2. Identifier Fields (Tower/Sector/Phase) */}
                <div className="form-row">
                  {['plots', 'layouts', 'agricultural_land', 'farmland', 'resort_plots'].includes(activeProjectView?.type) ? (
                    <div className="form-group">
                      <label className="form-label">Sector / Zone / Block Name</label>
                      <input
                        className="form-input"
                        value={unitForm.sector}
                        onChange={e => setUnitForm(p => ({ ...p, sector: e.target.value }))}
                        placeholder="e.g. Sector A / Zone 1 - East / Phase 1"
                      />
                    </div>
                  ) : activeProjectView?.type === 'villa' ? (
                    <div className="form-group">
                      <label className="form-label">Phase / Enclave</label>
                      <input
                        className="form-input"
                        value={unitForm.phase}
                        onChange={e => setUnitForm(p => ({ ...p, phase: e.target.value }))}
                        placeholder="e.g. Phase 1 - Lakeview"
                      />
                    </div>
                  ) : activeProjectView?.type === 'retail_shop' ? (
                    <div className="form-group">
                      <label className="form-label">Floor / Wing</label>
                      <input
                        className="form-input"
                        value={unitForm.block}
                        onChange={e => setUnitForm(p => ({ ...p, block: e.target.value }))}
                        placeholder="e.g. Ground Floor Galleria"
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Tower / Wing</label>
                      <select className="form-select" value={unitForm.tower} onChange={e => setUnitForm(p => ({ ...p, tower: e.target.value }))}>
                        {(activeProjectView?.towers || [{ name: 'Tower A' }, { name: 'Tower B' }]).map((t, idx) => (
                          <option key={idx} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">{activeCategoryConf?.unitTerm} # <span className="required">*</span></label>
                    <input
                      className="form-input"
                      value={unitForm.unitNumber}
                      onChange={e => setUnitForm(p => ({ ...p, unitNumber: e.target.value }))}
                      placeholder={
                        activeProjectView?.type === 'plots' ? 'e.g. Plot 108' :
                        activeProjectView?.type === 'layouts' ? 'e.g. Site 204' :
                        activeProjectView?.type === 'farmland' ? 'e.g. Farm Lot 12' :
                        activeProjectView?.type === 'agricultural_land' ? 'e.g. Agri Parcel 05' :
                        activeProjectView?.type === 'villa' ? 'e.g. Villa 24' : 'e.g. A-301 / Shop G-12'
                      }
                      required
                    />
                  </div>
                </div>

                {/* 3. Typology & Dimensions with Custom Entry */}
                <div className="form-row">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Typology / Configuration</label>
                      <button
                        type="button"
                        onClick={() => setUnitForm(p => ({ ...p, isCustomType: !p.isCustomType }))}
                        style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        {unitForm.isCustomType ? 'Standard Dropdown' : '✏️ Custom Type'}
                      </button>
                    </div>

                    {!unitForm.isCustomType ? (
                      <select
                        className="form-select"
                        value={unitForm.type}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'Custom Typology' || val.includes('Custom')) {
                            setUnitForm(p => ({ ...p, type: val, isCustomType: true }));
                          } else {
                            setUnitForm(p => ({ ...p, type: val, isCustomType: false }));
                          }
                        }}
                      >
                        {(CATEGORY_TYPOLOGIES[activeProjectView?.type] || CATEGORY_TYPOLOGIES.residential_apartment).map(typ => (
                          <option key={typ} value={typ}>{typ}</option>
                        ))}
                        <option value="Custom Typology">✏️ Other / Custom Typology (Manual Entry)</option>
                      </select>
                    ) : (
                      <input
                        className="form-input"
                        value={unitForm.customType}
                        onChange={e => setUnitForm(p => ({ ...p, customType: e.target.value }))}
                        placeholder="e.g. 1.5 Acre Mango Farm / 40x60 Luxury Plot / 5 BHK Penthouse"
                        required
                      />
                    )}
                  </div>

                  {['plots', 'layouts'].includes(activeProjectView?.type) ? (
                    <div className="form-group">
                      <label className="form-label">Plot Dimensions (L x W ft)</label>
                      <input
                        className="form-input"
                        value={unitForm.dimensions}
                        onChange={e => setUnitForm(p => ({ ...p, dimensions: e.target.value }))}
                        placeholder="e.g. 30 x 40 ft / 40 x 60 ft"
                      />
                    </div>
                  ) : ['farmland', 'agricultural_land'].includes(activeProjectView?.type) ? (
                    <div className="form-group">
                      <label className="form-label">Land Extent Size</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={unitForm.extentAcres}
                          onChange={e => setUnitForm(p => ({ ...p, extentAcres: e.target.value }))}
                          placeholder="0.5"
                          style={{ flex: 1 }}
                        />
                        <select
                          className="form-select"
                          value={unitForm.extentUnit}
                          onChange={e => setUnitForm(p => ({ ...p, extentUnit: e.target.value }))}
                          style={{ width: 105 }}
                        >
                          <option value="Acres">Acres</option>
                          <option value="Gunthas">Gunthas</option>
                          <option value="Bighas">Bighas</option>
                          <option value="Cents">Cents</option>
                          <option value="Sq.Yards">Sq.Yds</option>
                        </select>
                      </div>
                    </div>
                  ) : activeProjectView?.type === 'villa' ? (
                    <div className="form-group">
                      <label className="form-label">Villa Levels</label>
                      <select
                        className="form-select"
                        value={unitForm.levels}
                        onChange={e => setUnitForm(p => ({ ...p, levels: e.target.value }))}
                      >
                        <option value="G+1">G+1 (Ground + 1 Floor)</option>
                        <option value="G+2">G+2 (Ground + 2 Floors)</option>
                        <option value="G+3">G+3 (Triplex Villa)</option>
                      </select>
                    </div>
                  ) : activeProjectView?.type === 'retail_shop' ? (
                    <div className="form-group">
                      <label className="form-label">Frontage Width (ft)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={unitForm.frontage}
                        onChange={e => setUnitForm(p => ({ ...p, frontage: e.target.value }))}
                        placeholder="e.g. 18 ft"
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Floor Number</label>
                      <input
                        type="number"
                        className="form-input"
                        value={unitForm.floor}
                        onChange={e => setUnitForm(p => ({ ...p, floor: e.target.value }))}
                        placeholder="e.g. 3"
                      />
                    </div>
                  )}
                </div>

                {/* 4. Area & Facing with Custom Option */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      {['plots', 'layouts', 'farmland', 'agricultural_land'].includes(activeProjectView?.type) ? 'Total Area (sq.ft)' : 'Super Built-Up Area (sq.ft)'} <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={unitForm.area}
                      onChange={e => setUnitForm(p => ({ ...p, area: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Facing Orientation</label>
                      <button
                        type="button"
                        onClick={() => setUnitForm(p => ({ ...p, isCustomFacing: !p.isCustomFacing }))}
                        style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        {unitForm.isCustomFacing ? 'Standard List' : '✏️ Custom Facing'}
                      </button>
                    </div>

                    {!unitForm.isCustomFacing ? (
                      <select
                        className="form-select"
                        value={unitForm.facing}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'Custom') {
                            setUnitForm(p => ({ ...p, facing: val, isCustomFacing: true }));
                          } else {
                            setUnitForm(p => ({ ...p, facing: val, isCustomFacing: false }));
                          }
                        }}
                      >
                        {FACING_OPTIONS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="form-input"
                        value={unitForm.customFacing}
                        onChange={e => setUnitForm(p => ({ ...p, customFacing: e.target.value }))}
                        placeholder="e.g. Lake & Hills View / Valley Facing / 4-Side Open"
                        required
                      />
                    )}
                  </div>
                </div>

                {/* 5. Category-Specific Additional Controls */}
                {['plots', 'layouts'].includes(activeProjectView?.type) && (
                  <div className="form-row" style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Road Width in Front (ft)</label>
                      <select
                        className="form-select"
                        value={unitForm.roadWidth}
                        onChange={e => setUnitForm(p => ({ ...p, roadWidth: e.target.value }))}
                      >
                        <option value="30">30 ft Internal Road</option>
                        <option value="40">40 ft Sector Road</option>
                        <option value="60">60 ft Main Avenue</option>
                        <option value="80">80 ft Boulevard</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={unitForm.isCornerPlot}
                          onChange={e => setUnitForm(p => ({ ...p, isCornerPlot: e.target.checked }))}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        Corner Dual-Road Plot (+5% PLC)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={unitForm.boundaryWall}
                          onChange={e => setUnitForm(p => ({ ...p, boundaryWall: e.target.checked }))}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        Fencing & Boundary Wall Complete
                      </label>
                    </div>
                  </div>
                )}

                {['farmland', 'agricultural_land'].includes(activeProjectView?.type) && (
                  <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, marginBottom: 14, border: '1px solid #bbf7d0' }}>
                    <div className="form-row" style={{ marginBottom: 8 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Plantation / Tree Species</label>
                        <input
                          className="form-input"
                          value={unitForm.plantationType}
                          onChange={e => setUnitForm(p => ({ ...p, plantationType: e.target.value }))}
                          placeholder="e.g. Alphonso Mango, Sandalwood, Teakwood, Avocado"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Water & Irrigation System</label>
                        <input
                          className="form-input"
                          value={unitForm.waterSource}
                          onChange={e => setUnitForm(p => ({ ...p, waterSource: e.target.value }))}
                          placeholder="e.g. Borewell + Automated Drip / Canal Water"
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={unitForm.boundaryWall}
                          onChange={e => setUnitForm(p => ({ ...p, boundaryWall: e.target.checked }))}
                          style={{ accentColor: '#16a34a' }}
                        />
                        Chain-link / Stone Fencing Included
                      </label>
                    </div>
                  </div>
                )}

                {activeProjectView?.type === 'villa' && (
                  <div className="form-row" style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Private Garden Area (sq.ft)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={unitForm.gardenArea}
                        onChange={e => setUnitForm(p => ({ ...p, gardenArea: e.target.value }))}
                        placeholder="e.g. 450"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Covered Car Parks</label>
                      <input
                        type="number"
                        className="form-input"
                        value={unitForm.carParks}
                        onChange={e => setUnitForm(p => ({ ...p, carParks: e.target.value }))}
                        placeholder="e.g. 2"
                      />
                    </div>
                  </div>
                )}

                {/* 6. Pricing */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Base Rate / BSP (₹) <span className="required">*</span></label>
                    <input
                      type="number"
                      className="form-input"
                      value={unitForm.basePrice}
                      onChange={e => setUnitForm(p => ({ ...p, basePrice: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">All-Inclusive Total Package (₹) <span className="required">*</span></label>
                    <input
                      type="number"
                      className="form-input"
                      value={unitForm.totalPrice}
                      onChange={e => setUnitForm(p => ({ ...p, totalPrice: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* 7. Initial Status */}
                <div className="form-group">
                  <label className="form-label">Initial Sales Availability</label>
                  <select
                    className="form-select"
                    value={unitForm.status}
                    onChange={e => setUnitForm(p => ({ ...p, status: e.target.value }))}
                  >
                    <option value="available">🟢 Available (Open for Sale)</option>
                    <option value="on_hold">🟡 On Hold (48h Reservation)</option>
                    <option value="blocked">🔴 Blocked (Management)</option>
                    <option value="booked">🔵 Booked (Token Paid)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUnitModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add {activeCategoryConf?.unitTerm} to Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
