const express = require('express');
const router = express.Router();
const { registerUser, authUser, getUserProfile, setupPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', authUser);
router.get('/profile', protect, getUserProfile);
router.post('/setup-password', setupPassword);

module.exports = router;
