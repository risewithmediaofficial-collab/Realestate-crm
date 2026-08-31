const express = require('express');
const router = express.Router();
const { getTasks, getTask, createTask, updateTask, completeTask, deleteTask, getTaskStats } = require('../controllers/activities.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/stats', getTaskStats);
router.route('/').get(getTasks).post(createTask);
router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);
router.put('/:id/complete', completeTask);

module.exports = router;
