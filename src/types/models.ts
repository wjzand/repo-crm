export type UserRole = 'super_admin' | 'tenant_admin' | 'sales_manager' | 'sales_rep';

export type UserStatus = 'active' | 'disabled';

export interface Tenant {
  id: string;
  name: string;
  logo?: string;
  industry: string;
  timezone: string;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export type CustomerLevel = 'A' | 'B' | 'C' | 'D';

export interface Customer {
  id: string;
  tenantId: string;
  ownerId: string;
  name: string;
  industry: string;
  level: CustomerLevel;
  address?: string;
  website?: string;
  notes?: string;
  lastFollowUpAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  customerId: string;
  tenantId: string;
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  isDecisionMaker: boolean;
  createdAt: string;
}

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'discarded';

export interface Lead {
  id: string;
  tenantId: string;
  ownerId?: string;
  sourceId: string;
  companyName: string;
  contactName: string;
  phone?: string;
  email?: string;
  requirements?: string;
  notes?: string;
  status: LeadStatus;
  discardReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stage {
  id: string;
  tenantId: string;
  name: string;
  color: string;
  order: number;
  isWin?: boolean;
  isLoss?: boolean;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  tenantId: string;
  customerId: string;
  ownerId: string;
  leadId?: string;
  name: string;
  stageId: string;
  amount: number;
  expectedCloseDate: string;
  probability: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = 'call' | 'visit' | 'email' | 'meeting' | 'other';

export interface Activity {
  id: string;
  tenantId: string;
  customerId?: string;
  opportunityId?: string;
  userId: string;
  type: ActivityType;
  content: string;
  createdAt: string;
}

export interface StageHistory {
  id: string;
  opportunityId: string;
  tenantId: string;
  fromStageId?: string;
  toStageId: string;
  changedById: string;
  changedAt: string;
}

export interface SalesTarget {
  id: string;
  userId: string;
  tenantId: string;
  period: 'month' | 'quarter';
  periodValue: string;
  targetAmount: number;
  createdAt: string;
}

export interface LeadSource {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
}

export interface CustomerLevelConfig {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  color: string;
  createdAt: string;
}

export interface Competitor {
  id: string;
  opportunityId: string;
  tenantId: string;
  name: string;
  strengths?: string;
  weaknesses?: string;
  createdAt: string;
}

export interface FunnelStageData {
  stageId: string;
  stageName: string;
  color: string;
  count: number;
  amount: number;
  conversionRate: number;
}
