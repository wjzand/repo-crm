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

export type WarRoomStatus = 'active' | 'archived';
export type WarRoomMemberRole = 'commander' | 'assault' | 'staff' | 'observer';
export type WarRoomTaskStatus = 'todo' | 'in_progress' | 'done' | 'overdue';
export type DecisionNodeRole = 'decision_maker' | 'influencer' | 'user' | 'gatekeeper';
export type DecisionNodeAttitude = 'support' | 'neutral' | 'oppose';
export type RequirementType = 'explicit' | 'implicit';
export type ScriptCategory = 'opening' | 'objection' | 'comparison' | 'closing' | 'other';
export type BattleStatus = 'preparing' | 'active' | 'paused' | 'completed';

export interface WarRoomMember {
  userId: string;
  role: WarRoomMemberRole;
  joinedAt: string;
}

export interface WarRoom {
  id: string;
  tenantId: string;
  opportunityId: string;
  name: string;
  objective: string;
  status: WarRoomStatus;
  expectedEndDate: string;
  members: WarRoomMember[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface DecisionNode {
  id: string;
  warRoomId: string;
  tenantId: string;
  name: string;
  position: string;
  role: DecisionNodeRole;
  attitude: DecisionNodeAttitude;
  influence: number;
  contactStatus: string;
  x: number;
  y: number;
  createdAt: string;
}

export interface DecisionEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
}

export interface Requirement {
  id: string;
  warRoomId: string;
  tenantId: string;
  content: string;
  type: RequirementType;
  priority: number;
  difficulty: number;
  productFeature?: string;
  covered: boolean;
  createdAt: string;
}

export interface CompetitiveAnalysis {
  id: string;
  warRoomId: string;
  tenantId: string;
  competitorName: string;
  price: string;
  product: string;
  service: string;
  relationship: string;
  strengths: string;
  weaknesses: string;
  strategy: string;
  dynamics?: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  warRoomId: string;
  tenantId: string;
  name: string;
  dueDate: string;
  completed: boolean;
  order: number;
  completedAt?: string;
  createdAt: string;
}

export interface WarRoomTask {
  id: string;
  milestoneId: string;
  warRoomId: string;
  tenantId: string;
  name: string;
  assigneeId: string;
  dueDate: string;
  status: WarRoomTaskStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDoc {
  id: string;
  warRoomId: string;
  tenantId: string;
  title: string;
  content: string;
  type: 'document' | 'link' | 'image';
  url?: string;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Script {
  id: string;
  warRoomId: string;
  tenantId: string;
  category: ScriptCategory;
  scenario: string;
  content: string;
  notes?: string;
  rating: number;
  ratingCount: number;
  stageId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptComment {
  id: string;
  scriptId: string;
  tenantId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface BattleMessage {
  id: string;
  battleId: string;
  userId: string;
  role: 'our_side' | 'client_side';
  content: string;
  createdAt: string;
}

export interface Battle {
  id: string;
  warRoomId: string;
  tenantId: string;
  scenario: string;
  status: BattleStatus;
  participants: string[];
  clientChallenges: string[];
  messages: BattleMessage[];
  reviewScore: number;
  reviewNotes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BattleReport {
  id: string;
  warRoomId: string;
  tenantId: string;
  title: string;
  keyResults: string;
  unfinishedItems: string;
  lessons: string;
  nextPlan: string;
  milestoneIds: string[];
  published: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarRoomActivityLog {
  id: string;
  warRoomId: string;
  tenantId: string;
  userId: string;
  actionType: string;
  description: string;
  createdAt: string;
}
