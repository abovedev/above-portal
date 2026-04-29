import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  boardEditMode: boolean;
  theme: 'dark' | 'light';
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setBoardEditMode: (editing: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      boardEditMode: false,
      theme: 'dark',
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setBoardEditMode: (boardEditMode) => set({ boardEditMode }),
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },
    }),
    { name: 'portal-ui' }
  )
);
