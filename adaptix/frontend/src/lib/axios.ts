import axios from "axios";

// Create a global Axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8101/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    // Check if we are in the browser
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Global Errors (401, etc.)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (Token Expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Prevent infinite loops
      originalRequest._retry = true;

      if (typeof window !== "undefined") {
        // Option 1: Redirect to Login immediately
        // window.location.href = '/auth/login';

        // Option 2 (Future): Implement Refresh Token Logic here
        // const refreshSuccess = await refreshToken();
        // if (refreshSuccess) return api(originalRequest);

        console.warn("Unauthorized: Redirecting to login...");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/auth/login";
      }
    }

    // Pass other errors down to the component
    return Promise.reject(error);
  }
);

export default api;
