import type { UserRole } from '@/types/models';

export const rolePermissions: Record<UserRole, string[]> = {
  super_admin: [
    'dashboard:view',
    'customers:view_all',
    'customers:create',
    'customers:edit',
    'customers:delete',
    'leads:view_all',
    'leads:create',
    'leads:edit',
    'leads:delete',
    'leads:assign',
    'leads:convert',
    'opportunities:view_all',
    'opportunities:create',
    'opportunities:edit',
    'opportunities:delete',
    'funnel:view_all',
    'warrooms:view',
    'warrooms:create',
    'warrooms:edit',
    'warrooms:delete',
    'team:manage',
    'settings:manage',
  ],
  tenant_admin: [
    'dashboard:view',
    'customers:view_all',
    'customers:create',
    'customers:edit',
    'customers:delete',
    'leads:view_all',
    'leads:create',
    'leads:edit',
    'leads:delete',
    'leads:assign',
    'leads:convert',
    'opportunities:view_all',
    'opportunities:create',
    'opportunities:edit',
    'opportunities:delete',
    'funnel:view_all',
    'warrooms:view',
    'warrooms:create',
    'warrooms:edit',
    'warrooms:delete',
    'team:manage',
    'settings:manage',
  ],
  sales_manager: [
    'dashboard:view',
    'customers:view_all',
    'customers:create',
    'customers:edit',
    'leads:view_all',
    'leads:create',
    'leads:edit',
    'leads:assign',
    'leads:convert',
    'opportunities:view_all',
    'opportunities:create',
    'opportunities:edit',
    'funnel:view_all',
    'warrooms:view',
    'warrooms:create',
    'warrooms:edit',
  ],
  sales_rep: [
    'dashboard:view',
    'customers:view_own',
    'customers:create',
    'customers:edit_own',
    'leads:view_own',
    'leads:create',
    'leads:edit_own',
    'leads:convert',
    'opportunities:view_own',
    'opportunities:create',
    'opportunities:edit_own',
    'funnel:view_own',
    'warrooms:view',
    'warrooms:create',
    'warrooms:edit_own',
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  
  if (permissions.includes(permission)) return true;
  
  const basePermission = permission.replace('_own', '').replace('_all', '');
  const viewAll = basePermission + ':view_all';
  const viewOwn = basePermission + ':view_own';
  
  if (permission.endsWith('_own') && permissions.includes(viewAll)) return true;
  if (permission.endsWith('_all') && !permissions.includes(viewAll) && permissions.includes(viewOwn)) return false;
  
  return permissions.some(p => p.startsWith(basePermission));
}

export const roleLabels: Record<UserRole, string> = {
  super_admin: '超级管理员',
  tenant_admin: '租户管理员',
  sales_manager: '销售经理',
  sales_rep: '销售人员',
};
