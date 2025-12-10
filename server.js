require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const transactionsRoutes = require('./routes/transactions'); // if you have transactions
const budgetsRoutes = require('./routes/budgets'); // if you have transactions
const usersRoutes = require('./routes/users');
const { connectDB } = require('./config/db');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Optional: CORS for frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true, // allow cookies
  })
);

// Connect to DB and then start server
connectDB().then(() => {
    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/transactions', transactionsRoutes); // protected routes
    app.use('/api/budgets', budgetsRoutes); // protected routes
    app.use('/api/users', usersRoutes);
    

    // Test route
    app.get('/', (req, res) => res.send('API is running'));

    // Error handler
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ success: false, message: 'Server error' });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
    console.error('Failed to connect to the database:', err);
    process.exit(1); // Exit process if DB connection fails
});
