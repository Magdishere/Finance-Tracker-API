// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { verifyAccessToken } = require('../middleware/auth');

// Public
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh); // uses cookie
router.get('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected
router.get('/me', verifyAccessToken, authController.getMe);

module.exports = router;
