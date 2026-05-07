import { initialWorkshops } from "../data/workshops";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

function getFallbackToken() {
  try {
    return localStorage.getItem("unihub.auth.token") || "";
  } catch {
    return "";
  }
}

async function request(path, { token, method = "GET", body } = {}) {
  const authToken = token || getFallbackToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed");
    error.status = response.status;
    throw error;
  }

  return payload;
}

function toFrontendUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    studentCode: user.student_code || null,
    fullName: user.full_name || ""
  };
}

export const api = {
  async login(email, password) {
    const response = await request("/auth/login", { method: "POST", body: { email, password } });
    return {
      token: response?.data?.accessToken || "",
      user: toFrontendUser(response?.data?.user)
    };
  },
  async register({ email, password, fullName, studentCode }) {
    const response = await request("/auth/register", {
      method: "POST",
      body: {
        email,
        password,
        full_name: fullName,
        student_code: studentCode || null
      }
    });
    return {
      user: toFrontendUser(response?.data?.user)
    };
  },
  async refreshToken() {
    const response = await request("/auth/refresh", { method: "POST" });
    return response?.data?.accessToken || "";
  },
  async getProfile(token) {
    const response = await request("/auth/me", { token });
    return toFrontendUser(response?.data);
  },
  async logout(token) {
    await request("/auth/logout", { token, method: "POST" });
  },
  async getWorkshops(token, { page = 1, pageSize = 10 } = {}) {
    try {
      return await request(`/workshops?page=${page}&pageSize=${pageSize}`, { token });
    } catch (error) {
      if (error.status === 404) {
        return initialWorkshops;
      }
      throw error;
    }
  },
  async getWorkshopDetail(token, workshopId) {
    const response = await request(`/workshops/${workshopId}`, { token });
    return response?.data || null;
  },
  async getAdminWorkshops(token, { page = 1, pageSize = 10 } = {}) {
    return request(`/admin/workshops?page=${page}&pageSize=${pageSize}`, { token });
  },
  async getAdminWorkshopById(token, workshopId) {
    const response = await request(`/admin/workshops/${workshopId}`, { token });
    return response?.data || null;
  },
  async getDeletedWorkshops(token) {
    const response = await request('/admin/workshops/deleted', { token });
    return Array.isArray(response?.data) ? response.data : [];
  },
  restoreWorkshop(token, workshopId) {
    return request(`/admin/workshops/${workshopId}/restore`, { token, method: 'PATCH' });
  },
  async getRooms(token) {
    const response = await request('/admin/rooms', { token });
    return Array.isArray(response?.data) ? response.data : [];
  },
  registerWorkshop(token, workshopId) {
    return request("/registrations", { token, method: "POST", body: { workshopId } });
  },
  async getMyRegistrations(token) {
    try {
      return await request("/registrations/me", { token });
    } catch (error) {
      if (error.status === 404) return [];
      throw error;
    }
  },
  async getMyNotifications(token) {
    try {
      return await request("/notifications/me", { token });
    } catch (error) {
      if (error.status === 404) return [];
      throw error;
    }
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
  updateWorkshop(token, workshopId, payload) {
    return request(`/admin/workshops/${workshopId}`, { token, method: "PUT", body: payload });
  },
  deleteWorkshop(token, workshopId) {
    return request(`/admin/workshops/${workshopId}`, { token, method: "DELETE" });
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
