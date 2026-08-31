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

    // Support Admin mock/demo token
    if (token === 'demo_token_admin') {
      req.user = {
        _id: '65a000000000000000000002',
        name: 'Workspace Admin',
        email: 'admin@crm.com',
        role: 'admin',
        phone: '+91-9876543210',
        isActive: true,
        permissions: ['*']
      };
      return next();
    }

    // Support Sales Head mock/demo token
    if (token === 'demo_token_saleshead') {
      req.user = {
        _id: '65a000000000000000000003',
        name: 'Priya Sharma',
        email: 'sales.head@crm.com',
        role: 'sales_head',
        phone: '+91-9876543211',
        isActive: true,
        permissions: ['*']
      };
      return next();
    }

    // Support Sales Exec mock/demo token
    if (token === 'demo_token_sales1') {
      req.user = {
        _id: '65a000000000000000000004',
        name: 'Amit Singh',
        email: 'sales1@crm.com',
        role: 'sales_executive',
        phone: '+91-9876543212',
        isActive: true,
        permissions: []
      };
      return next();
    }

    // Support Sales Manager mock/demo token
    if (token === 'demo_token_salesmanager') {
      req.user = {
        _id: '65a000000000000000000005',
        name: 'Vikram Malhotra',
        email: 'manager@crm.com',
        role: 'sales_manager',
        phone: '+91-9876543213',
        isActive: true,
        permissions: ['dashboard', 'leads', 'communication', 'activities', 'pipeline', 'projects', 'inventory', 'pricing', 'sitevisits', 'negotiations', 'booking', 'reports']
      };
      return next();
    }

    // Support Telecaller mock/demo token
    if (token === 'demo_token_telecaller') {
      req.user = {
        _id: '65a000000000000000000006',
        name: 'Pooja Verma',
        email: 'telecaller@crm.com',
        role: 'telecaller',
        phone: '+91-9876543214',
        isActive: true,
        permissions: ['dashboard', 'leads', 'communication', 'activities', 'sitevisits']
      };
      return next();
    }

    // Support Pre-Sales mock/demo token
    if (token === 'demo_token_presales') {
      req.user = {
        _id: '65a000000000000000000007',
        name: 'Anjali Nair',
        email: 'presales@crm.com',
        role: 'presales',
        phone: '+91-9876543218',
        isActive: true,
        permissions: ['dashboard', 'leads', 'communication', 'activities', 'sitevisits']
      };
      return next();
    }

    // Support Finance Manager mock/demo token
    if (token === 'demo_token_finance') {
      req.user = {
        _id: '65a000000000000000000008',
        name: 'Ramesh Iyer',
        email: 'finance@crm.com',
        role: 'finance_manager',
        phone: '+91-9876543216',
        isActive: true,
        permissions: ['dashboard', 'pricing', 'negotiations', 'booking', 'payments', 'reports']
      };
      return next();
    }

    // Support Channel Partner mock/demo token
    if (token === 'demo_token_cp') {
      req.user = {
        _id: '65a000000000000000000009',
        name: 'Apex Realty Advisors',
        email: 'partner@crm.com',
        role: 'channel_partner',
        phone: '+91-9876543217',
        isActive: true,
        permissions: ['dashboard', 'projects', 'inventory', 'leads', 'channelpartners']
      };
      return next();
    }

    // Support Marketing Head mock/demo token
    if (token === 'demo_token_marketing') {
      req.user = {
        _id: '65a000000000000000000010',
        name: 'Sunita Rao',
        email: 'marketing@crm.com',
        role: 'marketing_head',
        phone: '+91-9876543215',
        isActive: true,
        permissions: ['marketing', 'leads']
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
