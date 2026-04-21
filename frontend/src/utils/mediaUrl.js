const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const resolveUploadUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;

  const serverRoot = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${serverRoot}${url}`;
};
