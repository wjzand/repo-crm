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
}

const DB_NAME = 'crm-db';
const DB_VERSION = 1;

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
