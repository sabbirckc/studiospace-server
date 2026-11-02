import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import studiosRoutes from './routes/studios.js';
import bookingsRoutes from './routes/bookings.js';
import wishlistRoutes from './routes/wishlist.js';
const app = express();
const PORT = process.env.PORT || 8000;

// Allowed origins configured from .env
const allowedOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        return callback(null, true); // Dev-friendly fallback
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Database connection middleware for serverless/local environments
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (dbErr) {
        console.error('Database connection error:', dbErr);
        res.status(500).json({ success: false, error: 'Database connection failed.' });
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'StudioSpace Production Engine API is running smoothly.',
        timestamp: new Date().toISOString()
    });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/studios', studiosRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/wishlist', wishlistRoutes);

// 404 Handler for API
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint route not found.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Start Server for standalone/local development
if (!process.env.VERCEL) {
    async function startServer() {
        try {
            await connectDB();
            app.listen(PORT, () => {
                console.log(`StudioSpace Server is running on port ${PORT}`);
                console.log(`API URL: http://localhost:${PORT}`);
            });
        } catch (err) {
            console.error('Failed to initialize MongoDB connection:', err);
            process.exit(1);
        }
    }

    startServer();
}

export default app;
