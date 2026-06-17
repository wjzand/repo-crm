import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import { getCustomers, deleteCustomer } from '@/services/customer.service';
import { getOpportunities } from '@/services/opportunity.service';
import { formatRelativeTime, formatNumber } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { Customer, CustomerLevel } from '@/types/models';

const levelColors: Record<CustomerLevel, string> = {
  A: 'bg-red-100 text-red-700 border-red-200',
  B: 'bg-amber-100 text-amber-700 border-amber-200',
  C: 'bg-blue-100 text-blue-700 border-blue-200',
  D: 'bg-slate-100 text-slate-600 border-slate-200',
};

const levelNames: Record<CustomerLevel, string> = {
  A: '重点客户',
  B: '普通客户',
  C: '潜在客户',
  D: '流失客户',
};

export default function Customers() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { can, getOwnerFilter, isAdmin } = usePermissions();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [oppCounts, setOppCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, [user?.tenantId]);

  const loadData = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const ownerId = getOwnerFilter();
      const data = await getCustomers(user.tenantId, ownerId);
      setCustomers(data);
      
      const opps = await getOpportunities(user.tenantId, { ownerId });
      const counts: Record<string, number> = {};
      for (const opp of opps) {
        counts[opp.customerId] = (counts[opp.customerId] || 0) + 1;
      }
      setOppCounts(counts);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
    setLoading(false);
  };

  const industries = [...new Set(customers.map((c) => c.industry))];

  const filteredCustomers = customers
    .filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.industry.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (levelFilter !== 'all' && c.level !== levelFilter) return false;
      if (industryFilter !== 'all' && c.industry !== industryFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'createdAt') comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortBy === 'lastFollowUpAt') {
        const aTime = a.lastFollowUpAt ? new Date(a.lastFollowUpAt).getTime() : 0;
        const bTime = b.lastFollowUpAt ? new Date(b.lastFollowUpAt).getTime() : 0;
        comparison = aTime - bTime;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const paginatedCustomers = filteredCustomers.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个客户吗？')) return;
    try {
      await deleteCustomer(id);
      setCustomers(customers.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
    setOpenMenu(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">客户管理</h1>
          <p className="text-slate-500 mt-1">
            共 {customers.length} 个客户
          </p>
        </div>
        {can('customers:create') && (
          <button
            onClick={() => navigate('/customers/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30"
          >
            <Plus size={18} />
            新建客户
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="搜索客户名称、行业..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={levelFilter}
                onChange={(e) => {
                  setLevelFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">全部等级</option>
                <option value="A">A级 - 重点</option>
                <option value="B">B级 - 普通</option>
                <option value="C">C级 - 潜在</option>
                <option value="D">D级 - 流失</option>
              </select>
            </div>
            <select
              value={industryFilter}
              onChange={(e) => {
                setIndustryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">全部行业</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    客户名称
                    {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  行业
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  等级
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  联系人
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('lastFollowUpAt')}
                >
                  <div className="flex items-center gap-1">
                    最近跟进
                    {sortBy === 'lastFollowUpAt' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  商机数
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
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    暂无客户数据
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{customer.name}</p>
                          {customer.website && (
                            <p className="text-xs text-slate-400">{customer.website}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.industry}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                          levelColors[customer.level]
                        )}
                      >
                        {levelNames[customer.level]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-slate-400" />
                        <span>--</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {customer.lastFollowUpAt ? (
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          {formatRelativeTime(customer.lastFollowUpAt)}
                        </div>
                      ) : (
                        <span className="text-slate-400">未跟进</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {oppCounts[customer.id] || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu(openMenu === customer.id ? null : customer.id);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={16} className="text-slate-400" />
                        </button>
                        {openMenu === customer.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-card-hover border border-slate-200 py-1 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/customers/${customer.id}/edit`);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              <Edit size={14} />
                              编辑
                            </button>
                            {can('customers:delete') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(customer.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                              >
                                <Trash2 size={14} />
                                删除
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

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredCustomers.length)} 条，共 {filteredCustomers.length} 条
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-all',
                    page === p
                      ? 'bg-primary-500 text-white shadow'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
