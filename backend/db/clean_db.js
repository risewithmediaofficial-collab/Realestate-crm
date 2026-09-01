require('dotenv').config();
const mongoose = require('mongoose');
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
const MetaWebhookEvent = require('../models/MetaWebhookEvent.model');
const MetaIntegrationLog = require('../models/MetaIntegrationLog.model');
const MetaSyncHistory = require('../models/MetaSyncHistory.model');
const MetaFormMapping = require('../models/MetaFormMapping.model');

const cleanDatabase = async () => {
  try {
    await connectDB();
    console.log('🚀 Starting targeted cleanup to remove seeded fake data...\n');

    // 1. CLEAN USERS: Keep ONLY super_admin and MRP REAL ESTATE
    const mrpRegex = /MRP\s*REAL\s*ESTATE/i;
    
    // Find users to keep
    const keptUsers = await User.find({
      $or: [
        { role: 'super_admin' },
        { email: 'superadmin@crm.com' },
        { organization: { $regex: mrpRegex } },
        { email: 'mrprealestate@gmail.com' }
      ]
    });

    const keptUserIds = keptUsers.map(u => u._id);
    const deleteUsersResult = await User.deleteMany({
      _id: { $nin: keptUserIds }
    });

    console.log(`👤 Users: Deleted ${deleteUsersResult.deletedCount} fake seeded user(s). Kept ${keptUsers.length} user(s):`);
    keptUsers.forEach(u => {
      console.log(`   - [${u.role}] ${u.name} (${u.email}) | Org: ${u.organization}`);
    });

    // 2. CLEAN BUSINESS DATA: Delete any data NOT belonging to MRP REAL ESTATE
    const businessModels = [
      { name: 'Projects', model: Project },
      { name: 'Units', model: Unit },
      { name: 'Leads', model: Lead },
      { name: 'Campaigns', model: Campaign },
      { name: 'Tasks', model: Task },
      { name: 'SiteVisits', model: SiteVisit },
      { name: 'ChannelPartners', model: ChannelPartner },
      { name: 'Bookings', model: Booking },
      { name: 'Payments', model: Payment },
    ];

    console.log('\n📦 Purging fake business data (keeping MRP REAL ESTATE if any exists)...');
    for (const item of businessModels) {
      const delRes = await item.model.deleteMany({
        organization: { $not: mrpRegex }
      });
      const remainingCount = await item.model.countDocuments({
        organization: { $regex: mrpRegex }
      });
      console.log(`   - ${item.name}: Deleted ${delRes.deletedCount} seeded fake records | Retained ${remainingCount} MRP REAL ESTATE records`);
    }

    // 3. CLEAN META INTEGRATION TEST / SIMULATED LOGS
    console.log('\n📡 Cleaning test/simulated Meta Integration events & logs...');
    const metaDelWebhooks = await MetaWebhookEvent.deleteMany({});
    const metaDelLogs = await MetaIntegrationLog.deleteMany({});
    const metaDelSync = await MetaSyncHistory.deleteMany({});
    console.log(`   - MetaWebhookEvents deleted: ${metaDelWebhooks.deletedCount}`);
    console.log(`   - MetaIntegrationLogs deleted: ${metaDelLogs.deletedCount}`);
    console.log(`   - MetaSyncHistories deleted: ${metaDelSync.deletedCount}`);

    console.log('\n✨ Purge complete! Database now only contains MRP REAL ESTATE organization and Super Admin Master.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
  }
};

cleanDatabase();
