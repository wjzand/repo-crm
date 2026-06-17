import { getDB } from '@/services/db';
import type { User, Tenant } from '@/types/models';

export interface LoginResult {
  success: boolean;
  user?: User;
  tenant?: Tenant;
  message?: string;
}

export async function login(email: string, _password: string, tenantId?: string): Promise<LoginResult> {
  const db = getDB();
  
  const users = await db.getAllFromIndex('users', 'by-email', email);
  
  if (users.length === 0) {
    return { success: false, message: '用户不存在' };
  }

  let user: User | undefined;
  
  if (tenantId) {
    user = users.find(u => u.tenantId === tenantId && u.status === 'active');
  } else {
    user = users.find(u => u.status === 'active');
  }

  if (!user) {
    return { success: false, message: '账号已禁用或租户不匹配' };
  }

  let tenant: Tenant | undefined;
  if (user.tenantId !== 'platform') {
    tenant = await db.get('tenants', user.tenantId);
  }

  return { success: true, user, tenant };
}

export async function getTenantsByEmail(email: string): Promise<Tenant[]> {
  const db = getDB();
  const users = await db.getAllFromIndex('users', 'by-email', email);
  const tenantIds = [...new Set(users.map(u => u.tenantId).filter(id => id !== 'platform'))];
  
  const tenants: Tenant[] = [];
  for (const tenantId of tenantIds) {
    const tenant = await db.get('tenants', tenantId);
    if (tenant) {
      tenants.push(tenant);
    }
  }
  return tenants;
}

export async function getTenantUsers(tenantId: string): Promise<User[]> {
  const db = getDB();
  return await db.getAllFromIndex('users', 'by-tenant', tenantId);
}

export async function getTenantById(tenantId: string): Promise<Tenant | undefined> {
  const db = getDB();
  return await db.get('tenants', tenantId);
}
