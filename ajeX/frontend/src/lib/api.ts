import axios from "axios";
import { useAuth } from "@/store/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
});

api.interceptors.request.use((config) => {
  const { token, currentOrgId } = useAuth.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (currentOrgId) config.headers["x-org-id"] = currentOrgId;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      useAuth.getState().logout();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);
