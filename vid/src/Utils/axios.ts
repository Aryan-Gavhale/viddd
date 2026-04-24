// vidlacing-frontend/src/utils/axios.js
import axios, { type InternalAxiosRequestConfig } from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:3000/api/v1/", // Adjust to your backend URL
  headers: { "Content-Type": "application/json" },
});

function getTokenFromLocalStorage(): string | null {
  if (typeof globalThis === "undefined") return null;
  const ls = (globalThis as unknown as { localStorage?: { getItem(k: string): string | null } })
    .localStorage;
  return ls?.getItem("token") ?? null;
}

// Add token to requests if logged in
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getTokenFromLocalStorage();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
