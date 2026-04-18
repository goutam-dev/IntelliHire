/**
 * Application Lifecycle Scenario Matrix Test
 *
 * Run:
 *   node test-application-lifecycle.js
 *
 * Purpose:
 * - Validate allowed/blocked application status transitions
 * - Validate job close does not mutate application statuses
 * - Validate job delete effects on application statuses
 * - Validate close-then-delete override behavior
 * - Validate candidate browse/apply visibility policy
 */

const assert = require('assert');

const ALLOWED_APPLICATION_STATUSES = [
  'Applied',
  'Shortlisted',
  'Interview Scheduled',
  'Interviewed',
  'Finalist',
  'Rejected',
  'Hired',
  'Withdrawn',
  'Job Deleted',
];

const APPLICATION_TRANSITIONS = {
  Applied: ['Shortlisted', 'Rejected'],
  Shortlisted: ['Interview Scheduled', 'Rejected'],
  'Interview Scheduled': ['Interviewed', 'Rejected'],
  Interviewed: ['Finalist', 'Hired', 'Rejected'],
  Finalist: ['Hired', 'Rejected'],
  Rejected: [],
  Hired: [],
  Withdrawn: [],
  'Job Deleted': [],
};

const DELETE_IMMUTABLE_APPLICATION_STATUSES = ['Rejected', 'Hired', 'Withdrawn', 'Job Deleted'];

function assertValidApplicationStatus(status) {
  if (!ALLOWED_APPLICATION_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
}

function canTransition(fromStatus, toStatus) {
  assertValidApplicationStatus(fromStatus);
  assertValidApplicationStatus(toStatus);

  if (fromStatus === toStatus) return true;
  return (APPLICATION_TRANSITIONS[fromStatus] || []).includes(toStatus);
}

function applyJobCloseToApplicationStatus(status) {
  return status;
}

function applyJobDeleteToApplicationStatus(status) {
  if (DELETE_IMMUTABLE_APPLICATION_STATUSES.includes(status)) {
    return status;
  }
  return 'Job Deleted';
}

function shouldShowJobInCandidateBrowse(job, includeClosed = true) {
  if (!job || job.isDeleted) return false;
  if (includeClosed) return ['active', 'closed'].includes(job.status);
  return job.status === 'active';
}

function canCandidateApply(job) {
  return Boolean(job && !job.isDeleted && job.status === 'active');
}

function runTransitionMatrixTests() {
  const validTransitions = [
    ['Applied', 'Shortlisted'],
    ['Applied', 'Rejected'],
    ['Shortlisted', 'Interview Scheduled'],
    ['Shortlisted', 'Rejected'],
    ['Interview Scheduled', 'Interviewed'],
    ['Interview Scheduled', 'Rejected'],
    ['Interviewed', 'Hired'],
    ['Interviewed', 'Rejected'],
  ];

  const invalidTransitions = [
    ['Applied', 'Hired'],
    ['Applied', 'Interviewed'],
    ['Shortlisted', 'Hired'],
    ['Rejected', 'Interview Scheduled'],
    ['Hired', 'Rejected'],
    ['Withdrawn', 'Interview Scheduled'],
    ['Job Deleted', 'Applied'],
  ];

  validTransitions.forEach(([from, to]) => {
    assert.strictEqual(
      canTransition(from, to),
      true,
      `Expected allowed transition: ${from} -> ${to}`
    );
  });

  invalidTransitions.forEach(([from, to]) => {
    assert.strictEqual(
      canTransition(from, to),
      false,
      `Expected blocked transition: ${from} -> ${to}`
    );
  });
}

function runCloseBehaviorTests() {
  assert.strictEqual(applyJobCloseToApplicationStatus('Applied'), 'Applied');
  assert.strictEqual(applyJobCloseToApplicationStatus('Shortlisted'), 'Shortlisted');

  // Scheduled/interviewed/final statuses remain unchanged on close.
  assert.strictEqual(applyJobCloseToApplicationStatus('Interview Scheduled'), 'Interview Scheduled');
  assert.strictEqual(applyJobCloseToApplicationStatus('Interviewed'), 'Interviewed');
  assert.strictEqual(applyJobCloseToApplicationStatus('Hired'), 'Hired');
}

function runDeleteBehaviorTests() {
  // Non-immutable statuses become Job Deleted.
  assert.strictEqual(applyJobDeleteToApplicationStatus('Applied'), 'Job Deleted');
  assert.strictEqual(applyJobDeleteToApplicationStatus('Interview Scheduled'), 'Job Deleted');
  assert.strictEqual(applyJobDeleteToApplicationStatus('Interviewed'), 'Job Deleted');

  // Immutable statuses stay as-is.
  assert.strictEqual(applyJobDeleteToApplicationStatus('Rejected'), 'Rejected');
  assert.strictEqual(applyJobDeleteToApplicationStatus('Hired'), 'Hired');
  assert.strictEqual(applyJobDeleteToApplicationStatus('Withdrawn'), 'Withdrawn');
  assert.strictEqual(applyJobDeleteToApplicationStatus('Job Deleted'), 'Job Deleted');
}

function runCloseThenDeleteOverrideTest() {
  const closed = applyJobCloseToApplicationStatus('Applied');
  assert.strictEqual(closed, 'Applied');

  const deletedAfterClose = applyJobDeleteToApplicationStatus(closed);
  assert.strictEqual(
    deletedAfterClose,
    'Job Deleted',
    'Close then delete must result in Job Deleted'
  );
}

function runBrowsePolicyTests() {
  const activeJob = { status: 'active', isDeleted: false };
  const closedJob = { status: 'closed', isDeleted: false };
  const archivedJob = { status: 'archived', isDeleted: false };
  const deletedJob = { status: 'archived', isDeleted: true };

  assert.strictEqual(shouldShowJobInCandidateBrowse(activeJob, true), true);
  assert.strictEqual(shouldShowJobInCandidateBrowse(closedJob, true), true);
  assert.strictEqual(shouldShowJobInCandidateBrowse(archivedJob, true), false);
  assert.strictEqual(shouldShowJobInCandidateBrowse(deletedJob, true), false);

  assert.strictEqual(canCandidateApply(activeJob), true);
  assert.strictEqual(canCandidateApply(closedJob), false);
  assert.strictEqual(canCandidateApply(deletedJob), false);
}

function runAll() {
  const sections = [
    ['Transition matrix', runTransitionMatrixTests],
    ['Close behavior', runCloseBehaviorTests],
    ['Delete behavior', runDeleteBehaviorTests],
    ['Close then delete override', runCloseThenDeleteOverrideTest],
    ['Browse/apply policy', runBrowsePolicyTests],
  ];

  console.log('\nApplication Lifecycle Matrix Tests\n');
  let passed = 0;

  sections.forEach(([name, fn]) => {
    try {
      fn();
      passed += 1;
      console.log(`PASS: ${name}`);
    } catch (err) {
      console.error(`FAIL: ${name}`);
      console.error(`  ${err.message}`);
      process.exitCode = 1;
    }
  });

  console.log(`\nSummary: ${passed}/${sections.length} sections passed.`);

  if (passed === sections.length) {
    console.log('Lifecycle rules are consistent with expected real-world behavior.');
  }
}

runAll();
