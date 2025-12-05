const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const contestRoutes = require('./routes/contests');
const syncRoutes = require('./routes/sync');
const problemRoutes = require('./routes/problems');
const profileRoutes = require('./routes/profile');
const botRoutes = require('./routes/bot');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// CORS Configuration - Only allow frontend URL
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:3000', // Development fallback
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow cookies
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
    res.json({ 
        message: 'LeetWars API is running...',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            contests: '/api/contests',
            sync: '/api/sync',
            problems: '/api/problems',
            profile: '/api/profile',
            bot: '/api/bot'
        }
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bot', botRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
