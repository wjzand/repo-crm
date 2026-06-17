import { useAuthStore } from '@/stores/useAuthStore';
import { hasPermission, roleLabels } from '@/utils/permissions';
import type { UserRole } from '@/types/models';

export function usePermissions() {
  const { user } = useAuthStore();
  
  const can = (permission: string): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };
  
  const isSuperAdmin = (): boolean => user?.role === 'super_admin';
  const isTenantAdmin = (): boolean => user?.role === 'tenant_admin';
  const isSalesManager = (): boolean => user?.role === 'sales_manager';
  const isSalesRep = (): boolean => user?.role === 'sales_rep';
  const isAdmin = (): boolean => 
    user?.role === 'super_admin' || user?.role === 'tenant_admin';
  const isManagerOrAbove = (): boolean =>
    user?.role === 'super_admin' || 
    user?.role === 'tenant_admin' || 
    user?.role === 'sales_manager';
  
  const getRoleLabel = (): string => {
    if (!user) return '';
    return roleLabels[user.role];
  };
  
  const getOwnerFilter = (): string | undefined => {
    if (!user) return undefined;
    if (isManagerOrAbove()) return undefined;
    return user.id;
  };
  
  return {
    can,
    isSuperAdmin,
    isTenantAdmin,
    isSalesManager,
    isSalesRep,
    isAdmin,
    isManagerOrAbove,
    getRoleLabel,
    getOwnerFilter,
    role: user?.role as UserRole | undefined,
  };
}
