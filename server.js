require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path'); // <-- needed for SPA fallback
const authRoutes = require('./routes/auth');
const transactionsRoutes = require('./routes/transactions');
const budgetsRoutes = require('./routes/budgets');
const usersRoutes = require('./routes/users');
const { connectDB } = require('./config/db');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS setup
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://magdishere.github.io'
];

app.use(
  cors({
    origin: function(origin, callback) {
      if (!origin) return callback(null, true); // allow Postman, etc.
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `CORS policy: origin ${origin} not allowed`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // allow cookies
  })
);

// Connect to DB and start server
connectDB()
  .then(() => {
    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/transactions', transactionsRoutes);
    app.use('/api/budgets', budgetsRoutes);
    app.use('/api/users', usersRoutes);

    // Test route
    app.get('/', (req, res) => res.send('API is running'));

    // ---------------- SPA fallback ----------------
    // Serve React app for all other routes
    app.use((req, res, next) => {
      // Only serve index.html if not an API route
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
    });

    // Error handler
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ success: false, message: 'Server error' });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to connect to the database:', err);
    process.exit(1); // Exit process if DB connection fails
  });