const envUrl = (import.meta.env.VITE_API_URL || '').trim();

function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location.hostname) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl;
      }
      return `${window.location.protocol}//${host}:5130`;
    }
  }
  return envUrl || 'http://localhost:5130';
}

export const API_BASE_URL = getApiBaseUrl();