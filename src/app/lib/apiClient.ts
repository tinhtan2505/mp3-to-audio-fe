import { createApiClient } from "./api-service";

export const api = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  getAccessToken: () => localStorage.getItem("token"),
  refreshAccessToken: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return null;
    const res = await fetch("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem("token", data.token);
    return data.token;
  },
  onUnauthorized: () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  },
});
