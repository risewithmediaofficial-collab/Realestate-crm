require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../db/connect');
const User = require('../models/User.model');

const cleanup = async () => {
  await connectDB();
  console.log('🧹 Purging all default seeded demo accounts...');

  const demoEmails = [
    'admin@crm.com',
    'sales.head@crm.com',
    'sales1@crm.com',
    'sales2@crm.com',
    'telecaller1@crm.com',
    'marketing@crm.com',
    'finance@crm.com'
  ];

  const result = await User.deleteMany({
    role: { $ne: 'super_admin' },
    $or: [
      { email: { $in: demoEmails } },
      { organization: 'Rise With RealtyHub' }
    ]
  });

  console.log(`✅ Successfully removed ${result.deletedCount} seeded demo accounts.`);
  console.log('🔒 Preserved Super Admin master account and all newly registered accounts.');

  const remainingUsers = await User.find({}).select('name email role organization approvalStatus');
  console.log('\n📋 Remaining Accounts in Database:');
  remainingUsers.forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.name} (${u.email}) - Role: ${u.role} - Org: ${u.organization || 'N/A'} - Status: ${u.approvalStatus}`);
  });

  process.exit(0);
};

cleanup().catch(err => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
