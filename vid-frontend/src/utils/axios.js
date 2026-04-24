import axios from "axios";
import store from "../redux/store";
import { clearUser } from "../redux/userSlice";

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : "http://localhost:3000/api/v1";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
  withCredentials: true,
});

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

axiosInstance.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase();
    if (method && !["GET", "HEAD", "OPTIONS"].includes(method)) {
      const csrfToken = getCookie("csrf_token");
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// FIX M1: Single in-flight refresh promise so simultaneous 401s don't fan out
// into N parallel /refresh calls (which would cause refresh-token reuse alarms).
let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_BASE_URL}/users/refresh`,
        {},
        {
          withCredentials: true,
          headers: {
            "X-CSRF-Token": getCookie("csrf_token") || "",
          },
        }
      )
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;

    // Don't try to refresh on the refresh endpoint itself, on auth endpoints,
    // or if we've already retried this request once.
    const url = original.url || "";
    const isAuthEndpoint =
      url.includes("/users/refresh") || url.includes("/users/login") || url.includes("/users/register");

    const redirectToLogin = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/signup" && currentPath !== "/") {
        const params = new URLSearchParams({ from: currentPath });
        window.location.href = `/login?${params.toString()}`;
      }
    };

    if (status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        await refreshAccessToken();
        return axiosInstance(original);
      } catch {
        store.dispatch(clearUser());
        redirectToLogin();
        return Promise.reject(error);
      }
    }

    if (status === 401) {
      store.dispatch(clearUser());
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
