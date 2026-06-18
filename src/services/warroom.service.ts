import { getDB, generateId } from '@/services/db';
import type {
  WarRoom,
  WarRoomMember,
  DecisionNode,
  Requirement,
  CompetitiveAnalysis,
  Milestone,
  WarRoomTask,
  KnowledgeDoc,
  Script,
  Battle,
  BattleMessage,
  BattleReport,
  WarRoomActivityLog,
} from '@/types/models';

export async function addActivityLog(data: Omit<WarRoomActivityLog, 'id' | 'createdAt'>): Promise<WarRoomActivityLog> {
  const db = getDB();
  const log: WarRoomActivityLog = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  await db.add('warRoomActivityLogs', log);
  return log;
}

export async function getActivityLogs(warRoomId: string): Promise<WarRoomActivityLog[]> {
  const db = getDB();
  const logs = await db.getAllFromIndex('warRoomActivityLogs', 'by-war-room', warRoomId);
  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getWarRooms(
  tenantId: string,
  options?: { status?: string }
): Promise<WarRoom[]> {
  const db = getDB();

  if (options?.status) {
    return await db.getAllFromIndex('warRooms', 'by-tenant-status', [tenantId, options.status]);
  }

  return await db.getAllFromIndex('warRooms', 'by-tenant', tenantId);
}

export async function getWarRoomById(id: string): Promise<WarRoom | undefined> {
  const db = getDB();
  return await db.get('warRooms', id);
}

export async function getWarRoomByOpportunity(opportunityId: string): Promise<WarRoom | undefined> {
  const db = getDB();
  const results = await db.getAllFromIndex('warRooms', 'by-opportunity', opportunityId);
  return results[0];
}

export async function createWarRoom(
  data: Omit<WarRoom, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>
): Promise<WarRoom> {
  const db = getDB();
  const now = new Date().toISOString();
  const warRoom: WarRoom = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  const tx = db.transaction(['warRooms', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('warRooms').add(warRoom);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId: warRoom.id,
    tenantId: data.tenantId,
    userId: data.createdBy,
    actionType: 'warroom_created',
    description: `War Room "${data.name}" created`,
    createdAt: now,
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return warRoom;
}

export async function updateWarRoom(id: string, data: Partial<WarRoom>): Promise<WarRoom | undefined> {
  const db = getDB();
  const warRoom = await db.get('warRooms', id);
  if (!warRoom) return undefined;

  const updated: WarRoom = {
    ...warRoom,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await db.put('warRooms', updated);
  return updated;
}

export async function archiveWarRoom(id: string): Promise<WarRoom | undefined> {
  const db = getDB();
  const warRoom = await db.get('warRooms', id);
  if (!warRoom) return undefined;

  const now = new Date().toISOString();
  const updated: WarRoom = {
    ...warRoom,
    status: 'archived',
    archivedAt: now,
    updatedAt: now,
  };

  const tx = db.transaction(['warRooms', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('warRooms').put(updated);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId: id,
    tenantId: warRoom.tenantId,
    userId: warRoom.createdBy,
    actionType: 'warroom_archived',
    description: `War Room "${warRoom.name}" archived`,
    createdAt: now,
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return updated;
}

export async function addWarRoomMember(warRoomId: string, member: WarRoomMember): Promise<WarRoom | undefined> {
  const db = getDB();
  const warRoom = await db.get('warRooms', warRoomId);
  if (!warRoom) return undefined;

  const updated: WarRoom = {
    ...warRoom,
    members: [...warRoom.members, member],
    updatedAt: new Date().toISOString(),
  };

  const tx = db.transaction(['warRooms', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('warRooms').put(updated);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId,
    tenantId: warRoom.tenantId,
    userId: member.userId,
    actionType: 'member_added',
    description: `Member added with role "${member.role}"`,
    createdAt: new Date().toISOString(),
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return updated;
}

export async function removeWarRoomMember(warRoomId: string, userId: string): Promise<WarRoom | undefined> {
  const db = getDB();
  const warRoom = await db.get('warRooms', warRoomId);
  if (!warRoom) return undefined;

  const updated: WarRoom = {
    ...warRoom,
    members: warRoom.members.filter(m => m.userId !== userId),
    updatedAt: new Date().toISOString(),
  };

  const tx = db.transaction(['warRooms', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('warRooms').put(updated);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId,
    tenantId: warRoom.tenantId,
    userId,
    actionType: 'member_removed',
    description: `Member removed from war room`,
    createdAt: new Date().toISOString(),
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return updated;
}

export async function getDecisionNodes(warRoomId: string): Promise<DecisionNode[]> {
  const db = getDB();
  return await db.getAllFromIndex('decisionNodes', 'by-war-room', warRoomId);
}

export async function createDecisionNode(data: Omit<DecisionNode, 'id' | 'createdAt'>): Promise<DecisionNode> {
  const db = getDB();
  const now = new Date().toISOString();
  const node: DecisionNode = {
    ...data,
    id: generateId(),
    createdAt: now,
  };

  const tx = db.transaction(['decisionNodes', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('decisionNodes').add(node);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId: data.warRoomId,
    tenantId: data.tenantId,
    userId: '',
    actionType: 'decision_node_created',
    description: `Decision node "${data.name}" created`,
    createdAt: now,
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return node;
}

export async function updateDecisionNode(id: string, data: Partial<DecisionNode>): Promise<DecisionNode | undefined> {
  const db = getDB();
  const node = await db.get('decisionNodes', id);
  if (!node) return undefined;

  const updated: DecisionNode = { ...node, ...data };
  await db.put('decisionNodes', updated);
  return updated;
}

export async function deleteDecisionNode(id: string): Promise<void> {
  const db = getDB();
  await db.delete('decisionNodes', id);
}

export async function getRequirements(warRoomId: string): Promise<Requirement[]> {
  const db = getDB();
  return await db.getAllFromIndex('requirements', 'by-war-room', warRoomId);
}

export async function createRequirement(data: Omit<Requirement, 'id' | 'createdAt'>): Promise<Requirement> {
  const db = getDB();
  const now = new Date().toISOString();
  const requirement: Requirement = {
    ...data,
    id: generateId(),
    createdAt: now,
  };

  const tx = db.transaction(['requirements', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('requirements').add(requirement);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId: data.warRoomId,
    tenantId: data.tenantId,
    userId: '',
    actionType: 'requirement_created',
    description: `Requirement created: "${data.content}"`,
    createdAt: now,
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return requirement;
}

export async function updateRequirement(id: string, data: Partial<Requirement>): Promise<Requirement | undefined> {
  const db = getDB();
  const requirement = await db.get('requirements', id);
  if (!requirement) return undefined;

  const updated: Requirement = { ...requirement, ...data };
  await db.put('requirements', updated);
  return updated;
}

export async function deleteRequirement(id: string): Promise<void> {
  const db = getDB();
  await db.delete('requirements', id);
}

export async function getCompetitiveAnalyses(warRoomId: string): Promise<CompetitiveAnalysis[]> {
  const db = getDB();
  return await db.getAllFromIndex('competitiveAnalyses', 'by-war-room', warRoomId);
}

export async function createCompetitiveAnalysis(data: Omit<CompetitiveAnalysis, 'id' | 'createdAt'>): Promise<CompetitiveAnalysis> {
  const db = getDB();
  const now = new Date().toISOString();
  const analysis: CompetitiveAnalysis = {
    ...data,
    id: generateId(),
    createdAt: now,
  };

  const tx = db.transaction(['competitiveAnalyses', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('competitiveAnalyses').add(analysis);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId: data.warRoomId,
    tenantId: data.tenantId,
    userId: '',
    actionType: 'competitive_analysis_created',
    description: `Competitive analysis created for "${data.competitorName}"`,
    createdAt: now,
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return analysis;
}

export async function updateCompetitiveAnalysis(id: string, data: Partial<CompetitiveAnalysis>): Promise<CompetitiveAnalysis | undefined> {
  const db = getDB();
  const analysis = await db.get('competitiveAnalyses', id);
  if (!analysis) return undefined;

  const updated: CompetitiveAnalysis = { ...analysis, ...data };
  await db.put('competitiveAnalyses', updated);
  return updated;
}

export async function deleteCompetitiveAnalysis(id: string): Promise<void> {
  const db = getDB();
  await db.delete('competitiveAnalyses', id);
}

export async function getMilestones(warRoomId: string): Promise<Milestone[]> {
  const db = getDB();
  const milestones = await db.getAllFromIndex('milestones', 'by-war-room', warRoomId);
  return milestones.sort((a, b) => a.order - b.order);
}

export async function createMilestone(data: Omit<Milestone, 'id' | 'createdAt'>): Promise<Milestone> {
  const db = getDB();
  const now = new Date().toISOString();
  const milestone: Milestone = {
    ...data,
    id: generateId(),
    createdAt: now,
  };

  const tx = db.transaction(['milestones', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('milestones').add(milestone);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId: data.warRoomId,
    tenantId: data.tenantId,
    userId: '',
    actionType: 'milestone_created',
    description: `Milestone "${data.name}" created`,
    createdAt: now,
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return milestone;
}

export async function updateMilestone(id: string, data: Partial<Milestone>): Promise<Milestone | undefined> {
  const db = getDB();
  const milestone = await db.get('milestones', id);
  if (!milestone) return undefined;

  const updated: Milestone = { ...milestone, ...data };
  await db.put('milestones', updated);
  return updated;
}

export async function deleteMilestone(id: string): Promise<void> {
  const db = getDB();
  const milestone = await db.get('milestones', id);
  if (!milestone) return;

  const tx = db.transaction(['milestones', 'warRoomTasks'], 'readwrite');

  await tx.objectStore('milestones').delete(id);

  const tasks = await tx.objectStore('warRoomTasks').index('by-milestone').getAll(id);
  for (const task of tasks) {
    await tx.objectStore('warRoomTasks').delete(task.id);
  }

  await tx.done;
}

export async function getTasksByMilestone(milestoneId: string): Promise<WarRoomTask[]> {
  const db = getDB();
  return await db.getAllFromIndex('warRoomTasks', 'by-milestone', milestoneId);
}

export async function getTasksByWarRoom(warRoomId: string): Promise<WarRoomTask[]> {
  const db = getDB();
  return await db.getAllFromIndex('warRoomTasks', 'by-war-room', warRoomId);
}

export async function createTask(data: Omit<WarRoomTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<WarRoomTask> {
  const db = getDB();
  const now = new Date().toISOString();
  const task: WarRoomTask = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  const tx = db.transaction(['warRoomTasks', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('warRoomTasks').add(task);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId: data.warRoomId,
    tenantId: data.tenantId,
    userId: data.assigneeId,
    actionType: 'task_created',
    description: `Task "${data.name}" created`,
    createdAt: now,
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return task;
}

export async function updateTask(id: string, data: Partial<WarRoomTask>): Promise<WarRoomTask | undefined> {
  const db = getDB();
  const task = await db.get('warRoomTasks', id);
  if (!task) return undefined;

  const updated: WarRoomTask = {
    ...task,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await db.put('warRoomTasks', updated);
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  const db = getDB();
  await db.delete('warRoomTasks', id);
}

export async function getKnowledgeDocs(warRoomId: string): Promise<KnowledgeDoc[]> {
  const db = getDB();
  return await db.getAllFromIndex('knowledgeDocs', 'by-war-room', warRoomId);
}

export async function createKnowledgeDoc(data: Omit<KnowledgeDoc, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<KnowledgeDoc> {
  const db = getDB();
  const now = new Date().toISOString();
  const doc: KnowledgeDoc = {
    ...data,
    version: 1,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  const tx = db.transaction(['knowledgeDocs', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('knowledgeDocs').add(doc);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId: data.warRoomId,
    tenantId: data.tenantId,
    userId: data.createdBy,
    actionType: 'knowledge_doc_created',
    description: `Knowledge doc "${data.title}" created`,
    createdAt: now,
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return doc;
}

export async function updateKnowledgeDoc(id: string, data: Partial<KnowledgeDoc>): Promise<KnowledgeDoc | undefined> {
  const db = getDB();
  const doc = await db.get('knowledgeDocs', id);
  if (!doc) return undefined;

  const updated: KnowledgeDoc = {
    ...doc,
    ...data,
    version: doc.version + 1,
    updatedAt: new Date().toISOString(),
  };
  await db.put('knowledgeDocs', updated);
  return updated;
}

export async function deleteKnowledgeDoc(id: string): Promise<void> {
  const db = getDB();
  await db.delete('knowledgeDocs', id);
}

export async function getScripts(warRoomId: string): Promise<Script[]> {
  const db = getDB();
  return await db.getAllFromIndex('scripts', 'by-war-room', warRoomId);
}

export async function createScript(data: Omit<Script, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'ratingCount'>): Promise<Script> {
  const db = getDB();
  const now = new Date().toISOString();
  const script: Script = {
    ...data,
    rating: 0,
    ratingCount: 0,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  const tx = db.transaction(['scripts', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('scripts').add(script);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId: data.warRoomId,
    tenantId: data.tenantId,
    userId: data.createdBy,
    actionType: 'script_created',
    description: `Script "${data.scenario}" created`,
    createdAt: now,
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return script;
}

export async function updateScript(id: string, data: Partial<Script>): Promise<Script | undefined> {
  const db = getDB();
  const script = await db.get('scripts', id);
  if (!script) return undefined;

  const updated: Script = {
    ...script,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await db.put('scripts', updated);
  return updated;
}

export async function deleteScript(id: string): Promise<void> {
  const db = getDB();
  await db.delete('scripts', id);
}

export async function rateScript(id: string, rating: number): Promise<Script | undefined> {
  const db = getDB();
  const script = await db.get('scripts', id);
  if (!script) return undefined;

  const newRatingCount = script.ratingCount + 1;
  const newRating = (script.rating * script.ratingCount + rating) / newRatingCount;

  const updated: Script = {
    ...script,
    rating: newRating,
    ratingCount: newRatingCount,
    updatedAt: new Date().toISOString(),
  };
  await db.put('scripts', updated);
  return updated;
}

export async function getBattles(warRoomId: string): Promise<Battle[]> {
  const db = getDB();
  return await db.getAllFromIndex('battles', 'by-war-room', warRoomId);
}

export async function createBattle(data: Omit<Battle, 'id' | 'createdAt' | 'updatedAt' | 'messages' | 'reviewScore' | 'reviewNotes'>): Promise<Battle> {
  const db = getDB();
  const now = new Date().toISOString();
  const battle: Battle = {
    ...data,
    messages: [],
    reviewScore: 0,
    reviewNotes: '',
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  const tx = db.transaction(['battles', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('battles').add(battle);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId: data.warRoomId,
    tenantId: data.tenantId,
    userId: data.createdBy,
    actionType: 'battle_created',
    description: `Battle "${data.scenario}" created`,
    createdAt: now,
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return battle;
}

export async function updateBattle(id: string, data: Partial<Battle>): Promise<Battle | undefined> {
  const db = getDB();
  const battle = await db.get('battles', id);
  if (!battle) return undefined;

  const updated: Battle = {
    ...battle,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await db.put('battles', updated);
  return updated;
}

export async function addBattleMessage(battleId: string, message: Omit<BattleMessage, 'id' | 'createdAt'>): Promise<Battle | undefined> {
  const db = getDB();
  const battle = await db.get('battles', battleId);
  if (!battle) return undefined;

  const now = new Date().toISOString();
  const newMessage: BattleMessage = {
    ...message,
    id: generateId(),
    createdAt: now,
  };

  const updated: Battle = {
    ...battle,
    messages: [...battle.messages, newMessage],
    updatedAt: now,
  };
  await db.put('battles', updated);
  return updated;
}

export async function completeBattleReview(battleId: string, score: number, notes: string): Promise<Battle | undefined> {
  const db = getDB();
  const battle = await db.get('battles', battleId);
  if (!battle) return undefined;

  const now = new Date().toISOString();
  const updated: Battle = {
    ...battle,
    status: 'completed',
    reviewScore: score,
    reviewNotes: notes,
    updatedAt: now,
  };
  await db.put('battles', updated);
  return updated;
}

export async function getBattleReports(warRoomId: string): Promise<BattleReport[]> {
  const db = getDB();
  return await db.getAllFromIndex('battleReports', 'by-war-room', warRoomId);
}

export async function createBattleReport(data: Omit<BattleReport, 'id' | 'createdAt' | 'updatedAt' | 'published'>): Promise<BattleReport> {
  const db = getDB();
  const now = new Date().toISOString();
  const report: BattleReport = {
    ...data,
    published: false,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  const tx = db.transaction(['battleReports', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('battleReports').add(report);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId: data.warRoomId,
    tenantId: data.tenantId,
    userId: data.createdBy,
    actionType: 'battle_report_created',
    description: `Battle report "${data.title}" created`,
    createdAt: now,
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return report;
}

export async function updateBattleReport(id: string, data: Partial<BattleReport>): Promise<BattleReport | undefined> {
  const db = getDB();
  const report = await db.get('battleReports', id);
  if (!report) return undefined;

  const updated: BattleReport = {
    ...report,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await db.put('battleReports', updated);
  return updated;
}

export async function publishBattleReport(id: string): Promise<BattleReport | undefined> {
  const db = getDB();
  const report = await db.get('battleReports', id);
  if (!report) return undefined;

  const now = new Date().toISOString();
  const updated: BattleReport = {
    ...report,
    published: true,
    updatedAt: now,
  };

  const tx = db.transaction(['battleReports', 'warRoomActivityLogs'], 'readwrite');
  await tx.objectStore('battleReports').put(updated);

  const log: WarRoomActivityLog = {
    id: generateId(),
    warRoomId: report.warRoomId,
    tenantId: report.tenantId,
    userId: report.createdBy,
    actionType: 'battle_report_published',
    description: `Battle report "${report.title}" published`,
    createdAt: now,
  };
  await tx.objectStore('warRoomActivityLogs').add(log);

  await tx.done;
  return updated;
}
