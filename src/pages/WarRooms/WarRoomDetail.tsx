import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Swords,
  Users,
  Target,
  Clock,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  Star,
  Copy,
  Send,
  Archive,
  UserPlus,
  X,
  LayoutDashboard,
  GripVertical,
  BookOpen,
  Shield,
  Zap,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import {
  getWarRoomById,
  archiveWarRoom,
  addWarRoomMember,
  removeWarRoomMember,
  getDecisionNodes,
  createDecisionNode,
  updateDecisionNode,
  deleteDecisionNode,
  getRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  getCompetitiveAnalyses,
  createCompetitiveAnalysis,
  deleteCompetitiveAnalysis,
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getTasksByWarRoom,
  createTask,
  updateTask,
  getKnowledgeDocs,
  createKnowledgeDoc,
  updateKnowledgeDoc,
  deleteKnowledgeDoc,
  getScripts,
  createScript,
  updateScript,
  deleteScript,
  getScriptComments,
  createScriptComment,
  deleteScriptComment,
  rateScript,
  getBattles,
  createBattle,
  updateBattle,
  addBattleMessage,
  completeBattleReview,
  getBattleReports,
  createBattleReport,
  updateBattleReport,
  publishBattleReport,
  getActivityLogs,
} from '@/services/warroom.service';
import { getOpportunityById, getStages } from '@/services/opportunity.service';
import { getCustomerById } from '@/services/customer.service';
import { getTeamMembers } from '@/services/team.service';
import { formatCurrency, formatDate, formatRelativeTime, formatDateTime } from '@/utils/date';
import { cn } from '@/lib/utils';
import type {
  WarRoom,
  DecisionNode,
  Requirement,
  CompetitiveAnalysis,
  Milestone,
  WarRoomTask,
  KnowledgeDoc,
  Script,
  ScriptComment,
  Battle,
  BattleReport,
  WarRoomActivityLog,
  Opportunity,
  Customer,
  Stage,
  User,
  WarRoomTaskStatus,
  DecisionNodeRole,
  DecisionNodeAttitude,
  RequirementType,
  ScriptCategory,
  BattleStatus,
} from '@/types/models';

type TabType = 'dashboard' | 'analysis' | 'milestones' | 'knowledge' | 'battle' | 'reports';
type AnalysisSubTab = 'decision' | 'requirement' | 'competitive';
type KnowledgeSubTab = 'docs' | 'scripts';

const roleLabels: Record<DecisionNodeRole, string> = {
  decision_maker: '决策者',
  influencer: '影响者',
  user: '使用者',
  gatekeeper: '守门人',
};
const roleBadgeColors: Record<DecisionNodeRole, string> = {
  decision_maker: 'bg-red-100 text-red-700',
  influencer: 'bg-blue-100 text-blue-700',
  user: 'bg-green-100 text-green-700',
  gatekeeper: 'bg-amber-100 text-amber-700',
};
const attitudeLabels: Record<DecisionNodeAttitude, string> = {
  support: '支持',
  neutral: '中立',
  oppose: '反对',
};
const attitudeColors: Record<DecisionNodeAttitude, string> = {
  support: 'bg-green-500',
  neutral: 'bg-yellow-500',
  oppose: 'bg-red-500',
};
const reqTypeLabels: Record<RequirementType, string> = { explicit: '显性', implicit: '隐性' };
const reqTypeBadge: Record<RequirementType, string> = { explicit: 'bg-blue-100 text-blue-700', implicit: 'bg-purple-100 text-purple-700' };
const scriptCategoryLabels: Record<ScriptCategory, string> = {
  opening: '开场白',
  objection: '异议处理',
  comparison: '竞品对比',
  closing: '逼单',
  other: '其他',
};
const battleStatusLabels: Record<BattleStatus, string> = {
  preparing: '准备中',
  active: '进行中',
  paused: '已暂停',
  completed: '已完成',
};
const battleStatusBadge: Record<BattleStatus, string> = {
  preparing: 'bg-slate-100 text-slate-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
};
const taskStatusLabels: Record<WarRoomTaskStatus, string> = {
  todo: '待开始',
  in_progress: '进行中',
  done: '已完成',
  overdue: '已延期',
};
const taskStatusColors: Record<WarRoomTaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(i)}
          className={cn(readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110', 'transition-transform')}
        >
          <Star size={16} className={i <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
        </button>
      ))}
    </div>
  );
}

function DraggableNode({
  node,
  onSelect,
  onDelete,
}: {
  node: DecisionNode;
  onSelect: (node: DecisionNode) => void;
  onDelete: (id: string) => void;
}) {
  const [pos, setPos] = useState({ x: node.x, y: node.y });
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y });
    };
    const handleMouseUp = async () => {
      setDragging(false);
      await updateDecisionNode(node.id, { x: pos.x, y: pos.y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, pos.x, pos.y, node.id]);

  return (
    <div
      className={cn(
        'absolute w-48 bg-white rounded-xl shadow-md border-2 p-3 cursor-move select-none transition-shadow',
        dragging ? 'shadow-xl z-50 border-primary-400' : 'hover:shadow-lg border-slate-200',
        node.attitude === 'support' ? 'border-l-4 border-l-green-500' : node.attitude === 'neutral' ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-red-500'
      )}
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect(node); }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="font-medium text-sm text-slate-900 truncate">{node.name}</div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="p-0.5 hover:bg-slate-100 rounded">
          <X size={12} className="text-slate-400" />
        </button>
      </div>
      <div className="text-xs text-slate-500 mb-2">{node.position}</div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', roleBadgeColors[node.role])}>{roleLabels[node.role]}</span>
        <span className={cn('w-2 h-2 rounded-full', attitudeColors[node.attitude])} title={attitudeLabels[node.attitude]} />
        {node.influence > 0 && <span className="text-xs text-slate-400 ml-auto">影响力 {node.influence}</span>}
      </div>
    </div>
  );
}

function TaskKanbanCard({ task, userMap }: { task: WarRoomTask; userMap: Record<string, string> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isOverdue = task.status !== 'done' && new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-lg p-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all group',
        isDragging && 'shadow-lg rotate-2 scale-105 z-50',
        isOverdue && 'border-l-4 border-l-red-400'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={14} className="text-slate-400" />
        </div>
        <span className="text-sm font-medium text-slate-900 flex-1 ml-1">{task.name}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{userMap[task.assigneeId] || '未分配'}</span>
        <span className={isOverdue ? 'text-red-500 font-medium' : ''}>{formatDate(task.dueDate, 'MM/DD')}</span>
      </div>
    </div>
  );
}

function TaskKanbanColumn({ status, tasks, userMap }: { status: WarRoomTaskStatus; tasks: WarRoomTask[]; userMap: Record<string, string> }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', taskStatusColors[status])}>{taskStatusLabels[status]}</span>
          <span className="text-xs text-slate-400">{tasks.length}</span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn('bg-slate-50 rounded-xl p-2 min-h-[150px] space-y-2 transition-colors', isOver && 'ring-2 ring-primary-400 bg-primary-50/50')}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => <TaskKanbanCard key={task.id} task={task} userMap={userMap} />)}
        </SortableContext>
        {tasks.length === 0 && <div className="text-center py-6 text-xs text-slate-400">暂无任务</div>}
      </div>
    </div>
  );
}

function DashboardTab({ warRoom, activityLogs, milestones, tasks, knowledgeDocs, userMap }: {
  warRoom: WarRoom; activityLogs: WarRoomActivityLog[]; milestones: Milestone[]; tasks: WarRoomTask[]; knowledgeDocs: KnowledgeDoc[]; userMap: Record<string, string>;
}) {
  const completedMilestones = milestones.filter((m) => m.completed).length;
  const milestoneProgress = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;
  const activeTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const memberCount = warRoom.members.length;

  const contributionMap: Record<string, number> = {};
  activityLogs.forEach((log) => { contributionMap[log.userId] = (contributionMap[log.userId] || 0) + 1; });
  const contributions = Object.entries(contributionMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2"><Target size={20} className="text-primary-500" /><span className="text-sm text-slate-500">里程碑进度</span></div>
          <p className="text-2xl font-bold text-slate-900 font-display">{milestoneProgress}%</p>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${milestoneProgress}%` }} /></div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2"><Zap size={20} className="text-amber-500" /><span className="text-sm text-slate-500">进行中任务</span></div>
          <p className="text-2xl font-bold text-slate-900 font-display">{activeTasks}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2"><BookOpen size={20} className="text-blue-500" /><span className="text-sm text-slate-500">知识文档</span></div>
          <p className="text-2xl font-bold text-slate-900 font-display">{knowledgeDocs.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2"><Users size={20} className="text-purple-500" /><span className="text-sm text-slate-500">团队成员</span></div>
          <p className="text-2xl font-bold text-slate-900 font-display">{memberCount}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">最近动态</h3>
          {activityLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">暂无动态</div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
              <div className="space-y-4">
                {activityLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="relative flex gap-3">
                    <div className="relative z-10 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center"><MessageSquare size={14} className="text-primary-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{log.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">成员贡献榜</h3>
          {contributions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">暂无贡献数据</div>
          ) : (
            <div className="space-y-3">
              {contributions.map(([userId, count], index) => (
                <div key={userId} className="flex items-center gap-3">
                  <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500')}>
                    {index + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-white text-xs">{userMap[userId]?.charAt(0) || '?'}</div>
                  <span className="flex-1 text-sm font-medium text-slate-700">{userMap[userId] || '未知'}</span>
                  <span className="text-sm text-slate-500">{count} 次操作</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DecisionChainSubTab({ warRoomId, tenantId, nodes, onRefresh }: { warRoomId: string; tenantId: string; nodes: DecisionNode[]; onRefresh: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<DecisionNode | null>(null);
  const [editForm, setEditForm] = useState<Partial<DecisionNode>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', position: '', role: 'influencer' as DecisionNodeRole, attitude: 'neutral' as DecisionNodeAttitude, influence: 5 });

  const handleAddNode = async () => {
    if (!addForm.name.trim()) return;
    await createDecisionNode({ warRoomId, tenantId, name: addForm.name, position: addForm.position, role: addForm.role, attitude: addForm.attitude, influence: addForm.influence, contactStatus: '', x: 50 + Math.random() * 300, y: 50 + Math.random() * 200 });
    setAddForm({ name: '', position: '', role: 'influencer', attitude: 'neutral', influence: 5 });
    setShowAddForm(false);
    onRefresh();
  };

  const handleDeleteNode = async (id: string) => {
    if (!confirm('确定删除此节点？')) return;
    await deleteDecisionNode(id);
    setSelectedNode(null);
    onRefresh();
  };

  const handleUpdateNode = async () => {
    if (!selectedNode || !editForm.name) return;
    await updateDecisionNode(selectedNode.id, editForm);
    setSelectedNode(null);
    setEditForm({});
    onRefresh();
  };

  const handleSelectNode = (node: DecisionNode) => {
    setSelectedNode(node);
    setEditForm({ name: node.name, position: node.position, role: node.role, attitude: node.attitude, influence: node.influence });
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus size={14} />添加节点
          </button>
        </div>
        {showAddForm && (
          <div className="mb-4 p-4 bg-white rounded-xl shadow-card space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="姓名" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <input placeholder="职位" value={addForm.position} onChange={(e) => setAddForm({ ...addForm, position: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value as DecisionNodeRole })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="decision_maker">决策者</option><option value="influencer">影响者</option><option value="user">使用者</option><option value="gatekeeper">守门人</option>
              </select>
              <select value={addForm.attitude} onChange={(e) => setAddForm({ ...addForm, attitude: e.target.value as DecisionNodeAttitude })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="support">支持</option><option value="neutral">中立</option><option value="oppose">反对</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">影响力:</span>
              <input type="number" min={1} max={10} value={addForm.influence} onChange={(e) => setAddForm({ ...addForm, influence: Number(e.target.value) })} className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
              <button onClick={handleAddNode} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg">添加</button>
            </div>
          </div>
        )}
        <div ref={containerRef} className="relative bg-slate-50 rounded-xl border border-slate-200 min-h-[500px] overflow-hidden" onClick={() => { setSelectedNode(null); setEditForm({}); }}>
          {nodes.length === 0 ? (
            <div className="flex items-center justify-center h-[500px] text-slate-400">点击"添加节点"开始构建决策链</div>
          ) : nodes.map((node) => <DraggableNode key={node.id} node={node} onSelect={handleSelectNode} onDelete={handleDeleteNode} />)}
        </div>
      </div>
      {selectedNode && (
        <div className="w-72 bg-white rounded-xl shadow-card p-4 space-y-3 h-fit">
          <h4 className="font-semibold text-slate-900">编辑节点</h4>
          <div><label className="text-xs text-slate-500">姓名</label><input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="text-xs text-slate-500">职位</label><input value={editForm.position || ''} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="text-xs text-slate-500">角色</label><select value={editForm.role || 'influencer'} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as DecisionNodeRole })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="decision_maker">决策者</option><option value="influencer">影响者</option><option value="user">使用者</option><option value="gatekeeper">守门人</option></select></div>
          <div><label className="text-xs text-slate-500">态度</label><select value={editForm.attitude || 'neutral'} onChange={(e) => setEditForm({ ...editForm, attitude: e.target.value as DecisionNodeAttitude })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="support">支持</option><option value="neutral">中立</option><option value="oppose">反对</option></select></div>
          <div><label className="text-xs text-slate-500">影响力</label><input type="number" min={1} max={10} value={editForm.influence || 5} onChange={(e) => setEditForm({ ...editForm, influence: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleUpdateNode} className="flex-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg">保存</button>
            <button onClick={() => handleDeleteNode(selectedNode.id)} className="px-3 py-1.5 text-sm text-danger-600 hover:bg-danger-50 rounded-lg">删除</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RequirementsSubTab({ warRoomId, tenantId, requirements, onRefresh }: { warRoomId: string; tenantId: string; requirements: Requirement[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ content: '', type: 'explicit' as RequirementType, priority: 3, difficulty: 3, productFeature: '' });
  const coveredCount = requirements.filter((r) => r.covered).length;
  const coveragePercent = requirements.length > 0 ? Math.round((coveredCount / requirements.length) * 100) : 0;

  const handleAdd = async () => {
    if (!addForm.content.trim()) return;
    await createRequirement({ warRoomId, tenantId, content: addForm.content, type: addForm.type, priority: addForm.priority, difficulty: addForm.difficulty, productFeature: addForm.productFeature, covered: false });
    setAddForm({ content: '', type: 'explicit', priority: 3, difficulty: 3, productFeature: '' });
    setShowAdd(false);
    onRefresh();
  };
  const handleToggleCovered = async (req: Requirement) => { await updateRequirement(req.id, { covered: !req.covered }); onRefresh(); };
  const handleDelete = async (id: string) => { if (!confirm('确定删除？')) return; await deleteRequirement(id); onRefresh(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">覆盖率: {coveredCount}/{requirements.length} = {coveragePercent}%</span>
          <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${coveragePercent}%` }} /></div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"><Plus size={14} />添加需求</button>
      </div>
      {showAdd && (
        <div className="mb-4 p-4 bg-white rounded-xl shadow-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="需求内容" value={addForm.content} onChange={(e) => setAddForm({ ...addForm, content: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 col-span-2" />
            <select value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value as RequirementType })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="explicit">显性需求</option><option value="implicit">隐性需求</option>
            </select>
            <input placeholder="对应产品功能" value={addForm.productFeature} onChange={(e) => setAddForm({ ...addForm, productFeature: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><span className="text-sm text-slate-500">优先级:</span><StarRating value={addForm.priority} onChange={(v) => setAddForm({ ...addForm, priority: v })} /></div>
            <div className="flex items-center gap-2"><span className="text-sm text-slate-500">难度:</span><StarRating value={addForm.difficulty} onChange={(v) => setAddForm({ ...addForm, difficulty: v })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
            <button onClick={handleAdd} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg">添加</button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">需求内容</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-20">类型</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 w-24">优先级</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 w-24">难度</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">产品功能</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 w-16">覆盖</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requirements.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">暂无需求分析</td></tr>
            ) : requirements.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-700">{req.content}</td>
                <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded text-xs font-medium', reqTypeBadge[req.type])}>{reqTypeLabels[req.type]}</span></td>
                <td className="px-4 py-3 text-center"><StarRating value={req.priority} readonly /></td>
                <td className="px-4 py-3 text-center"><StarRating value={req.difficulty} readonly /></td>
                <td className="px-4 py-3 text-sm text-slate-500">{req.productFeature || '-'}</td>
                <td className="px-4 py-3 text-center"><input type="checkbox" checked={req.covered} onChange={() => handleToggleCovered(req)} className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500" /></td>
                <td className="px-4 py-3"><button onClick={() => handleDelete(req.id)} className="p-1 hover:bg-danger-50 rounded text-slate-400 hover:text-danger-500"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompetitiveSubTab({ warRoomId, tenantId, analyses, onRefresh }: { warRoomId: string; tenantId: string; analyses: CompetitiveAnalysis[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ competitorName: '', price: 'average', product: 'average', service: 'average', relationship: 'average', strengths: '', weaknesses: '', strategy: '' });

  const ratingBadge = (val: string) => val === 'good' ? 'bg-green-100 text-green-700' : val === 'poor' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600';
  const ratingLabel = (val: string) => val === 'good' ? '优' : val === 'poor' ? '劣' : '中';

  const handleAdd = async () => {
    if (!addForm.competitorName.trim()) return;
    await createCompetitiveAnalysis({ warRoomId, tenantId, competitorName: addForm.competitorName, price: addForm.price, product: addForm.product, service: addForm.service, relationship: addForm.relationship, strengths: addForm.strengths, weaknesses: addForm.weaknesses, strategy: addForm.strategy });
    setAddForm({ competitorName: '', price: 'average', product: 'average', service: 'average', relationship: 'average', strengths: '', weaknesses: '', strategy: '' });
    setShowAdd(false);
    onRefresh();
  };
  const handleDelete = async (id: string) => { if (!confirm('确定删除？')) return; await deleteCompetitiveAnalysis(id); onRefresh(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">竞争态势</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"><Plus size={14} />添加竞品</button>
      </div>
      {showAdd && (
        <div className="mb-4 p-4 bg-white rounded-xl shadow-card space-y-3">
          <input placeholder="竞品名称" value={addForm.competitorName} onChange={(e) => setAddForm({ ...addForm, competitorName: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <div className="grid grid-cols-4 gap-3">
            {(['price', 'product', 'service', 'relationship'] as const).map((dim) => (
              <div key={dim}>
                <label className="text-xs text-slate-500">{{ price: '价格', product: '产品', service: '服务', relationship: '关系' }[dim]}</label>
                <select value={addForm[dim]} onChange={(e) => setAddForm({ ...addForm, [dim]: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="good">优</option><option value="average">中</option><option value="poor">劣</option>
                </select>
              </div>
            ))}
          </div>
          <textarea placeholder="竞品优势" value={addForm.strengths} onChange={(e) => setAddForm({ ...addForm, strengths: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={2} />
          <textarea placeholder="竞品劣势" value={addForm.weaknesses} onChange={(e) => setAddForm({ ...addForm, weaknesses: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={2} />
          <textarea placeholder="我方策略" value={addForm.strategy} onChange={(e) => setAddForm({ ...addForm, strategy: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={2} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
            <button onClick={handleAdd} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg">添加</button>
          </div>
        </div>
      )}
      {analyses.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无竞品分析</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyses.map((analysis) => (
            <div key={analysis.id} className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-900">{analysis.competitorName}</h4>
                <button onClick={() => handleDelete(analysis.id)} className="p-1 hover:bg-danger-50 rounded text-slate-400 hover:text-danger-500"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {(['price', 'product', 'service', 'relationship'] as const).map((dim) => (
                  <div key={dim} className="text-center">
                    <p className="text-xs text-slate-500 mb-1">{{ price: '价格', product: '产品', service: '服务', relationship: '关系' }[dim]}</p>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', ratingBadge(analysis[dim]))}>{ratingLabel(analysis[dim])}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm">
                {analysis.strengths && <div><span className="text-green-600 font-medium">优势：</span><span className="text-slate-600">{analysis.strengths}</span></div>}
                {analysis.weaknesses && <div><span className="text-red-600 font-medium">劣势：</span><span className="text-slate-600">{analysis.weaknesses}</span></div>}
                {analysis.strategy && <div><span className="text-primary-600 font-medium">策略：</span><span className="text-slate-600">{analysis.strategy}</span></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalysisTab({ warRoomId, tenantId, decisionNodes, requirements, competitiveAnalyses, onRefresh }: {
  warRoomId: string; tenantId: string; decisionNodes: DecisionNode[]; requirements: Requirement[]; competitiveAnalyses: CompetitiveAnalysis[]; onRefresh: () => void;
}) {
  const [subTab, setSubTab] = useState<AnalysisSubTab>('decision');
  const subTabs: { key: AnalysisSubTab; label: string }[] = [
    { key: 'decision', label: '决策链' }, { key: 'requirement', label: '需求分析' }, { key: 'competitive', label: '竞争态势' },
  ];
  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {subTabs.map((tab) => (
          <button key={tab.key} onClick={() => setSubTab(tab.key)} className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-all', subTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
            {tab.label}
          </button>
        ))}
      </div>
      {subTab === 'decision' && <DecisionChainSubTab warRoomId={warRoomId} tenantId={tenantId} nodes={decisionNodes} onRefresh={onRefresh} />}
      {subTab === 'requirement' && <RequirementsSubTab warRoomId={warRoomId} tenantId={tenantId} requirements={requirements} onRefresh={onRefresh} />}
      {subTab === 'competitive' && <CompetitiveSubTab warRoomId={warRoomId} tenantId={tenantId} analyses={competitiveAnalyses} onRefresh={onRefresh} />}
    </div>
  );
}

function MilestonesTab({ warRoomId, tenantId, milestones, tasks, userMap, onRefresh }: {
  warRoomId: string; tenantId: string; milestones: Milestone[]; tasks: WarRoomTask[]; userMap: Record<string, string>; onRefresh: () => void;
}) {
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(milestones[0]?.id || null);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ name: '', dueDate: '' });
  const [taskForm, setTaskForm] = useState({ name: '', assigneeId: '', dueDate: '', milestoneId: '' });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const overdueMilestones = milestones.filter((m) => !m.completed && new Date(m.dueDate) < new Date());
  const milestoneTasks = selectedMilestone ? tasks.filter((t) => t.milestoneId === selectedMilestone) : tasks;
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;

  const handleAddMilestone = async () => {
    if (!milestoneForm.name.trim() || !milestoneForm.dueDate) return;
    await createMilestone({ warRoomId, tenantId, name: milestoneForm.name, dueDate: milestoneForm.dueDate, completed: false, order: milestones.length });
    setMilestoneForm({ name: '', dueDate: '' }); setShowAddMilestone(false); onRefresh();
  };
  const handleAddTask = async () => {
    if (!taskForm.name.trim() || !taskForm.milestoneId || !taskForm.dueDate) return;
    await createTask({ warRoomId, tenantId, milestoneId: taskForm.milestoneId, name: taskForm.name, assigneeId: taskForm.assigneeId, dueDate: taskForm.dueDate, status: 'todo' });
    setTaskForm({ name: '', assigneeId: '', dueDate: '', milestoneId: '' }); setShowAddTask(false); onRefresh();
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const overId = over.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const statusValues: WarRoomTaskStatus[] = ['todo', 'in_progress', 'done', 'overdue'];
    if (statusValues.includes(overId as WarRoomTaskStatus)) {
      if (task.status === overId) return;
      await updateTask(taskId, { status: overId as WarRoomTaskStatus }); onRefresh();
    }
  };
  const handleToggleMilestone = async (milestone: Milestone) => {
    await updateMilestone(milestone.id, { completed: !milestone.completed, completedAt: !milestone.completed ? new Date().toISOString() : undefined }); onRefresh();
  };
  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('确定删除此里程碑及其所有任务？')) return;
    await deleteMilestone(id); if (selectedMilestone === id) setSelectedMilestone(null); onRefresh();
  };

  return (
    <div>
      {overdueMilestones.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500" />
          <span className="text-sm text-red-700 font-medium">{overdueMilestones.length} 个里程碑已逾期！</span>
        </div>
      )}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setShowAddMilestone(true)} className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"><Plus size={14} />添加里程碑</button>
        <button onClick={() => { setTaskForm({ ...taskForm, milestoneId: selectedMilestone || '' }); setShowAddTask(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"><Plus size={14} />添加任务</button>
      </div>
      {showAddMilestone && (
        <div className="mb-4 p-4 bg-white rounded-xl shadow-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="里程碑名称" value={milestoneForm.name} onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <input type="date" value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddMilestone(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
            <button onClick={handleAddMilestone} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg">添加</button>
          </div>
        </div>
      )}
      {showAddTask && (
        <div className="mb-4 p-4 bg-white rounded-xl shadow-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="任务名称" value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <select value={taskForm.milestoneId} onChange={(e) => setTaskForm({ ...taskForm, milestoneId: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">选择里程碑</option>{milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select value={taskForm.assigneeId} onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">选择负责人</option>{Object.entries(userMap).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddTask(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
            <button onClick={handleAddTask} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg">添加</button>
          </div>
        </div>
      )}
      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0">
          <h4 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">里程碑</h4>
          {milestones.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">暂无里程碑</div>
          ) : (
            <div className="space-y-2">
              {milestones.map((milestone) => {
                const mTasks = tasks.filter((t) => t.milestoneId === milestone.id);
                const doneTasks = mTasks.filter((t) => t.status === 'done').length;
                const isOverdue = !milestone.completed && new Date(milestone.dueDate) < new Date();
                return (
                  <div key={milestone.id} onClick={() => setSelectedMilestone(milestone.id)} className={cn('p-3 rounded-xl cursor-pointer transition-all border', selectedMilestone === milestone.id ? 'bg-primary-50 border-primary-200 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50')}>
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={(e) => { e.stopPropagation(); handleToggleMilestone(milestone); }} className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors', milestone.completed ? 'bg-green-500 border-green-500' : isOverdue ? 'border-red-400' : 'border-slate-300')}>
                        {milestone.completed && <CheckCircle size={14} className="text-white" />}
                      </button>
                      <span className={cn('text-sm font-medium flex-1 truncate', milestone.completed && 'line-through text-slate-400')}>{milestone.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteMilestone(milestone.id); }} className="p-0.5 hover:bg-slate-200 rounded"><X size={12} className="text-slate-400" /></button>
                    </div>
                    <div className="ml-7">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1"><Clock size={10} /><span className={isOverdue ? 'text-red-500 font-medium' : ''}>{formatDate(milestone.dueDate)}</span></div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className={cn('h-full rounded-full transition-all', milestone.completed ? 'bg-green-500' : 'bg-primary-500')} style={{ width: mTasks.length > 0 ? `${(doneTasks / mTasks.length) * 100}%` : '0%' }} /></div>
                      <span className="text-xs text-slate-400">{doneTasks}/{mTasks.length} 任务</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex-1">
          {milestones.find((m) => m.id === selectedMilestone) && (
            <div className="mb-4 p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">当前: <strong>{milestones.find((m) => m.id === selectedMilestone)?.name}</strong> — 截止 {formatDate(milestones.find((m) => m.id === selectedMilestone)?.dueDate || '')}</span>
            </div>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={({ active }) => setActiveTaskId(active.id as string)} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {(['todo', 'in_progress', 'done', 'overdue'] as WarRoomTaskStatus[]).map((status) => (
                <TaskKanbanColumn key={status} status={status} tasks={milestoneTasks.filter((t) => t.status === status)} userMap={userMap} />
              ))}
            </div>
            <DragOverlay>
              {activeTask && (
                <div className="opacity-90 rotate-3 scale-105">
                  <div className="bg-white rounded-lg p-3 shadow-md border border-slate-200">
                    <p className="text-sm font-medium text-slate-900">{activeTask.name}</p>
                    <p className="text-xs text-slate-500">{userMap[activeTask.assigneeId] || '未分配'}</p>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

function KnowledgeTab({ warRoomId, tenantId, knowledgeDocs, scripts, userId, onRefresh }: {
  warRoomId: string; tenantId: string; knowledgeDocs: KnowledgeDoc[]; scripts: Script[]; userId: string; onRefresh: () => void;
}) {
  const [subTab, setSubTab] = useState<KnowledgeSubTab>('docs');
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDoc | null>(null);
  const [docForm, setDocForm] = useState({ title: '', content: '', type: 'document' as 'document' | 'link' | 'image' });
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [scriptForm, setScriptForm] = useState({ scenario: '', content: '', category: 'opening' as ScriptCategory, notes: '' });
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [expandedScriptId, setExpandedScriptId] = useState<string | null>(null);
  const [scriptComments, setScriptComments] = useState<Record<string, ScriptComment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});

  const subTabs: { key: KnowledgeSubTab; label: string }[] = [{ key: 'docs', label: '文档' }, { key: 'scripts', label: '话术库' }];

  const handleSaveDoc = async () => {
    if (!docForm.title.trim()) return;
    if (editingDoc) { await updateKnowledgeDoc(editingDoc.id, { title: docForm.title, content: docForm.content, type: docForm.type }); }
    else { await createKnowledgeDoc({ warRoomId, tenantId, title: docForm.title, content: docForm.content, type: docForm.type, createdBy: userId }); }
    setDocForm({ title: '', content: '', type: 'document' }); setEditingDoc(null); setShowDocModal(false); onRefresh();
  };
  const handleDeleteDoc = async (id: string) => { if (!confirm('确定删除？')) return; await deleteKnowledgeDoc(id); onRefresh(); };
  const handleSaveScript = async () => {
    if (!scriptForm.scenario.trim() || !scriptForm.content.trim()) return;
    if (editingScript) { await updateScript(editingScript.id, { scenario: scriptForm.scenario, content: scriptForm.content, category: scriptForm.category, notes: scriptForm.notes }); }
    else { await createScript({ warRoomId, tenantId, scenario: scriptForm.scenario, content: scriptForm.content, category: scriptForm.category, notes: scriptForm.notes, createdBy: userId }); }
    setScriptForm({ scenario: '', content: '', category: 'opening', notes: '' }); setEditingScript(null); setShowScriptModal(false); onRefresh();
  };
  const handleDeleteScript = async (id: string) => { if (!confirm('确定删除？')) return; await deleteScript(id); onRefresh(); };
  const handleCopyScript = async (script: Script) => {
    try { await navigator.clipboard.writeText(script.content); setCopySuccess(script.id); setTimeout(() => setCopySuccess(null), 2000); } catch {}
  };
  const handleToggleComments = async (script: Script) => {
    if (expandedScriptId === script.id) {
      setExpandedScriptId(null);
      return;
    }
    setExpandedScriptId(script.id);
    const comments = await getScriptComments(script.id);
    setScriptComments((prev) => ({ ...prev, [script.id]: comments }));
  };
  const handleAddComment = async (script: Script) => {
    const content = newComment[script.id]?.trim();
    if (!content) return;
    const comment = await createScriptComment({
      scriptId: script.id,
      tenantId,
      userId,
      content,
    });
    setScriptComments((prev) => ({
      ...prev,
      [script.id]: [...(prev[script.id] || []), comment],
    }));
    setNewComment((prev) => ({ ...prev, [script.id]: '' }));
  };
  const handleDeleteComment = async (scriptId: string, commentId: string) => {
    if (!confirm('确定删除此评论？')) return;
    await deleteScriptComment(commentId);
    setScriptComments((prev) => ({
      ...prev,
      [scriptId]: (prev[scriptId] || []).filter((c) => c.id !== commentId),
    }));
  };
  const handleRateScript = async (script: Script, rating: number) => {
    await rateScript(script.id, rating);
    onRefresh();
  };
  const openEditDoc = (doc: KnowledgeDoc) => { setEditingDoc(doc); setDocForm({ title: doc.title, content: doc.content, type: doc.type }); setShowDocModal(true); };
  const openEditScript = (script: Script) => { setEditingScript(script); setScriptForm({ scenario: script.scenario, content: script.content, category: script.category, notes: script.notes || '' }); setShowScriptModal(true); };

  const groupedScripts = scripts.reduce((acc, script) => { if (!acc[script.category]) acc[script.category] = []; acc[script.category].push(script); return acc; }, {} as Record<ScriptCategory, Script[]>);

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {subTabs.map((tab) => (
          <button key={tab.key} onClick={() => setSubTab(tab.key)} className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-all', subTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
            {tab.label}
          </button>
        ))}
      </div>
      {subTab === 'docs' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">文档列表</h3>
            <button onClick={() => { setEditingDoc(null); setDocForm({ title: '', content: '', type: 'document' }); setShowDocModal(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"><Plus size={14} />添加文档</button>
          </div>
          {showDocModal && (
            <div className="mb-4 p-4 bg-white rounded-xl shadow-card space-y-3">
              <input placeholder="文档标题" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <select value={docForm.type} onChange={(e) => setDocForm({ ...docForm, type: e.target.value as 'document' | 'link' | 'image' })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="document">文档</option><option value="link">链接</option><option value="image">图片</option>
              </select>
              <textarea placeholder="文档内容" value={docForm.content} onChange={(e) => setDocForm({ ...docForm, content: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={6} />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowDocModal(false); setEditingDoc(null); }} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                <button onClick={handleSaveDoc} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg">保存</button>
              </div>
            </div>
          )}
          {knowledgeDocs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">暂无文档</div>
          ) : (
            <div className="space-y-2">
              {knowledgeDocs.map((doc) => (
                <div key={doc.id} className="bg-white rounded-xl shadow-card p-4 flex items-center gap-4">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', doc.type === 'document' ? 'bg-blue-100 text-blue-600' : doc.type === 'link' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600')}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{doc.title}</p>
                    <p className="text-xs text-slate-400">v{doc.version} · {formatRelativeTime(doc.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditDoc(doc)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"><Edit size={14} /></button>
                    <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 hover:bg-danger-50 rounded-lg text-slate-400 hover:text-danger-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {subTab === 'scripts' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">话术库</h3>
            <button onClick={() => { setEditingScript(null); setScriptForm({ scenario: '', content: '', category: 'opening', notes: '' }); setShowScriptModal(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"><Plus size={14} />添加话术</button>
          </div>
          {showScriptModal && (
            <div className="mb-4 p-4 bg-white rounded-xl shadow-card space-y-3">
              <input placeholder="场景描述" value={scriptForm.scenario} onChange={(e) => setScriptForm({ ...scriptForm, scenario: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <select value={scriptForm.category} onChange={(e) => setScriptForm({ ...scriptForm, category: e.target.value as ScriptCategory })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="opening">开场白</option><option value="objection">异议处理</option><option value="comparison">竞品对比</option><option value="closing">逼单</option><option value="other">其他</option>
              </select>
              <textarea placeholder="话术内容" value={scriptForm.content} onChange={(e) => setScriptForm({ ...scriptForm, content: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={4} />
              <textarea placeholder="备注" value={scriptForm.notes} onChange={(e) => setScriptForm({ ...scriptForm, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={2} />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowScriptModal(false); setEditingScript(null); }} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                <button onClick={handleSaveScript} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg">保存</button>
              </div>
            </div>
          )}
          {scripts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">暂无话术</div>
          ) : (
            <div className="space-y-6">
              {(Object.entries(groupedScripts) as [ScriptCategory, Script[]][]).map(([category, categoryScripts]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                    <MessageSquare size={14} />{scriptCategoryLabels[category]}
                  </h4>
                  <div className="space-y-2">
                    {categoryScripts.map((script) => (
                      <div key={script.id} className="bg-white rounded-xl shadow-card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-900">{script.scenario}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleComments(script)}
                              className={cn(
                                'p-1.5 rounded-lg transition-colors flex items-center gap-1',
                                expandedScriptId === script.id
                                  ? 'bg-primary-100 text-primary-600'
                                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                              )}
                              title="评论"
                            >
                              <MessageSquare size={14} />
                              {(scriptComments[script.id]?.length || 0) > 0 && (
                                <span className="text-xs font-medium">{scriptComments[script.id].length}</span>
                              )}
                            </button>
                            <button onClick={() => handleCopyScript(script)} className={cn('p-1.5 rounded-lg transition-colors', copySuccess === script.id ? 'bg-green-100 text-green-600' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600')}>
                              <Copy size={14} />
                            </button>
                            <button onClick={() => openEditScript(script)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"><Edit size={14} /></button>
                            <button onClick={() => handleDeleteScript(script.id)} className="p-1.5 hover:bg-danger-50 rounded-lg text-slate-400 hover:text-danger-500"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{script.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <StarRating value={Math.round(script.rating)} onChange={(v) => handleRateScript(script, v)} />
                            <span className="text-xs text-slate-400">({script.ratingCount})</span>
                          </div>
                          {script.notes && <span className="text-xs text-slate-400 truncate ml-auto">{script.notes}</span>}
                        </div>
                        {expandedScriptId === script.id && (
                          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                            <div className="space-y-2">
                              {(scriptComments[script.id] || []).length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-400">暂无评论</div>
                              ) : (
                                (scriptComments[script.id] || []).map((comment) => (
                                  <div key={comment.id} className="flex items-start gap-2">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                                      {comment.userId.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-slate-700">{comment.userId}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-slate-400">{formatRelativeTime(comment.createdAt)}</span>
                                          <button onClick={() => handleDeleteComment(script.id, comment.id)} className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-danger-500">
                                            <X size={12} />
                                          </button>
                                        </div>
                                      </div>
                                      <p className="text-sm text-slate-600 mt-0.5">{comment.content}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                            <div className="flex gap-2">
                              <input
                                value={newComment[script.id] || ''}
                                onChange={(e) => setNewComment((prev) => ({ ...prev, [script.id]: e.target.value }))}
                                placeholder="添加评论..."
                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment(script)}
                              />
                              <button
                                onClick={() => handleAddComment(script)}
                                disabled={!newComment[script.id]?.trim()}
                                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-lg transition-colors"
                              >
                                发送
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BattleTab({ warRoomId, tenantId, battles, userId, onRefresh }: {
  warRoomId: string; tenantId: string; battles: Battle[]; userId: string; onRefresh: () => void;
}) {
  const [activeBattle, setActiveBattle] = useState<Battle | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messageRole, setMessageRole] = useState<'our_side' | 'client_side'>('our_side');
  const [showCreateBattle, setShowCreateBattle] = useState(false);
  const [battleForm, setBattleForm] = useState({ scenario: '', clientChallenges: '' });
  const [showReview, setShowReview] = useState(false);
  const [reviewScore, setReviewScore] = useState(3);
  const [reviewNotes, setReviewNotes] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeBattle?.messages?.length]);

  const handleCreateBattle = async () => {
    if (!battleForm.scenario.trim()) return;
    await createBattle({ warRoomId, tenantId, scenario: battleForm.scenario, status: 'preparing', participants: [userId], clientChallenges: battleForm.clientChallenges.split('\n').filter(Boolean), createdBy: userId });
    setBattleForm({ scenario: '', clientChallenges: '' }); setShowCreateBattle(false); onRefresh();
  };
  const handleStartBattle = async (battle: Battle) => { await updateBattle(battle.id, { status: 'active' }); onRefresh(); const updated = battles.find((b) => b.id === battle.id); if (updated) setActiveBattle({ ...updated, status: 'active' }); };
  const handlePauseBattle = async (battle: Battle) => { await updateBattle(battle.id, { status: 'paused' }); onRefresh(); if (activeBattle?.id === battle.id) setActiveBattle({ ...activeBattle, status: 'paused' }); };
  const handleSendMessage = async () => {
    if (!activeBattle || !messageInput.trim()) return;
    await addBattleMessage(activeBattle.id, { battleId: activeBattle.id, userId, role: messageRole, content: messageInput });
    setMessageInput('');
    onRefresh();
    const updated = battles.find((b) => b.id === activeBattle.id);
    if (updated) setActiveBattle(updated);
  };
  const handleCompleteReview = async () => {
    if (!activeBattle) return;
    await completeBattleReview(activeBattle.id, reviewScore, reviewNotes);
    setShowReview(false); setReviewScore(3); setReviewNotes(''); onRefresh();
    setActiveBattle(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">对抗演练</h3>
        <button onClick={() => setShowCreateBattle(!showCreateBattle)} className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"><Plus size={14} />创建对抗</button>
      </div>
      {showCreateBattle && (
        <div className="mb-4 p-4 bg-white rounded-xl shadow-card space-y-3">
          <input placeholder="场景描述" value={battleForm.scenario} onChange={(e) => setBattleForm({ ...battleForm, scenario: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <textarea placeholder="客户挑战（每行一个）" value={battleForm.clientChallenges} onChange={(e) => setBattleForm({ ...battleForm, clientChallenges: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={4} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateBattle(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
            <button onClick={handleCreateBattle} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg">创建</button>
          </div>
        </div>
      )}
      {activeBattle ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-card overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">{activeBattle.scenario}</h4>
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', battleStatusBadge[activeBattle.status])}>{battleStatusLabels[activeBattle.status]}</span>
                </div>
                <div className="flex items-center gap-2">
                  {activeBattle.status === 'preparing' && <button onClick={() => handleStartBattle(activeBattle)} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg">开始</button>}
                  {activeBattle.status === 'active' && <button onClick={() => handlePauseBattle(activeBattle)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg">暂停</button>}
                  {activeBattle.status === 'paused' && <button onClick={() => handleStartBattle(activeBattle)} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg">继续</button>}
                  {(activeBattle.status === 'active' || activeBattle.status === 'paused') && (
                    <button onClick={() => setShowReview(true)} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg">完成并复盘</button>
                  )}
                  <button onClick={() => setActiveBattle(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} className="text-slate-400" /></button>
                </div>
              </div>
              <div className="p-4 h-96 overflow-y-auto space-y-3">
                {activeBattle.messages.length === 0 && activeBattle.clientChallenges.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-slate-500 font-medium">客户挑战点:</p>
                    {activeBattle.clientChallenges.map((challenge, i) => (
                      <div key={i} className="p-3 bg-red-50 rounded-lg text-sm text-red-700">🎯 {challenge}</div>
                    ))}
                  </div>
                )}
                {activeBattle.messages.map((msg) => (
                  <div key={msg.id} className={cn('flex', msg.role === 'our_side' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[70%] rounded-xl p-3', msg.role === 'our_side' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-700')}>
                      <div className={cn('text-xs mb-1', msg.role === 'our_side' ? 'text-primary-200' : 'text-slate-400')}>{msg.role === 'our_side' ? '我方' : '客户方'}</div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {activeBattle.status === 'active' && (
                <div className="p-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setMessageRole('our_side')} className={cn('px-2 py-1 rounded text-xs font-medium', messageRole === 'our_side' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500')}>我方</button>
                    <button onClick={() => setMessageRole('client_side')} className={cn('px-2 py-1 rounded text-xs font-medium', messageRole === 'client_side' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500')}>客户方</button>
                  </div>
                  <div className="flex gap-2">
                    <input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()} placeholder="输入消息..." className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    <button onClick={handleSendMessage} className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"><Send size={16} /></button>
                  </div>
                </div>
              )}
            </div>
            {showReview && (
              <div className="mt-4 p-4 bg-white rounded-xl shadow-card space-y-3">
                <h4 className="font-semibold text-slate-900">复盘评价</h4>
                <div className="flex items-center gap-2"><span className="text-sm text-slate-500">评分:</span><StarRating value={reviewScore} onChange={setReviewScore} /></div>
                <textarea placeholder="复盘笔记..." value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={3} />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowReview(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                  <button onClick={handleCompleteReview} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg">提交</button>
                </div>
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">对抗列表</h4>
            <div className="space-y-2">
              {battles.map((battle) => (
                <div key={battle.id} onClick={() => setActiveBattle(battle)} className={cn('p-3 rounded-xl cursor-pointer transition-all border', activeBattle?.id === battle.id ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-100 hover:bg-slate-50')}>
                  <p className="text-sm font-medium text-slate-900 truncate">{battle.scenario}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', battleStatusBadge[battle.status])}>{battleStatusLabels[battle.status]}</span>
                    {battle.status === 'completed' && battle.reviewScore > 0 && <span className="text-xs text-amber-500">{battle.reviewScore}★</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {battles.length === 0 ? (
            <div className="text-center py-12 text-slate-400">暂无对抗演练</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {battles.map((battle) => (
                <div key={battle.id} onClick={() => setActiveBattle(battle)} className="bg-white rounded-xl shadow-card p-5 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900 truncate">{battle.scenario}</h4>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', battleStatusBadge[battle.status])}>{battleStatusLabels[battle.status]}</span>
                  </div>
                  <div className="text-xs text-slate-400">{battle.messages.length} 条消息 · {formatRelativeTime(battle.createdAt)}</div>
                  {battle.status === 'completed' && battle.reviewScore > 0 && (
                    <div className="mt-2 flex items-center gap-2"><StarRating value={battle.reviewScore} readonly /></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportsTab({ warRoomId, tenantId, reports, userId, onRefresh }: {
  warRoomId: string; tenantId: string; reports: BattleReport[]; userId: string; onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState<BattleReport | null>(null);
  const [reportForm, setReportForm] = useState({ title: '', keyResults: '', unfinishedItems: '', lessons: '', nextPlan: '' });

  const handleSave = async () => {
    if (!reportForm.title.trim()) return;
    if (editingReport) {
      await updateBattleReport(editingReport.id, { title: reportForm.title, keyResults: reportForm.keyResults, unfinishedItems: reportForm.unfinishedItems, lessons: reportForm.lessons, nextPlan: reportForm.nextPlan });
    } else {
      await createBattleReport({ warRoomId, tenantId, title: reportForm.title, keyResults: reportForm.keyResults, unfinishedItems: reportForm.unfinishedItems, lessons: reportForm.lessons, nextPlan: reportForm.nextPlan, milestoneIds: [], createdBy: userId });
    }
    setReportForm({ title: '', keyResults: '', unfinishedItems: '', lessons: '', nextPlan: '' }); setEditingReport(null); setShowForm(false); onRefresh();
  };
  const handlePublish = async (id: string) => { await publishBattleReport(id); onRefresh(); };
  const openEdit = (report: BattleReport) => {
    setEditingReport(report); setReportForm({ title: report.title, keyResults: report.keyResults, unfinishedItems: report.unfinishedItems, lessons: report.lessons, nextPlan: report.nextPlan }); setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">战报</h3>
        <button onClick={() => { setEditingReport(null); setReportForm({ title: '', keyResults: '', unfinishedItems: '', lessons: '', nextPlan: '' }); setShowForm(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"><Plus size={14} />创建战报</button>
      </div>
      {showForm && (
        <div className="mb-6 p-4 bg-white rounded-xl shadow-card space-y-3">
          <input placeholder="战报标题" value={reportForm.title} onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <div>
            <label className="text-xs text-slate-500">关键成果</label>
            <textarea value={reportForm.keyResults} onChange={(e) => setReportForm({ ...reportForm, keyResults: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={3} />
          </div>
          <div>
            <label className="text-xs text-slate-500">未完成事项</label>
            <textarea value={reportForm.unfinishedItems} onChange={(e) => setReportForm({ ...reportForm, unfinishedItems: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={3} />
          </div>
          <div>
            <label className="text-xs text-slate-500">经验教训</label>
            <textarea value={reportForm.lessons} onChange={(e) => setReportForm({ ...reportForm, lessons: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={3} />
          </div>
          <div>
            <label className="text-xs text-slate-500">下一步计划</label>
            <textarea value={reportForm.nextPlan} onChange={(e) => setReportForm({ ...reportForm, nextPlan: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setEditingReport(null); }} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
            <button onClick={handleSave} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg">保存</button>
          </div>
        </div>
      )}
      {reports.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无战报</div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-slate-900">{report.title}</h4>
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', report.published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                    {report.published ? '已发布' : '草稿'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!report.published && (
                    <button onClick={() => handlePublish(report.id)} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg">发布</button>
                  )}
                  <button onClick={() => openEdit(report)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"><Edit size={14} /></button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {report.keyResults && <div><span className="font-medium text-slate-500">关键成果: </span><span className="text-slate-700">{report.keyResults}</span></div>}
                {report.unfinishedItems && <div><span className="font-medium text-slate-500">未完成事项: </span><span className="text-slate-700">{report.unfinishedItems}</span></div>}
                {report.lessons && <div><span className="font-medium text-slate-500">经验教训: </span><span className="text-slate-700">{report.lessons}</span></div>}
                {report.nextPlan && <div><span className="font-medium text-slate-500">下一步计划: </span><span className="text-slate-700">{report.nextPlan}</span></div>}
              </div>
              <p className="text-xs text-slate-400 mt-3">{formatDateTime(report.updatedAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WarRoomDetail() {
  const { id: warRoomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { can } = usePermissions();

  const [warRoom, setWarRoom] = useState<WarRoom | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<WarRoomActivityLog[]>([]);
  const [decisionNodes, setDecisionNodes] = useState<DecisionNode[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [competitiveAnalyses, setCompetitiveAnalyses] = useState<CompetitiveAnalysis[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<WarRoomTask[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [reports, setReports] = useState<BattleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'assault' as const });

  const userMap: Record<string, string> = {};
  teamMembers.forEach((u) => { userMap[u.id] = u.name; });

  const loadData = useCallback(async () => {
    if (!warRoomId || !user?.tenantId) return;
    setLoading(true);
    try {
      const wr = await getWarRoomById(warRoomId);
      if (!wr) {
        setLoading(false);
        return;
      }
      setWarRoom(wr);
      const [oppData, stgs, members, logs, nodes, reqs, compAnalyses, ms, tks, docs, scrs, btls, rpts] = await Promise.all([
        getOpportunityById(wr.opportunityId),
        getStages(user.tenantId),
        getTeamMembers(user.tenantId),
        getActivityLogs(warRoomId),
        getDecisionNodes(warRoomId),
        getRequirements(warRoomId),
        getCompetitiveAnalyses(warRoomId),
        getMilestones(warRoomId),
        getTasksByWarRoom(warRoomId),
        getKnowledgeDocs(warRoomId),
        getScripts(warRoomId),
        getBattles(warRoomId),
        getBattleReports(warRoomId),
      ]);
      setOpportunity(oppData || null);
      setStages(stgs);
      setTeamMembers(members);
      setActivityLogs(logs);
      setDecisionNodes(nodes);
      setRequirements(reqs);
      setCompetitiveAnalyses(compAnalyses);
      setMilestones(ms);
      setTasks(tks);
      setKnowledgeDocs(docs);
      setScripts(scrs);
      setBattles(btls);
      setReports(rpts);
      if (oppData) {
        const cust = await getCustomerById(oppData.customerId);
        setCustomer(cust || null);
      }
    } catch (err) {
      console.error('Failed to load war room:', err);
    }
    setLoading(false);
  }, [warRoomId, user?.tenantId]);

  useEffect(() => {
    if (warRoomId && user?.tenantId) loadData();
  }, [warRoomId, user?.tenantId, loadData]);

  const handleArchive = async () => {
    if (!warRoom || !confirm('确定要归档此作战室？')) return;
    await archiveWarRoom(warRoom.id);
    navigate('/warrooms');
  };

  const handleAddMember = async () => {
    if (!warRoom || !memberForm.userId) return;
    await addWarRoomMember(warRoom.id, { userId: memberForm.userId, role: memberForm.role, joinedAt: new Date().toISOString() });
    setMemberForm({ userId: '', role: 'assault' }); setShowMemberModal(false); loadData();
  };

  const handleRemoveMember = async (userId: string) => {
    if (!warRoom || !confirm('确定移除该成员？')) return;
    await removeWarRoomMember(warRoom.id, userId); loadData();
  };

  const getStageName = (stageId?: string) => stages.find((s) => s.id === stageId)?.name || '';

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-slate-400">加载中...</div></div>;
  }

  if (!warRoom) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">作战室不存在</p>
        <button onClick={() => navigate('/warrooms')} className="mt-4 text-primary-600 hover:text-primary-700">返回作战室列表</button>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: '仪表盘', icon: <LayoutDashboard size={16} /> },
    { key: 'analysis', label: '拆解', icon: <Shield size={16} /> },
    { key: 'milestones', label: '里程碑', icon: <Target size={16} /> },
    { key: 'knowledge', label: '知识库', icon: <BookOpen size={16} /> },
    { key: 'battle', label: '对抗', icon: <Swords size={16} /> },
    { key: 'reports', label: '战报', icon: <FileText size={16} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/warrooms')} className="p-2 rounded-lg hover:bg-white transition-colors"><ArrowLeft size={20} className="text-slate-600" /></button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center text-white"><Swords size={24} /></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-display font-bold text-slate-900">{warRoom.name}</h1>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', warRoom.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600')}>
                  {warRoom.status === 'active' ? '进行中' : '已归档'}
                </span>
              </div>
              <p className="text-sm text-slate-500">{warRoom.objective}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {warRoom.status === 'active' && can('warrooms:edit') && (
            <>
              <button onClick={handleArchive} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"><Archive size={16} />归档</button>
              <button onClick={() => setShowMemberModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"><UserPlus size={16} />管理成员</button>
            </>
          )}
        </div>
      </div>

      {opportunity && (
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">商机</span>
              <span className="text-sm font-medium text-slate-900">{opportunity.name}</span>
            </div>
            {customer && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">客户</span>
                <span className="text-sm font-medium text-slate-900">{customer.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">金额</span>
              <span className="text-sm font-semibold text-slate-900">{formatCurrency(opportunity.amount)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">阶段</span>
              <span className="text-sm font-medium text-slate-900">{getStageName(opportunity.stageId)}</span>
            </div>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setShowMemberModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 animate-slide-up max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-semibold text-slate-900">管理成员</h4>
              <button onClick={() => setShowMemberModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex gap-2">
                <select value={memberForm.userId} onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">选择成员</option>
                  {teamMembers.filter((m) => !warRoom.members.some((wm) => wm.userId === m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as any })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="commander">指挥官</option><option value="assault">突击手</option><option value="staff">参谋</option><option value="observer">观察员</option>
                </select>
                <button onClick={handleAddMember} className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg flex items-center gap-1"><UserPlus size={16} />添加</button>
              </div>
              <div className="space-y-2">
                {warRoom.members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-white text-sm">{userMap[member.userId]?.charAt(0) || '?'}</div>
                      <div>
                        <span className="text-sm font-medium text-slate-700">{userMap[member.userId] || '未知'}</span>
                        <span className="ml-2 px-2 py-0.5 bg-slate-200 rounded text-xs text-slate-600">{member.role === 'commander' ? '指挥官' : member.role === 'assault' ? '突击手' : member.role === 'staff' ? '参谋' : '观察员'}</span>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveMember(member.userId)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-danger-500"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="border-b border-slate-100">
          <div className="flex gap-1 px-4">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all', activeTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">
          {activeTab === 'dashboard' && <DashboardTab warRoom={warRoom} activityLogs={activityLogs} milestones={milestones} tasks={tasks} knowledgeDocs={knowledgeDocs} userMap={userMap} />}
          {activeTab === 'analysis' && <AnalysisTab warRoomId={warRoom.id} tenantId={warRoom.tenantId} decisionNodes={decisionNodes} requirements={requirements} competitiveAnalyses={competitiveAnalyses} onRefresh={loadData} />}
          {activeTab === 'milestones' && <MilestonesTab warRoomId={warRoom.id} tenantId={warRoom.tenantId} milestones={milestones} tasks={tasks} userMap={userMap} onRefresh={loadData} />}
          {activeTab === 'knowledge' && <KnowledgeTab warRoomId={warRoom.id} tenantId={warRoom.tenantId} knowledgeDocs={knowledgeDocs} scripts={scripts} userId={user?.id || ''} onRefresh={loadData} />}
          {activeTab === 'battle' && <BattleTab warRoomId={warRoom.id} tenantId={warRoom.tenantId} battles={battles} userId={user?.id || ''} onRefresh={loadData} />}
          {activeTab === 'reports' && <ReportsTab warRoomId={warRoom.id} tenantId={warRoom.tenantId} reports={reports} userId={user?.id || ''} onRefresh={loadData} />}
        </div>
      </div>
    </div>
  );
}