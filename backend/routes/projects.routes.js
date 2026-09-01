const express = require('express');
const router = express.Router();
const { getProjects, getProject, createProject, updateProject, deleteProject } = require('../controllers/projects.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.route('/')
  .get(getProjects)
  .post(authorize('admin', 'super_admin', 'director'), createProject);

router.route('/:id')
  .get(getProject)
  .put(authorize('admin', 'super_admin', 'director'), updateProject)
  .delete(authorize('admin', 'super_admin', 'director'), deleteProject);

module.exports = router;
