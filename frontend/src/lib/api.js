// Cliente HTTP único del frontend. La URL del backend se toma de VITE_API_URL (archivo .env).
import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });

// Formato de precios en soles: S/ 48.00
export const soles = (n) => `S/ ${Number(n || 0).toFixed(2)}`;
