import axios from "axios";

// Professional setup: base URL comes from env, with local fallback.
//   - local dev:  create frontend/.env.development with VITE_API_URL=http://127.0.0.1:8000/api
//   - prod build: set VITE_API_URL at build time (Vercel Project Settings env var)
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT + Guest ID on every request (skip for auth endpoints to avoid CORS preflight)
API.interceptors.request.use((config) => {
  const isAuth = config.url && (config.url.includes("/users/login") || config.url.includes("/users/register") || config.url.includes("/users/token"));
  const token = localStorage.getItem("deallens_access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Guest ID only for wishlist / products, not for auth
  if (!isAuth) {
    let guestId = localStorage.getItem("deallens_guest_id");
    if (!guestId) {
      guestId = "guest_" + crypto.randomUUID();
      localStorage.setItem("deallens_guest_id", guestId);
    }
    config.headers["X-Guest-ID"] = guestId;
    if (config.method === "get" && config.url && config.url.includes("wishlist")) {
      config.params = { ...(config.params || {}), guest_id: guestId };
    }
    if (config.method === "post" && config.url && config.url.includes("wishlist")) {
      if (config.data && typeof config.data === "object" && !config.data.guest_id) {
        config.data.guest_id = guestId;
      }
    }
  }
  return config;
});

// Handle 401: try refresh
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response && error.response.status === 401 && !original._retry) {
      const refresh = localStorage.getItem("deallens_refresh");
      if (refresh) {
        original._retry = true;
        try {
          const res = await axios.post(`${API_BASE_URL}/users/token/refresh/`, { refresh });
          localStorage.setItem("deallens_access", res.data.access);
          original.headers.Authorization = `Bearer ${res.data.access}`;
          return API(original);
        } catch (_e) {
          localStorage.removeItem("deallens_access");
          localStorage.removeItem("deallens_refresh");
          localStorage.removeItem("deallens_user");
          window.dispatchEvent(new Event("deallens:logout"));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;
