/**
 * React Query Client konfiguratsiyasi.
 *
 * Server state management — fetch, cache, refetch, retry barchasi avtomatik.
 * Bu `useEffect + fetch + useState` pattern'ni to'liq almashtiradi.
 */
import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './apiClient';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 daqiqa davomida ma'lumot "fresh" hisoblanadi — keraksiz refetch yo'q
      staleTime: 5 * 60 * 1000,
      // 10 daqiqadan keyin GC — foydalanilmagan cache tozalanadi
      gcTime: 10 * 60 * 1000,
      // Xato bo'lsa 2 marta qayta urinish
      retry: (failureCount, error) => {
        // 4xx xatolar uchun retry qilmaymiz (client-side muammo)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      // Tab focus bo'lganda refetch qilmaslik — foydalanuvchi tajribasini yaxshilaydi
      refetchOnWindowFocus: false,
      // Network qayta ulanganda refetch
      refetchOnReconnect: true,
    },
    mutations: {
      onError: (error) => {
        const message = error instanceof ApiError
          ? error.message
          : 'Kutilmagan xatolik yuz berdi';
        toast.error(message);
      },
    },
  },
});

// Query Key Factory — type-safe, takrorlanmaslik uchun
// Barcha query key'larini bir joyda boshqaramiz
export const queryKeys = {
  // Auth
  me: () => ['auth', 'me'] as const,

  // Results
  results: {
    all: (limit?: number) => ['results', { limit }] as const,
    byId: (id: string) => ['results', id] as const,
    studentHistory: (name: string) => ['results', 'student', name] as const,
  },

  // Online Tests
  tests: {
    all: () => ['online-tests'] as const,
    byId: (id: string) => ['online-tests', id] as const,
    results: (testId: string) => ['online-tests', testId, 'results'] as const,
  },

  // Admin
  admin: {
    stats: () => ['admin', 'stats'] as const,
    teachers: () => ['admin', 'teachers'] as const,
    subscriptions: () => ['admin', 'subscriptions'] as const,
  },
} as const;
