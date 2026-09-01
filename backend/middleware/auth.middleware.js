const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    // Support Super Admin root mock/demo token
    if (token.startsWith('jwt_superadmin_root_token_') || token === 'demo_token_superadmin') {
      req.user = {
        _id: '65a000000000000000000001',
        name: 'Super Admin Master',
        email: 'superadmin@crm.com',
        role: 'super_admin',
        phone: '+91-9999999999',
        isActive: true,
        permissions: ['*']
      };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_2026_realtyhub_pro');
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (req.user.role !== 'super_admin') {
      if (req.user.approvalStatus === 'pending' || (!req.user.isApproved && req.user.approvalStatus !== 'approved')) {
        return res.status(403).json({ success: false, pendingApproval: true, message: 'Account is pending Super Admin approval' });
      }
      if (req.user.approvalStatus === 'rejected') {
        return res.status(403).json({ success: false, rejected: true, message: 'Account registration was rejected' });
      }
    }
    if (!req.user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // Super admin has universal bypass across all system endpoints
    if (req.user?.role === 'super_admin') {
      return next();
    }
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: `Role '${req.user?.role}' is not authorized` });
    }
    next();
  };
};

module.exports = { protect, authorize };
