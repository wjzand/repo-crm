import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Clock,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Users,
  MessageSquare,
  ChevronRight,
  PhoneCall,
  Users2,
  MailIcon,
  Calendar,
  MoreHorizontal,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import {
  getCustomerById,
  getContactsByCustomer,
  getActivitiesByCustomer,
  deleteCustomer,
} from '@/services/customer.service';
import { getOpportunitiesByCustomer, getStages, createActivity } from '@/services/opportunity.service';
import { formatDate, formatDateTime, formatRelativeTime, formatCurrency } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { Customer, Contact, Activity, Opportunity, Stage } from '@/types/models';

type TabType = 'info' | 'contacts' | 'activities' | 'opportunities';

const activityTypeIcons: Record<string, React.ReactNode> = {
  call: <PhoneCall size={16} />,
  visit: <Users2 size={16} />,
  email: <MailIcon size={16} />,
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

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { can } = usePermissions();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
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
      const [cust, conts, acts, opps, stgs] = await Promise.all([
        getCustomerById(id),
        getContactsByCustomer(id, user.tenantId),
        getActivitiesByCustomer(id, user.tenantId),
        getOpportunitiesByCustomer(user.tenantId, id),
        getStages(user.tenantId),
      ]);
      setCustomer(cust || null);
      setContacts(conts);
      setActivities(acts);
      setOpportunities(opps);
      setStages(stgs);
    } catch (err) {
      console.error('Failed to load customer:', err);
    }
    setLoading(false);
  };

  const handleAddActivity = async () => {
    if (!id || !user || !activityContent.trim()) return;
    try {
      const newActivity = await createActivity({
        tenantId: user.tenantId,
        customerId: id,
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
    if (!customer || !confirm('确定要删除这个客户吗？')) return;
    deleteCustomer(customer.id);
    navigate('/customers');
  };

  const getStageName = (stageId: string) => {
    return stages.find((s) => s.id === stageId)?.name || '未知阶段';
  };

  const getStageColor = (stageId: string) => {
    return stages.find((s) => s.id === stageId)?.color || '#6b7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">客户不存在</p>
        <button
          onClick={() => navigate('/customers')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          返回客户列表
        </button>
      </div>
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'info', label: '基本信息', icon: <Building2 size={16} /> },
    { key: 'contacts', label: '联系人', icon: <Users size={16} />, count: contacts.length },
    { key: 'activities', label: '跟进记录', icon: <MessageSquare size={16} />, count: activities.length },
    { key: 'opportunities', label: '关联商机', icon: <DollarSign size={16} />, count: opportunities.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 rounded-lg hover:bg-white transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-lg font-bold">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-slate-900">
                {customer.name}
              </h1>
              <p className="text-sm text-slate-500">
                {customer.industry} · {customer.level}级客户
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {can('customers:edit') && (
            <button
              onClick={() => navigate(`/customers/${customer.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
            >
              <Edit size={16} />
              编辑
            </button>
          )}
          {can('customers:delete') && (
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
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">商机数量</p>
              <p className="text-lg font-bold text-slate-900">{opportunities.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">商机总额</p>
              <p className="text-lg font-bold text-slate-900">
                {formatCurrency(opportunities.reduce((sum, o) => sum + o.amount, 0))}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <Users size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">联系人</p>
              <p className="text-lg font-bold text-slate-900">{contacts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">最近跟进</p>
              <p className="text-lg font-bold text-slate-900">
                {customer.lastFollowUpAt ? formatRelativeTime(customer.lastFollowUpAt) : '未跟进'}
              </p>
            </div>
          </div>
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
                      <p className="text-xs text-slate-400">公司名称</p>
                      <p className="text-sm font-medium text-slate-700">{customer.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">所属行业</p>
                      <p className="text-sm font-medium text-slate-700">{customer.industry}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">公司地址</p>
                      <p className="text-sm font-medium text-slate-700">
                        {customer.address || '未填写'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">官方网站</p>
                      <p className="text-sm font-medium text-primary-600">
                        {customer.website || '未填写'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">备注</h3>
                <div className="p-4 bg-slate-50 rounded-lg min-h-[120px]">
                  <p className="text-sm text-slate-600">
                    {customer.notes || '暂无备注信息'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">联系人列表</h3>
                {can('customers:edit') && (
                  <button className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
                    <Plus size={16} />
                    添加联系人
                  </button>
                )}
              </div>
              {contacts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  暂无联系人
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-white font-medium">
                        {contact.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{contact.name}</p>
                          {contact.isDecisionMaker && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                              决策人
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{contact.position || '职位'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {contact.phone && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Phone size={14} className="text-slate-400" />
                            {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Mail size={14} className="text-slate-400" />
                            {contact.email}
                          </div>
                        )}
                      </div>
                      <button className="p-2 hover:bg-white rounded-lg transition-colors">
                        <MoreHorizontal size={16} className="text-slate-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">跟进记录</h3>
                {can('customers:edit') && (
                  <button
                    onClick={() => setShowAddActivity(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    添加跟进
                  </button>
                )}
              </div>

              {showAddActivity && (
                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                  <div className="flex gap-2 mb-3">
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

          {activeTab === 'opportunities' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">关联商机</h3>
                {can('opportunities:create') && (
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors">
                    <Plus size={16} />
                    新建商机
                  </button>
                )}
              </div>
              {opportunities.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  暂无关联商机
                </div>
              ) : (
                <div className="space-y-3">
                  {opportunities.map((opp) => (
                    <div
                      key={opp.id}
                      onClick={() => navigate(`/opportunities/${opp.id}`)}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      <div
                        className="w-1.5 h-12 rounded-full"
                        style={{ backgroundColor: getStageColor(opp.stageId) }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{opp.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: getStageColor(opp.stageId) }}
                          >
                            {getStageName(opp.stageId)}
                          </span>
                          <span className="text-xs text-slate-500">
                            预计成交：{formatDate(opp.expectedCloseDate)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">
                          {formatCurrency(opp.amount)}
                        </p>
                        <p className="text-xs text-slate-500">
                          成功率 {opp.probability}%
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-slate-400" />
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
