const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

async function request(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export const api = {
  login(email, password) {
    return request("/auth/login", { method: "POST", body: { email, password } });
  },
  getWorkshops(token, { page = 1, pageSize = 10 } = {}) {
    return request(`/workshops?page=${page}&pageSize=${pageSize}`, { token });
  },
  registerWorkshop(token, workshopId) {
    return request("/registrations", { token, method: "POST", body: { workshopId } });
  },
  getMyRegistrations(token) {
    return request("/registrations/me", { token });
  },
  getMyNotifications(token) {
    return request("/notifications/me", { token });
  },
  checkoutPayment(token, registrationId, idempotencyKey, simulateResult) {
    return request("/payments/checkout", {
      token,
      method: "POST",
      body: { registrationId, idempotencyKey, ...(simulateResult ? { simulateResult } : {}) }
    });
  },
  createWorkshop(token, payload) {
    return request("/admin/workshops", { token, method: "POST", body: payload });
  },
  cancelWorkshop(token, workshopId) {
    return request(`/admin/workshops/${workshopId}/cancel`, { token, method: "PATCH" });
  },
  uploadDocument(token, payload) {
    return request("/admin/documents", { token, method: "POST", body: payload });
  },
  getAnalytics(token) {
    return request("/admin/analytics", { token });
  },
  getCsvLatest(token) {
    return request("/admin/csv-sync/latest", { token });
  },
  syncCheckins(token, items) {
    return request("/checkins/sync", { token, method: "POST", body: { items } });
  }
};
