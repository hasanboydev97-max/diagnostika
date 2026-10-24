/**
 * Auth Store — Zustand bilan global autentifikatsiya holati.
 *
 * Avval: localStorage to'g'ridan-to'g'ri har komponentda o'qilgan.
 * Endi: Markazlashgan store — bir joyda o'zgartir, hamma yerda yangilansin.
 *
 * `persist` middleware — localStorage bilan avtomatik sinxronizatsiya.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  role: 'teacher' | 'admin';
  plan: 'free' | 'standard' | 'premium';
  planStatus: 'active' | 'pending' | 'expired';
  planExpiresAt?: string | null;
  requestedPlan?: string | null;
  paymentNote?: string;
  avatar?: string;
  schoolName?: string;
  schoolLogo?: string;
  phone?: string;
}

interface AuthState {
  teacher: Teacher | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (teacher: Teacher, token: string) => void;
  logout: () => void;
  updateTeacher: (updates: Partial<Teacher>) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      teacher: null,
      token: null,
      get isAuthenticated() {
        return !!(get().token && get().teacher);
      },

      login: (teacher, token) => {
        set({ teacher, token });
      },

      logout: () => {
        set({ teacher: null, token: null });
        // React Router navigate ishlatilmaydi — store router'dan mustaqil bo'lsin
        window.location.href = '/teacher/login';
      },

      updateTeacher: (updates) =>
        set(state => ({
          teacher: state.teacher ? { ...state.teacher, ...updates } : null,
        })),

      setToken: (token) => set({ token }),
    }),
    {
      name: 'hb-auth',
      storage: createJSONStorage(() => localStorage),
      // Faqat zarur maydonlarni saqlash
      partialize: state => ({
        teacher: state.teacher,
        token: state.token,
      }),
    },
  ),
);

// Qulay yordamchi hooks
export const useTeacher = () => useAuthStore(s => s.teacher);
export const useToken = () => useAuthStore(s => s.token);
export const useIsAuthenticated = () => useAuthStore(s => !!(s.token && s.teacher));
export const useIsAdmin = () => useAuthStore(s => s.teacher?.role === 'admin');
export const useTeacherPlan = () => useAuthStore(s => s.teacher?.plan ?? 'free');
