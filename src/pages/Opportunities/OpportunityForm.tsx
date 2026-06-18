import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { createOpportunity, getStages } from '@/services/opportunity.service';
import { getCustomers } from '@/services/customer.service';
import { getTeamMembers } from '@/services/team.service';
import type { Customer, Stage, User } from '@/types/models';

export default function OpportunityForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerIdParam = searchParams.get('customerId');
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    customerId: '',
    stageId: '',
    amount: '',
    expectedCloseDate: '',
    ownerId: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [user?.tenantId]);

  const loadData = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const [stagesData, customersData, membersData] = await Promise.all([
        getStages(user.tenantId),
        getCustomers(user.tenantId),
        getTeamMembers(user.tenantId),
      ]);
      setStages(stagesData.filter(s => !s.isWin && !s.isLoss));
      setCustomers(customersData);
      setTeamMembers(membersData.filter(m => m.role === 'sales_rep' || m.role === 'sales_manager'));
      
      const firstStage = stagesData.find(s => !s.isWin && !s.isLoss);
      if (firstStage) {
        setFormData(prev => ({ ...prev, stageId: firstStage.id }));
      }
      
      if (customerIdParam) {
        const customer = customersData.find(c => c.id === customerIdParam);
        if (customer) {
          setSelectedCustomer(customer);
          setCustomerSearch(customer.name);
          setFormData(prev => ({ ...prev, customerId: customer.id }));
        }
      }
      
      setFormData(prev => ({ ...prev, ownerId: user.id }));
      
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      setFormData(prev => ({ ...prev, expectedCloseDate: nextMonth.toISOString().split('T')[0] }));
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setFormData({ ...formData, customerId: customer.id });
    setShowCustomerDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId || !formData.name.trim() || !formData.customerId || !formData.stageId) return;
    
    setLoading(true);
    try {
      await createOpportunity({
        tenantId: user.tenantId,
        customerId: formData.customerId,
        ownerId: formData.ownerId,
        name: formData.name,
        stageId: formData.stageId,
        amount: parseFloat(formData.amount) || 0,
        expectedCloseDate: formData.expectedCloseDate,
        notes: formData.notes,
      });
      
      navigate('/opportunities');
    } catch (err) {
      console.error('Failed to create opportunity:', err);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">新建商机</h1>
          <p className="text-slate-500 mt-1">添加一个新的销售商机</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">基本信息</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  商机名称 <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入商机名称"
                />
              </div>
              
              <div className="md:col-span-2 relative">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  关联客户 <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                      if (!e.target.value) {
                        setSelectedCustomer(null);
                        setFormData(prev => ({ ...prev, customerId: '' }));
                      }
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="搜索客户名称..."
                  />
                </div>
                {showCustomerDropdown && customerSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-card border border-slate-200 max-h-48 overflow-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500">未找到匹配的客户</div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onMouseDown={() => handleSelectCustomer(customer)}
                          className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                        >
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                            {customer.name.charAt(0)}
                          </div>
                          <span className="text-sm">{customer.name}</span>
                          <span className="text-xs text-slate-400 ml-auto">{customer.industry}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {selectedCustomer && (
                  <p className="mt-1 text-xs text-green-600">已选择：{selectedCustomer.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  销售阶段
                </label>
                <select
                  value={formData.stageId}
                  onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  预计金额（万元）
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入预计金额"
                  min="0"
                  step="0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  预计成交日期
                </label>
                <input
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  负责人
                </label>
                <select
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                备注
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="商机备注信息..."
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!formData.name.trim() || !formData.customerId || loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
