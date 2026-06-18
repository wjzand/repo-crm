import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Swords,
  Plus,
  Search,
  Filter,
  Users,
  Target,
  Clock,
  Archive,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import {
  getWarRooms,
  createWarRoom,
  getMilestones,
  getActivityLogs,
} from '@/services/warroom.service';
import { getTeamMembers } from '@/services/team.service';
import { getOpportunities } from '@/services/opportunity.service';
import { formatRelativeTime } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { WarRoom, User, Opportunity } from '@/types/models';

interface WarRoomWithMeta {
  warRoom: WarRoom;
  opportunityName: string;
  commanderName: string;
  milestoneProgress: number;
  lastActivity: string;
}

export default function WarRooms() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { can } = usePermissions();

  const [warRooms, setWarRooms] = useState<WarRoom[]>([]);
  const [warRoomMeta, setWarRoomMeta] = useState<Record<string, WarRoomWithMeta>>({});
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    objective: '',
    expectedEndDate: '',
    opportunityId: '',
    commanderId: '',
  });
  const [opportunitySearch, setOpportunitySearch] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.tenantId, statusFilter]);

  const loadData = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const [roomsData, membersData, oppsData] = await Promise.all([
        getWarRooms(user.tenantId, statusFilter !== 'all' ? { status: statusFilter } : undefined),
        getTeamMembers(user.tenantId),
        getOpportunities(user.tenantId),
      ]);
      setWarRooms(roomsData);
      setTeamMembers(membersData);
      setOpportunities(oppsData);

      const userMap: Record<string, string> = {};
      membersData.forEach((u) => {
        userMap[u.id] = u.name;
      });

      const oppMap: Record<string, string> = {};
      oppsData.forEach((o) => {
        oppMap[o.id] = o.name;
      });

      const metaMap: Record<string, WarRoomWithMeta> = {};
      await Promise.all(
        roomsData.map(async (room) => {
          const commander = room.members.find((m) => m.role === 'commander');
          const commanderName = commander ? userMap[commander.userId] || '未指定' : '未指定';
          const opportunityName = oppMap[room.opportunityId] || '未关联商机';

          let milestoneProgress = 0;
          try {
            const milestones = await getMilestones(room.id);
            if (milestones.length > 0) {
              const completed = milestones.filter((m) => m.completed).length;
              milestoneProgress = Math.round((completed / milestones.length) * 100);
            }
          } catch {}

          let lastActivity = room.updatedAt;
          try {
            const logs = await getActivityLogs(room.id);
            if (logs.length > 0) {
              lastActivity = logs[0].createdAt;
            }
          } catch {}

          metaMap[room.id] = {
            warRoom: room,
            opportunityName,
            commanderName,
            milestoneProgress,
            lastActivity,
          };
        })
      );
      setWarRoomMeta(metaMap);
    } catch (err) {
      console.error('Failed to load war rooms:', err);
    }
    setLoading(false);
  };

  const userMap: Record<string, string> = {};
  teamMembers.forEach((u) => {
    userMap[u.id] = u.name;
  });

  const filteredRooms = warRooms.filter((room) => {
    if (search) {
      const lowerSearch = search.toLowerCase();
      const meta = warRoomMeta[room.id];
      const oppName = meta?.opportunityName || '';
      if (
        !room.name.toLowerCase().includes(lowerSearch) &&
        !oppName.toLowerCase().includes(lowerSearch)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && room.status !== statusFilter) return false;
    if (!room.members.some((m) => m.userId === user?.id) && !can('warrooms:view_all')) {
      return false;
    }
    return true;
  });

  const handleCreate = async () => {
    if (!user?.tenantId) return;
    if (!createForm.name.trim() || !createForm.objective.trim() || !createForm.expectedEndDate) return;
    setCreating(true);
    try {
      const members = [];
      if (createForm.commanderId) {
        members.push({
          userId: createForm.commanderId,
          role: 'commander' as const,
          joinedAt: new Date().toISOString(),
        });
      } else {
        members.push({
          userId: user.id,
          role: 'commander' as const,
          joinedAt: new Date().toISOString(),
        });
      }
      await createWarRoom({
        tenantId: user.tenantId,
        opportunityId: createForm.opportunityId || '',
        name: createForm.name.trim(),
        objective: createForm.objective.trim(),
        status: 'active',
        expectedEndDate: createForm.expectedEndDate,
        members,
        createdBy: user.id,
      });
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        objective: '',
        expectedEndDate: '',
        opportunityId: '',
        commanderId: '',
      });
      loadData();
    } catch (err) {
      console.error('Failed to create war room:', err);
    }
    setCreating(false);
  };

  const filteredOpportunities = opportunities.filter((o) => {
    if (!opportunitySearch) return true;
    return o.name.toLowerCase().includes(opportunitySearch.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">作战室</h1>
          <p className="text-slate-500 mt-1">
            共 {warRooms.length} 个作战室
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30"
        >
          <Plus size={18} />
          新建作战室
        </button>
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
                placeholder="搜索作战室名称、商机名称..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">全部状态</option>
                <option value="active">进行中</option>
                <option value="archived">已归档</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400">加载中...</div>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Swords size={28} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">暂无作战室</h3>
          <p className="text-slate-400 mb-6">创建作战室，协同团队赢下关键商机</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-500/20"
          >
            <Plus size={18} />
            新建作战室
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const meta = warRoomMeta[room.id];
            if (!meta) return null;
            const isArchived = room.status === 'archived';

            return (
              <div
                key={room.id}
                onClick={() => navigate(`/warrooms/${room.id}`)}
                className={cn(
                  'bg-white rounded-xl p-5 shadow-card border border-slate-100 cursor-pointer hover:shadow-md hover:border-primary-200 transition-all group',
                  isArchived && 'opacity-70'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <Swords size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{room.name}</h3>
                      <span className="text-xs text-slate-400">{meta.opportunityName}</span>
                    </div>
                  </div>
                  {isArchived && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
                      <Archive size={10} />
                      已归档
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-4 line-clamp-2">{room.objective}</p>

                <div className="flex items-center justify-between mb-3 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-white text-xs">
                      {meta.commanderName.charAt(0)}
                    </div>
                    <span>{meta.commanderName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Users size={12} />
                    <span>{room.members.length} 人</span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Target size={12} />
                      <span>里程碑进度</span>
                    </div>
                    <span className="text-xs font-medium text-slate-700">{meta.milestoneProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        meta.milestoneProgress === 100
                          ? 'bg-green-500'
                          : 'bg-primary-500'
                      )}
                      style={{ width: `${meta.milestoneProgress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400 pt-3 border-t border-slate-100">
                  <Clock size={12} />
                  <span>最近活动：{formatRelativeTime(meta.lastActivity)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-display font-bold text-slate-900">新建作战室</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">作战室名称</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="输入作战室名称"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">目标</label>
                <textarea
                  value={createForm.objective}
                  onChange={(e) => setCreateForm({ ...createForm, objective: e.target.value })}
                  placeholder="描述作战室目标"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">预计结束日期</label>
                <input
                  type="date"
                  value={createForm.expectedEndDate}
                  onChange={(e) => setCreateForm({ ...createForm, expectedEndDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">关联商机</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={opportunitySearch}
                    onChange={(e) => setOpportunitySearch(e.target.value)}
                    placeholder="搜索商机..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                  <select
                    value={createForm.opportunityId}
                    onChange={(e) => setCreateForm({ ...createForm, opportunityId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  >
                    <option value="">选择商机（可选）</option>
                    {filteredOpportunities.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">指挥官</label>
                <select
                  value={createForm.commanderId}
                  onChange={(e) => setCreateForm({ ...createForm, commanderId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="">选择指挥官</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm({
                    name: '',
                    objective: '',
                    expectedEndDate: '',
                    opportunityId: '',
                    commanderId: '',
                  });
                  setOpportunitySearch('');
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.name.trim() || !createForm.objective.trim() || !createForm.expectedEndDate}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                  creating || !createForm.name.trim() || !createForm.objective.trim() || !createForm.expectedEndDate
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                )}
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
