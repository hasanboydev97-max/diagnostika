/**
 * UI Store — Global UI holati (modal, sidebar, notification va h.k.)
 *
 * Avval: har komponentda `useState` bilan takroriy holat.
 * Endi: Bir joyda boshqariladi.
 */
import { create } from 'zustand';

interface UIState {
  // Global loading (page transition uchun)
  isPageLoading: boolean;
  setPageLoading: (v: boolean) => void;

  // Sidebar/Drawer holati
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;

  // Qaysi modal ochiq
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;

  // Notification badge'lar
  unreadCount: number;
  setUnreadCount: (n: number) => void;
}

export const useUIStore = create<UIState>()(set => ({
  isPageLoading: false,
  setPageLoading: (v) => set({ isPageLoading: v }),

  isSidebarOpen: false,
  toggleSidebar: () => set(s => ({ isSidebarOpen: !s.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),

  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),

  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),
}));
