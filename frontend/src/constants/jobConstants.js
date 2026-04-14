// Shared job-related constants used across CreateJobPage, EditJobPage, and filters

export const JOB_CATEGORIES = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'hr', label: 'HR' },
  { value: 'design', label: 'Design' },
  { value: 'product', label: 'Product' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'customer-support', label: 'Customer Support' },
  { value: 'other', label: 'Other' },
];

export const EXPERIENCE_LEVELS = [
  { value: 'no-experience', label: 'No Experience (Fresher)' },
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'expert', label: 'Expert' },
];

export const EXPERIENCE_LEVEL_DURATION_GUIDE = {
  'no-experience': '0 years',
  entry: '0-1 years',
  mid: '2-4 years',
  senior: '5-7 years',
  expert: '8+ years',
};

export const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'remote', label: 'Remote' },
];

export const WORK_ARRANGEMENTS = [
  { value: 'onsite', label: 'On-site' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
];

export const EDUCATION_OPTIONS = [
  { value: 'high-school', label: 'High School' },
  { value: 'associate', label: "Associate's Degree" },
  { value: 'bachelor', label: "Bachelor's Degree" },
  { value: 'master', label: "Master's Degree" },
  { value: 'phd', label: 'PhD' },
  { value: 'none', label: 'No specific requirement' },
];

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'PKR', label: 'PKR (₨)', symbol: '₨' },
  { value: 'INR', label: 'INR (₹)', symbol: '₹' },
  { value: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
  { value: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
  { value: 'AED', label: 'AED (د.إ)', symbol: 'د.إ' },
  { value: 'SAR', label: 'SAR (﷼)', symbol: '﷼' },
  { value: 'CNY', label: 'CNY (¥)', symbol: '¥' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
];

/**
 * Returns the symbol for a given currency code.
 * @param {string} currencyCode - e.g. 'USD', 'EUR', 'PKR'
 * @returns {string} The currency symbol, or the code itself if not found.
 */
export const getCurrencySymbol = (currencyCode) => {
  const currency = CURRENCY_OPTIONS.find((c) => c.value === currencyCode);
  return currency ? currency.symbol : currencyCode;
};
