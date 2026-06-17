import { getDB, generateId } from '@/services/db';
import type { Customer, Contact, Activity } from '@/types/models';

export async function getCustomers(tenantId: string, ownerId?: string): Promise<Customer[]> {
  const db = getDB();
  
  if (ownerId) {
    return await db.getAllFromIndex('customers', 'by-owner', [tenantId, ownerId]);
  }
  return await db.getAllFromIndex('customers', 'by-tenant', tenantId);
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  const db = getDB();
  return await db.get('customers', id);
}

export async function createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
  const db = getDB();
  const now = new Date().toISOString();
  const customer: Customer = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.add('customers', customer);
  return customer;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | undefined> {
  const db = getDB();
  const customer = await db.get('customers', id);
  if (!customer) return undefined;
  
  const updated: Customer = {
    ...customer,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await db.put('customers', updated);
  return updated;
}

export async function deleteCustomer(id: string): Promise<void> {
  const db = getDB();
  const customer = await db.get('customers', id);
  if (!customer) return;
  
  const tx = db.transaction(['customers', 'contacts', 'activities'], 'readwrite');
  await tx.objectStore('customers').delete(id);
  
  const contacts = await tx.objectStore('contacts').index('by-customer').getAll([customer.tenantId, id]);
  for (const contact of contacts) {
    await tx.objectStore('contacts').delete(contact.id);
  }
  
  const activities = await tx.objectStore('activities').index('by-customer').getAll([customer.tenantId, id]);
  for (const activity of activities) {
    await tx.objectStore('activities').delete(activity.id);
  }
  
  await tx.done;
}

export async function getContactsByCustomer(customerId: string, tenantId: string): Promise<Contact[]> {
  const db = getDB();
  return await db.getAllFromIndex('contacts', 'by-customer', [tenantId, customerId]);
}

export async function createContact(data: Omit<Contact, 'id' | 'createdAt'>): Promise<Contact> {
  const db = getDB();
  const contact: Contact = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  await db.add('contacts', contact);
  return contact;
}

export async function updateContact(id: string, data: Partial<Contact>): Promise<Contact | undefined> {
  const db = getDB();
  const contact = await db.get('contacts', id);
  if (!contact) return undefined;
  
  const updated: Contact = { ...contact, ...data };
  await db.put('contacts', updated);
  return updated;
}

export async function deleteContact(id: string): Promise<void> {
  const db = getDB();
  await db.delete('contacts', id);
}

export async function getActivitiesByCustomer(customerId: string, tenantId: string): Promise<Activity[]> {
  const db = getDB();
  const activities = await db.getAllFromIndex('activities', 'by-customer', [tenantId, customerId]);
  return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function searchCustomers(tenantId: string, query: string, ownerId?: string): Promise<Customer[]> {
  const customers = await getCustomers(tenantId, ownerId);
  const lowerQuery = query.toLowerCase();
  return customers.filter(c => 
    c.name.toLowerCase().includes(lowerQuery) ||
    c.industry.toLowerCase().includes(lowerQuery)
  );
}
