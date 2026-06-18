import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { getCustomerById, createCustomer, updateCustomer } from '@/services/customer.service';
import { getContactsByCustomer, createContact, updateContact, deleteContact } from '@/services/customer.service';
import { getCustomerLevels } from '@/services/team.service';
import { getTeamMembers } from '@/services/team.service';
import { cn } from '@/lib/utils';
import type { Customer, Contact, CustomerLevelConfig, User } from '@/types/models';

interface ContactForm {
  id?: string;
  name: string;
  position: string;
  phone: string;
  email: string;
  isDecisionMaker: boolean;
}

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState<CustomerLevelConfig[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    level: 'B' as string,
    address: '',
    website: '',
    notes: '',
    ownerId: '',
  });
  
  const [contacts, setContacts] = useState<ContactForm[]>([
    { name: '', position: '', phone: '', email: '', isDecisionMaker: false }
  ]);

  useEffect(() => {
    loadData();
  }, [user?.tenantId, id]);

  const loadData = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const [levelsData, membersData] = await Promise.all([
        getCustomerLevels(user.tenantId),
        getTeamMembers(user.tenantId),
      ]);
      setLevels(levelsData);
      setTeamMembers(membersData);
      
      if (isEdit && id) {
        const customer = await getCustomerById(id);
        if (customer) {
          setFormData({
            name: customer.name,
            industry: customer.industry,
            level: customer.level,
            address: customer.address || '',
            website: customer.website || '',
            notes: customer.notes || '',
            ownerId: customer.ownerId,
          });
          
          const contactList = await getContactsByCustomer(id, user.tenantId);
          if (contactList.length > 0) {
            setContacts(contactList.map(c => ({
              id: c.id,
              name: c.name,
              position: c.position || '',
              phone: c.phone || '',
              email: c.email || '',
              isDecisionMaker: c.isDecisionMaker,
            })));
          }
        }
      } else {
        setFormData(prev => ({ ...prev, ownerId: user.id }));
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  const handleAddContact = () => {
    setContacts([...contacts, { name: '', position: '', phone: '', email: '', isDecisionMaker: false }]);
  };

  const handleRemoveContact = (index: number) => {
    if (contacts.length === 1) return;
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleContactChange = (index: number, field: keyof ContactForm, value: string | boolean) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId || !formData.name.trim()) return;
    
    setLoading(true);
    try {
      if (isEdit && id) {
        const updated = await updateCustomer(id, {
          name: formData.name,
          industry: formData.industry,
          level: formData.level as any,
          address: formData.address,
          website: formData.website,
          notes: formData.notes,
          ownerId: formData.ownerId,
        });
        
        if (updated) {
          for (const contact of contacts) {
            if (contact.id) {
              await updateContact(contact.id, {
                name: contact.name,
                position: contact.position,
                phone: contact.phone,
                email: contact.email,
                isDecisionMaker: contact.isDecisionMaker,
              });
            } else if (contact.name.trim()) {
              await createContact({
                customerId: id,
                tenantId: user.tenantId,
                name: contact.name,
                position: contact.position,
                phone: contact.phone,
                email: contact.email,
                isDecisionMaker: contact.isDecisionMaker,
              });
            }
          }
        }
        
        navigate(`/customers/${id}`);
      } else {
        const customer = await createCustomer({
          tenantId: user.tenantId,
          ownerId: formData.ownerId,
          name: formData.name,
          industry: formData.industry,
          level: formData.level as any,
          address: formData.address,
          website: formData.website,
          notes: formData.notes,
        });
        
        for (const contact of contacts) {
          if (contact.name.trim()) {
            await createContact({
              customerId: customer.id,
              tenantId: user.tenantId,
              name: contact.name,
              position: contact.position,
              phone: contact.phone,
              email: contact.email,
              isDecisionMaker: contact.isDecisionMaker,
            });
          }
        }
        
        navigate(`/customers/${customer.id}`);
      }
    } catch (err) {
      console.error('Failed to save customer:', err);
    }
    setLoading(false);
  };

  if (loading && isEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">加载中...</p>
      </div>
    );
  }

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
          <h1 className="text-2xl font-display font-bold text-slate-900">
            {isEdit ? '编辑客户' : '新建客户'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isEdit ? '修改客户信息' : '添加一个新的客户'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">基本信息</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  客户名称 <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入客户名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  所属行业
                </label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="如：软件服务"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  客户等级
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {levels.map((level) => (
                    <option key={level.id} value={level.code}>
                      {level.name} ({level.code}级)
                    </option>
                  ))}
                </select>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  官网
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  地址
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入地址"
                />
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
                placeholder="客户备注信息..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">联系人</h3>
            <button
              type="button"
              onClick={handleAddContact}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus size={16} />
              添加联系人
            </button>
          </div>
          <div className="p-6 space-y-4">
            {contacts.map((contact, index) => (
              <div
                key={index}
                className="p-4 bg-slate-50 rounded-xl space-y-3 relative group"
              >
                {contacts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveContact(index)}
                    className="absolute top-3 right-3 p-1.5 hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} className="text-danger-500" />
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      姓名
                    </label>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="联系人姓名"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      职位
                    </label>
                    <input
                      type="text"
                      value={contact.position}
                      onChange={(e) => handleContactChange(index, 'position', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="如：销售总监"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      电话
                    </label>
                    <input
                      type="text"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="联系电话"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      邮箱
                    </label>
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="邮箱地址"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={contact.isDecisionMaker}
                    onChange={(e) => handleContactChange(index, 'isDecisionMaker', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-slate-600">是否为决策人</span>
                </div>
              </div>
            ))}
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
            disabled={!formData.name.trim() || loading}
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
