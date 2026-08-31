const mongoose = require('mongoose');
const User = require('../models/User.model');

async function updateDbUsers() {
  await mongoose.connect('mongodb://localhost:27017/real-estate-crm');
  const res = await User.updateMany(
    { name: { $regex: /rajesh/i } },
    { $set: { name: 'Workspace Admin' } }
  );
  console.log('MongoDB User Name Update:', res);
  await mongoose.disconnect();
}

updateDbUsers().catch(console.error);
