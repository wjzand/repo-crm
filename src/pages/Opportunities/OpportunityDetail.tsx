import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Calendar,
  User as UserIcon,
  Clock,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  ChevronRight,
  PhoneCall,
  Phone,
  Mail,
  Users,
  Target,
  Swords,
  MoreHorizontal,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import {
  getOpportunityById,
  getStageHistories,
  getActivitiesByOpportunity,
  getCompetitors,
  deleteOpportunity,
  createActivity,
} from '@/services/opportunity.service';
import { getCustomerById } from '@/services/customer.service';
import { getStages, getStageById } from '@/services/opportunity.service';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { Opportunity, StageHistory, Stage, Activity, Competitor, Customer } from '@/types/models';

type TabType = 'info' | 'activities' | 'history' | 'competitors';

const activityTypeIcons: Record<string, React.ReactNode> = {
  call: <Phone size={16} />,
  visit: <Users size={16} />,
  email: <Mail size={16} />,
  meeting: <Calendar size={16} />,
  other: <MessageSquare size={16} />,
};

const activityTypeLabels: Record<string, string> = {
  call: '电话',
  visit: '拜访',
  email: '邮件',
  meeting: '会议',
  other: '其他',
};

const activityTypeColors: Record<string, string> = {
  call: 'bg-blue-100 text-blue-600',
  visit: 'bg-purple-100 text-purple-600',
  email: 'bg-green-100 text-green-600',
  meeting: 'bg-amber-100 text-amber-600',
  other: 'bg-slate-100 text-slate-600',
};

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { can } = usePermissions();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [stageHistories, setStageHistories] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activityType, setActivityType] = useState<'call' | 'visit' | 'email' | 'meeting' | 'other'>('call');
  const [activityContent, setActivityContent] = useState('');

  useEffect(() => {
    if (id && user?.tenantId) {
      loadData();
    }
  }, [id, user?.tenantId]);

  const loadData = async () => {
    if (!id || !user?.tenantId) return;
    setLoading(true);
    try {
      const [opp, stgs, histories, acts, comps] = await Promise.all([
        getOpportunityById(id),
        getStages(user.tenantId),
        getStageHistories(id),
        getActivitiesByOpportunity(id, user.tenantId),
        getCompetitors(id),
      ]);
      setOpportunity(opp || null);
      setStages(stgs);
      setStageHistories(histories);
      setActivities(acts);
      setCompetitors(comps);

      if (opp) {
        const cust = await getCustomerById(opp.customerId);
        setCustomer(cust || null);
      }
    } catch (err) {
      console.error('Failed to load opportunity:', err);
    }
    setLoading(false);
  };

  const handleAddActivity = async () => {
    if (!id || !user || !activityContent.trim()) return;
    try {
      const newActivity = await createActivity({
        tenantId: user.tenantId,
        opportunityId: id,
        customerId: opportunity?.customerId,
        userId: user.id,
        type: activityType,
        content: activityContent,
      });
      setActivities([newActivity, ...activities]);
      setActivityContent('');
      setShowAddActivity(false);
    } catch (err) {
      console.error('Failed to add activity:', err);
    }
  };

  const handleDelete = () => {
    if (!opportunity || !confirm('确定要删除这个商机吗？')) return;
    deleteOpportunity(opportunity.id);
    navigate('/opportunities');
  };

  const getStageName = (stageId?: string) => {
    if (!stageId) return '';
    return stages.find((s) => s.id === stageId)?.name || '未知';
  };

  const getStageColor = (stageId?: string) => {
    if (!stageId) return '#6b7280';
    return stages.find((s) => s.id === stageId)?.color || '#6b7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">商机不存在</p>
        <button
          onClick={() => navigate('/opportunities')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          返回商机列表
        </button>
      </div>
    );
  }

  const currentStageIndex = stages.findIndex((s) => s.id === opportunity.stageId);

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'info', label: '基本信息', icon: <Building2 size={16} /> },
    { key: 'activities', label: '跟进记录', icon: <MessageSquare size={16} />, count: activities.length },
    { key: 'history', label: '阶段历史', icon: <Clock size={16} />, count: stageHistories.length },
    { key: 'competitors', label: '竞争对手', icon: <Target size={16} />, count: competitors.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/opportunities')}
          className="p-2 rounded-lg hover:bg-white transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white">
              <DollarSign size={24} />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-slate-900">
                {opportunity.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: getStageColor(opportunity.stageId) }}
                >
                  {getStageName(opportunity.stageId)}
                </span>
                <span className="text-sm text-slate-500">
                  {customer?.name || '未知客户'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {can('opportunities:edit') && (
            <button
              onClick={() => navigate(`/opportunities/${opportunity.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
            >
              <Edit size={16} />
              编辑
            </button>
          )}
          {can('opportunities:delete') && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg hover:bg-danger-50 text-slate-400 hover:text-danger-500 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={20} className="text-green-500" />
            <span className="text-sm text-slate-500">商机金额</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display">
            {formatCurrency(opportunity.amount)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <Calendar size={20} className="text-blue-500" />
            <span className="text-sm text-slate-500">预计成交</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display">
            {new Date(opportunity.expectedCloseDate).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <Target size={20} className="text-purple-500" />
            <span className="text-sm text-slate-500">成功率</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display">
            {opportunity.probability}%
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <UserIcon size={20} className="text-amber-500" />
            <span className="text-sm text-slate-500">负责人</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display">
            --
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="border-b border-slate-100">
          <div className="flex gap-1 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all',
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-xs',
                      activeTab === tab.key
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">基本信息</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 size={18} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">商机名称</p>
                      <p className="text-sm font-medium text-slate-700">{opportunity.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign size={18} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">商机金额</p>
                      <p className="text-sm font-medium text-slate-700">
                        {formatCurrency(opportunity.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">预计成交日期</p>
                      <p className="text-sm font-medium text-slate-700">
                        {new Date(opportunity.expectedCloseDate).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Target size={18} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">当前阶段</p>
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: getStageColor(opportunity.stageId) }}
                      >
                        {getStageName(opportunity.stageId)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">关联客户</h3>
                {customer && (
                  <div
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                        {customer.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{customer.name}</p>
                        <p className="text-sm text-slate-500">{customer.industry}</p>
                      </div>
                      <ChevronRight size={20} className="text-slate-400" />
                    </div>
                  </div>
                )}

                <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">备注</h3>
                <div className="p-4 bg-slate-50 rounded-xl min-h-[100px]">
                  <p className="text-sm text-slate-600">
                    {opportunity.notes || '暂无备注信息'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">跟进记录</h3>
              </div>

              {showAddActivity && (
                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                  <div className="flex gap-2 mb-3 flex-wrap">
                  {(['call', 'visit', 'email', 'meeting', 'other'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setActivityType(type)}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
                        activityType === type
                          ? 'bg-primary-500 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      {activityTypeIcons[type]}
                      {activityTypeLabels[type]}
                    </button>
                  ))}
                </div>
                <textarea
                  value={activityContent}
                  onChange={(e) => setActivityContent(e.target.value)}
                  placeholder="输入跟进内容..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  rows={3}
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setShowAddActivity(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddActivity}
                    disabled={!activityContent.trim()}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    保存
                  </button>
                </div>
              </div>
            )}
              {activities.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  暂无跟进记录
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />
                  <div className="space-y-6">
                    {activities.map((activity) => (
                      <div key={activity.id} className="relative flex gap-4">
                        <div
                          className={cn(
                            'relative z-10 w-10 h-10 rounded-full flex items-center justify-center',
                            activityTypeColors[activity.type]
                          )}
                        >
                          {activityTypeIcons[activity.type]}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-900">
                              {activityTypeLabels[activity.type]}跟进
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDateTime(activity.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {activity.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-6">阶段变更历史</h3>
              {stageHistories.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  暂无阶段变更记录
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />
                  <div className="space-y-6">
                    {stageHistories.map((history, index) => (
                      <div key={history.id} className="relative flex gap-4">
                        <div
                          className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                          style={{ backgroundColor: getStageColor(history.toStageId) }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium text-white"
                              style={{ backgroundColor: getStageColor(history.fromStageId) }}
                            >
                              {getStageName(history.fromStageId)}
                            </span>
                            <ChevronRight size={14} className="text-slate-400" />
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium text-white"
                              style={{ backgroundColor: getStageColor(history.toStageId) }}
                            >
                              {getStageName(history.toStageId)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            变更时间：{formatDateTime(history.changedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'competitors' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">竞争对手</h3>
                <button className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
                  <Plus size={16} />
                  添加
                </button>
              </div>
              {competitors.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  暂无竞争对手信息
                </div>
              ) : (
                <div className="space-y-3">
                  {competitors.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                            <Target size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{comp.name}</p>
                          </div>
                        </div>
                        <button className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                          <MoreHorizontal size={16} className="text-slate-400" />
                        </button>
                      </div>
                      {(comp.strengths || comp.weaknesses) && (
                        <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-3">
                          {comp.strengths && (
                            <div>
                              <p className="text-xs text-green-600 font-medium mb-1">优势</p>
                              <p className="text-xs text-slate-600">{comp.strengths}</p>
                            </div>
                          )}
                          {comp.weaknesses && (
                            <div>
                              <p className="text-xs text-red-600 font-medium mb-1">劣势</p>
                              <p className="text-xs text-slate-600">{comp.weaknesses}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
