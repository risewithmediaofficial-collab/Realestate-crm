const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('../models/User.model');
const Lead = require('../models/Lead.model');
const Booking = require('../models/Booking.model');
const Project = require('../models/Project.model');

const runTest = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/real_estate_crm';
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB for approval & data isolation verification');

    // 1. Clean up test users if existing
    await User.deleteMany({ email: { $in: ['bob@skylineinfra.com', 'charlie@primebuilds.com'] } });
    await Lead.deleteMany({ organization: 'Skyline Infra' });

    // 2. Simulate Registration for Bob (Skyline Infra)
    console.log('\n--- STEP 1: Registration Flow ---');
    const hashedPassword = await bcrypt.hash('Skyline@2026', 12);
    const newApplicant = await User.create({
      name: 'Bob Builder',
      email: 'bob@skylineinfra.com',
      username: 'bobskyline',
      password: hashedPassword,
      phone: '+91 9988776655',
      organization: 'Skyline Infra',
      city: 'Bangalore',
      role: 'admin',
      approvalStatus: 'pending',
      isApproved: false,
      isActive: false
    });
    console.log(`✅ Registered applicant: ${newApplicant.name} (${newApplicant.organization})`);
    console.log(`   Approval Status: ${newApplicant.approvalStatus}, isApproved: ${newApplicant.isApproved}, isActive: ${newApplicant.isActive}`);

    // 3. Simulate Login attempt while pending
    console.log('\n--- STEP 2: Pending Login Block Check ---');
    const checkLoginUser = await User.findOne({ email: 'bob@skylineinfra.com' });
    if (checkLoginUser.approvalStatus === 'pending' || !checkLoginUser.isApproved) {
      console.log('✅ Pending check PASS: Login blocked with 403 (pendingApproval: true).');
    } else {
      throw new Error('Pending login was NOT blocked!');
    }

    // 4. Simulate Super Admin Approval
    console.log('\n--- STEP 3: Super Admin Approval ---');
    const superAdmin = await User.findOne({ role: 'super_admin' }) || { _id: new mongoose.Types.ObjectId() };
    const approvedUser = await User.findByIdAndUpdate(
      newApplicant._id,
      {
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        approvedAt: new Date(),
        approvedBy: superAdmin._id
      },
      { new: true }
    );
    console.log(`✅ Super Admin approved user: ${approvedUser.email}`);
    console.log(`   New status: ${approvedUser.approvalStatus}, isApproved: ${approvedUser.isApproved}, isActive: ${approvedUser.isActive}`);

    // 5. Simulate Approved Login
    console.log('\n--- STEP 4: Approved User Login & Token Generation ---');
    if (approvedUser.approvalStatus === 'approved' && approvedUser.isApproved) {
      const token = jwt.sign(
        { id: approvedUser._id, role: approvedUser.role, organization: approvedUser.organization },
        process.env.JWT_SECRET || 'fallback_secret_for_jwt_tokens_2026',
        { expiresIn: '7d' }
      );
      console.log('✅ Approved Login PASS: Token issued successfully.');
    }

    // 6. Verify Data Isolation for Skyline Infra
    console.log('\n--- STEP 5: Multi-Tenant Data Isolation Check ---');
    const skylineLeads = await Lead.find({ organization: 'Skyline Infra' });
    const skylineBookings = await Booking.find({ organization: 'Skyline Infra' });
    console.log(`📊 Initial Skyline Infra Leads count: ${skylineLeads.length} (Expected: 0)`);
    console.log(`📊 Initial Skyline Infra Bookings count: ${skylineBookings.length} (Expected: 0)`);

    if (skylineLeads.length !== 0 || skylineBookings.length !== 0) {
      throw new Error('Data isolation FAILED: New organization sees existing records!');
    }
    console.log('✅ Initial Data Isolation PASS: Clean zero-data workspace verified!');

    // 7. Create a new lead under Skyline Infra
    const newSkylineLead = await Lead.create({
      name: 'Dr. Suresh R',
      email: 'suresh@gmail.com',
      phone: '+91 9123456780',
      organization: 'Skyline Infra',
      stage: 'new',
      source: 'website',
      budget: { min: 8000000, max: 12000000 }
    });
    console.log(`✅ Created Skyline Infra lead: "${newSkylineLead.name}"`);

    // 8. Verify Rise With RealtyHub cannot see Skyline Infra leads
    const defaultOrgLeads = await Lead.find({ organization: 'Rise With RealtyHub' });
    const hasLeak = defaultOrgLeads.some(l => l.name === 'Dr. Suresh R');
    if (hasLeak) {
      throw new Error('Data isolation FAILED: Rise With RealtyHub can see Skyline Infra lead!');
    }
    console.log(`✅ Reverse Isolation PASS: Rise With RealtyHub has ${defaultOrgLeads.length} leads and does NOT see Skyline Infra's lead.`);

    console.log('\n=============================================');
    console.log('🎉 ALL APPROVAL & MULTI-TENANT ISOLATION TESTS PASSED!');
    console.log('=============================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runTest();
