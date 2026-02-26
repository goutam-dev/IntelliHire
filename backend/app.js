require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');

// Import configuration and utilities
const config = require('./config');
const { connectDatabase } = require('./config/database');
const { errorHandler } = require('./utils/errorHandler');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const employerRoutes = require('./routes/employer.routes');
const candidateRoutes = require('./routes/candidate.routes');
const jobRoutes = require('./routes/jobRoutes');
const resumeRankingRoutes = require('./routes/resumeRanking.routes');

const app = express();

// ======================
// Database Connection
// ======================
connectDatabase();

// ======================
// Middleware
// ======================

// Security headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: config.isProduction() ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      }
    } : false,
    hsts: config.isProduction() ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    } : false,
  })
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = config.corsOrigin.split(',').map(o => o.trim());
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser with secure settings
app.use(cookieParser());

// ======================
// Health Check
// ======================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ======================
// API Routes
// ======================

// Global request logger
app.use((req, res, next) => {
  console.log(`\n📨 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/job-applications', require('./routes/jobApplication.routes'));
app.use('/api/interview', require('./routes/interview.routes'));
app.use('/api/resume-ranking', resumeRankingRoutes); // AI-powered Resume Ranking Module

// Serve uploaded files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ======================
// 404 Handler
// ======================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ======================
// Error Handling
// ======================
app.use(errorHandler);

// ======================
// Start Server
// ======================
const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${config.nodeEnv}`);
  logger.info(`🌐 CORS origin: ${config.corsOrigin}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
