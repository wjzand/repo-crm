import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  UserPlus,
  MoreVertical,
  Trash2,
  ArrowRight,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
  Globe,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import { getLeads, assignLeads, discardLead } from '@/services/lead.service';
import { getLeadSources, getTeamMembers } from '@/services/team.service';
import { formatRelativeTime } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { Lead, LeadStatus, LeadSource, User } from '@/types/models';

const statusConfig: Record<LeadStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  new: { label: '新线索', color: 'text-blue-700', bg: 'bg-blue-100', icon: <Target size={14} /> },
  contacted: { label: '已联系', color: 'text-amber-700', bg: 'bg-amber-100', icon: <Clock size={14} /> },
  converted: { label: '已转化', color: 'text-green-700', bg: 'bg-green-100', icon: <CheckCircle2 size={14} /> },
  discarded: { label: '已废弃', color: 'text-slate-500', bg: 'bg-slate-100', icon: <XCircle size={14} /> },
};

export default function Leads() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { can, getOwnerFilter, isManagerOrAbove } = usePermissions();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user?.tenantId]);

  const loadData = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const ownerId = getOwnerFilter();
      const [leadsData, sourcesData, membersData] = await Promise.all([
        getLeads(user.tenantId, ownerId),
        getLeadSources(user.tenantId),
        isManagerOrAbove() ? getTeamMembers(user.tenantId) : Promise.resolve([]),
      ]);
      setLeads(leadsData);
      setSources(sourcesData);
      setTeamMembers(membersData.filter(m => m.role === 'sales_rep' || m.role === 'sales_manager'));
    } catch (err) {
      console.error('Failed to load leads:', err);
    }
    setLoading(false);
  };

  const getSourceName = (sourceId: string) => {
    return sources.find((s) => s.id === sourceId)?.name || '未知';
  };

  const filteredLeads = leads
    .filter((l) => {
      if (search && !l.companyName.toLowerCase().includes(search.toLowerCase()) && !l.contactName.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && l.sourceId !== sourceFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'companyName') comparison = a.companyName.localeCompare(b.companyName);
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

  const toggleSelect = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((lid) => lid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((l) => l.id));
    }
  };

  const handleAssign = async () => {
    if (!selectedOwner || selectedLeads.length === 0) return;
    try {
      await assignLeads(selectedLeads, selectedOwner);
      setLeads(leads.map(l => 
        selectedLeads.includes(l.id) 
          ? { ...l, ownerId: selectedOwner, status: 'contacted' as LeadStatus } 
          : l
      ));
      setSelectedLeads([]);
      setShowAssignModal(false);
      setSelectedOwner('');
    } catch (err) {
      console.error('Failed to assign leads:', err);
    }
  };

  const handleDiscard = async (id: string) => {
    const reason = prompt('请输入废弃原因：');
    if (!reason) return;
    try {
      await discardLead(id, reason);
      setLeads(leads.map(l => l.id === id ? { ...l, status: 'discarded' as LeadStatus, discardReason: reason } : l));
    } catch (err) {
      console.error('Failed to discard lead:', err);
    }
    setOpenMenu(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">线索池</h1>
          <p className="text-slate-500 mt-1">
            共 {leads.length} 条线索
            {selectedLeads.length > 0 && `，已选择 ${selectedLeads.length} 条`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can('leads:assign') && selectedLeads.length > 0 && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-all"
            >
              <UserPlus size={18} />
              分配线索
            </button>
          )}
          {can('leads:create') && (
            <button
              onClick={() => navigate('/leads/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30"
            >
              <Plus size={18} />
              新建线索
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['new', 'contacted', 'converted', 'discarded'] as LeadStatus[]).map((status) => {
          const count = leads.filter((l) => l.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={cn(
                'p-4 rounded-xl border transition-all text-left',
                statusFilter === status
                  ? 'bg-white border-primary-300 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', statusConfig[status].bg, statusConfig[status].color)}>
                  {statusConfig[status].icon}
                </div>
                <span className="text-sm text-slate-600">{statusConfig[status].label}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{count}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索公司名称、联系人..."
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
                <option value="new">新线索</option>
                <option value="contacted">已联系</option>
                <option value="converted">已转化</option>
                <option value="discarded">已废弃</option>
              </select>
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">全部来源</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('companyName')}
                >
                  <div className="flex items-center gap-1">
                    公司名称
                    {sortBy === 'companyName' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  联系人
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  来源
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    创建时间
                    {sortBy === 'createdAt' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  负责人
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    加载中...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    暂无线索数据
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium">
                          {lead.companyName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{lead.companyName}</p>
                          {lead.email && (
                            <p className="text-xs text-slate-400">{lead.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {lead.contactName}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Globe size={14} className="text-slate-400" />
                        {getSourceName(lead.sourceId)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                          statusConfig[lead.status].bg,
                          statusConfig[lead.status].color
                        )}
                      >
                        {statusConfig[lead.status].icon}
                        {statusConfig[lead.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {formatRelativeTime(lead.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      {lead.ownerId ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center">
                            {teamMembers.find((m) => m.id === lead.ownerId)?.name.charAt(0) || '?'}
                          </div>
                          <span className="text-sm text-slate-600">
                            {teamMembers.find((m) => m.id === lead.ownerId)?.name || '未分配'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">未分配</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu(openMenu === lead.id ? null : lead.id);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={16} className="text-slate-400" />
                        </button>
                        {openMenu === lead.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-card-hover border border-slate-200 py-1 z-10">
                            {can('leads:convert') && lead.status !== 'converted' && lead.status !== 'discarded' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/leads/${lead.id}/convert`);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                              >
                                <ArrowRight size={14} />
                                转化为商机
                              </button>
                            )}
                            {can('leads:assign') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLeads([lead.id]);
                                  setShowAssignModal(true);
                                  setOpenMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <UserPlus size={14} />
                                分配
                              </button>
                            )}
                            {lead.status !== 'discarded' && lead.status !== 'converted' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDiscard(lead.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                              >
                                <Ban size={14} />
                                废弃
                              </button>
                            )}
                          </div>
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

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 animate-slide-up">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">分配线索</h3>
            <p className="text-sm text-slate-500 mb-4">
              已选择 {selectedLeads.length} 条线索，分配给：
            </p>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mb-6"
            >
              <option value="">请选择销售人员</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role === 'sales_manager' ? '销售经理' : '销售人员'})
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOwner('');
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedOwner}
                className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                确认分配
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
