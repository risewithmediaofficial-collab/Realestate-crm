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
const MetaWebhookEvent = require('../models/MetaWebhookEvent.model');
const MetaIntegrationLog = require('../models/MetaIntegrationLog.model');
const MetaSyncHistory = require('../models/MetaSyncHistory.model');
const MetaFormMapping = require('../models/MetaFormMapping.model');

const clearAll = async () => {
  try {
    await connectDB();
    console.log('🧹 Purging seeded fake data while preserving SuperAdmin & MRP Real Estate...');

    const mrpRegex = /MRP\s*REAL\s*ESTATE/i;

    // Clear fake business data not belonging to MRP REAL ESTATE
    await Promise.all([
      Project.deleteMany({ organization: { $not: mrpRegex } }),
      Unit.deleteMany({ organization: { $not: mrpRegex } }),
      Lead.deleteMany({ organization: { $not: mrpRegex } }),
      Campaign.deleteMany({ organization: { $not: mrpRegex } }),
      Task.deleteMany({ organization: { $not: mrpRegex } }),
      SiteVisit.deleteMany({ organization: { $not: mrpRegex } }),
      ChannelPartner.deleteMany({ organization: { $not: mrpRegex } }),
      Booking.deleteMany({ organization: { $not: mrpRegex } }),
      Payment.deleteMany({ organization: { $not: mrpRegex } }),
      MetaWebhookEvent.deleteMany({}),
      MetaIntegrationLog.deleteMany({}),
      MetaSyncHistory.deleteMany({}),
    ]);
    console.log('✅ Non-MRP business data collections wiped clean.');

    // Keep ONLY Super Admin Master and MRP REAL ESTATE users
    const keptUsers = await User.find({
      $or: [
        { role: 'super_admin' },
        { email: 'superadmin@crm.com' },
        { organization: { $regex: mrpRegex } },
        { email: 'mrprealestate@gmail.com' }
      ]
    });

    const keptUserIds = keptUsers.map(u => u._id);
    await User.deleteMany({ _id: { $nin: keptUserIds } });

    // If Super Admin Master doesn't exist, create it
    let superAdmin = await User.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      const superAdminHashedPassword = await bcrypt.hash('SuperAdmin@2026', 12);
      await User.create({
        name: 'Super Admin Master',
        email: 'superadmin@crm.com',
        password: superAdminHashedPassword,
        role: 'super_admin',
        phone: '+91-9999999999',
        organization: 'RealtyHub HQ',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        permissions: ['*']
      });
    }

    console.log('👑 Retained Super Admin Master user & MRP REAL ESTATE workspace account.');
    console.log('✨ Clean slate ready! All fake seeded records removed.');
    process.exit(0);
  } catch (err) {
    console.error('Error while clearing database:', err);
    process.exit(1);
  }
};

clearAll();
