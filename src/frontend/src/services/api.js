import { initialWorkshops } from "../data/workshops";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

function getFallbackToken() {
  try {
    return localStorage.getItem("unihub.auth.token") || "";
  } catch {
    return "";
  }
}

function persistFallbackToken(nextToken) {
  try {
    if (nextToken) localStorage.setItem("unihub.auth.token", nextToken);
    else localStorage.removeItem("unihub.auth.token");
  } catch {
    // Ignore storage failures.
  }
}

async function request(path, { token, method = "GET", body, retryOnAuth = true } = {}) {
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

  if (
    response.status === 401
    && retryOnAuth
    && path !== "/auth/refresh"
  ) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      let refreshPayload = null;
      try {
        refreshPayload = await refreshResponse.json();
      } catch {
        refreshPayload = null;
      }

      const refreshedToken = refreshPayload?.data?.accessToken || "";
      if (refreshResponse.ok && refreshedToken) {
        persistFallbackToken(refreshedToken);
        return request(path, { token: refreshedToken, method, body, retryOnAuth: false });
      }
    } catch {
      // Ignore refresh failures and continue with original auth error.
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed");
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function uploadFile(path, { token, file, formData: additionalData = {} } = {}) {
  const authToken = token || getFallbackToken();
  const formData = new FormData();
  formData.append("file", file);
  
  for (const [key, value] of Object.entries(additionalData)) {
    formData.append(key, value);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: formData
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
  async createRoom(token, payload) {
    const response = await request('/admin/rooms', { token, method: 'POST', body: payload });
    return response?.data || null;
  },
  async updateRoom(token, roomId, payload) {
    const response = await request(`/admin/rooms/${roomId}`, { token, method: 'PUT', body: payload });
    return response?.data || null;
  },
  async deleteRoom(token, roomId) {
    const response = await request(`/admin/rooms/${roomId}`, { token, method: 'DELETE' });
    return response?.data || null;
  },
  async restoreRoom(token, roomId) {
    const response = await request(`/admin/rooms/${roomId}/restore`, { token, method: 'PATCH' });
    return response?.data || null;
  },
  async getDeletedRooms(token) {
    const response = await request('/admin/rooms/deleted', { token });
    return Array.isArray(response?.data) ? response.data : [];
  },
  async getRoomWorkshops(token, roomId) {
    const response = await request(`/admin/rooms/${roomId}/workshops`, { token });
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
  async markNotificationAsRead(token, notificationId) {
    return request(`/notifications/${notificationId}/read`, { token, method: "PATCH" });
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
  cancelWorkshop(token, workshopId) {
    return request(`/admin/workshops/${workshopId}/cancel`, { token, method: "PATCH" });
  },
  uploadDocument(token, workshopId, file) {
    return uploadFile("/admin/documents", { 
      token, 
      file,
      formData: { workshopId }
    }).then(response => response?.data);
  },
  uploadCsvSyncFile(token, file) {
    return uploadFile('/admin/csv-sync/upload', {
      token,
      file,
    }).then(response => response?.data);
  },
  startDocumentSummary(token, workshopId) {
    return request(`/admin/documents/${workshopId}/summary`, { token, method: "PATCH" }).then(response => response?.data);
  },
  getDocument(token, workshopId) {
    return request(`/admin/documents/${workshopId}`, { token }).then(response => response?.data);
  },
  getAnalytics(token) {
    return request("/admin/analytics", { token });
  },
  getCsvLatest(token) {
    return request("/admin/csv-sync/latest", { token });
  },
  async getWorkshopRegistrations(token, workshopId) {
    const response = await request(`/admin/workshops/${workshopId}/registrations`, { token });
    return response?.data || null;
  },
  async getCheckinStats(token) {
    const response = await request('/admin/checkins/stats', { token });
    return response?.data || null;
  },
  async getAdminNotifications(token, status = 'ALL') {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') {
      params.set('status', status);
    }
    const path = params.toString() ? `/admin/notifications?${params.toString()}` : '/admin/notifications';
    const response = await request(path, { token });
    return Array.isArray(response?.data) ? response.data : [];
  },
  async triggerCsvSync(token) {
    const response = await request('/admin/csv-sync/run', { token, method: 'POST', body: {} });
    return response;
  },
  async getCsvSyncLogs(token, page = 1, limit = 20) {
    const response = await request(`/admin/csv-sync-logs?page=${page}&limit=${limit}`, { token });
    return response?.data || null;
  },
  async getAuditLogs(token, page = 1, limit = 20, entityType = '', action = '') {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (entityType) params.set('entityType', entityType);
    if (action) params.set('action', action);
    const response = await request(`/admin/audit-logs?${params.toString()}`, { token });
    return response?.data || null;
  },
  syncCheckins(token, items) {
    return request("/checkins/sync", { token, method: "POST", body: { items } });
  },
  async getRegistrationDetail(token, registrationId) {
    const response = await request(`/registrations/${registrationId}`, { token });
    return response?.data || null;
  },
  async getPaymentDetail(token, paymentId) {
    const response = await request(`/payments/${paymentId}`, { token });
    return response?.data || null;
  },
  async getMyPayments(token) {
    try {
      const response = await request('/payments/me', { token });
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      if (error.status === 404) return [];
      throw error;
    }
  },
  async getMyRefunds(token) {
    try {
      const response = await request('/payments/refunds/me', { token });
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      if (error.status === 404) return [];
      throw error;
    }
  },
  async getRefundStatus(token, paymentId) {
    const response = await request(`/payments/refund/${paymentId}/status`, { token });
    return response?.data || null;
  },
  async requestRefund(token, paymentId, reason) {
    const response = await request(`/payments/refund/${paymentId}`, {
      token,
      method: 'POST',
      body: { reason }
    });
    return response?.data || null;
  },
  async getAdminRefunds(token, page = 1, pageSize = 20, reason = '', workshop_id = '') {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (reason) params.set('reason', reason);
    if (workshop_id) params.set('workshop_id', workshop_id);
    const response = await request(`/admin/refunds?${params.toString()}`, { token });
    return response || { data: [], pagination: {} };
  },
  async getAdminRefundStats(token) {
    const response = await request('/admin/refunds/stats', { token });
    return response?.data || null;
  },
  async getMyCheckins(token) {
    try {
      const response = await request('/checkins/me', { token });
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      if (error.status === 404) return [];
      throw error;
    }
  },
  async getFailedNotifications(token) {
    const response = await request('/admin/notifications/failed', { token });
    return response?.data || [];
  },
  async replayNotifications(token, selectedIds = null) {
    const response = await request('/admin/notifications/replay', { 
      token, 
      method: 'POST', 
      body: selectedIds ? { notificationIds: selectedIds } : {} 
    });
    return response?.data || null;
  }
};
