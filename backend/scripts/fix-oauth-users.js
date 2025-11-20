/**
 * Migration Script: Fix OAuth User Auth Providers
 * 
 * This script fixes users who were created via OAuth but incorrectly
 * marked with ['clerk', 'google'] instead of just ['google'].
 * 
 * Run this once to clean up existing data:
 * node scripts/fix-oauth-users.js
 */

require('dotenv').config();
const { clerkClient } = require('@clerk/clerk-sdk-node');
const mongoose = require('mongoose');
const User = require('../models/User');

async function fixOAuthUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihire');
    console.log('Connected to MongoDB');

    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to check`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Get Clerk user data
        const clerkUser = await clerkClient.users.getUser(user.clerkUserId);
        
        const hasOAuth = clerkUser.externalAccounts && clerkUser.externalAccounts.length > 0;
        const hasPassword = clerkUser.passwordEnabled || false;
        
        // Determine correct auth providers
        let correctAuthProviders = [];
        if (hasOAuth) {
          correctAuthProviders.push('google');
        }
        if (hasPassword) {
          correctAuthProviders.push('clerk');
        }
        
        // Get current auth providers
        const currentProviders = Array.isArray(user.authProvider) 
          ? user.authProvider 
          : [user.authProvider];
        
        // Check if needs fixing
        const needsFixing = correctAuthProviders.length !== currentProviders.length ||
                           !correctAuthProviders.every(p => currentProviders.includes(p)) ||
                           !currentProviders.every(p => correctAuthProviders.includes(p));
        
        if (needsFixing && correctAuthProviders.length > 0) {
          console.log(`\nFixing user: ${user.email}`);
          console.log(`  Current: [${currentProviders.join(', ')}]`);
          console.log(`  Correct: [${correctAuthProviders.join(', ')}]`);
          console.log(`  hasOAuth: ${hasOAuth}, hasPassword: ${hasPassword}`);
          
          user.authProvider = correctAuthProviders;
          await user.save();
          
          fixedCount++;
          console.log(`  ✅ Fixed!`);
        } else {
          skippedCount++;
        }
        
      } catch (err) {
        console.error(`Error processing user ${user.email}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Migration Complete!');
    console.log('='.repeat(50));
    console.log(`Total users: ${users.length}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Skipped (already correct): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(50));

    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixOAuthUsers();
