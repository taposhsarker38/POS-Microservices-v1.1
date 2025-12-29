import axios from "axios";
import { db } from "./offline/OfflineStore";
import { jwtDecode } from "jwt-decode";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8101/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
api.interceptors.request.use(
  async (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;

        try {
          // Decode token to extract company_uuid for multi-tenant headers
          const decoded: any = jwtDecode(token);
          if (decoded.company_uuid) {
            config.headers["X-Company-Id"] = decoded.company_uuid;
            console.log(
              "Header Check - JWT company_uuid:",
              decoded.company_uuid
            );
          } else {
            console.warn("No company_uuid found in token payload");
          }
        } catch (e) {
          console.error("Failed to decode token for company header", e);
        }
      }

      // Offline Resilience: If offline and NOT a GET request, queue it
      if (
        !navigator.onLine &&
        config.method &&
        config.method.toUpperCase() !== "GET"
      ) {
        console.warn("Offline detected. Queuing request:", config.url);
        await db.syncQueue.add({
          method: config.method.toUpperCase() as any,
          url: config.url || "",
          data: config.data,
          timestamp: Date.now(),
          status: "pending",
        });

        // Return a mock success response to keep the UI flowing
        return Promise.reject({
          isOffline: true,
          message: "Request queued for sync",
          config,
        });
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  async (response) => {
    // Cache GET requests for offline browsing
    if (response.config.method?.toUpperCase() === "GET" && response.data) {
      await db.cache.put({
        key: response.config.url || "",
        data: response.data,
        expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle offline "errors"
    if (error.isOffline) {
      return { data: { success: true, offline: true }, status: 202 };
    }

    // Try to serve from cache if network fails on GET
    if (
      error.code === "ERR_NETWORK" &&
      originalRequest.method?.toUpperCase() === "GET"
    ) {
      const cached = await db.cache.get(originalRequest.url || "");
      if (cached) {
        console.info("Serving from local cache:", originalRequest.url);
        return { data: cached.data, status: 200, fromCache: true };
      }
    }

    // Refresh token logic...
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(`${API_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        localStorage.setItem("access_token", data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (typeof window !== "undefined") window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
