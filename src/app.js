const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/config');
const path = require('path');

const app = express();

// Initialize Firebase (moved from database.js)
const { initializeFirebase } = require('./config/firebase');
initializeFirebase();

// Security middleware
app.use(helmet());
app.use(cors(config.corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Logging
if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
}

// Register /api/payments BEFORE body parsing (for Stripe webhook)
app.use('/api/payments', require('./routes/payments'));

// Body parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register all other API routes AFTER body parsing
// Authentication routes
app.use('/api/auth', require('./routes/auth'));

const adminBootstrapRoutes = require('./routes/admin-bootstrap');
app.use('/api/admin-bootstrap', adminBootstrapRoutes);


const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);


// SmartRent Property Management routes
app.use('/api/properties', require('./routes/properties'));
app.use('/api/leases', require('./routes/leases'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/landlords', require('./routes/landlords'));

// Legacy fitness routes (removed)
// Admin routes (removed)

// Serve uploaded files statically (avatars, property images, maintenance images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Something went wrong!',
        error: config.nodeEnv === 'development' ? err.stack : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        status: 'error',
        message: 'Route not found' 
    });
});

module.exports = app; 