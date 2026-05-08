import axios from 'axios';

const apiURL = import.meta.env.VITE_API_URL || '';
console.log("[API] Base URL configured as:", apiURL ? apiURL : "(relative /api)");

const api = axios.create({
  baseURL: apiURL ? `${apiURL.replace(/\/$/, '')}/api` : '/api',
  timeout: 300000, // 5 minute timeout to prevent indefinite hanging for long embedding processes
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Handle timeouts
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      alert("Request timed out. The AI engine may be overloaded. Please try again.");
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    // 2. Handle specific status codes
    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      window.location.href = '/';
    } else if (status === 429) {
      alert("Too many requests. Please wait a moment.");
    } else if (status === 500) {
      alert("An internal error occurred. Check audit logs.");
    } else if (status === 502) {
      alert("AI provider is temporarily unavailable.");
    }

    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
