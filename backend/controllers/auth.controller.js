const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const EmployerProfile = require('../models/EmployerProfile');
const CandidateProfile = require('../models/CandidateProfile');

// Keep our User.email aligned with the primary email stored in Clerk.
async function syncPrimaryEmailAddress(clerkUserId) {
  if (!clerkUserId) {
    return;
  }

  const dbUser = await User.findOne({ clerkUserId });
  if (!dbUser) {
    return; // Local profile not created yet, nothing to sync.
  }

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const primaryEmailId = clerkUser.primaryEmailAddressId;
  const primaryEmail = clerkUser.emailAddresses?.find(
    (address) => address.id === primaryEmailId
  )?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;

  if (!primaryEmail || primaryEmail === dbUser.email) {
    return;
  }

  dbUser.email = primaryEmail.toLowerCase();
  await dbUser.save();
}

// Complete signup - called after Clerk email verification or OAuth sign-up
async function completeSignup(req, res) {
  try {
    const { clerkUserId, role, email, fullName, phoneNumber, companyName, industry, companyWebsite, professionalHeadline } = req.body;

    // Validate required fields
    if (!clerkUserId || !role || !email || !fullName || !phoneNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['employer', 'candidate'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    let user = await User.findOne({ clerkUserId });
    
    if (user) {
      // User exists - check if we need to update anything
      let updated = false;
      
      // Update role if not set
      if (!user.role || user.role !== role) {
        user.role = role;
        updated = true;
      }
      
      // Update email if changed
      if (user.email !== email.toLowerCase()) {
        user.email = email.toLowerCase();
        updated = true;
      }

      // Update phone number if changed
      if (user.phoneNumber !== phoneNumber) {
        user.phoneNumber = phoneNumber;
        updated = true;
      }

      // Get Clerk user to check auth method
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const hasOAuth = clerkUser.externalAccounts && clerkUser.externalAccounts.length > 0;
      const hasPassword = clerkUser.passwordEnabled || false;
      
      // Update auth providers array based on what's actually enabled
      let newAuthProviders = [];
      if (hasOAuth) {
        newAuthProviders.push('google');
      }
      if (hasPassword) {
        newAuthProviders.push('clerk');
      }
      
      // Update if changed
      const currentProviders = Array.isArray(user.authProvider) ? user.authProvider : [user.authProvider];
      const providersChanged = newAuthProviders.length !== currentProviders.length || 
                               !newAuthProviders.every(p => currentProviders.includes(p));
      
      if (providersChanged && newAuthProviders.length > 0) {
        user.authProvider = newAuthProviders;
        updated = true;
      }

      // Ensure email is verified for OAuth users
      if (hasOAuth && !user.emailVerifiedAt) {
        user.emailVerifiedAt = new Date();
        updated = true;
      }

      if (updated) {
        await user.save();
      }

      // Update Clerk metadata with role
      await clerkClient.users.updateUser(clerkUserId, {
        publicMetadata: { role },
      });

      // Check if role-specific profile exists, create if not
      if (role === 'employer') {
        const existingProfile = await EmployerProfile.findOne({ user: user._id });
        if (!existingProfile) {
          const employerProfile = new EmployerProfile({
            user: user._id,
            companyName: companyName || '',
            industry: industry || '',
            companyWebsite: companyWebsite || '',
          });
          await employerProfile.save();
        }
      } else if (role === 'candidate') {
        const existingProfile = await CandidateProfile.findOne({ user: user._id });
        if (!existingProfile) {
          const candidateProfile = new CandidateProfile({
            user: user._id,
            professionalHeadline: professionalHeadline || '',
          });
          await candidateProfile.save();
        }
      }

      return res.status(200).json({ 
        message: 'Profile updated successfully', 
        user,
        role 
      });
    }

    // Get Clerk user to determine auth method
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const hasOAuth = clerkUser.externalAccounts && clerkUser.externalAccounts.length > 0;
    const hasPassword = clerkUser.passwordEnabled || false;
    
    // Determine auth providers based on what's actually enabled
    let authProviders = [];
    if (hasOAuth) {
      authProviders.push('google');
    }
    if (hasPassword) {
      authProviders.push('clerk');
    }
    // If somehow neither (shouldn't happen), default to clerk
    if (authProviders.length === 0) {
      authProviders = ['clerk'];
    }

    // Create new user in our database
    user = new User({
      clerkUserId,
      email: email.toLowerCase(),
      phoneNumber,
      fullName,
      role,
      status: 'active',
      emailVerifiedAt: new Date(), // OAuth users are pre-verified by Google
      authProvider: authProviders,
      profileCompletion: {
        basicInfo: true,
        percentage: 20, // Basic info complete
      },
    });

    await user.save();

    // Update Clerk user's public metadata with role
    await clerkClient.users.updateUser(clerkUserId, {
      publicMetadata: { role },
    });

    // Create role-specific profile
    if (role === 'employer') {
      const employerProfile = new EmployerProfile({
        user: user._id,
        companyName: companyName || '',
        industry: industry || '',
        companyWebsite: companyWebsite || '',
      });
      await employerProfile.save();
    } else if (role === 'candidate') {
      const candidateProfile = new CandidateProfile({
        user: user._id,
        professionalHeadline: professionalHeadline || '',
      });
      await candidateProfile.save();
    }

    res.status(201).json({ 
      message: 'Signup completed successfully', 
      user,
      role 
    });
  } catch (error) {
    console.error('Complete signup error:', error);
    res.status(500).json({ error: 'Failed to complete signup' });
  }
}

// Get user role - used during sign-in
async function getUserRole(req, res) {
  try {
    const sessionToken = req.cookies.__session || req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token' });
    }

    // Verify JWT token (networkless verification)
    const { verifyToken } = require('@clerk/clerk-sdk-node');
    const payload = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    // Get user information from Clerk
    const user = await clerkClient.users.getUser(payload.sub);
    
    // Get role from public metadata or database
    let role = user.publicMetadata?.role;
    
    if (!role) {
      // Fallback: check database
      const dbUser = await User.findOne({ clerkUserId: user.id });
      role = dbUser?.role || null;
      
      // Update Clerk metadata if found in database
      if (role) {
        await clerkClient.users.updateUser(user.id, {
          publicMetadata: { role },
        });
      }
    }

    res.json({ role, userId: user.id });
  } catch (error) {
    console.error('Get user role error:', error);
    res.status(500).json({ error: 'Failed to get user role' });
  }
}

// Webhook handler for Clerk events
async function handleWebhook(req, res) {
  try {
    const { type, data } = req.body;

    switch (type) {
      case 'user.created':
        // User created in Clerk
        console.log('User created:', data.id);
        break;

      case 'user.updated':
        // Sync user updates
        const user = await User.findOne({ clerkUserId: data.id });
        if (user) {
          user.email = data.email_addresses[0]?.email_address || user.email;
          user.fullName = `${data.first_name} ${data.last_name}`.trim() || user.fullName;
          await user.save();
        }
        break;

      case 'user.deleted':
        // Handle user deletion
        await User.updateOne(
          { clerkUserId: data.id },
          { status: 'deleted' }
        );
        break;

      case 'session.created':
        // Update last login
        await User.updateOne(
          { clerkUserId: data.user_id },
          { lastLoginAt: new Date() }
        );
        break;

      case 'email.created':
      case 'email.updated':
      case 'email.deleted':
        await syncPrimaryEmailAddress(data.user_id);
        break;

      default:
        console.log('Unhandled webhook type:', type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Check if email exists - for password reset flow
async function checkEmailExists(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check in our database first
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      // Check Clerk to see if password is set (this is authoritative)
      try {
        const clerkUser = await clerkClient.users.getUser(user.clerkUserId);
        const hasPassword = clerkUser.passwordEnabled || false;
        const hasOAuth = clerkUser.externalAccounts && clerkUser.externalAccounts.length > 0;
        const isOAuthOnly = hasOAuth && !hasPassword;
        
        // Get current auth providers from database
        const authProviders = Array.isArray(user.authProvider) ? user.authProvider : [user.authProvider];
        
        return res.json({ 
          exists: true,
          hasPassword: hasPassword,
          isOAuthOnly: isOAuthOnly,
          authProviders: authProviders
        });
      } catch (clerkError) {
        console.error('Clerk user check error:', clerkError);
        // Fallback to database check
        const authProviders = Array.isArray(user.authProvider) ? user.authProvider : [user.authProvider];
        const isOAuthOnly = authProviders.includes('google') && !authProviders.includes('clerk') && !authProviders.includes('local');
        
        return res.json({ 
          exists: true,
          hasPassword: !isOAuthOnly,
          isOAuthOnly: isOAuthOnly,
          authProviders: authProviders
        });
      }
    }

    // Also check in Clerk if not in database
    try {
      const clerkUsers = await clerkClient.users.getUserList({
        emailAddress: [email.toLowerCase()],
      });
      
      if (clerkUsers && clerkUsers.length > 0) {
        const clerkUser = clerkUsers[0];
        const hasPassword = clerkUser.passwordEnabled || false;
        const externalAccounts = clerkUser.externalAccounts || [];
        const isOAuthOnly = externalAccounts.length > 0 && !hasPassword;
        
        return res.json({ 
          exists: true,
          hasPassword: hasPassword,
          isOAuthOnly: isOAuthOnly,
          authProviders: isOAuthOnly ? ['google'] : ['clerk']
        });
      }
    } catch (clerkError) {
      console.error('Clerk email check error:', clerkError);
      // If Clerk check fails, rely on database check
    }

    res.json({ exists: false });
  } catch (error) {
    console.error('Check email exists error:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
}

module.exports = {
  completeSignup,
  getUserRole,
  handleWebhook,
  checkEmailExists,
};
