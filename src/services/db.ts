import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type {
  Tenant,
  User,
  Customer,
  Contact,
  Lead,
  Opportunity,
  Stage,
  Activity,
  StageHistory,
  SalesTarget,
  LeadSource,
  CustomerLevelConfig,
  Competitor,
  WarRoom,
  Milestone,
  WarRoomTask,
  KnowledgeDoc,
  Script,
  ScriptComment,
  Battle,
  BattleReport,
  WarRoomActivityLog,
  DecisionNode,
  Requirement,
  CompetitiveAnalysis,
} from '@/types/models';

interface CRMDBSchema extends DBSchema {
  tenants: {
    key: string;
    value: Tenant;
    indexes: { 'by-name': string };
  };
  users: {
    key: string;
    value: User;
    indexes: { 'by-tenant': string; 'by-email': string; 'by-tenant-role': [string, string] };
  };
  customers: {
    key: string;
    value: Customer;
    indexes: { 'by-tenant': string; 'by-owner': [string, string]; 'by-tenant-level': [string, string] };
  };
  contacts: {
    key: string;
    value: Contact;
    indexes: { 'by-tenant': string; 'by-customer': [string, string] };
  };
  leads: {
    key: string;
    value: Lead;
    indexes: { 'by-tenant': string; 'by-owner': [string, string]; 'by-tenant-status': [string, string]; 'by-tenant-source': [string, string] };
  };
  stages: {
    key: string;
    value: Stage;
    indexes: { 'by-tenant': string; 'by-tenant-order': [string, number] };
  };
  opportunities: {
    key: string;
    value: Opportunity;
    indexes: { 'by-tenant': string; 'by-owner': [string, string]; 'by-tenant-stage': [string, string]; 'by-customer': [string, string] };
  };
  activities: {
    key: string;
    value: Activity;
    indexes: { 'by-tenant': string; 'by-customer': [string, string]; 'by-opportunity': [string, string] };
  };
  stageHistories: {
    key: string;
    value: StageHistory;
    indexes: { 'by-opportunity': string; 'by-tenant': string };
  };
  salesTargets: {
    key: string;
    value: SalesTarget;
    indexes: { 'by-user': string; 'by-tenant': string; 'by-user-period': [string, string, string] };
  };
  leadSources: {
    key: string;
    value: LeadSource;
    indexes: { 'by-tenant': string };
  };
  customerLevels: {
    key: string;
    value: CustomerLevelConfig;
    indexes: { 'by-tenant': string };
  };
  competitors: {
    key: string;
    value: Competitor;
    indexes: { 'by-opportunity': string; 'by-tenant': string };
  };
  warRooms: {
    key: string;
    value: WarRoom;
    indexes: { 'by-tenant': string; 'by-opportunity': string; 'by-tenant-status': [string, string] };
  };
  milestones: {
    key: string;
    value: Milestone;
    indexes: { 'by-war-room': string; 'by-tenant': string };
  };
  warRoomTasks: {
    key: string;
    value: WarRoomTask;
    indexes: { 'by-milestone': string; 'by-war-room': string; 'by-tenant': string; 'by-assignee': string };
  };
  knowledgeDocs: {
    key: string;
    value: KnowledgeDoc;
    indexes: { 'by-war-room': string; 'by-tenant': string };
  };
  scripts: {
    key: string;
    value: Script;
    indexes: { 'by-war-room': string; 'by-tenant': string; 'by-category': string };
  };
  scriptComments: {
    key: string;
    value: ScriptComment;
    indexes: { 'by-script': string; 'by-tenant': string };
  };
  battles: {
    key: string;
    value: Battle;
    indexes: { 'by-war-room': string; 'by-tenant': string };
  };
  battleReports: {
    key: string;
    value: BattleReport;
    indexes: { 'by-war-room': string; 'by-tenant': string };
  };
  warRoomActivityLogs: {
    key: string;
    value: WarRoomActivityLog;
    indexes: { 'by-war-room': string; 'by-tenant': string };
  };
  decisionNodes: {
    key: string;
    value: DecisionNode;
    indexes: { 'by-war-room': string; 'by-tenant': string };
  };
  requirements: {
    key: string;
    value: Requirement;
    indexes: { 'by-war-room': string; 'by-tenant': string };
  };
  competitiveAnalyses: {
    key: string;
    value: CompetitiveAnalysis;
    indexes: { 'by-war-room': string; 'by-tenant': string };
  };
}

const DB_NAME = 'crm-db';
const DB_VERSION = 3;

let db: IDBPDatabase<CRMDBSchema> | null = null;

export async function initDB(): Promise<IDBPDatabase<CRMDBSchema>> {
  if (db) return db;

  db = await openDB<CRMDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('tenants')) {
        const tenantStore = db.createObjectStore('tenants', { keyPath: 'id' });
        tenantStore.createIndex('by-name', 'name');
      }

      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('by-tenant', 'tenantId');
        userStore.createIndex('by-email', 'email', { unique: false });
        userStore.createIndex('by-tenant-role', ['tenantId', 'role']);
      }

      if (!db.objectStoreNames.contains('customers')) {
        const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
        customerStore.createIndex('by-tenant', 'tenantId');
        customerStore.createIndex('by-owner', ['tenantId', 'ownerId']);
        customerStore.createIndex('by-tenant-level', ['tenantId', 'level']);
      }

      if (!db.objectStoreNames.contains('contacts')) {
        const contactStore = db.createObjectStore('contacts', { keyPath: 'id' });
        contactStore.createIndex('by-tenant', 'tenantId');
        contactStore.createIndex('by-customer', ['tenantId', 'customerId']);
      }

      if (!db.objectStoreNames.contains('leads')) {
        const leadStore = db.createObjectStore('leads', { keyPath: 'id' });
        leadStore.createIndex('by-tenant', 'tenantId');
        leadStore.createIndex('by-owner', ['tenantId', 'ownerId']);
        leadStore.createIndex('by-tenant-status', ['tenantId', 'status']);
        leadStore.createIndex('by-tenant-source', ['tenantId', 'sourceId']);
      }

      if (!db.objectStoreNames.contains('stages')) {
        const stageStore = db.createObjectStore('stages', { keyPath: 'id' });
        stageStore.createIndex('by-tenant', 'tenantId');
        stageStore.createIndex('by-tenant-order', ['tenantId', 'order']);
      }

      if (!db.objectStoreNames.contains('opportunities')) {
        const oppStore = db.createObjectStore('opportunities', { keyPath: 'id' });
        oppStore.createIndex('by-tenant', 'tenantId');
        oppStore.createIndex('by-owner', ['tenantId', 'ownerId']);
        oppStore.createIndex('by-tenant-stage', ['tenantId', 'stageId']);
        oppStore.createIndex('by-customer', ['tenantId', 'customerId']);
      }

      if (!db.objectStoreNames.contains('activities')) {
        const activityStore = db.createObjectStore('activities', { keyPath: 'id' });
        activityStore.createIndex('by-tenant', 'tenantId');
        activityStore.createIndex('by-customer', ['tenantId', 'customerId']);
        activityStore.createIndex('by-opportunity', ['tenantId', 'opportunityId']);
      }

      if (!db.objectStoreNames.contains('stageHistories')) {
        const historyStore = db.createObjectStore('stageHistories', { keyPath: 'id' });
        historyStore.createIndex('by-opportunity', 'opportunityId');
        historyStore.createIndex('by-tenant', 'tenantId');
      }

      if (!db.objectStoreNames.contains('salesTargets')) {
        const targetStore = db.createObjectStore('salesTargets', { keyPath: 'id' });
        targetStore.createIndex('by-user', 'userId');
        targetStore.createIndex('by-tenant', 'tenantId');
        targetStore.createIndex('by-user-period', ['userId', 'period', 'periodValue']);
      }

      if (!db.objectStoreNames.contains('leadSources')) {
        const sourceStore = db.createObjectStore('leadSources', { keyPath: 'id' });
        sourceStore.createIndex('by-tenant', 'tenantId');
      }

      if (!db.objectStoreNames.contains('customerLevels')) {
        const levelStore = db.createObjectStore('customerLevels', { keyPath: 'id' });
        levelStore.createIndex('by-tenant', 'tenantId');
      }

      if (!db.objectStoreNames.contains('competitors')) {
        const compStore = db.createObjectStore('competitors', { keyPath: 'id' });
        compStore.createIndex('by-opportunity', 'opportunityId');
        compStore.createIndex('by-tenant', 'tenantId');
      }

      if (!db.objectStoreNames.contains('warRooms')) {
        const wrStore = db.createObjectStore('warRooms', { keyPath: 'id' });
        wrStore.createIndex('by-tenant', 'tenantId');
        wrStore.createIndex('by-opportunity', 'opportunityId');
        wrStore.createIndex('by-tenant-status', ['tenantId', 'status']);
      }

      if (!db.objectStoreNames.contains('milestones')) {
        const msStore = db.createObjectStore('milestones', { keyPath: 'id' });
        msStore.createIndex('by-war-room', 'warRoomId');
        msStore.createIndex('by-tenant', 'tenantId');
      }

      if (!db.objectStoreNames.contains('warRoomTasks')) {
        const taskStore = db.createObjectStore('warRoomTasks', { keyPath: 'id' });
        taskStore.createIndex('by-milestone', 'milestoneId');
        taskStore.createIndex('by-war-room', 'warRoomId');
        taskStore.createIndex('by-tenant', 'tenantId');
        taskStore.createIndex('by-assignee', 'assigneeId');
      }

      if (!db.objectStoreNames.contains('knowledgeDocs')) {
        const kdStore = db.createObjectStore('knowledgeDocs', { keyPath: 'id' });
        kdStore.createIndex('by-war-room', 'warRoomId');
        kdStore.createIndex('by-tenant', 'tenantId');
      }

      if (!db.objectStoreNames.contains('scripts')) {
        const scStore = db.createObjectStore('scripts', { keyPath: 'id' });
        scStore.createIndex('by-war-room', 'warRoomId');
        scStore.createIndex('by-tenant', 'tenantId');
        scStore.createIndex('by-category', 'category');
      }

      if (!db.objectStoreNames.contains('scriptComments')) {
        const sccStore = db.createObjectStore('scriptComments', { keyPath: 'id' });
        sccStore.createIndex('by-script', 'scriptId');
        sccStore.createIndex('by-tenant', 'tenantId');
      }

      if (!db.objectStoreNames.contains('battles')) {
        const btStore = db.createObjectStore('battles', { keyPath: 'id' });
        btStore.createIndex('by-war-room', 'warRoomId');
        btStore.createIndex('by-tenant', 'tenantId');
      }

      if (!db.objectStoreNames.contains('battleReports')) {
        const brStore = db.createObjectStore('battleReports', { keyPath: 'id' });
        brStore.createIndex('by-war-room', 'warRoomId');
        brStore.createIndex('by-tenant', 'tenantId');
      }

      if (!db.objectStoreNames.contains('warRoomActivityLogs')) {
        const logStore = db.createObjectStore('warRoomActivityLogs', { keyPath: 'id' });
        logStore.createIndex('by-war-room', 'warRoomId');
        logStore.createIndex('by-tenant', 'tenantId');
      }

      if (!db.objectStoreNames.contains('decisionNodes')) {
        const dnStore = db.createObjectStore('decisionNodes', { keyPath: 'id' });
        dnStore.createIndex('by-war-room', 'warRoomId');
        dnStore.createIndex('by-tenant', 'tenantId');
      }

      if (!db.objectStoreNames.contains('requirements')) {
        const reqStore = db.createObjectStore('requirements', { keyPath: 'id' });
        reqStore.createIndex('by-war-room', 'warRoomId');
        reqStore.createIndex('by-tenant', 'tenantId');
      }

      if (!db.objectStoreNames.contains('competitiveAnalyses')) {
        const caStore = db.createObjectStore('competitiveAnalyses', { keyPath: 'id' });
        caStore.createIndex('by-war-room', 'warRoomId');
        caStore.createIndex('by-tenant', 'tenantId');
      }
    },
  });

  return db;
}

export function getDB(): IDBPDatabase<CRMDBSchema> {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export type { CRMDBSchema };
