/**
 * One-time migration for legacy records created by old coupling logic.
 *
 * Behavior:
 * - Job Closed + deleted/missing job => Job Deleted
 * - Job Closed + active/non-deleted job => Applied
 * - Under Review => Applied
 *
 * Usage:
 * - Dry run (default): node scripts/migrate-legacy-job-closed-status.js
 * - Apply changes:      node scripts/migrate-legacy-job-closed-status.js --write
 */

require('dotenv').config();
const mongoose = require('mongoose');
const JobApplication = require('../models/JobApplication');
require('../models/Job');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihire';

const run = async () => {
  const writeMode = process.argv.includes('--write');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const legacyApps = await JobApplication.find({
      status: { $in: ['Job Closed', 'Under Review'] },
    })
      .populate({ path: 'jobId', select: 'isDeleted status' })
      .select('_id applicationId status jobId lastUpdated')
      .lean();

    if (legacyApps.length === 0) {
      console.log('No legacy Job Closed/Under Review records found.');
      return;
    }

    const updates = [];
    let toApplied = 0;
    let toJobDeleted = 0;

    for (const app of legacyApps) {
      let nextStatus = 'Applied';
      if (app.status === 'Job Closed') {
        const isDeletedOrMissingJob = !app.jobId || Boolean(app.jobId.isDeleted);
        nextStatus = isDeletedOrMissingJob ? 'Job Deleted' : 'Applied';
      }

      if (nextStatus === 'Applied') toApplied += 1;
      if (nextStatus === 'Job Deleted') toJobDeleted += 1;

      updates.push({
        updateOne: {
          filter: { _id: app._id },
          update: {
            $set: {
              status: nextStatus,
              lastUpdated: new Date(),
            },
          },
        },
      });
    }

    console.log('--- Legacy Status Migration Summary ---');
    console.log(`Found: ${legacyApps.length}`);
    console.log(`Will set to Applied: ${toApplied}`);
    console.log(`Will set to Job Deleted: ${toJobDeleted}`);
    console.log(`Mode: ${writeMode ? 'WRITE' : 'DRY-RUN'}`);

    if (!writeMode) {
      console.log('Dry-run complete. Re-run with --write to apply updates.');
      return;
    }

    const result = await JobApplication.bulkWrite(updates, { ordered: false });
    console.log('Write complete.');
    console.log(`Matched: ${result.matchedCount || 0}`);
    console.log(`Modified: ${result.modifiedCount || 0}`);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

run();
