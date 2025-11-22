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

const app = express();

// ======================
// Database Connection
// ======================
connectDatabase();

// ======================
// Middleware
// ======================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.use('/api/auth', authRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/job-applications', require('./routes/jobApplication.routes'));

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

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${config.nodeEnv}`);
  logger.info(`🌐 CORS origin: ${config.corsOrigin}`);
});

module.exports = app;
