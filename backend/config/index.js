require('dotenv').config();

/**
 * Centralized configuration management
 * All environment variables and app configuration in one place
 */
const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihire',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Clerk
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET,
  
  // File Upload
  uploadsDir: 'uploads',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  
  // Helper functions
  isDevelopment: () => config.nodeEnv === 'development',
  isProduction: () => config.nodeEnv === 'production',
};

// Validate required environment variables
const requiredEnvVars = {
  production: ['CLERK_SECRET_KEY', 'MONGODB_URI', 'CLERK_WEBHOOK_SECRET'],
  development: ['CLERK_SECRET_KEY']
};

const envVarsToCheck = config.isProduction() 
  ? requiredEnvVars.production 
  : requiredEnvVars.development;

const missingVars = [];

envVarsToCheck.forEach((envVar) => {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
  }
});

if (missingVars.length > 0) {
  const errorMessage = `❌ Missing required environment variables: ${missingVars.join(', ')}`;
  
  if (config.isProduction()) {
    // In production, fail fast
    console.error(errorMessage);
    console.error('Application cannot start without required environment variables in production.');
    process.exit(1);
  } else {
    // In development, just warn
    console.warn(`⚠️  Warning: ${errorMessage}`);
    console.warn('Some features may not work properly without these variables.');
  }
}

// Validate MongoDB URI format
if (config.mongoUri && !config.mongoUri.startsWith('mongodb')) {
  console.error('❌ Invalid MONGODB_URI format. Must start with "mongodb://" or "mongodb+srv://"');
  process.exit(1);
}

// Validate port is a number
if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
  console.error('❌ Invalid PORT. Must be a number between 1 and 65535');
  process.exit(1);
}

module.exports = config;
