import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Filter,
  Calendar,
  User,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import { getOpportunities, getStages } from '@/services/opportunity.service';
import { getTeamMembers } from '@/services/team.service';
import { formatCurrency, formatNumber, getMonthStart, getMonthEnd, getQuarterStart, getQuarterEnd, getYearStart, getYearEnd } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { Opportunity, Stage, User as UserType } from '@/types/models';

type TimeRange = 'month' | 'quarter' | 'year' | 'custom';
type MetricType = 'count' | 'amount';

interface FunnelDataItem {
  stage: Stage;
  count: number;
  amount: number;
  conversionRate: number;
}

export default function Funnel() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isManagerOrAbove, getOwnerFilter } = usePermissions();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [metric, setMetric] = useState<MetricType>('count');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadData();
  }, [user?.tenantId]);

  useEffect(() => {
    drawFunnel();
  }, [opportunities, stages, metric, hoveredIndex]);

  const loadData = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const ownerId = getOwnerFilter();
      const [oppsData, stagesData, membersData] = await Promise.all([
        getOpportunities(user.tenantId, { ownerId }),
        getStages(user.tenantId),
        isManagerOrAbove() ? getTeamMembers(user.tenantId) : Promise.resolve([]),
      ]);
      setOpportunities(oppsData);
      setStages(stagesData.filter(s => !s.isWin && !s.isLoss));
      setTeamMembers(membersData.filter(m => m.role === 'sales_rep' || m.role === 'sales_manager'));
    } catch (err) {
      console.error('Failed to load funnel data:', err);
    }
    setLoading(false);
  };

  const getFilteredOpps = () => {
    let filtered = [...opportunities];

    if (ownerFilter !== 'all') {
      filtered = filtered.filter(o => o.ownerId === ownerFilter);
    }

    let startDate: Date;
    let endDate: Date;

    switch (timeRange) {
      case 'month':
        startDate = getMonthStart();
        endDate = getMonthEnd();
        break;
      case 'quarter':
        startDate = getQuarterStart();
        endDate = getQuarterEnd();
        break;
      case 'year':
        startDate = getYearStart();
        endDate = getYearEnd();
        break;
      default:
        return filtered;
    }

    return filtered.filter(o => {
      const created = new Date(o.createdAt);
      return created >= startDate && created <= endDate;
    });
  };

  const getFunnelData = (): FunnelDataItem[] => {
    const filteredOpps = getFilteredOpps();
    const funnelStages = stages.filter(s => !s.isWin && !s.isLoss);

    const data = funnelStages.map((stage) => {
      const stageOpps = filteredOpps.filter(o => o.stageId === stage.id);
      return {
        stage,
        count: stageOpps.length,
        amount: stageOpps.reduce((sum, o) => sum + o.amount, 0),
        conversionRate: 0,
      };
    });

    for (let i = 1; i < data.length; i++) {
      if (data[i - 1].count > 0) {
        data[i].conversionRate = Math.round((data[i].count / data[i - 1].count) * 100);
      }
    }

    return data;
  };

  const drawFunnel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const funnelData = getFunnelData();

    if (funnelData.length === 0) return;

    const maxValue = metric === 'count' 
      ? Math.max(...funnelData.map(d => d.count))
      : Math.max(...funnelData.map(d => d.amount));

    const topWidth = width * 0.9;
    const bottomWidth = width * 0.3;
    const topX = (width - topWidth) / 2;
    const bottomX = (width - bottomWidth) / 2;

    const paddingY = 20;
    const itemHeight = (height - paddingY * 2) / funnelData.length;

    ctx.clearRect(0, 0, width, height);

    funnelData.forEach((item, index) => {
      const value = metric === 'count' ? item.count : item.amount;
      const ratio = maxValue > 0 ? value / maxValue : 0;

      const y = paddingY + index * itemHeight;
      const nextY = y + itemHeight;

      const topWidthCurrent = topWidth - (topWidth - bottomWidth) * (index / funnelData.length);
      const bottomWidthCurrent = topWidth - (topWidth - bottomWidth) * ((index + 1) / funnelData.length);

      const topXCurrent = (width - topWidthCurrent) / 2;
      const bottomXCurrent = (width - bottomWidthCurrent) / 2;

      const color = item.stage.color;

      ctx.save();
      
      const gradient = ctx.createLinearGradient(topXCurrent, y, bottomXCurrent, nextY);
      gradient.addColorStop(0, color + 'cc');
      gradient.addColorStop(1, color + '99');

      ctx.beginPath();
      ctx.moveTo(topXCurrent, y);
      ctx.lineTo(topXCurrent + topWidthCurrent, y);
      ctx.lineTo(bottomXCurrent + bottomWidthCurrent, nextY);
      ctx.lineTo(bottomXCurrent, nextY);
      ctx.closePath();

      if (hoveredIndex === index) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
      }

      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.restore();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const label = metric === 'count' ? formatNumber(value) : formatCurrency(value);
      const centerY = y + itemHeight / 2;

      ctx.fillStyle = '#fff';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText(label, width / 2, centerY - 8);

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(item.stage.name, width / 2, centerY + 12);

      if (index > 0) {
        const prevValue = metric === 'count' ? funnelData[index - 1].count : funnelData[index - 1].amount;
        const rate = prevValue > 0 ? Math.round((value / prevValue) * 100) : 0;

        ctx.fillStyle = '#64748b';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`转化率 ${rate}%`, width - 10, centerY);
      }
    });
  };

  const funnelData = getFunnelData();

  const idealConversionRates = [100, 70, 50, 30, 15];

  const getHealthAnalysis = () => {
    const analysis: { stage: string; issue: string; suggestion: string; severity: 'warning' | 'danger' }[] = [];

    funnelData.forEach((item, index) => {
      if (index === 0) return;
      const ideal = idealConversionRates[index] || 30;
      if (item.conversionRate > 0 && item.conversionRate < ideal * 0.6) {
        analysis.push({
          stage: item.stage.name,
          issue: `转化率仅 ${item.conversionRate}%，低于理想值 ${ideal}%`,
          suggestion: `建议优化${item.stage.name}阶段的跟进策略，加强客户需求挖掘`,
          severity: item.conversionRate < ideal * 0.4 ? 'danger' : 'warning',
        });
      }
    });

    return analysis;
  };

  const healthAnalysis = getHealthAnalysis();

  const totalCount = funnelData.reduce((sum, d) => sum + d.count, 0);
  const totalAmount = funnelData.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">销售漏斗</h1>
          <p className="text-slate-500 mt-1">可视化分析销售转化漏斗</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <div className="flex bg-slate-100 rounded-lg p-1">
              {(['month', 'quarter', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                    timeRange === range
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {range === 'month' ? '本月' : range === 'quarter' ? '本季' : '本年'}
                </button>
              ))}
            </div>
          </div>

          {isManagerOrAbove() && (
            <div className="flex items-center gap-2">
              <User size={16} className="text-slate-400" />
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">全部销售人员</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setMetric('count')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                  metric === 'count'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                按数量
              </button>
              <button
                onClick={() => setMetric('amount')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                  metric === 'amount'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                按金额
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">漏斗视图</h3>
            <div className="text-sm text-slate-500">
              共 {totalCount} 个商机，总金额 {formatCurrency(totalAmount)}
            </div>
          </div>
          <div className="relative" style={{ height: '400px' }}>
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-pointer"
              onMouseMove={(e) => {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;
                const y = e.clientY - rect.top;
                const itemHeight = (rect.height - 40) / funnelData.length;
                const index = Math.floor((y - 20) / itemHeight);
                if (index >= 0 && index < funnelData.length) {
                  setHoveredIndex(index);
                } else {
                  setHoveredIndex(null);
                }
              }}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => {
                if (hoveredIndex !== null) {
                  navigate(`/opportunities?stage=${funnelData[hoveredIndex].stage.id}`);
                }
              }}
            />
            {hoveredIndex !== null && funnelData[hoveredIndex] && (
              <div 
                className="absolute bg-slate-900 text-white px-3 py-2 rounded-lg text-xs pointer-events-none z-10 shadow-lg"
                style={{
                  left: '50%',
                  top: `${20 + hoveredIndex * ((400 - 40) / funnelData.length) + ((400 - 40) / funnelData.length) / 2}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <p className="font-medium">{funnelData[hoveredIndex].stage.name}</p>
                <p>商机数：{funnelData[hoveredIndex].count}</p>
                <p>金额：{formatCurrency(funnelData[hoveredIndex].amount)}</p>
                {hoveredIndex > 0 && (
                  <p>转化率：{funnelData[hoveredIndex].conversionRate}%</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">漏斗数据</h3>
            <div className="space-y-3">
              {funnelData.map((item, index) => (
                <div
                  key={item.stage.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/opportunities?stage=${item.stage.id}`)}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.stage.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {item.stage.name}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {metric === 'count' ? formatNumber(item.count) : formatCurrency(item.amount)}
                      </span>
                    </div>
                    {index > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        转化率 {item.conversionRate}%
                      </p>
                    )}
                  </div>
                  <ChevronDown size={16} className="text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={20} className="text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-900">健康度分析</h3>
        </div>

        {healthAnalysis.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-slate-400">
            <TrendingUp size={48} className="mb-3 text-accent-400" />
            <p className="font-medium">漏斗健康度良好</p>
            <p className="text-sm">各阶段转化率处于正常范围</p>
          </div>
        ) : (
          <div className="space-y-3">
            {healthAnalysis.map((item, index) => (
              <div
                key={index}
                className={cn(
                  'p-4 rounded-xl border',
                  item.severity === 'danger'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                )}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={20}
                    className={cn(
                      'flex-shrink-0 mt-0.5',
                      item.severity === 'danger' ? 'text-red-500' : 'text-amber-500'
                    )}
                  />
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.stage}阶段转化率偏低
                    </p>
                    <p className="text-sm text-slate-600 mt-1">{item.issue}</p>
                    <p className="text-sm text-slate-500 mt-2">
                      <span className="font-medium text-accent-600">建议：</span>
                      {item.suggestion}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
