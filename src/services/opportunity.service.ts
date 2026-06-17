import { getDB, generateId } from '@/services/db';
import type { Opportunity, Stage, StageHistory, Activity, Competitor } from '@/types/models';

export async function getOpportunities(
  tenantId: string,
  options?: { ownerId?: string; stageId?: string; customerId?: string }
): Promise<Opportunity[]> {
  const db = getDB();
  
  if (options?.stageId) {
    const opps = await db.getAllFromIndex('opportunities', 'by-tenant-stage', [tenantId, options.stageId]);
    if (options.ownerId) {
      return opps.filter(o => o.ownerId === options.ownerId);
    }
    return opps;
  }
  
  if (options?.customerId) {
    return await db.getAllFromIndex('opportunities', 'by-customer', [tenantId, options.customerId]);
  }
  
  if (options?.ownerId) {
    return await db.getAllFromIndex('opportunities', 'by-owner', [tenantId, options.ownerId]);
  }
  
  return await db.getAllFromIndex('opportunities', 'by-tenant', tenantId);
}

export async function getOpportunityById(id: string): Promise<Opportunity | undefined> {
  const db = getDB();
  return await db.get('opportunities', id);
}

export async function getOpportunitiesByCustomer(
  tenantId: string,
  customerId: string
): Promise<Opportunity[]> {
  return getOpportunities(tenantId, { customerId });
}

export async function createOpportunity(
  data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt' | 'probability'> & { probability?: number }
): Promise<Opportunity> {
  const db = getDB();
  const now = new Date().toISOString();
  const opportunity: Opportunity = {
    ...data,
    probability: data.probability ?? 20,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  
  const tx = db.transaction(['opportunities', 'stageHistories'], 'readwrite');
  await tx.objectStore('opportunities').add(opportunity);
  
  const history: StageHistory = {
    id: generateId(),
    opportunityId: opportunity.id,
    tenantId: data.tenantId,
    toStageId: data.stageId,
    changedById: data.ownerId,
    changedAt: now,
  };
  await tx.objectStore('stageHistories').add(history);
  
  await tx.done;
  return opportunity;
}

export async function updateOpportunity(id: string, data: Partial<Opportunity>): Promise<Opportunity | undefined> {
  const db = getDB();
  const opp = await db.get('opportunities', id);
  if (!opp) return undefined;
  
  const updated: Opportunity = {
    ...opp,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await db.put('opportunities', updated);
  return updated;
}

export async function updateOpportunityStage(
  id: string,
  stageId: string,
  changedById: string
): Promise<Opportunity | undefined> {
  const db = getDB();
  const opp = await db.get('opportunities', id);
  if (!opp) return undefined;
  
  if (opp.stageId === stageId) return opp;
  
  const now = new Date().toISOString();
  
  const tx = db.transaction(['opportunities', 'stageHistories'], 'readwrite');
  
  const updated: Opportunity = {
    ...opp,
    stageId,
    updatedAt: now,
  };
  await tx.objectStore('opportunities').put(updated);
  
  const history: StageHistory = {
    id: generateId(),
    opportunityId: id,
    tenantId: opp.tenantId,
    fromStageId: opp.stageId,
    toStageId: stageId,
    changedById,
    changedAt: now,
  };
  await tx.objectStore('stageHistories').add(history);
  
  await tx.done;
  return updated;
}

export async function deleteOpportunity(id: string): Promise<void> {
  const db = getDB();
  const opp = await db.get('opportunities', id);
  if (!opp) return;
  
  const tx = db.transaction(['opportunities', 'stageHistories', 'activities', 'competitors'], 'readwrite');
  
  await tx.objectStore('opportunities').delete(id);
  
  const histories = await tx.objectStore('stageHistories').index('by-opportunity').getAll(id);
  for (const h of histories) {
    await tx.objectStore('stageHistories').delete(h.id);
  }
  
  const activities = await tx.objectStore('activities').index('by-opportunity').getAll([opp.tenantId, id]);
  for (const a of activities) {
    await tx.objectStore('activities').delete(a.id);
  }
  
  const competitors = await tx.objectStore('competitors').index('by-opportunity').getAll(id);
  for (const c of competitors) {
    await tx.objectStore('competitors').delete(c.id);
  }
  
  await tx.done;
}

export async function getStages(tenantId: string): Promise<Stage[]> {
  const db = getDB();
  const stages = await db.getAllFromIndex('stages', 'by-tenant', tenantId);
  return stages.sort((a, b) => a.order - b.order);
}

export async function getStageById(id: string): Promise<Stage | undefined> {
  const db = getDB();
  return await db.get('stages', id);
}

export async function createStage(data: Omit<Stage, 'id' | 'createdAt'>): Promise<Stage> {
  const db = getDB();
  const stage: Stage = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  await db.add('stages', stage);
  return stage;
}

export async function updateStage(id: string, data: Partial<Stage>): Promise<Stage | undefined> {
  const db = getDB();
  const stage = await db.get('stages', id);
  if (!stage) return undefined;
  
  const updated: Stage = { ...stage, ...data };
  await db.put('stages', updated);
  return updated;
}

export async function deleteStage(id: string, moveToStageId: string): Promise<void> {
  const db = getDB();
  const stage = await db.get('stages', id);
  if (!stage) return;
  
  const tx = db.transaction(['stages', 'opportunities'], 'readwrite');
  
  const opps = await tx.objectStore('opportunities').index('by-tenant-stage').getAll([stage.tenantId, id]);
  for (const opp of opps) {
    await tx.objectStore('opportunities').put({ ...opp, stageId: moveToStageId });
  }
  
  await tx.objectStore('stages').delete(id);
  await tx.done;
}

export async function getStageHistories(opportunityId: string): Promise<StageHistory[]> {
  const db = getDB();
  const histories = await db.getAllFromIndex('stageHistories', 'by-opportunity', opportunityId);
  return histories.sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
}

export async function getActivitiesByOpportunity(opportunityId: string, tenantId: string): Promise<Activity[]> {
  const db = getDB();
  const activities = await db.getAllFromIndex('activities', 'by-opportunity', [tenantId, opportunityId]);
  return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createActivity(data: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
  const db = getDB();
  const activity: Activity = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  await db.add('activities', activity);
  
  if (data.customerId) {
    await db.put('customers', {
      ...(await db.get('customers', data.customerId))!,
      lastFollowUpAt: activity.createdAt,
      updatedAt: activity.createdAt,
    });
  }
  
  return activity;
}

export async function getCompetitors(opportunityId: string): Promise<Competitor[]> {
  const db = getDB();
  return await db.getAllFromIndex('competitors', 'by-opportunity', opportunityId);
}

export async function createCompetitor(data: Omit<Competitor, 'id' | 'createdAt'>): Promise<Competitor> {
  const db = getDB();
  const competitor: Competitor = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  await db.add('competitors', competitor);
  return competitor;
}

export async function deleteCompetitor(id: string): Promise<void> {
  const db = getDB();
  await db.delete('competitors', id);
}
