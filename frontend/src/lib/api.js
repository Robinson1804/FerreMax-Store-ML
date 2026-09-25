// Cliente HTTP único del frontend.
// VITE_API_URL: en desarrollo http://localhost:8000 (archivo .env); en producción vacío (.env.production),
// de modo que las llamadas van al mismo dominio y Nginx las pasa al backend.
import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });

// El panel envía su token en cada llamada a /api/admin/*
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token && config.url?.startsWith("/api/admin")) {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  }
  return config;
});

// Token vencido o inválido: se cierra la sesión del panel y se vuelve al login
api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error.config?.url || "";
    if (error.response?.status === 401 && url.startsWith("/api/admin") && !url.endsWith("/login")) {
      localStorage.removeItem("admin_token");
      if (window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin/login") {
        window.location.assign("/admin/login");
      }
    }
    return Promise.reject(error);
  }
);

// Formato de precios en soles: S/ 48.00
export const soles = (n) => `S/ ${Number(n || 0).toFixed(2)}`;
