const Project = require('../models/Project.model');
const Unit = require('../models/Unit.model');

const getProjects = async (req, res, next) => {
  try {
    const { status, city, type, search } = req.query;
    const query = { isActive: true };

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const requestedOrg = req.query.organization;

    if (isSuperAdmin) {
      if (requestedOrg) {
        query.organization = { $regex: new RegExp(`^${requestedOrg.trim()}$`, 'i') };
      }
    } else {
      if (!userOrg) {
        return res.json({ success: true, data: [] });
      }
      query.organization = { $regex: new RegExp(`^${userOrg.trim()}$`, 'i') };
    }

    if (status) query.status = status;
    if (city) query.city = { $regex: city, $options: 'i' };
    if (type) query.type = type;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }];
    const projects = await Project.find(query).populate('createdBy', 'name email').sort('-createdAt');
    
    // Attach unitStats for each project
    const projectListWithStats = await Promise.all(projects.map(async (p) => {
      const pObj = p.toObject();
      const stats = await Unit.aggregate([
        { $match: { project: p._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      const unitStats = { available: 0, booked: 0, sold: 0, on_hold: 0, blocked: 0 };
      stats.forEach(s => { unitStats[s._id] = s.count; });
      
      pObj.unitStats = unitStats;
      return pObj;
    }));

    res.json({ success: true, data: projectListWithStats });
  } catch (err) { next(err); }
};

const getProject = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      const userOrg = req.user?.organization;
      if (!userOrg) return res.status(404).json({ success: false, message: 'Project not found' });
      query.organization = { $regex: new RegExp(`^${userOrg.trim()}$`, 'i') };
    }

    const project = await Project.findOne(query).populate('createdBy', 'name email phone');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const unitStats = await Unit.aggregate([
      { $match: { project: project._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    res.json({ success: true, data: project, unitStats });
  } catch (err) { next(err); }
};

const createProject = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const payload = { ...req.body };
    const userOrg = req.user?.organization;

    if (!isSuperAdmin || !payload.organization) {
      payload.organization = userOrg;
    }
    if (!payload.organization) {
      return res.status(400).json({ success: false, message: 'User organization is required to create a project' });
    }

    if (!payload.createdBy && req.user?._id) {
      payload.createdBy = req.user._id;
    }

    if (!payload.code || payload.code.trim() === '') {
      payload.code = `PRJ-${Date.now().toString().slice(-4)}`;
    } else {
      payload.code = payload.code.trim().toUpperCase();
    }
    const project = await Project.create(payload);
    const pObj = project.toObject();
    pObj.unitStats = { available: 0, booked: 0, sold: 0, on_hold: 0, blocked: 0 };
    res.status(201).json({ success: true, data: pObj });
  } catch (err) { next(err); }
};

const updateProject = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const project = await Project.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
};

const deleteProject = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const project = await Project.findOneAndDelete(query);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    await Unit.deleteMany({ project: req.params.id });
    res.json({ success: true, message: 'Project and associated inventory deleted' });
  } catch (err) { next(err); }
};

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject };
