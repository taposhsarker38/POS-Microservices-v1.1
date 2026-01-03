import axios from "axios";
import { db } from "./offline/OfflineStore";
import { jwtDecode } from "jwt-decode";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8101/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Mutex for Refresh Token
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

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
          }
          if (decoded.role || decoded.is_superuser) {
            config.headers["X-User-Role"] = decoded.is_superuser
              ? "admin"
              : decoded.role || "";
          }
          if (decoded.user_id || decoded.sub) {
            config.headers["X-User-Id"] = decoded.user_id || decoded.sub;
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

    // Refresh token logic with Mutex/Lock to prevent Race Conditions
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(`${API_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        localStorage.setItem("access_token", data.access);
        api.defaults.headers.common["Authorization"] = "Bearer " + data.access;

        // Process queued requests
        processQueue(null, data.access);

        // Return original request
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        console.error("RefreshToken Failed:", refreshError);

        // Avoid infinite loops by only alerting once or redirecting safely
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/login")
        ) {
          // Optional: User feedback or redirect
          // window.location.href = "/login";
          console.warn("Session expired. Please login again.");
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
