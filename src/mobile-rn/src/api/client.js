import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE_URL = "http://10.0.2.2:4000/api";

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
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
    return apiRequest("/auth/login", { method: "POST", body: { email, password } });
  },
  getWorkshops(token, page = 1, pageSize = 10) {
    return apiRequest(`/workshops?page=${page}&pageSize=${pageSize}`, { token });
  },
  registerWorkshop(token, workshopId) {
    return apiRequest("/registrations", { method: "POST", token, body: { workshopId } });
  },
  checkoutPayment(token, registrationId, idempotencyKey, simulateResult = "success") {
    return apiRequest("/payments/checkout", {
      method: "POST",
      token,
      body: { registrationId, idempotencyKey, simulateResult }
    });
  },
  getMyRegistrations(token) {
    return apiRequest("/registrations/me", { token });
  },
  getMyNotifications(token) {
    return apiRequest("/notifications/me", { token });
  },
  getAdminAnalytics(token) {
    return apiRequest("/admin/analytics", { token });
  },
  getCsvLatest(token) {
    return apiRequest("/admin/csv-sync/latest", { token });
  },
  createWorkshop(token, payload) {
    return apiRequest("/admin/workshops", { method: "POST", token, body: payload });
  },
  cancelWorkshop(token, workshopId) {
    return apiRequest(`/admin/workshops/${workshopId}/cancel`, { method: "PATCH", token });
  },
  uploadDocument(token, payload) {
    return apiRequest("/admin/documents", { method: "POST", token, body: payload });
  },
  verifyScan(token, qrCode) {
    return apiRequest("/checkins/scan", { method: "POST", token, body: { qrCode } });
  },
  syncCheckins(token, items) {
    return apiRequest("/checkins/sync", { method: "POST", token, body: { items } });
  }
};

export const storageKeys = {
  authSession: "unihub.auth.session",
  checkerQueue: "unihub.checker.queue"
};

export async function saveJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadJson(key) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export async function removeKey(key) {
  await AsyncStorage.removeItem(key);
}
