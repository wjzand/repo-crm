import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Filter,
  Calendar,
  User as UserIcon,
  DollarSign,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  GripVertical,
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
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import {
  getOpportunities,
  getStages,
  updateOpportunityStage,
  deleteOpportunity,
} from '@/services/opportunity.service';
import { getCustomers } from '@/services/customer.service';
import { getTeamMembers } from '@/services/team.service';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { Opportunity, Stage, Customer, User } from '@/types/models';

type ViewType = 'kanban' | 'table';

interface KanbanCardProps {
  opportunity: Opportunity;
  customerName: string;
  ownerName: string;
  isDragging?: boolean;
}

function KanbanCard({ opportunity, customerName, ownerName, isDragging }: KanbanCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { can } = usePermissions();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: opportunity.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isWinOrLoss = false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-lg p-4 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-primary-200 transition-all group',
        isDragging && 'opacity-50',
        isSortableDragging && 'shadow-lg rotate-2 scale-105 z-50'
      )}
      onClick={() => navigate(`/opportunities/${opportunity.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical size={14} className="text-slate-400" />
          </div>
          <span className="text-xs text-slate-400">{customerName}</span>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={14} className="text-slate-400" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-28 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {can('opportunities:edit') && (
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Edit size={14} />
                  编辑
                </button>
              )}
              {can('opportunities:delete') && (
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50">
                  <Trash2 size={14} />
                  删除
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <h4 className="font-medium text-slate-900 text-sm mb-3 line-clamp-2">{opportunity.name}</h4>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-slate-500">
          <DollarSign size={12} />
          <span className="font-semibold text-slate-700">{formatCurrency(opportunity.amount)}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <Calendar size={12} />
          <span>{formatDate(opportunity.expectedCloseDate, 'MM/DD')}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-white text-xs">
            {ownerName.charAt(0)}
          </div>
          <span className="text-xs text-slate-500">{ownerName}</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="h-1.5 w-12 bg-slate-200 rounded-full overflow-hidden"
            title={`成功率 ${opportunity.probability}%`}
          >
            <div
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${opportunity.probability}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">{opportunity.probability}%</span>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  opportunities,
  customerMap,
  userMap,
  onAddClick,
}: {
  stage: Stage;
  opportunities: Opportunity[];
  customerMap: Record<string, string>;
  userMap: Record<string, string>;
  onAddClick: (stageId: string) => void;
}) {
  const totalAmount = opportunities.reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="font-semibold text-slate-700">{stage.name}</h3>
          <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
            {opportunities.length}
          </span>
        </div>
        <button
          onClick={() => onAddClick(stage.id)}
          className="p-1 hover:bg-slate-200 rounded transition-colors"
        >
          <Plus size={16} className="text-slate-500" />
        </button>
      </div>
      <div className="text-xs text-slate-500 mb-3">金额：{formatCurrency(totalAmount)}</div>
      <div
        className="bg-slate-100/50 rounded-xl p-2 min-h-[200px] space-y-2"
        style={{ borderTop: `3px solid ${stage.color}` }}
      >
        <SortableContext items={opportunities.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          {opportunities.map((opp) => (
            <KanbanCard
              key={opp.id}
              opportunity={opp}
              customerName={customerMap[opp.customerId] || '未知客户'}
              ownerName={userMap[opp.ownerId] || '未分配'}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function Opportunities() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { can, getOwnerFilter, isManagerOrAbove } = usePermissions();

  const [view, setView] = useState<ViewType>('kanban');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadData();
  }, [user?.tenantId]);

  const loadData = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const ownerId = getOwnerFilter();
      const [oppsData, stagesData, custsData, membersData] = await Promise.all([
        getOpportunities(user.tenantId, { ownerId }),
        getStages(user.tenantId),
        getCustomers(user.tenantId, ownerId),
        isManagerOrAbove() ? getTeamMembers(user.tenantId) : Promise.resolve([]),
      ]);
      setOpportunities(oppsData);
      setStages(stagesData);
      setCustomers(custsData);
      setTeamMembers(membersData);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
    }
    setLoading(false);
  };

  const customerMap: Record<string, string> = {};
  customers.forEach((c) => {
    customerMap[c.id] = c.name;
  });

  const userMap: Record<string, string> = {};
  teamMembers.forEach((u) => {
    userMap[u.id] = u.name;
  });

  const activeOpportunity = activeId ? opportunities.find((o) => o.id === activeId) : null;

  const filteredOpps = opportunities.filter((o) => {
    if (search) {
      const lowerSearch = search.toLowerCase();
      const custName = customerMap[o.customerId] || '';
      if (!o.name.toLowerCase().includes(lowerSearch) && !custName.toLowerCase().includes(lowerSearch)) {
        return false;
      }
    }
    if (stageFilter !== 'all' && o.stageId !== stageFilter) return false;
    if (ownerFilter !== 'all' && o.ownerId !== ownerFilter) return false;
    return true;
  });

  const sortedOpps = [...filteredOpps].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'amount') comparison = a.amount - b.amount;
    else if (sortBy === 'expectedCloseDate') comparison = new Date(a.expectedCloseDate).getTime() - new Date(b.expectedCloseDate).getTime();
    else if (sortBy === 'createdAt') comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const oppId = active.id as string;
    const overId = over.id as string;

    const activeOpp = opportunities.find((o) => o.id === oppId);
    const overOpp = opportunities.find((o) => o.id === overId);

    if (!activeOpp || !overOpp) return;
    if (activeOpp.stageId === overOpp.stageId) return;

    try {
      await updateOpportunityStage(oppId, overOpp.stageId, user?.id || '');
      setOpportunities(
        opportunities.map((o) =>
          o.id === oppId ? { ...o, stageId: overOpp.stageId } : o
        )
      );
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个商机吗？')) return;
    try {
      await deleteOpportunity(id);
      setOpportunities(opportunities.filter((o) => o.id !== id));
    } catch (err) {
      console.error('Failed to delete opportunity:', err);
    }
  };

  const stagesForKanban = stages.filter((s) => !s.isWin && !s.isLoss);

  const getStageName = (stageId: string) => {
    return stages.find((s) => s.id === stageId)?.name || '未知';
  };

  const getStageColor = (stageId: string) => {
    return stages.find((s) => s.id === stageId)?.color || '#6b7280';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">商机管理</h1>
          <p className="text-slate-500 mt-1">
            共 {opportunities.length} 个商机
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-lg p-1 shadow-card">
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'p-2 rounded-md transition-all',
                view === 'kanban' ? 'bg-primary-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setView('table')}
              className={cn(
                'p-2 rounded-md transition-all',
                view === 'table' ? 'bg-primary-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <List size={18} />
            </button>
          </div>
          {can('opportunities:create') && (
            <button
              onClick={() => navigate('/opportunities/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30"
            >
              <Plus size={18} />
              新建商机
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索商机名称、客户..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">全部阶段</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {isManagerOrAbove() && (
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">全部负责人</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {view === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stagesForKanban.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                opportunities={filteredOpps.filter((o) => o.stageId === stage.id)}
                customerMap={customerMap}
                userMap={userMap}
                onAddClick={() => navigate('/opportunities/new')}
              />
            ))}
          </div>
          <DragOverlay>
            {activeOpportunity && (
              <div className="opacity-90 rotate-3 scale-105">
                <KanbanCard
                  opportunity={activeOpportunity}
                  customerName={customerMap[activeOpportunity.customerId] || '未知'}
                  ownerName={userMap[activeOpportunity.ownerId] || '未分配'}
                  isDragging
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    商机名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    客户
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    阶段
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center gap-1">
                      金额
                      {sortBy === 'amount' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('expectedCloseDate')}
                  >
                    <div className="flex items-center gap-1">
                      预计成交
                      {sortBy === 'expectedCloseDate' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    负责人
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      加载中...
                    </td>
                  </tr>
                ) : sortedOpps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      暂无商机数据
                    </td>
                  </tr>
                ) : (
                  sortedOpps.map((opp) => (
                    <tr
                      key={opp.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/opportunities/${opp.id}`)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{opp.name}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {customerMap[opp.customerId] || '未知'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: getStageColor(opp.stageId) }}
                        >
                          {getStageName(opp.stageId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(opp.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(opp.expectedCloseDate)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center">
                            {userMap[opp.ownerId]?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm text-slate-600">
                            {userMap[opp.ownerId] || '未分配'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {can('opportunities:edit') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/opportunities/${opp.id}/edit`);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit size={16} className="text-slate-400" />
                            </button>
                          )}
                          {can('opportunities:delete') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(opp.id);
                              }}
                              className="p-1.5 hover:bg-danger-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} className="text-danger-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
