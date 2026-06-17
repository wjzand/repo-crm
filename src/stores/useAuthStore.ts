import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant } from '@/types/models';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tenant?: Tenant | null) => void;
  clearAuth: () => void;
  updateTenant: (tenant: Tenant) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      isAuthenticated: false,
      setAuth: (user, tenant = null) =>
        set({ user, tenant: tenant || null, isAuthenticated: true }),
      clearAuth: () =>
        set({ user: null, tenant: null, isAuthenticated: false }),
      updateTenant: (tenant) => set({ tenant }),
    }),
    {
      name: 'crm-auth-storage',
    }
  )
);
