import { create } from 'zustand';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: true }),
  setAccessToken: (accessToken) => set({ accessToken }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
