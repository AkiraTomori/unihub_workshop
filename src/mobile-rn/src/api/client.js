import AsyncStorage from "@react-native-async-storage/async-storage";

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
export const API_BASE_URL = envBaseUrl || "http://10.0.2.2:3000/api";

function mapUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name || "",
    studentCode: user.student_code || null
  };
}

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    const networkError = new Error(error.message || "Network request failed");
    networkError.isNetworkError = true;
    throw networkError;
  }

  const data = await response.json();
  if (!response.ok) {
    const requestError = new Error(data.message || "Request failed");
    requestError.status = response.status;
    requestError.response = data;
    throw requestError;
  }
  return data;
}

export const api = {
  async login(email, password) {
    const response = await apiRequest("/auth/login", { method: "POST", body: { email, password } });
    return {
      token: response?.data?.accessToken || "",
      user: mapUser(response?.data?.user)
    };
  },
  async register({ email, password, fullName, studentCode }) {
    const response = await apiRequest("/auth/register", {
      method: "POST",
      body: {
        email,
        password,
        full_name: fullName,
        student_code: studentCode || null
      }
    });
    return {
      user: mapUser(response?.data?.user)
    };
  },
  async getProfile(token) {
    const response = await apiRequest("/auth/me", { token });
    return mapUser(response?.data);
  },
  async logout(token) {
    await apiRequest("/auth/logout", { method: "POST", token });
  },
  getWorkshops(token, page = 1, pageSize = 10) {
    return apiRequest(`/workshops?page=${page}&pageSize=${pageSize}`, { token });
  },
  getWorkshopDetail(token, workshopId) {
    return apiRequest(`/workshops/${workshopId}`, { token });
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
