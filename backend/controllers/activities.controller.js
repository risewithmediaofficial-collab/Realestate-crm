const mongoose = require('mongoose');
const Task = require('../models/Task.model');

const getTasks = async (req, res, next) => {
  try {
    const { status, type, assignedTo, lead, page = 1, limit = 50, myTasks } = req.query;
    const query = {};

    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    if (isSuperAdmin) {
      if (req.query.organization) query.organization = req.query.organization;
    } else {
      if (!userOrg) return res.json({ success: true, data: [], total: 0 });
      query.organization = userOrg;
    }

    if (status) query.status = status;
    if (type) query.type = type;
    if (assignedTo) query.assignedTo = assignedTo;
    if (lead) query.lead = lead;
    if (myTasks === 'true') query.assignedTo = req.user._id;

    const skip = (Number(page) - 1) * Number(limit);
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .sort({ dueDate: 1 })
        .skip(skip).limit(Number(limit))
        .populate('lead', 'name phone stage')
        .populate('assignedTo', 'name avatar')
        .populate('createdBy', 'name'),
      Task.countDocuments(query),
    ]);
    res.json({ success: true, data: tasks, total });
  } catch (err) { next(err); }
};

const getTask = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const task = await Task.findOne(query)
      .populate('lead', 'name phone stage')
      .populate('assignedTo', 'name avatar role')
      .populate('createdBy', 'name');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
};

const createTask = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const payload = { ...req.body };
    const userOrg = req.user?.organization;
    if (!isSuperAdmin || !payload.organization) {
      payload.organization = userOrg;
    }
    if (!payload.organization) {
      return res.status(400).json({ success: false, message: 'User organization is required to create a task' });
    }

    if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      payload.createdBy = req.user._id;
      if (!payload.assignedTo) payload.assignedTo = req.user._id;
    }
    if (payload.lead && !mongoose.Types.ObjectId.isValid(payload.lead)) delete payload.lead;
    if (payload.project && !mongoose.Types.ObjectId.isValid(payload.project)) delete payload.project;
    if (payload.assignedTo && !mongoose.Types.ObjectId.isValid(payload.assignedTo)) delete payload.assignedTo;
    if (payload.createdBy && !mongoose.Types.ObjectId.isValid(payload.createdBy)) delete payload.createdBy;

    const task = await Task.create(payload);
    const populated = await task.populate(['lead', 'assignedTo', 'createdBy']);
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};

const updateTask = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const task = await Task.findOneAndUpdate(query, req.body, { new: true, runValidators: true })
      .populate('lead', 'name phone').populate('assignedTo', 'name avatar');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
};

const completeTask = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const task = await Task.findOneAndUpdate(
      query,
      { status: 'completed', completedAt: new Date(), completedBy: req.user._id, outcome: req.body.outcome },
      { new: true }
    ).populate('lead', 'name phone').populate('assignedTo', 'name');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
};

const deleteTask = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const query = { _id: req.params.id };
    if (!isSuperAdmin) {
      query.organization = req.user?.organization || '__UNAUTHORIZED__';
    }

    const task = await Task.findOneAndDelete(query);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
};

const getTaskStats = async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userOrg = req.user?.organization;
    const match = isSuperAdmin
      ? (req.query.organization ? { organization: req.query.organization } : {})
      : { organization: userOrg || '__NO_ORG__' };

    const [pending, overdue, todayTasks, completed] = await Promise.all([
      Task.countDocuments({ ...match, status: 'pending', assignedTo: req.user._id }),
      Task.countDocuments({ ...match, status: 'pending', dueDate: { $lt: today }, assignedTo: req.user._id }),
      Task.countDocuments({ ...match, dueDate: { $gte: today, $lt: tomorrow }, assignedTo: req.user._id }),
      Task.countDocuments({ ...match, status: 'completed', assignedTo: req.user._id }),
    ]);
    res.json({ success: true, data: { pending, overdue, todayTasks, completed } });
  } catch (err) { next(err); }
};

module.exports = { getTasks, getTask, createTask, updateTask, completeTask, deleteTask, getTaskStats };
