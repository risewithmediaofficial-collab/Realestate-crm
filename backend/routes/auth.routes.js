const express = require('express');
const router = express.Router();
const { login, register, getMe, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/login', login);
router.post('/register', register);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
