require('dotenv').config();

/**
 * Centralized configuration management
 * All environment variables and app configuration in one place
 */
const config = {
  // Server
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihire',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Clerk
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  
  // Default IDs (for development/testing)
  defaultEmployerId: process.env.DEFAULT_EMPLOYER_ID || '000000000000000000000000',
  
  // File Upload
  uploadsDir: 'uploads',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  
  // Helper functions
  isDevelopment: () => config.nodeEnv === 'development',
  isProduction: () => config.nodeEnv === 'production',
};

// Validate required environment variables
const requiredEnvVars = ['CLERK_SECRET_KEY'];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Warning: ${envVar} is not set in environment variables`);
  }
});

module.exports = config;
