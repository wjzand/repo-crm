import { getDB, generateId } from '@/services/db';
import type { Lead, LeadStatus } from '@/types/models';

export async function getLeads(tenantId: string, ownerId?: string, status?: LeadStatus): Promise<Lead[]> {
  const db = getDB();
  
  if (status) {
    const leads = await db.getAllFromIndex('leads', 'by-tenant-status', [tenantId, status]);
    if (ownerId) {
      return leads.filter(l => l.ownerId === ownerId);
    }
    return leads;
  }
  
  if (ownerId) {
    return await db.getAllFromIndex('leads', 'by-owner', [tenantId, ownerId]);
  }
  
  return await db.getAllFromIndex('leads', 'by-tenant', tenantId);
}

export async function getLeadById(id: string): Promise<Lead | undefined> {
  const db = getDB();
  return await db.get('leads', id);
}

export async function createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: LeadStatus }): Promise<Lead> {
  const db = getDB();
  const now = new Date().toISOString();
  const lead: Lead = {
    ...data,
    status: data.status || 'new',
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.add('leads', lead);
  return lead;
}

export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead | undefined> {
  const db = getDB();
  const lead = await db.get('leads', id);
  if (!lead) return undefined;
  
  const updated: Lead = {
    ...lead,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await db.put('leads', updated);
  return updated;
}

export async function assignLeads(leadIds: string[], ownerId: string): Promise<void> {
  const db = getDB();
  const tx = db.transaction('leads', 'readwrite');
  const store = tx.objectStore('leads');
  
  for (const id of leadIds) {
    const lead = await store.get(id);
    if (lead) {
      const updated: Lead = {
        ...lead,
        ownerId,
        status: 'contacted',
        updatedAt: new Date().toISOString(),
      };
      await store.put(updated);
    }
  }
  
  await tx.done;
}

export async function convertLead(
  leadId: string,
  customerData: { name: string; industry: string; level?: string },
  contactData: { name: string; phone?: string; email?: string },
  opportunityData: { name: string; amount: number; expectedCloseDate: string; stageId: string }
): Promise<{ customerId: string; opportunityId: string }> {
  const db = getDB();
  const lead = await db.get('leads', leadId);
  if (!lead) throw new Error('线索不存在');

  const now = new Date().toISOString();
  const customerId = generateId();
  const contactId = generateId();
  const opportunityId = generateId();

  const tx = db.transaction(['leads', 'customers', 'contacts', 'opportunities', 'stageHistories'], 'readwrite');

  const customer = {
    id: customerId,
    tenantId: lead.tenantId,
    ownerId: lead.ownerId || '',
    name: customerData.name,
    industry: customerData.industry,
    level: (customerData.level || 'B') as 'A' | 'B' | 'C' | 'D',
    lastFollowUpAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await tx.objectStore('customers').put(customer);

  const contact = {
    id: contactId,
    customerId,
    tenantId: lead.tenantId,
    name: contactData.name,
    phone: contactData.phone,
    email: contactData.email,
    isDecisionMaker: true,
    createdAt: now,
  };
  await tx.objectStore('contacts').put(contact);

  const opportunity = {
    id: opportunityId,
    tenantId: lead.tenantId,
    customerId,
    ownerId: lead.ownerId || '',
    leadId: lead.id,
    name: opportunityData.name,
    stageId: opportunityData.stageId,
    amount: opportunityData.amount,
    expectedCloseDate: opportunityData.expectedCloseDate,
    probability: 20,
    createdAt: now,
    updatedAt: now,
  };
  await tx.objectStore('opportunities').put(opportunity);

  const stageHistory = {
    id: generateId(),
    opportunityId,
    tenantId: lead.tenantId,
    toStageId: opportunityData.stageId,
    changedById: lead.ownerId || '',
    changedAt: now,
  };
  await tx.objectStore('stageHistories').put(stageHistory);

  const updatedLead: Lead = {
    ...lead,
    status: 'converted',
    updatedAt: now,
  };
  await tx.objectStore('leads').put(updatedLead);

  await tx.done;
  return { customerId, opportunityId };
}

export async function discardLead(id: string, reason: string): Promise<Lead | undefined> {
  const db = getDB();
  const lead = await db.get('leads', id);
  if (!lead) return undefined;
  
  const updated: Lead = {
    ...lead,
    status: 'discarded',
    discardReason: reason,
    updatedAt: new Date().toISOString(),
  };
  await db.put('leads', updated);
  return updated;
}

export async function getLeadsBySource(tenantId: string, sourceId: string): Promise<Lead[]> {
  const db = getDB();
  return await db.getAllFromIndex('leads', 'by-tenant-source', [tenantId, sourceId]);
}
