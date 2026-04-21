export const isApplicationDeadlinePassed = (applicationDeadline) => {
  if (!applicationDeadline) return false;

  const deadlineDate = new Date(applicationDeadline);
  if (Number.isNaN(deadlineDate.getTime())) return false;

  return Date.now() > deadlineDate.getTime();
};

export const canApplyToJob = (job) => {
  if (!job) return false;
  if (job.isDeleted) return false;
  if (job.status !== 'active') return false;
  if (isApplicationDeadlinePassed(job.applicationDeadline)) return false;
  return true;
};
