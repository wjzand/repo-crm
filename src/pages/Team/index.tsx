import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  MoreVertical,
  Edit,
  Shield,
  Mail,
  Phone,
  UserCog,
  Target,
  Trash2,
  Crown,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { getTeamMembers, updateUserRole, updateUserStatus, setSalesTarget } from '@/services/team.service';
import { getUserSalesTarget } from '@/services/team.service';
import { formatDateTime, formatCurrency } from '@/utils/date';
import { roleLabels } from '@/utils/permissions';
import { cn } from '@/lib/utils';
import type { User, UserRole } from '@/types/models';

const roleColors: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  tenant_admin: 'bg-blue-100 text-blue-700',
  sales_manager: 'bg-amber-100 text-amber-700',
  sales_rep: 'bg-green-100 text-green-700',
};

export default function Team() {
  const { user, tenant } = useAuthStore();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'sales_rep' as UserRole, name: '' });
  const [targetForm, setTargetForm] = useState({ period: 'month' as 'month' | 'quarter', periodValue: '', targetAmount: '' });

  useEffect(() => {
    loadMembers();
  }, [user?.tenantId]);

  const loadMembers = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const data = await getTeamMembers(user.tenantId);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
    setLoading(false);
  };

  const handleRoleChange = async (id: string, role: UserRole) => {
    try {
      await updateUserRole(id, role);
      setMembers(members.map(m => m.id === id ? { ...m, role } : m));
    } catch (err) {
      console.error('Failed to update role:', err);
    }
    setOpenMenu(null);
  };

  const handleStatusToggle = async (id: string, status: 'active' | 'disabled') => {
    try {
      await updateUserStatus(id, status);
      setMembers(members.map(m => m.id === id ? { ...m, status } : m));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
    setOpenMenu(null);
  };

  const handleSetTarget = async (member: User) => {
    setSelectedMember(member);
    const currentMonth = new Date().toISOString().slice(0, 7);
    setTargetForm({ period: 'month', periodValue: currentMonth, targetAmount: '' });
    setShowTargetModal(true);
  };

  const handleSaveTarget = async () => {
    if (!selectedMember || !targetForm.targetAmount) return;
    try {
      await setSalesTarget(
        selectedMember.id,
        selectedMember.tenantId,
        targetForm.period,
        targetForm.periodValue,
        Number(targetForm.targetAmount)
      );
      setShowTargetModal(false);
      setSelectedMember(null);
    } catch (err) {
      console.error('Failed to set target:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">团队成员</h1>
          <p className="text-slate-500 mt-1">
            管理 {tenant?.name || '租户'} 的团队成员
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30"
        >
          <Plus size={18} />
          邀请成员
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Users size={20} />
            </div>
            <span className="text-sm text-slate-500">总成员数</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display">{members.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
              <Crown size={20} />
            </div>
            <span className="text-sm text-slate-500">管理人员</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display">
            {members.filter(m => m.role === 'tenant_admin' || m.role === 'sales_manager').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              <Target size={20} />
            </div>
            <span className="text-sm text-slate-500">销售人员</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display">
            {members.filter(m => m.role === 'sales_rep').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  成员
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  联系方式
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  加入时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    加载中...
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                          roleColors[member.role]
                        )}
                      >
                        <Shield size={12} />
                        {roleLabels[member.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {member.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Phone size={12} className="text-slate-400" />
                            {member.phone}
                          </div>
                        )}
                        {member.email && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Mail size={12} className="text-slate-400" />
                            {member.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                          member.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full mr-1.5',
                            member.status === 'active' ? 'bg-green-500' : 'bg-slate-400'
                          )}
                        />
                        {member.status === 'active' ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDateTime(member.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={16} className="text-slate-400" />
                        </button>
                        {openMenu === member.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-card-hover border border-slate-200 py-1 z-10">
                            {member.role !== 'tenant_admin' && (
                              <>
                                <button
                                  onClick={() => handleRoleChange(member.id, 'sales_manager')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <UserCog size={14} />
                                  设为销售经理
                                </button>
                                <button
                                  onClick={() => handleRoleChange(member.id, 'sales_rep')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <Users size={14} />
                                  设为销售人员
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleSetTarget(member)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              <Target size={14} />
                              设置目标
                            </button>
                            {member.status === 'active' ? (
                              <button
                                onClick={() => handleStatusToggle(member.id, 'disabled')}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                              >
                                <Trash2 size={14} />
                                禁用账号
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusToggle(member.id, 'active')}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                              >
                                <Users size={14} />
                                启用账号
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

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 animate-slide-up">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">邀请成员</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  姓名
                </label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  邮箱
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入邮箱"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  角色
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="sales_rep">销售人员</option>
                  <option value="sales_manager">销售经理</option>
                  <option value="tenant_admin">租户管理员</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                }}
                className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
              >
                发送邀请
              </button>
            </div>
          </div>
        </div>
      )}

      {showTargetModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 animate-slide-up">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">
              设置销售目标 - {selectedMember.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  周期类型
                </label>
                <select
                  value={targetForm.period}
                  onChange={(e) => setTargetForm({ ...targetForm, period: e.target.value as 'month' | 'quarter' })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="month">月度目标</option>
                  <option value="quarter">季度目标</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  周期值
                </label>
                <input
                  type="text"
                  value={targetForm.periodValue}
                  onChange={(e) => setTargetForm({ ...targetForm, periodValue: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="例如：2026-06 或 2026-Q2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  目标金额
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                  <input
                    type="number"
                    value={targetForm.targetAmount}
                    onChange={(e) => setTargetForm({ ...targetForm, targetAmount: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="请输入目标金额"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowTargetModal(false);
                  setSelectedMember(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveTarget}
                disabled={!targetForm.targetAmount}
                className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
