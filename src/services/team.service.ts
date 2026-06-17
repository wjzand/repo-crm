import { getDB, generateId } from '@/services/db';
import type { User, UserRole, SalesTarget, LeadSource, CustomerLevelConfig, Tenant } from '@/types/models';

export async function getTeamMembers(tenantId: string): Promise<User[]> {
  const db = getDB();
  const users = await db.getAllFromIndex('users', 'by-tenant', tenantId);
  return users.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getUserById(id: string): Promise<User | undefined> {
  const db = getDB();
  return await db.get('users', id);
}

export async function createUser(data: Omit<User, 'id' | 'createdAt' | 'status'> & { status?: 'active' | 'disabled' }): Promise<User> {
  const db = getDB();
  const user: User = {
    ...data,
    status: data.status || 'active',
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  await db.add('users', user);
  return user;
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
  const db = getDB();
  const user = await db.get('users', id);
  if (!user) return undefined;
  
  const updated: User = { ...user, ...data };
  await db.put('users', updated);
  return updated;
}

export async function updateUserRole(id: string, role: UserRole): Promise<User | undefined> {
  return updateUser(id, { role });
}

export async function updateUserStatus(id: string, status: 'active' | 'disabled'): Promise<User | undefined> {
  return updateUser(id, { status });
}

export async function getSalesTargets(tenantId: string, period?: 'month' | 'quarter'): Promise<SalesTarget[]> {
  const db = getDB();
  const targets = await db.getAllFromIndex('salesTargets', 'by-tenant', tenantId);
  
  if (period) {
    return targets.filter(t => t.period === period);
  }
  
  return targets;
}

export async function getUserSalesTarget(userId: string, period: 'month' | 'quarter', periodValue: string): Promise<SalesTarget | undefined> {
  const db = getDB();
  const targets = await db.getAllFromIndex('salesTargets', 'by-user-period', [userId, period, periodValue]);
  return targets[0];
}

export async function setSalesTarget(
  userId: string,
  tenantId: string,
  period: 'month' | 'quarter',
  periodValue: string,
  targetAmount: number
): Promise<SalesTarget> {
  const db = getDB();
  const existing = await getUserSalesTarget(userId, period, periodValue);
  
  if (existing) {
    const updated: SalesTarget = { ...existing, targetAmount };
    await db.put('salesTargets', updated);
    return updated;
  }
  
  const target: SalesTarget = {
    id: generateId(),
    userId,
    tenantId,
    period,
    periodValue,
    targetAmount,
    createdAt: new Date().toISOString(),
  };
  await db.add('salesTargets', target);
  return target;
}

export async function getLeadSources(tenantId: string): Promise<LeadSource[]> {
  const db = getDB();
  return await db.getAllFromIndex('leadSources', 'by-tenant', tenantId);
}

export async function createLeadSource(data: Omit<LeadSource, 'id' | 'createdAt'>): Promise<LeadSource> {
  const db = getDB();
  const source: LeadSource = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  await db.add('leadSources', source);
  return source;
}

export async function updateLeadSource(id: string, data: Partial<LeadSource>): Promise<LeadSource | undefined> {
  const db = getDB();
  const source = await db.get('leadSources', id);
  if (!source) return undefined;
  
  const updated: LeadSource = { ...source, ...data };
  await db.put('leadSources', updated);
  return updated;
}

export async function deleteLeadSource(id: string): Promise<void> {
  const db = getDB();
  await db.delete('leadSources', id);
}

export async function getCustomerLevels(tenantId: string): Promise<CustomerLevelConfig[]> {
  const db = getDB();
  return await db.getAllFromIndex('customerLevels', 'by-tenant', tenantId);
}

export async function createCustomerLevel(data: Omit<CustomerLevelConfig, 'id' | 'createdAt'>): Promise<CustomerLevelConfig> {
  const db = getDB();
  const level: CustomerLevelConfig = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  await db.add('customerLevels', level);
  return level;
}

export async function updateCustomerLevel(id: string, data: Partial<CustomerLevelConfig>): Promise<CustomerLevelConfig | undefined> {
  const db = getDB();
  const level = await db.get('customerLevels', id);
  if (!level) return undefined;
  
  const updated: CustomerLevelConfig = { ...level, ...data };
  await db.put('customerLevels', updated);
  return updated;
}

export async function deleteCustomerLevel(id: string): Promise<void> {
  const db = getDB();
  await db.delete('customerLevels', id);
}

export async function updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant | undefined> {
  const db = getDB();
  const tenant = await db.get('tenants', id);
  if (!tenant) return undefined;
  
  const updated: Tenant = { ...tenant, ...data };
  await db.put('tenants', updated);
  return updated;
}
