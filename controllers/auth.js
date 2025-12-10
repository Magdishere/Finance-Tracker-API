require('dotenv').config();
const { getDB } = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');
const Resend = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// ---------------- CONFIG ----------------
const BCRYPT_SALT = parseInt(process.env.BCRYPT_SALT, 10) || 10;
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRE || '15m';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRE || '7d';
const REFRESH_COOKIE_NAME = 'refreshToken';

// ---------------- EMAIL (NO VERIFY ON STARTUP) ---------------
const buildTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: process.env.EMAIL_SECURE === "true" || true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 20000,
  });


// ---------------- HELPERS ----------------

// JWT tokens
const createAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES });

const createRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

// Refresh token cookie options
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: (() => {
    const v = process.env.REFRESH_TOKEN_EXPIRE || '7d';
    const m = v.match(/^(\d+)([smhd])$/);
    if (m) {
      const n = parseInt(m[1], 10);
      const unit = m[2];
      if (unit === 's') return n * 1000;
      if (unit === 'm') return n * 60 * 1000;
      if (unit === 'h') return n * 60 * 60 * 1000;
      if (unit === 'd') return n * 24 * 60 * 60 * 1000;
    }
    return 7 * 24 * 60 * 60 * 1000;
  })(),
});

// Send tokens
const sendTokenResponse = (res, userId, statusCode = 200) => {
  const accessToken = createAccessToken(userId);
  const refreshToken = createRefreshToken(userId);

  res
    .status(statusCode)
    .cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions())
    .json({ success: true, accessToken });
};


// ---------------- CONTROLLERS ----------------

// REGISTER
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const db = getDB();
    const existing = await db.collection('users').findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'User already exists' });

    const hash = await bcrypt.hash(password, BCRYPT_SALT);
    const newUser = { email, password: hash, createdAt: new Date() };
    const result = await db.collection('users').insertOne(newUser);

    sendTokenResponse(res, result.insertedId.toString(), 201);

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const db = getDB();
    const user = await db.collection('users').findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    sendTokenResponse(res, user._id.toString());

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// LOGOUT
exports.logout = async (req, res) => {
  res
    .cookie(REFRESH_COOKIE_NAME, 'none', { httpOnly: true, expires: new Date(Date.now() + 5 * 1000) })
    .status(200)
    .json({ success: true, message: 'Logged out' });
};

// GET CURRENT USER
exports.getMe = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const db = getDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { password: 0 } }
    );

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        name: user.name || '',
        createdAt: user.createdAt
      }
    });

  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// REFRESH TOKEN
exports.refresh = async (req, res) => {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });

    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
    catch { return res.status(401).json({ success: false, message: 'Invalid refresh token' }); }

    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.id) });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token user' });

    const accessToken = createAccessToken(decoded.id);
    res.status(200).json({ success: true, accessToken });

  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const db = getDB();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      console.log(`Forgot Password: No account with email ${email}`);
      return res.status(200).json({ success: true, message: "If an account exists, a password reset email has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { resetToken, resetExpires } }
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send email with Resend
    await resend.emails.send({
      from: 'Finance Tracker <no-reply@yourdomain.com>',
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <p>You requested a password reset.</p>
        <p>Click the link below to reset your password (expires in 10 minutes):</p>
        <a href="${resetUrl}">${resetUrl}</a>
      `,
    });

    console.log("✅ Password reset email sent via Resend");

    return res.status(200).json({ success: true, message: "If an account exists, a password reset email has been sent." });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: "Token and password required" });

    const db = getDB();
    const user = await db.collection('users').findOne({
      resetToken: token,
      resetExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired reset token" });

    const newHash = await bcrypt.hash(password, BCRYPT_SALT);

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { password: newHash }, $unset: { resetToken: "", resetExpires: "" } }
    );

    return res.status(200).json({ success: true, message: "Password successfully updated" });

  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
