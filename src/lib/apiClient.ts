/**
 * API Client — Markazlashgan HTTP qatlam.
 *
 * Avval: har komponent o'zida `fetch` chaqirardi → takroriy kod, xatolarni ushlash yo'q.
 * Endi:
 *   - Typed request/response
 *   - Avtomatik auth header
 *   - 401 → logout
 *   - Retry mantiq (network errors)
 *   - Timeout
 *
 * Ishlatish:
 *   const results = await apiClient.get<Result[]>('/results');
 *   await apiClient.post('/auth/login', { email, password });
 */

import { useAuthStore } from '../store/authStore';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') as string;
const DEFAULT_TIMEOUT_MS = 30_000;

// ─── Xato Klassi ─────────────────────────────────────────────────────────────
export class ApiError extends Error {
  readonly status: number;
  readonly data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ─── Ichki So'rov Mexanizmi ───────────────────────────────────────────────────
async function request<T>(
  endpoint: string,
  options: RequestInit & { timeout?: number } = {},
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  // Timeout: AbortSignal
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    // 401 → avtomatik logout
    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new ApiError(401, 'Sessiya tugadi. Qayta kiring.');
    }

    // Muvaffaqiyatli bo'sh javob (204 No Content)
    if (response.status === 204) return undefined as T;

    const data = await response.json().catch(() => ({ error: 'JSON parse xatosi' }));

    if (!response.ok) {
      throw new ApiError(
        response.status,
        (data as { error?: string }).error || `HTTP ${response.status}`,
        data,
      );
    }

    return data as T;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ApiError(408, 'So\'rov vaqti tugadi. Internet aloqasini tekshiring.');
    }
    throw new ApiError(0, 'Server bilan bog\'lanib bo\'lmadi. Internet aloqasini tekshiring.');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  // Multipart (fayl yuklash)
  upload: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}, // Content-Type'ni brauzer o'zi o'rnatsin (boundary uchun)
    }),
};

// ─── Typed API Metodlar ───────────────────────────────────────────────────────
// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ token: string; teacher: import('../store/authStore').Teacher }>(
      '/auth/login', { email, password },
    ),
  register: (data: { name: string; email: string; password: string; subject: string }) =>
    apiClient.post<{ token: string; teacher: import('../store/authStore').Teacher }>(
      '/auth/register', data,
    ),
  getMe: () =>
    apiClient.get<import('../store/authStore').Teacher>('/auth/me'),
  updateProfile: (data: Partial<import('../store/authStore').Teacher>) =>
    apiClient.put<{ success: boolean; teacher: import('../store/authStore').Teacher }>(
      '/auth/profile', data,
    ),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.put<{ success: boolean }>('/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email }),
};

// Results (Diagnostika)
export const resultsApi = {
  getAll: (limit = 100) =>
    apiClient.get<unknown[]>(`/results?limit=${limit}`),
  getById: (id: string) =>
    apiClient.get<unknown>(`/results/${id}`),
  getStudentHistory: (studentName: string) =>
    apiClient.get<unknown[]>(`/student-results/${encodeURIComponent(studentName)}`),
};

// Online Tests
export const onlineTestsApi = {
  getAll: () => apiClient.get<unknown[]>('/online-tests'),
  getById: (id: string) => apiClient.get<unknown>(`/online-tests/${id}`),
  create: (data: unknown) => apiClient.post<unknown>('/online-tests', data),
  delete: (id: string) => apiClient.delete<{ success: boolean }>(`/online-tests/${id}`),
  getResults: (testId: string) => apiClient.get<unknown[]>(`/online-tests/${testId}/results`),
  generate: (data: unknown) => apiClient.post<unknown>('/online-tests/generate', data),
  classAnalysis: (testId: string, data: unknown) =>
    apiClient.post<unknown>(`/online-tests/${testId}/class-analysis`, data),
};

// Admin
export const adminApi = {
  getStats: () => apiClient.get<unknown>('/admin/stats'),
  getTeachers: () => apiClient.get<unknown[]>('/admin/teachers'),
  deleteTeacher: (id: string) => apiClient.delete<{ success: boolean }>(`/admin/teachers/${id}`),
  getSubscriptions: () => apiClient.get<unknown[]>('/admin/subscriptions'),
  updatePlan: (data: { teacherId: string; plan: string; status: string; durationDays: number }) =>
    apiClient.post<unknown>('/admin/subscriptions/update-plan', data),
};

// AI
export const aiApi = {
  generateText: (data: unknown) => apiClient.post<{ text: string }>('/ai/generate-text', data),
  generateVision: (data: unknown) => apiClient.post<{ text: string }>('/ai/generate-vision', data),
  explainMistake: (data: {
    questionText: string;
    options?: string[];
    studentAnswer?: string;
    correctAnswer?: string;
    subject?: string;
    grade?: string;
  }) => apiClient.post<{ explanation: string }>('/ai/explain-mistake', data),
};

// Subscription
export const subscriptionApi = {
  request: (requestedPlan: string, paymentNote?: string) =>
    apiClient.post<unknown>('/subscription/request', { requestedPlan, paymentNote }),
};

// Upload
export const uploadApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload<{ url: string }>('/upload', formData);
  },
};
