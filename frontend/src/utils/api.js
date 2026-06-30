// Get API URL from environment variable or use relative path
export const getApiUrl = (path) => {
  const apiBaseUrl = import.meta.env.VITE_API_URL || '';
  return `${apiBaseUrl}${path}`;
};

export const apiFetch = async (path, options = {}) => {
  const url = getApiUrl(path);
  const response = await fetch(url, options);
  return response;
};
