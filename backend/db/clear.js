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

const clearAll = async () => {
  try {
    await connectDB();
    console.log('🧹 Purging all seeded data across collections...');

    // Clear all business data
    await Promise.all([
      Project.deleteMany({}),
      Unit.deleteMany({}),
      Lead.deleteMany({}),
      Campaign.deleteMany({}),
      Task.deleteMany({}),
      SiteVisit.deleteMany({}),
      ChannelPartner.deleteMany({}),
      Booking.deleteMany({}),
      Payment.deleteMany({}),
    ]);
    console.log('✅ All business data collections wiped clean.');

    // Keep ONLY the Super Admin Master account
    await User.deleteMany({});
    const superAdminHashedPassword = await bcrypt.hash('SuperAdmin@2026', 12);

    await User.insertMany([
      {
        name: 'Super Admin Master',
        email: 'superadmin@crm.com',
        password: superAdminHashedPassword,
        role: 'super_admin',
        phone: '+91-9999999999',
        isActive: true,
        permissions: ['*']
      }
    ]);

    console.log('👑 Retained ONLY Super Admin Master user (superadmin@crm.com). All other data wiped clean.');

    console.log('✨ Clean slate ready! All fake projects, leads, bookings, visits and tasks removed.');
    process.exit(0);
  } catch (err) {
    console.error('Error while clearing database:', err);
    process.exit(1);
  }
};

clearAll();
