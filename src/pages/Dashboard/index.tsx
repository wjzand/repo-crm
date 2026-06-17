import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  TrendingUp,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  Trophy,
  Calendar,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import { getLeads } from '@/services/lead.service';
import { getOpportunities, getStages } from '@/services/opportunity.service';
import { getTeamMembers, getUserSalesTarget } from '@/services/team.service';
import { formatCurrency, formatNumber } from '@/utils/date';
import { getMonthStart, getMonthEnd, getDaysDiff, getLastNMonths, getMonthName } from '@/utils/date';
import type { Lead, Opportunity, Stage, User } from '@/types/models';

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  progress?: number;
  progressLabel?: string;
}

function StatCard({ title, value, change, icon, iconBg, iconColor, progress, progressLabel }: StatCardProps) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-display font-bold text-slate-900 mt-2">{value}</p>
          <div className="flex items-center gap-1 mt-2">
            {isPositive ? (
              <ArrowUpRight size={14} className="text-accent-500" />
            ) : (
              <ArrowDownRight size={14} className="text-danger-500" />
            )}
            <span className={`text-xs font-medium ${isPositive ? 'text-accent-600' : 'text-danger-600'}`}>
              {Math.abs(change)}%
            </span>
            <span className="text-xs text-slate-400">较上月</span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>{progressLabel || '目标完成率'}</span>
            <span className="font-medium text-slate-700">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FunnelMiniChart({ stages, opportunities }: { stages: Stage[]; opportunities: Opportunity[] }) {
  const stageData = stages.map((stage) => {
    const count = opportunities.filter((o) => o.stageId === stage.id).length;
    const amount = opportunities
      .filter((o) => o.stageId === stage.id)
      .reduce((sum, o) => sum + o.amount, 0);
    return { ...stage, count, amount };
  });

  const maxCount = Math.max(...stageData.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {stageData.map((stage) => (
        <div key={stage.id} className="group">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-sm font-medium text-slate-700">{stage.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-900">{stage.count}</span>
              <span className="text-xs text-slate-400 w-20 text-right">
                {formatCurrency(stage.amount)}
              </span>
            </div>
          </div>
          <div className="h-6 bg-slate-100 rounded-lg overflow-hidden">
            <div
              className="h-full rounded-lg transition-all duration-700 group-hover:opacity-90"
              style={{
                width: `${(stage.count / maxCount) * 100}%`,
                backgroundColor: stage.color,
                opacity: 0.8,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FollowUpItem({ opportunity, customerName }: { opportunity: Opportunity; customerName: string }) {
  const days = getDaysDiff(new Date(), new Date(opportunity.updatedAt));
  const isUrgent = days >= 7;

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isUrgent ? 'bg-warning-100 text-warning-600' : 'bg-slate-100 text-slate-500'
        }`}
      >
        <Clock size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{opportunity.name}</p>
        <p className="text-xs text-slate-500 truncate">{customerName}</p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-medium ${isUrgent ? 'text-warning-600' : 'text-slate-500'}`}>
          {days}天未跟进
        </p>
        <p className="text-xs text-slate-400">{formatCurrency(opportunity.amount)}</p>
      </div>
    </div>
  );
}

function RankingItem({ user, rank, amount }: { user: User; rank: number; amount: number }) {
  const rankColors = [
    'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white',
    'bg-gradient-to-br from-slate-300 to-slate-500 text-white',
    'bg-gradient-to-br from-amber-600 to-amber-800 text-white',
  ];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          rank <= 3 ? rankColors[rank - 1] : 'bg-slate-100 text-slate-600'
        }`}
      >
        {rank}
      </div>
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-white text-sm font-medium">
        {user.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{user.name}</p>
        <p className="text-xs text-slate-500">
          {user.role === 'sales_manager' ? '销售经理' : '销售人员'}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-900">{formatCurrency(amount)}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, tenant } = useAuthStore();
  const { isManagerOrAbove, getOwnerFilter } = usePermissions();
  
  const [period, setPeriod] = useState<'month' | 'quarter'>('month');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user?.tenantId]);

  const loadData = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const ownerId = getOwnerFilter();
      const [leadsData, oppsData, stagesData, membersData] = await Promise.all([
        getLeads(user.tenantId, ownerId),
        getOpportunities(user.tenantId, { ownerId }),
        getStages(user.tenantId),
        isManagerOrAbove() ? getTeamMembers(user.tenantId) : Promise.resolve([]),
      ]);
      setLeads(leadsData);
      setOpportunities(oppsData);
      setStages(stagesData);
      setTeamMembers(membersData.filter(m => m.role === 'sales_rep'));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
    setLoading(false);
  };

  const monthStart = getMonthStart();
  const monthEnd = getMonthEnd();

  const monthlyLeads = leads.filter(
    (l) => new Date(l.createdAt) >= monthStart && new Date(l.createdAt) <= monthEnd
  );

  const monthlyOpportunities = opportunities.filter(
    (o) => new Date(o.createdAt) >= monthStart && new Date(o.createdAt) <= monthEnd
  );

  const winStage = stages.find((s) => s.isWin);
  const monthlyWonAmount = opportunities
    .filter(
      (o) =>
        winStage &&
        o.stageId === winStage.id &&
        new Date(o.updatedAt) >= monthStart &&
        new Date(o.updatedAt) <= monthEnd
    )
    .reduce((sum, o) => sum + o.amount, 0);

  const targetProgress = user ? 68 : 0;

  const followUpOpps = opportunities
    .filter((o) => {
      const days = getDaysDiff(new Date(), new Date(o.updatedAt));
      return days >= 3 && !stages.find((s) => s.id === o.stageId)?.isWin && !stages.find((s) => s.id === o.stageId)?.isLoss;
    })
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
    .slice(0, 5);

  const trendData = getLastNMonths(6).map((date) => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const monthLeads = leads.filter(
      (l) => new Date(l.createdAt) >= monthStart && new Date(l.createdAt) <= monthEnd
    ).length;
    
    const monthOpps = opportunities.filter(
      (o) => new Date(o.createdAt) >= monthStart && new Date(o.createdAt) <= monthEnd
    ).length;
    
    const monthAmount = opportunities
      .filter(
        (o) =>
          winStage &&
          o.stageId === winStage.id &&
          new Date(o.updatedAt) >= monthStart &&
          new Date(o.updatedAt) <= monthEnd
      )
      .reduce((sum, o) => sum + o.amount, 0);

    return {
      month: getMonthName(date),
      线索数: monthLeads,
      商机数: monthOpps,
      成交金额: monthAmount / 10000,
    };
  });

  const rankings = teamMembers
    .map((member) => {
      const wonAmount = opportunities
        .filter(
          (o) =>
            o.ownerId === member.id &&
            winStage &&
            o.stageId === winStage.id
        )
        .reduce((sum, o) => sum + o.amount, 0);
      return { user: member, amount: wonAmount };
    })
    .sort((a, b) => b.amount - a.amount);

  const customerNames: Record<string, string> = {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            早上好，{user?.name?.split('')[0]}！
          </h1>
          <p className="text-slate-500 mt-1">
            这是{tenant?.name || '您团队'}的销售数据概览
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-card">
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              period === 'month'
                ? 'bg-primary-500 text-white shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            本月
          </button>
          <button
            onClick={() => setPeriod('quarter')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              period === 'quarter'
                ? 'bg-primary-500 text-white shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            本季
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="本月新增线索"
          value={formatNumber(monthlyLeads.length)}
          change={12.5}
          icon={<Target size={24} />}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
        />
        <StatCard
          title="本月转化商机"
          value={formatNumber(monthlyOpportunities.length)}
          change={8.3}
          icon={<TrendingUp size={24} />}
          iconBg="bg-accent-100"
          iconColor="text-accent-600"
        />
        <StatCard
          title="本月成交金额"
          value={formatCurrency(monthlyWonAmount)}
          change={23.1}
          icon={<DollarSign size={24} />}
          iconBg="bg-warning-100"
          iconColor="text-warning-600"
        />
        <StatCard
          title="目标完成率"
          value={`${targetProgress}%`}
          change={5.2}
          icon={<Users size={24} />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          progress={targetProgress}
          progressLabel="月度目标"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">销售趋势</h3>
              <p className="text-sm text-slate-500 mt-0.5">近6个月数据走势</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOpps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="线索数" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="商机数" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorOpps)" />
                <Area type="monotone" dataKey="成交金额" stroke="#10b981" fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">销售漏斗概览</h3>
              <p className="text-sm text-slate-500 mt-0.5">各阶段商机分布</p>
            </div>
            <button
              onClick={() => navigate('/funnel')}
              className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1"
            >
              详情
              <ChevronRight size={14} />
            </button>
          </div>
          <FunnelMiniChart stages={stages.filter(s => !s.isWin && !s.isLoss)} opportunities={opportunities} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-warning-500" />
              <h3 className="text-lg font-semibold text-slate-900">近期跟进提醒</h3>
            </div>
          </div>
          <div className="space-y-1">
            {followUpOpps.length > 0 ? (
              followUpOpps.map((opp) => (
                <FollowUpItem key={opp.id} opportunity={opp} customerName={customerNames[opp.customerId] || '客户'} />
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                暂无需要跟进的商机
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-warning-500" />
              <h3 className="text-lg font-semibold text-slate-900">销售业绩排行</h3>
            </div>
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Calendar size={14} />
              <span>本月</span>
            </div>
          </div>
          {rankings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1">
              {rankings.map((item, index) => (
                <RankingItem
                  key={item.user.id}
                  user={item.user}
                  rank={index + 1}
                  amount={item.amount}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">
              暂无排行数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
