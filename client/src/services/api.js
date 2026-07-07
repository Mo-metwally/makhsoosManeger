import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', // Pointing to the Node.js server via env var
  withCredentials: true, // Very important for cookies (token, deviceId)
});

// Optionally add interceptors here to handle global errors (e.g., 401 Unauthorized -> redirect to login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If we get an unauthorized error from the server (e.g. token expired)
      // We can emit an event or dispatch an action to log the user out
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
