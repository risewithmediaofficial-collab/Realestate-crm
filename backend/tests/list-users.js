const mongoose = require('mongoose');
const User = require('../models/User.model');

async function listUsers() {
  await mongoose.connect('mongodb://localhost:27017/real-estate-crm');
  const users = await User.find({});
  console.log('Current DB Users:', users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })));
  await mongoose.disconnect();
}

listUsers().catch(console.error);
