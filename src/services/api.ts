import axios from 'axios';

const apiURL = import.meta.env.VITE_API_URL || '';
console.log("[API] Base URL configured as:", apiURL ? apiURL : "(relative /api)");

const api = axios.create({
  baseURL: apiURL ? `${apiURL.replace(/\/$/, '')}/api` : '/api',
  timeout: 30000, // 30 second timeout to prevent indefinite hanging
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      window.location.href = '/';
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
