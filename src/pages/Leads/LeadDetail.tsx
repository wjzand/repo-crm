import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  FileText,
  User,
  Tag,
  Clock,
  ArrowRight,
  Ban,
  Edit,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import { getLeadById, convertLead } from '@/services/lead.service';
import { getLeadSources, getTeamMembers } from '@/services/team.service';
import { getStages } from '@/services/opportunity.service';
import { formatDateTime, formatCurrency } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { Lead, LeadSource, Stage } from '@/types/models';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { can } = usePermissions();

  const [lead, setLead] = useState<Lead | null>(null);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertForm, setConvertForm] = useState({
    customerName: '',
    industry: '',
    contactName: '',
    phone: '',
    email: '',
    opportunityName: '',
    amount: '',
    expectedCloseDate: '',
    stageId: '',
  });

  useEffect(() => {
    if (id && user?.tenantId) {
      loadData();
    }
  }, [id, user?.tenantId]);

  const loadData = async () => {
    if (!id || !user?.tenantId) return;
    setLoading(true);
    try {
      const [leadData, sourcesData, stagesData, membersData] = await Promise.all([
        getLeadById(id),
        getLeadSources(user.tenantId),
        getStages(user.tenantId),
        getTeamMembers(user.tenantId),
      ]);
      setLead(leadData || null);
      setSources(sourcesData);
      setStages(stagesData.filter(s => !s.isWin && !s.isLoss));
      setTeamMembers(membersData);

      if (leadData) {
        setConvertForm({
          customerName: leadData.companyName,
          industry: '',
          contactName: leadData.contactName,
          phone: leadData.phone || '',
          email: leadData.email || '',
          opportunityName: leadData.companyName + ' - 合作项目',
          amount: '',
          expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          stageId: stagesData.find(s => !s.isWin && !s.isLoss)?.id || '',
        });
      }
    } catch (err) {
      console.error('Failed to load lead:', err);
    }
    setLoading(false);
  };

  const handleConvert = async () => {
    if (!id || !convertForm.customerName || !convertForm.opportunityName || !convertForm.amount || !convertForm.stageId) {
      return;
    }
    try {
      const result = await convertLead(
        id,
        {
          name: convertForm.customerName,
          industry: convertForm.industry || '其他',
        },
        {
          name: convertForm.contactName,
          phone: convertForm.phone,
          email: convertForm.email,
        },
        {
          name: convertForm.opportunityName,
          amount: Number(convertForm.amount),
          expectedCloseDate: convertForm.expectedCloseDate,
          stageId: convertForm.stageId,
        }
      );
      navigate(`/opportunities/${result.opportunityId}`);
    } catch (err) {
      console.error('Failed to convert lead:', err);
    }
  };

  const getSourceName = (sourceId: string) => {
    return sources.find((s) => s.id === sourceId)?.name || '未知';
  };

  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return '未分配';
    return teamMembers.find((m) => m.id === ownerId)?.name || '未知';
  };

  const statusLabels: Record<string, string> = {
    new: '新线索',
    contacted: '已联系',
    converted: '已转化',
    discarded: '已废弃',
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-amber-100 text-amber-700',
    converted: 'bg-green-100 text-green-700',
    discarded: 'bg-slate-100 text-slate-600',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">线索不存在</p>
        <button
          onClick={() => navigate('/leads')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          返回线索列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/leads')}
          className="p-2 rounded-lg hover:bg-white transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg font-bold">
              {lead.companyName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-slate-900">
                {lead.companyName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[lead.status])}>
                  {statusLabels[lead.status]}
                </span>
                <span className="text-sm text-slate-500">
                  来源：{getSourceName(lead.sourceId)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {can('leads:convert') && lead.status !== 'converted' && lead.status !== 'discarded' && (
            <button
              onClick={() => setShowConvertModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors"
            >
              <ArrowRight size={16} />
              转化为商机
            </button>
          )}
          {can('leads:edit') && (
            <button
              onClick={() => navigate(`/leads/${lead.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
            >
              <Edit size={16} />
              编辑
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Building2 size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">公司名称</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{lead.companyName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                  <Tag size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">线索来源</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{getSourceName(lead.sourceId)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">联系人</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{lead.contactName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">联系电话</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{lead.phone || '未填写'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 flex-shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">邮箱</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{lead.email || '未填写'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">负责人</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{getOwnerName(lead.ownerId)}</p>
                </div>
              </div>
            </div>
          </div>

          {lead.requirements && (
            <div className="bg-white rounded-xl p-6 shadow-card">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">需求描述</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{lead.requirements}</p>
            </div>
          )}

          {lead.notes && (
            <div className="bg-white rounded-xl p-6 shadow-card">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                <FileText size={18} className="inline mr-2" />
                备注
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{lead.notes}</p>
            </div>
          )}

          {lead.discardReason && (
            <div className="bg-danger-50 rounded-xl p-6 border border-danger-200">
              <h3 className="text-lg font-semibold text-danger-700 mb-2">
                <Ban size={18} className="inline mr-2" />
                废弃原因
              </h3>
              <p className="text-sm text-danger-600">{lead.discardReason}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">时间信息</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">创建时间</span>
                <span className="text-sm font-medium text-slate-700">
                  {formatDateTime(lead.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">更新时间</span>
                <span className="text-sm font-medium text-slate-700">
                  {formatDateTime(lead.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-6 text-white shadow-card">
            <h3 className="font-semibold mb-3">快速操作</h3>
            <div className="space-y-2">
              {can('leads:convert') && lead.status !== 'converted' && lead.status !== 'discarded' && (
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
                >
                  <ArrowRight size={18} />
                  转化为商机
                </button>
              )}
              {lead.status !== 'discarded' && lead.status !== 'converted' && (
                <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <Phone size={18} />
                  拨打电话
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">转化为商机</h3>
            
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <Building2 size={16} className="text-primary-500" />
                  客户信息
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">客户名称</label>
                    <input
                      type="text"
                      value={convertForm.customerName}
                      onChange={(e) => setConvertForm({ ...convertForm, customerName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="请输入客户名称"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">所属行业</label>
                    <input
                      type="text"
                      value={convertForm.industry}
                      onChange={(e) => setConvertForm({ ...convertForm, industry: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="请输入行业"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <User size={16} className="text-primary-500" />
                  联系人
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">姓名</label>
                    <input
                      type="text"
                      value={convertForm.contactName}
                      onChange={(e) => setConvertForm({ ...convertForm, contactName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">电话</label>
                    <input
                      type="tel"
                      value={convertForm.phone}
                      onChange={(e) => setConvertForm({ ...convertForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <span className="text-primary-500">💰</span>
                  商机信息
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">商机名称</label>
                    <input
                      type="text"
                      value={convertForm.opportunityName}
                      onChange={(e) => setConvertForm({ ...convertForm, opportunityName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="请输入商机名称"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">预计金额</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                        <input
                          type="number"
                          value={convertForm.amount}
                          onChange={(e) => setConvertForm({ ...convertForm, amount: e.target.value })}
                          className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">销售阶段</label>
                      <select
                        value={convertForm.stageId}
                        onChange={(e) => setConvertForm({ ...convertForm, stageId: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">预计成交日期</label>
                    <input
                      type="date"
                      value={convertForm.expectedCloseDate}
                      onChange={(e) => setConvertForm({ ...convertForm, expectedCloseDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowConvertModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConvert}
                disabled={!convertForm.customerName || !convertForm.opportunityName || !convertForm.amount}
                className="flex-1 px-4 py-2.5 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                确认转化
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
