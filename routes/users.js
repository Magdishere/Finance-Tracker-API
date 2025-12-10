const express = require('express');
const { getProfile, updateProfile } = require('../controllers/users');
const { verifyAccessToken } = require('../middleware/auth');

const router = express.Router();

// Get current user's profile
router.get('/profile', verifyAccessToken, getProfile);

// Update current user's profile
router.put('/profile', verifyAccessToken, updateProfile);

module.exports = router;
