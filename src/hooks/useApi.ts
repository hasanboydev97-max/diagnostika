/**
 * Custom Hooks — React Query asosida qurilgan typed data hooks.
 *
 * Avval: har sahifada `useEffect` + `fetch` + `useState(isLoading)` + `useState(error)`
 * Endi: bitta hook — loading, error, data, refetch hammasi ichida.
 *
 * Ishlatish:
 *   const { data: results, isLoading } = useResults();
 *   const { mutate: deleteTest } = useDeleteTest();
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '../lib/queryClient';
import { resultsApi, onlineTestsApi, adminApi, authApi, subscriptionApi } from '../lib/apiClient';
import { useAuthStore } from '../store/authStore';

// ─── Auth Hooks ───────────────────────────────────────────────────────────────
export function useCurrentTeacher() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: authApi.getMe,
    enabled: !!token,           // Token bo'lsagina fetch qilsin
    staleTime: 10 * 60 * 1000, // 10 daqiqa — /me tez-tez o'zgarmaydi
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const updateTeacher = useAuthStore(s => s.updateTeacher);

  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: ({ teacher }) => {
      updateTeacher(teacher);
      qc.invalidateQueries({ queryKey: queryKeys.me() });
      toast.success('Profil muvaffaqiyatli yangilandi');
    },
  });
}

// ─── Results Hooks ────────────────────────────────────────────────────────────
export function useResults(limit = 100) {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: queryKeys.results.all(limit),
    queryFn: () => resultsApi.getAll(limit),
    enabled: !!token,
  });
}

export function useResult(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.results.byId(id!),
    queryFn: () => resultsApi.getById(id!),
    enabled: !!id,
  });
}

export function useStudentHistory(studentName: string | undefined) {
  return useQuery({
    queryKey: queryKeys.results.studentHistory(studentName!),
    queryFn: () => resultsApi.getStudentHistory(studentName!),
    enabled: !!studentName,
    staleTime: 2 * 60 * 1000, // 2 daqiqa
  });
}

// ─── Online Tests Hooks ───────────────────────────────────────────────────────
export function useOnlineTests() {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: queryKeys.tests.all(),
    queryFn: onlineTestsApi.getAll,
    enabled: !!token,
  });
}

export function useOnlineTest(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tests.byId(id!),
    queryFn: () => onlineTestsApi.getById(id!),
    enabled: !!id,
  });
}

export function useTestResults(testId: string | undefined) {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey: queryKeys.tests.results(testId!),
    queryFn: () => onlineTestsApi.getResults(testId!),
    enabled: !!testId && !!token,
  });
}

export function useDeleteTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: onlineTestsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tests.all() });
      toast.success("Test o'chirildi");
    },
    onError: () => {
      toast.error("Testni o'chirishda xatolik");
    },
  });
}

export function useCreateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: onlineTestsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tests.all() });
      toast.success('Test yaratildi');
    },
  });
}

// ─── Admin Hooks ──────────────────────────────────────────────────────────────
export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: adminApi.getStats,
    staleTime: 60 * 1000, // 1 daqiqa
  });
}

export function useAdminTeachers() {
  return useQuery({
    queryKey: queryKeys.admin.teachers(),
    queryFn: adminApi.getTeachers,
  });
}

export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteTeacher,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.teachers() });
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats() });
      toast.success("O'qituvchi o'chirildi");
    },
  });
}

export function useAdminSubscriptions() {
  return useQuery({
    queryKey: queryKeys.admin.subscriptions(),
    queryFn: adminApi.getSubscriptions,
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.updatePlan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.teachers() });
      qc.invalidateQueries({ queryKey: queryKeys.admin.subscriptions() });
      toast.success('Tarif rejasi yangilandi');
    },
  });
}

// ─── Subscription Hook ────────────────────────────────────────────────────────
export function useRequestSubscription() {
  const updateTeacher = useAuthStore(s => s.updateTeacher);
  return useMutation({
    mutationFn: ({ plan, note }: { plan: string; note?: string }) =>
      subscriptionApi.request(plan, note),
    onSuccess: () => {
      updateTeacher({ planStatus: 'pending' });
      toast.success("Tarif so'rovi yuborildi! Admin tez orada ko'rib chiqadi.");
    },
  });
}
