require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./connect');

const User = require('../models/User.model');
const Project = require('../models/Project.model');
const Unit = require('../models/Unit.model');
const Lead = require('../models/Lead.model');
const Campaign = require('../models/Campaign.model');
const Task = require('../models/Task.model');
const SiteVisit = require('../models/SiteVisit.model');
const ChannelPartner = require('../models/ChannelPartner.model');
const Booking = require('../models/Booking.model');
const Payment = require('../models/Payment.model');

const seed = async (shouldExit = false) => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }
  console.log('🌱 Starting comprehensive real estate CRM database seed...');

  // Clear all collections
  await Promise.all([
    User.deleteMany({}), Project.deleteMany({}), Unit.deleteMany({}),
    Lead.deleteMany({}), Campaign.deleteMany({}), Task.deleteMany({}),
    SiteVisit.deleteMany({}), ChannelPartner.deleteMany({}),
    Booking.deleteMany({}), Payment.deleteMany({}),
  ]);
  console.log('🗑️  Cleared all existing CRM collections');

  // --- 1. USERS ---
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  const superAdminHashedPassword = await bcrypt.hash('SuperAdmin@2026', 12);
  const users = await User.insertMany([
    { name: 'Super Admin Master', email: 'superadmin@crm.com', password: superAdminHashedPassword, role: 'super_admin', phone: '+91-9999999999', organization: 'RealtyHub HQ', approvalStatus: 'approved', isApproved: true, isActive: true, permissions: ['*'] },
    { name: 'Workspace Admin', email: 'admin@crm.com', password: hashedPassword, role: 'admin', phone: '+91-9876543210', organization: 'Rise With RealtyHub', approvalStatus: 'approved', isApproved: true, isActive: true },
    { name: 'Priya Sharma', email: 'sales.head@crm.com', password: hashedPassword, role: 'sales_head', phone: '+91-9876543211', organization: 'Rise With RealtyHub', approvalStatus: 'approved', isApproved: true, isActive: true },
    { name: 'Amit Singh', email: 'sales1@crm.com', password: hashedPassword, role: 'sales_executive', phone: '+91-9876543212', organization: 'Rise With RealtyHub', approvalStatus: 'approved', isApproved: true, isActive: true },
    { name: 'Neha Patel', email: 'sales2@crm.com', password: hashedPassword, role: 'sales_executive', phone: '+91-9876543213', organization: 'Rise With RealtyHub', approvalStatus: 'approved', isApproved: true, isActive: true },
    { name: 'Ravi Verma', email: 'telecaller1@crm.com', password: hashedPassword, role: 'telecaller', phone: '+91-9876543214', organization: 'Rise With RealtyHub', approvalStatus: 'approved', isApproved: true, isActive: true },
    { name: 'Sunita Rao', email: 'marketing@crm.com', password: hashedPassword, role: 'marketing_head', phone: '+91-9876543215', organization: 'Rise With RealtyHub', approvalStatus: 'approved', isApproved: true, isActive: true },
    { name: 'Vikram Mehta', email: 'finance@crm.com', password: hashedPassword, role: 'finance_manager', phone: '+91-9876543216', organization: 'Rise With RealtyHub', approvalStatus: 'approved', isApproved: true, isActive: true },
  ]);
  console.log(`✅ Created ${users.length} users`);

  const admin = users[0];
  const salesHead = users[1];
  const exec1 = users[2];
  const exec2 = users[3];
  const telecaller = users[4];
  const financeMgr = users[6];

  // --- 2. CAMPAIGNS ---
  const campaigns = await Campaign.insertMany([
    { name: 'Green Valley Meta Ads - Q3 2026', type: 'meta_ads', status: 'active', budget: 350000, spent: 187000, impressions: 450000, clicks: 6200, leads: 142, conversions: 6, revenue: 48000000, createdBy: admin._id },
    { name: 'Skyline Tower Google Search - Q3 2026', type: 'google_ads', status: 'active', budget: 500000, spent: 280000, impressions: 280000, clicks: 4100, leads: 88, conversions: 4, revenue: 85000000, createdBy: admin._id },
    { name: '99acres Premium Developer Banner', type: 'portal', status: 'active', budget: 200000, spent: 150000, impressions: 190000, clicks: 3100, leads: 95, conversions: 3, revenue: 24000000, createdBy: admin._id },
    { name: 'MagicBricks Verified Project Listing', type: 'portal', status: 'active', budget: 180000, spent: 120000, impressions: 160000, clicks: 2700, leads: 74, conversions: 2, revenue: 16000000, createdBy: admin._id },
    { name: 'WhatsApp Broadcast - VIP HNI Database', type: 'whatsapp', status: 'completed', budget: 25000, spent: 25000, impressions: 12000, clicks: 1400, leads: 42, conversions: 2, revenue: 25000000, createdBy: admin._id },
    { name: 'Direct Developer Website Inbound Forms', type: 'website', status: 'active', budget: 50000, spent: 30000, impressions: 80000, clicks: 2200, leads: 56, conversions: 5, revenue: 42000000, createdBy: admin._id },
  ]);
  console.log(`✅ Created ${campaigns.length} marketing campaigns`);

  // --- 3. PROJECTS ---
  const projects = await Project.insertMany([
    {
      name: 'Green Valley Residences',
      code: 'GVR',
      description: 'A premium luxury township offering 2, 3 & 4 BHK apartments with 25+ world-class amenities in Hinjewadi IT corridor.',
      city: 'Pune',
      state: 'Maharashtra',
      address: 'Hinjewadi Phase 2, Pune',
      landmark: 'Near Infosys Circle',
      type: 'residential_apartment',
      totalArea: 14.5,
      totalUnits: 240,
      reraNumber: 'P52100018923',
      status: 'launched',
      launchDate: new Date('2024-01-15'),
      possessionDate: new Date('2026-12-31'),
      priceRange: { min: 7500000, max: 18500000 },
      salesHead: salesHead._id,
      towers: [
        {
          name: 'Tower A - Emerald',
          code: 'A',
          totalFloors: 12,
          totalUnits: 60,
          status: 'under_construction',
          floors: Array.from({ length: 12 }, (_, i) => ({ floorNumber: i + 1, floorName: i === 0 ? 'Ground' : `Floor ${i + 1}`, totalUnits: 5 })),
        },
        {
          name: 'Tower B - Sapphire',
          code: 'B',
          totalFloors: 15,
          totalUnits: 90,
          status: 'launched',
          floors: Array.from({ length: 15 }, (_, i) => ({ floorNumber: i + 1, floorName: `Floor ${i + 1}`, totalUnits: 6 })),
        },
      ],
      unitTypes: [
        { name: '2 BHK', area: 950, bedrooms: 2, bathrooms: 2, basePrice: 7500000 },
        { name: '3 BHK', area: 1350, bedrooms: 3, bathrooms: 3, basePrice: 12500000 },
        { name: '4 BHK', area: 1850, bedrooms: 4, bathrooms: 4, basePrice: 18000000 },
      ],
      amenities: [
        { name: 'Infinity Swimming Pool', category: 'recreational' },
        { name: 'Gym & Yoga Studio', category: 'sports' },
      ],
    },
    {
      name: 'Grand Palms Palm Meadows Plots',
      code: 'GPP',
      description: 'HMDA & DTCP approved premium residential plotted layout with 40ft/60ft wide roads, underground cabling and clubhouse.',
      city: 'Hyderabad',
      state: 'Telangana',
      address: 'Shankarpally - Mokila Highway, Hyderabad',
      landmark: 'Near ICFAI University',
      type: 'plots',
      totalArea: 25.0,
      totalUnits: 150,
      categoryDetails: { approvalBody: 'DTCP & HMDA Approved', roadWidths: [30, 40, 60], totalAcres: 25 },
      reraNumber: 'P02400001289',
      status: 'launched',
      launchDate: new Date('2024-03-01'),
      possessionDate: new Date('2025-06-30'),
      priceRange: { min: 3600000, max: 12000000 },
      salesHead: exec1._id,
      towers: [{ name: 'Sector A', code: 'A', totalFloors: 1, totalUnits: 75, status: 'ready' }],
      unitTypes: [
        { name: '30 x 40 ft (1,200 sq.ft)', area: 1200, basePrice: 3600000 },
        { name: '30 x 50 ft (1,500 sq.ft)', area: 1500, basePrice: 4500000 },
        { name: '40 x 60 ft (2,400 sq.ft)', area: 2400, basePrice: 7200000 },
      ],
    },
    {
      name: 'Emerald Meadows Luxury Villas',
      code: 'EMV',
      description: 'Exclusive 4BHK & 5BHK private garden villas with private pools and smart home automation in Sarjapur.',
      city: 'Bangalore',
      state: 'Karnataka',
      address: 'Sarjapur Main Road, Bangalore',
      landmark: 'Near Wipro Corporate Campus',
      type: 'villa',
      totalArea: 18.0,
      totalUnits: 60,
      reraNumber: 'PRM/KA/RERA/1251/308/PR/210323/004021',
      status: 'under_construction',
      launchDate: new Date('2024-02-01'),
      possessionDate: new Date('2026-09-30'),
      priceRange: { min: 21000000, max: 45000000 },
      salesHead: salesHead._id,
      towers: [{ name: 'Phase 1 - Lakeview', code: 'P1', totalFloors: 2, totalUnits: 30, status: 'under_construction' }],
    },
    {
      name: 'Skyline Tower Commercial & IT Park',
      code: 'STC',
      description: 'Grade-A commercial office suites & retail spaces in the prime financial hub of BKC Mumbai.',
      city: 'Mumbai',
      state: 'Maharashtra',
      address: 'BKC, Bandra East, Mumbai',
      landmark: 'Opposite US Consulate',
      type: 'commercial_office',
      totalArea: 5.8,
      totalUnits: 80,
      reraNumber: 'P51800054321',
      status: 'ready_to_move',
      launchDate: new Date('2023-06-01'),
      possessionDate: new Date('2024-06-01'),
      priceRange: { min: 15000000, max: 65000000 },
      salesHead: exec1._id,
      towers: [
        {
          name: 'Main Commercial Tower',
          code: 'M',
          totalFloors: 20,
          totalUnits: 80,
          status: 'ready',
          floors: Array.from({ length: 20 }, (_, i) => ({ floorNumber: i + 1, floorName: `Floor ${i + 1}`, totalUnits: 4 })),
        },
      ],
    },
    {
      name: 'Apex High-Street Retail Galleria',
      code: 'ARG',
      description: 'Prime high-street commercial retail shops, anchor showrooms and double-height food court outlets.',
      city: 'Delhi NCR',
      state: 'Haryana',
      address: 'Golf Course Extension Road, Gurugram',
      type: 'retail_shop',
      totalArea: 4.2,
      totalUnits: 50,
      reraNumber: 'HRERA-GGM-2024-88',
      status: 'launched',
      priceRange: { min: 8500000, max: 38000000 },
      salesHead: exec2._id,
    },
    {
      name: 'LogiPark Industrial & Logistics Hub',
      code: 'LIP',
      description: 'Grade-A logistics warehouses, cold storage facilities and heavy industrial manufacturing sheds.',
      city: 'Chennai',
      state: 'Tamil Nadu',
      address: 'Sriperumbudur Industrial Corridor, Chennai',
      type: 'industrial_warehouse',
      totalArea: 40.0,
      totalUnits: 25,
      status: 'ready_to_move',
      priceRange: { min: 25000000, max: 120000000 },
      salesHead: exec1._id,
    },
    {
      name: 'Serene Valley Weekend Farmhouses',
      code: 'SVF',
      description: 'Gated weekend farmland plots and agro-estate villas with organic plantation & private drip irrigation.',
      city: 'Lonavala',
      state: 'Maharashtra',
      address: 'Pawna Dam Backwaters, Lonavala',
      type: 'farmland',
      totalArea: 35.0,
      totalUnits: 35,
      status: 'launched',
      priceRange: { min: 9500000, max: 28000000 },
      salesHead: salesHead._id,
    }
  ]);
  console.log(`✅ Created ${projects.length} real estate projects across categories`);

  const gvr = projects[0];
  const gpp = projects[1];
  const emv = projects[2];
  const stc = projects[3];
  const arg = projects[4];
  const lip = projects[5];
  const svf = projects[6];

  // --- 4. CHANNEL PARTNERS ---
  const channelPartners = await ChannelPartner.insertMany([
    { firmName: 'Apex Realty Advisory', contactPerson: 'Rajesh Sharma', phone: '9811001100', email: 'rajesh@apexrealty.com', city: 'Pune', reraNumber: 'A52100018923', tier: 'platinum', status: 'approved', defaultCommissionRate: 2.5, totalLeadsSubmitted: 42, totalBookings: 8, totalValue: 98000000, totalCommissionEarned: 2450000, totalCommissionPaid: 2000000, totalCommissionPending: 450000, approvedBy: admin._id },
    { firmName: 'Star Realty Associates', contactPerson: 'Mahesh Choudhary', phone: '9711111111', email: 'star.realty@email.com', city: 'Pune', reraNumber: 'A52100024512', tier: 'platinum', status: 'approved', defaultCommissionRate: 2.5, totalLeadsSubmitted: 35, totalBookings: 6, totalValue: 74000000, totalCommissionEarned: 1850000, totalCommissionPaid: 1500000, totalCommissionPending: 350000, approvedBy: admin._id },
  ]);
  console.log(`✅ Created ${channelPartners.length} channel partners`);

  // --- 5. INVENTORY UNITS ---
  const unitData = [];

  // GVR Apartments
  const gvrConfigs = [
    { tower: 'Tower A', towerName: 'Tower A - Emerald', floors: 12, unitsPerFloor: 5, prefix: 'A' },
    { tower: 'Tower B', towerName: 'Tower B - Sapphire', floors: 15, unitsPerFloor: 6, prefix: 'B' },
  ];
  const unitTypes = ['2 BHK', '2 BHK', '3 BHK', '3 BHK', '4 BHK'];
  const facings = ['east', 'west', 'north', 'south', 'east'];
  const statuses = ['available', 'available', 'available', 'available', 'on_hold', 'booked', 'sold', 'available', 'blocked'];

  gvrConfigs.forEach(tc => {
    for (let floor = 1; floor <= tc.floors; floor++) {
      for (let unit = 1; unit <= tc.unitsPerFloor; unit++) {
        const unitNum = `${tc.prefix}-${floor}0${unit}`;
        const uType = unitTypes[(unit - 1) % unitTypes.length];
        const area = uType === '2 BHK' ? 950 : uType === '3 BHK' ? 1350 : 1850;
        const basePrice = uType === '2 BHK' ? 7500000 : uType === '3 BHK' ? 12500000 : 18000000;
        const floorRise = floor * 50000;
        const status = (floor === 1 && unit === 1) ? 'sold' : (floor === 1 && unit === 2) ? 'booked' : (floor === 1 && unit === 3) ? 'available' : (floor === 1 && unit === 4) ? 'on_hold' : statuses[Math.floor(Math.random() * statuses.length)];
        
        unitData.push({
          unitNumber: unitNum,
          project: gvr._id,
          tower: tc.tower,
          towerName: tc.towerName,
          floor,
          type: uType,
          category: 'residential_apartment',
          facing: facings[(unit - 1) % facings.length],
          area: { carpet: Math.round(area * 0.7), builtUp: Math.round(area * 0.85), superBuiltUp: area },
          bedrooms: uType === '2 BHK' ? 2 : uType === '3 BHK' ? 3 : 4,
          bathrooms: uType === '2 BHK' ? 2 : uType === '3 BHK' ? 3 : 4,
          balconies: uType === '4 BHK' ? 2 : 1,
          parking: uType === '4 BHK' ? 2 : 1,
          status,
          pricing: {
            basePrice,
            floorRise,
            gst: Math.round((basePrice + floorRise) * 0.05),
            totalPrice: Math.round((basePrice + floorRise) * 1.05 + 350000 + 250000),
          },
        });
      }
    }
  });

  // GPP Plots Units
  const plotConfigs = [
    { num: 'Plot 101', dim: '30 x 40 ft', area: 1200, road: 40, corner: false, price: 3600000, facing: 'east', status: 'available' },
    { num: 'Plot 102', dim: '30 x 50 ft', area: 1500, road: 40, corner: false, price: 4500000, facing: 'north', status: 'available' },
    { num: 'Plot 103 (Corner)', dim: '40 x 60 ft', area: 2400, road: 60, corner: true, price: 7560000, facing: 'ne', status: 'on_hold' },
    { num: 'Plot 201', dim: '50 x 80 ft', area: 4000, road: 60, corner: false, price: 12000000, facing: 'east', status: 'booked' },
    { num: 'Plot 202', dim: '30 x 40 ft', area: 1200, road: 30, corner: false, price: 3600000, facing: 'west', status: 'sold' },
    { num: 'Plot 203', dim: '30 x 50 ft', area: 1500, road: 40, corner: false, price: 4500000, facing: 'north', status: 'available' },
  ];

  plotConfigs.forEach(p => {
    unitData.push({
      unitNumber: p.num,
      project: gpp._id,
      tower: 'Sector A',
      towerName: 'Sector A Layout',
      floor: 1,
      type: `${p.dim} (${p.area.toLocaleString()} sq.ft)`,
      category: 'plots',
      facing: p.facing,
      area: { carpet: p.area, builtUp: p.area, superBuiltUp: p.area, plotArea: p.area },
      dimensions: { length: Number(p.dim.split('x')[1]?.replace(/[^\d]/g, '')) || 40, width: Number(p.dim.split('x')[0]?.replace(/[^\d]/g, '')) || 30 },
      plotDetails: { dimensionStr: p.dim, roadWidth: p.road, isCornerPlot: p.corner, boundaryWall: true, approvalAuthority: 'DTCP & HMDA Approved' },
      status: p.status,
      pricing: { basePrice: p.price, totalPrice: p.price },
    });
  });

  // EMV Luxury Villas
  const villaConfigs = [
    { num: 'Villa 12', type: '3 BHK Villa (G+1)', plot: 1800, built: 2650, garden: 450, price: 22800000, facing: 'east', status: 'available' },
    { num: 'Villa 14 (Corner)', type: '4 BHK Luxury Villa (G+2)', plot: 2400, built: 3850, garden: 650, price: 34500000, facing: 'ne', status: 'booked' },
    { num: 'Villa 21', type: '4 BHK Luxury Villa (G+2)', plot: 2400, built: 3850, garden: 600, price: 34200000, facing: 'east', status: 'available' },
    { num: 'Villa 30 - Royal', type: '5 BHK Royal Villa', plot: 3600, built: 5200, garden: 1100, price: 45000000, facing: 'north', status: 'sold' },
  ];

  villaConfigs.forEach(v => {
    unitData.push({
      unitNumber: v.num,
      project: emv._id,
      tower: 'Phase 1',
      towerName: 'Phase 1 - Lakeview Enclave',
      floor: 1,
      type: v.type,
      category: 'villa',
      facing: v.facing,
      area: { carpet: Math.round(v.built * 0.75), builtUp: v.built, superBuiltUp: v.built, plotArea: v.plot },
      villaDetails: { levels: 'G+2', gardenArea: v.garden, coveredCarParks: 2 },
      status: v.status,
      pricing: { basePrice: v.price * 0.9, totalPrice: v.price },
    });
  });

  // Skyline Commercial Units
  for (let floor = 1; floor <= 6; floor++) {
    for (let u = 1; u <= 4; u++) {
      const uType = u <= 2 ? 'Office Suite' : 'Full Floor Plate (5000+ sq.ft)';
      const area = u <= 2 ? 850 : 3500;
      const bPrice = u <= 2 ? 15500000 : 55000000;
      unitData.push({
        unitNumber: `Office ${floor}0${u}`,
        project: stc._id,
        tower: 'Main',
        towerName: 'Main Commercial Tower',
        floor,
        type: uType,
        category: 'commercial_office',
        facing: u === 1 ? 'east' : u === 2 ? 'west' : u === 3 ? 'north' : 'south',
        area: { carpet: Math.round(area * 0.75), builtUp: Math.round(area * 0.9), superBuiltUp: area },
        status: (floor === 1 && u === 1) ? 'sold' : (floor === 1 && u === 2) ? 'booked' : 'available',
        pricing: {
          basePrice: bPrice,
          floorRise: floor * 75000,
          gst: Math.round(bPrice * 0.18),
          totalPrice: Math.round((bPrice + floor * 75000) * 1.18),
        },
      });
    }
  }

  const units = await Unit.insertMany(unitData);
  console.log(`✅ Created ${units.length} inventory units across all real estate categories`);

  // --- 6. LEADS ---
  const leadProfiles = [
    { name: 'Arjun Kapoor', phone: '9811111111', email: 'arjun.kapoor@email.com', city: 'Pune', budget: 12500000, type: '3BHK', stage: 'qualified', score: 85, leadType: 'hot', source: 'meta_ads' },
    { name: 'Deepa Menon', phone: '9822222222', email: 'deepa.menon@email.com', city: 'Pune', budget: 8500000, type: '2BHK', stage: 'site_visit_scheduled', score: 72, leadType: 'warm', source: 'google_ads' },
    { name: 'Suresh Nair', phone: '9833333333', email: 'suresh.nair@email.com', city: 'Pune', budget: 18000000, type: '4BHK', stage: 'booked', score: 96, leadType: 'hot', source: 'channel_partner', cpIndex: 0 },
    { name: 'Kavya Reddy', phone: '9844444444', email: 'kavya.reddy@email.com', city: 'Bangalore', budget: 7500000, type: '2BHK', stage: 'new', score: 28, leadType: 'cold', source: 'property_portal' },
    { name: 'Manoj Tiwari', phone: '9855555555', email: 'manoj.tiwari@email.com', city: 'Pune', budget: 13000000, type: '3BHK', stage: 'negotiation', score: 88, leadType: 'hot', source: 'walk_in' },
    { name: 'Anita Desai', phone: '9866666666', email: 'anita.desai@email.com', city: 'Pune', budget: 12500000, type: '3BHK', stage: 'site_visit_done', score: 79, leadType: 'warm', source: 'website' },
    { name: 'Ramesh Gupta', phone: '9877777777', email: 'ramesh.gupta@email.com', city: 'Mumbai', budget: 16000000, type: 'Office Suite', stage: 'booked', score: 94, leadType: 'hot', source: 'meta_ads', proj: stc._id },
    { name: 'Pooja Joshi', phone: '9888888888', email: 'pooja.joshi@email.com', city: 'Pune', budget: 8000000, type: '2BHK', stage: 'contacted', score: 48, leadType: 'warm', source: 'google_ads' },
    { name: 'Karan Malhotra', phone: '9899999999', email: 'karan.malhotra@email.com', city: 'Delhi', budget: 18500000, type: '4BHK', stage: 'booking_in_progress', score: 91, leadType: 'hot', source: 'channel_partner', cpIndex: 1 },
    { name: 'Sneha Iyer', phone: '9800000001', email: 'sneha.iyer@email.com', city: 'Pune', budget: 12000000, type: '3BHK', stage: 'connected', score: 62, leadType: 'warm', source: 'whatsapp' },
    { name: 'Vivek Bhat', phone: '9800000002', email: 'vivek.bhat@email.com', city: 'Pune', budget: 7800000, type: '2BHK', stage: 'nurturing', score: 35, leadType: 'cold', source: 'property_portal' },
    { name: 'Ritu Saxena', phone: '9800000003', email: 'ritu.saxena@email.com', city: 'Mumbai', budget: 55000000, type: 'Office Floor', stage: 'qualified', score: 86, leadType: 'hot', source: 'referral', proj: stc._id },
    { name: 'Arun Kumar', phone: '9800000004', email: 'arun.kumar@email.com', city: 'Pune', budget: 8200000, type: '2BHK', stage: 'new', score: 30, leadType: 'cold', source: 'website' },
    { name: 'Meera Shah', phone: '9800000005', email: 'meera.shah@email.com', city: 'Pune', budget: 13500000, type: '3BHK', stage: 'site_visit_scheduled', score: 75, leadType: 'warm', source: 'walk_in' },
    { name: 'Harish Pillai', phone: '9800000006', email: 'harish.pillai@email.com', city: 'Pune', budget: 17500000, type: '4BHK', stage: 'negotiation', score: 84, leadType: 'hot', source: 'channel_partner', cpIndex: 0 },
    { name: 'Divya Nair', phone: '9800000007', email: 'divya.nair@email.com', city: 'Pune', budget: 12500000, type: '3BHK', stage: 'booked', score: 98, leadType: 'hot', source: 'meta_ads' },
    { name: 'Sanjay Rao', phone: '9800000008', email: 'sanjay.rao@email.com', city: 'Pune', budget: 8000000, type: '2BHK', stage: 'not_interested', score: 15, leadType: 'cold', source: 'google_ads' },
    { name: 'Lakshmi Devi', phone: '9800000009', email: 'lakshmi.devi@email.com', city: 'Hyderabad', budget: 18000000, type: '4BHK', stage: 'connected', score: 68, leadType: 'warm', source: 'portal' },
    { name: 'Rohit Sharma', phone: '9800000010', email: 'rohit.sharma@email.com', city: 'Pune', budget: 13000000, type: '3BHK', stage: 'site_visit_done', score: 80, leadType: 'hot', source: 'meta_ads' },
    { name: 'Anjali Singh', phone: '9800000011', email: 'anjali.singh@email.com', city: 'Pune', budget: 7500000, type: '2BHK', stage: 'contacted', score: 52, leadType: 'warm', source: 'website' },
  ];

  const execs = [exec1._id, exec2._id, telecaller._id];
  const leadsData = leadProfiles.map((lp, i) => ({
    name: lp.name,
    phone: lp.phone,
    email: lp.email,
    city: lp.city,
    source: lp.source,
    campaign: campaigns[i % campaigns.length]._id,
    stage: lp.stage,
    leadScore: lp.score,
    leadType: lp.leadType,
    assignedTo: execs[i % execs.length],
    assignedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
    interestedProject: lp.proj || gvr._id,
    interestedUnitType: lp.type,
    budget: { min: Math.round(lp.budget * 0.85), max: lp.budget },
    channelPartner: lp.cpIndex !== undefined ? channelPartners[lp.cpIndex]._id : undefined,
    slaStartedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
    nextFollowUp: new Date(Date.now() + (i % 3) * 24 * 60 * 60 * 1000),
    lastActivityAt: new Date(Date.now() - (i % 4) * 60 * 60 * 1000),
    activities: [
      { type: 'system', title: `Lead captured via ${lp.source.replace(/_/g, ' ')}`, performedAt: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000) },
      { type: 'call', title: 'Introductory discussion call', outcome: 'connected', duration: 180, performedBy: execs[i % execs.length], performedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000) },
      ...(lp.score > 70 ? [{ type: 'note', title: `High intent buyer for ${lp.type}. Pre-approved bank loan ready.`, performedBy: execs[i % execs.length] }] : []),
    ],
    tags: lp.score > 80 ? ['vip', 'high_intent'] : ['regular_inquiry'],
    createdAt: new Date(Date.now() - (i + 3) * 24 * 60 * 60 * 1000),
  }));

  const leads = await Lead.insertMany(leadsData);
  console.log(`✅ Created ${leads.length} leads with full activity trails`);

  // --- 7. TASKS & ACTIVITIES ---
  const tasksData = leads.slice(0, 12).map((lead, i) => ({
    type: ['call', 'follow_up', 'meeting', 'site_visit'][i % 4],
    title: [`Follow up call with ${lead.name}`, `Send updated cost sheet to ${lead.name}`, `Meeting with ${lead.name}`, `Site visit walkthrough - ${lead.name}`][i % 4],
    lead: lead._id,
    assignedTo: execs[i % execs.length],
    createdBy: admin._id,
    dueDate: new Date(Date.now() + (i - 2) * 24 * 60 * 60 * 1000),
    priority: ['low', 'medium', 'high', 'urgent'][i % 4],
    status: i < 3 ? 'overdue' : i < 8 ? 'pending' : 'completed',
  }));
  await Task.insertMany(tasksData);
  console.log(`✅ Created ${tasksData.length} tasks`);

  // --- 8. SITE VISITS ---
  const eligibleVisitsLeads = leads.filter(l => ['site_visit_scheduled', 'site_visit_done', 'negotiation', 'booking_in_progress', 'booked'].includes(l.stage));
  const svData = eligibleVisitsLeads.map((lead, i) => ({
    lead: lead._id,
    project: lead.interestedProject,
    scheduledDate: new Date(Date.now() + (i - 2) * 24 * 60 * 60 * 1000),
    assignedExecutive: lead.assignedTo,
    scheduledBy: admin._id,
    status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'confirmed' : 'scheduled',
    outcome: i % 3 === 0 ? 'interested' : undefined,
    feedback: i % 3 === 0 ? 'Client loved the clubhouse and sample 3BHK flat layout. Requested discount on floor rise.' : undefined,
    rating: i % 3 === 0 ? 5 : undefined,
    unitsShown: [units[i * 2]._id, units[i * 2 + 1]._id],
    shortlistedUnit: units[i * 2]._id,
  }));
  const siteVisits = await SiteVisit.insertMany(svData);
  console.log(`✅ Created ${siteVisits.length} site visits`);

  // --- 9. BOOKINGS ---
  const bookedLeads = leads.filter(l => ['booked', 'booking_in_progress'].includes(l.stage)).slice(0, 5);
  const bookingData = [
    {
      bookingNumber: 'BK-2026-001',
      lead: bookedLeads[0]?._id,
      unit: units[0]._id, // A-101
      project: gvr._id,
      customerName: 'Suresh Nair',
      customerPhone: '9833333333',
      customerEmail: 'suresh.nair@email.com',
      panNumber: 'AAAPN1234F',
      aadharNumber: '4455-6677-8899',
      kycVerified: true,
      basePrice: 16000000,
      floorRise: 500000,
      plc: 250000,
      parkingCharges: 350000,
      amenityCharges: 250000,
      gst: 850000,
      totalAmount: 18000000,
      paymentPlan: 'construction_linked',
      bookingAmount: 500000,
      bookingAmountPaid: true,
      bookingAmountDate: new Date(Date.now() - 30 * 86400000),
      bookingAmountMode: 'neft',
      status: 'approved',
      approvedBy: salesHead._id,
      approvedAt: new Date(Date.now() - 25 * 86400000),
      channelPartner: channelPartners[0]._id,
      commissionRate: 2.5,
      commissionAmount: 450000,
      handledBy: exec1._id,
      notes: 'HNI buyer booking 4BHK. Opted for CLP plan.',
    },
    {
      bookingNumber: 'BK-2026-002',
      lead: bookedLeads[1]?._id,
      unit: units[1]._id, // A-102
      project: gvr._id,
      customerName: 'Ramesh Gupta',
      customerPhone: '9877777777',
      customerEmail: 'ramesh.gupta@email.com',
      panNumber: 'BBBPG5678H',
      aadharNumber: '1122-3344-5566',
      kycVerified: true,
      basePrice: 7500000,
      floorRise: 100000,
      totalAmount: 8200000,
      paymentPlan: 'construction_linked',
      bookingAmount: 200000,
      bookingAmountPaid: true,
      bookingAmountDate: new Date(Date.now() - 15 * 86400000),
      bookingAmountMode: 'cheque',
      status: 'pending_approval',
      handledBy: exec2._id,
      notes: 'Token cheque deposited in HDFC account.',
    },
    {
      bookingNumber: 'BK-2026-003',
      lead: bookedLeads[2]?._id,
      unit: units[2]._id, // A-103
      project: gvr._id,
      customerName: 'Priya Desai',
      customerPhone: '9811112222',
      customerEmail: 'priya.desai@email.com',
      panNumber: 'CCCPD9911K',
      aadharNumber: '9988-7766-5544',
      kycVerified: true,
      basePrice: 11800000,
      floorRise: 250000,
      totalAmount: 12700000,
      paymentPlan: 'down_payment',
      bookingAmount: 500000,
      bookingAmountPaid: true,
      bookingAmountDate: new Date(Date.now() - 45 * 86400000),
      bookingAmountMode: 'rtgs',
      status: 'agreement_signed',
      approvedBy: salesHead._id,
      approvedAt: new Date(Date.now() - 40 * 86400000),
      handledBy: exec1._id,
      notes: 'Registered agreement completed with sub-registrar.',
    },
    {
      bookingNumber: 'BK-2026-004',
      lead: bookedLeads[3]?._id,
      unit: units[3]._id, // A-104
      project: gvr._id,
      customerName: 'Divya Nair',
      customerPhone: '9800000007',
      customerEmail: 'divya.nair@email.com',
      panNumber: 'DDDPN7722M',
      kycVerified: true,
      basePrice: 12000000,
      totalAmount: 12500000,
      paymentPlan: 'construction_linked',
      bookingAmount: 300000,
      bookingAmountPaid: true,
      bookingAmountDate: new Date(Date.now() - 5 * 86400000),
      bookingAmountMode: 'upi',
      status: 'approved',
      approvedBy: admin._id,
      approvedAt: new Date(Date.now() - 3 * 86400000),
      handledBy: exec2._id,
    },
  ];
  const bookings = await Booking.insertMany(bookingData);
  console.log(`✅ Created ${bookings.length} verified bookings`);

  // --- 10. PAYMENT DEMANDS & RECEIPTS ---
  const paymentData = [
    {
      booking: bookings[0]._id,
      lead: bookings[0].lead,
      project: gvr._id,
      unit: units[0]._id,
      demandNumber: 'DEM-2026-081',
      demandDate: new Date('2026-08-01'),
      dueDate: new Date('2026-08-15'),
      milestoneDescription: 'Completion of Plinth / Foundation (15%)',
      demandAmount: 2700000,
      paidAmount: 2700000,
      balanceAmount: 0,
      status: 'paid',
      paymentDate: new Date('2026-08-10'),
      paymentMode: 'neft',
      transactionReference: 'HDFC0089234812',
      bankName: 'HDFC Bank',
      collectedBy: financeMgr._id,
    },
    {
      booking: bookings[1]._id,
      lead: bookings[1].lead,
      project: gvr._id,
      unit: units[1]._id,
      demandNumber: 'DEM-2026-082',
      demandDate: new Date('2026-08-05'),
      dueDate: new Date('2026-08-20'),
      milestoneDescription: 'Booking Token + Agreement Execution (20%)',
      demandAmount: 1640000,
      paidAmount: 1000000,
      balanceAmount: 640000,
      status: 'partial',
      paymentDate: new Date('2026-08-18'),
      paymentMode: 'cheque',
      chequeNumber: 'CHQ-889124',
      bankName: 'ICICI Bank',
      collectedBy: financeMgr._id,
    },
    {
      booking: bookings[2]._id,
      lead: bookings[2].lead,
      project: gvr._id,
      unit: units[2]._id,
      demandNumber: 'DEM-2026-083',
      demandDate: new Date('2026-07-20'),
      dueDate: new Date('2026-08-05'),
      milestoneDescription: 'Completion of 5th Floor Slab (20%)',
      demandAmount: 2540000,
      paidAmount: 0,
      balanceAmount: 2540000,
      status: 'overdue',
      isDelayed: true,
      delayedDays: 22,
      penaltyAmount: 15000,
      collectedBy: financeMgr._id,
    },
    {
      booking: bookings[3]._id,
      lead: bookings[3].lead,
      project: gvr._id,
      unit: units[3]._id,
      demandNumber: 'DEM-2026-084',
      demandDate: new Date('2026-08-15'),
      dueDate: new Date('2026-08-30'),
      milestoneDescription: 'Token Booking Amount (10%)',
      demandAmount: 1250000,
      paidAmount: 0,
      balanceAmount: 1250000,
      status: 'pending',
      collectedBy: financeMgr._id,
    },
    {
      booking: bookings[0]._id,
      lead: bookings[0].lead,
      project: gvr._id,
      unit: units[0]._id,
      demandNumber: 'DEM-2026-085',
      demandDate: new Date('2026-08-20'),
      dueDate: new Date('2026-09-10'),
      milestoneDescription: 'Completion of 8th Floor Slab (15%)',
      demandAmount: 2700000,
      paidAmount: 0,
      balanceAmount: 2700000,
      status: 'pending',
      collectedBy: financeMgr._id,
    },
  ];
  await Payment.insertMany(paymentData);
  console.log(`✅ Created ${paymentData.length} payment milestone demands & receipts`);

  console.log('\n=============================================');
  console.log('🎉 COMPREHENSIVE CRM SEED COMPLETED!');
  console.log('=============================================');
  console.log('📊 Summary of Seeded Data:');
  console.log(`   - Users:            ${users.length}`);
  console.log(`   - Projects:         ${projects.length}`);
  console.log(`   - Inventory Units:  ${units.length}`);
  console.log(`   - Ad Campaigns:     ${campaigns.length}`);
  console.log(`   - Channel Partners: ${channelPartners.length}`);
  console.log(`   - Leads:            ${leads.length}`);
  console.log(`   - Tasks:            ${tasksData.length}`);
  console.log(`   - Site Visits:      ${siteVisits.length}`);
  console.log(`   - Bookings:         ${bookings.length}`);
  console.log(`   - Payment Demands:  ${paymentData.length}`);
  console.log('---------------------------------------------');
  console.log('🔑 Login Credentials:');
  console.log('   Admin:      admin@crm.com      / Admin@123');
  console.log('   Sales Head: sales.head@crm.com  / Admin@123');
  console.log('   Executive:  sales1@crm.com     / Admin@123');
  console.log('=============================================\n');

  if (shouldExit) {
    process.exit(0);
  }
  return true;
};

module.exports = seed;

if (require.main === module) {
  seed(true).catch(err => {
    console.error('❌ Database seed failed:', err);
    process.exit(1);
  });
}
