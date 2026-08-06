export const API_BASE_URL = import.meta.env.VITE_API_URL 
  || (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        ? `${window.location.protocol}//${window.location.hostname}:5130`
        : 'http://localhost:5130');