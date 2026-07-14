import axios from "axios";

export const API_ORIGIN = String(
  import.meta.env.VITE_API_URL || "http://localhost:8081"
).replace(/\/$/, "");

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && token !== "null" && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

//Response interceptor — unwrap backend response
api.interceptors.response.use(
  (response) => {
    return response.data; // return ApiResponse directly
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
