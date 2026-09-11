const express = require('express');
const router = express.Router();
const { registerUser, authUser, getUserProfile, setupPassword, getUsers, portalLogin } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/portal-login', portalLogin);
router.get('/profile', protect, getUserProfile);
router.get('/users', protect, getUsers);
router.post('/setup-password', setupPassword);

module.exports = router;
