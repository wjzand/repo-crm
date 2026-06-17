import { useState, useEffect } from 'react';
import {
  Settings,
  Layers,
  Target,
  Building2,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Save,
  Palette,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  getStages,
  createStage,
  updateStage,
  deleteStage,
} from '@/services/opportunity.service';
import {
  getLeadSources,
  createLeadSource,
  updateLeadSource,
  deleteLeadSource,
} from '@/services/team.service';
import {
  getCustomerLevels,
  createCustomerLevel,
  updateCustomerLevel,
  deleteCustomerLevel,
} from '@/services/team.service';
import { updateTenant } from '@/services/team.service';
import { cn } from '@/lib/utils';
import type { Stage, LeadSource, CustomerLevelConfig, Tenant } from '@/types/models';

type TabType = 'stages' | 'sources' | 'levels' | 'info';

const colorOptions = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1',
];

export default function SettingsPage() {
  const { user, tenant, updateTenant: updateAuthTenant } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('stages');
  const [stages, setStages] = useState<Stage[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [customerLevels, setCustomerLevels] = useState<CustomerLevelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantForm, setTenantForm] = useState({ name: '', industry: '', timezone: '' });

  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [stageForm, setStageForm] = useState({ name: '', color: '#3b82f6' });

  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null);
  const [sourceForm, setSourceForm] = useState({ name: '' });

  const [showLevelModal, setShowLevelModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<CustomerLevelConfig | null>(null);
  const [levelForm, setLevelForm] = useState({ name: '', code: '', color: '#3b82f6' });

  useEffect(() => {
    loadData();
    if (tenant) {
      setTenantForm({
        name: tenant.name,
        industry: tenant.industry,
        timezone: tenant.timezone,
      });
    }
  }, [user?.tenantId]);

  const loadData = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const [stagesData, sourcesData, levelsData] = await Promise.all([
        getStages(user.tenantId),
        getLeadSources(user.tenantId),
        getCustomerLevels(user.tenantId),
      ]);
      setStages(stagesData);
      setLeadSources(sourcesData);
      setCustomerLevels(levelsData);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    setLoading(false);
  };

  const handleSaveStage = async () => {
    if (!user?.tenantId || !stageForm.name.trim()) return;

    if (editingStage) {
      const updated = await updateStage(editingStage.id, stageForm);
      if (updated) {
        setStages(stages.map(s => s.id === editingStage.id ? updated : s));
      }
    } else {
      const newStage = await createStage({
        ...stageForm,
        tenantId: user.tenantId,
        order: stages.length + 1,
      });
      setStages([...stages, newStage]);
    }
    setShowStageModal(false);
    setEditingStage(null);
    setStageForm({ name: '', color: '#3b82f6' });
  };

  const handleDeleteStage = async (id: string) => {
    if (!confirm('确定要删除这个阶段吗？该阶段下的商机将移动到第一个阶段。')) return;
    const firstStage = stages.find(s => s.id !== id);
    if (!firstStage) return;
    try {
      await deleteStage(id, firstStage.id);
      setStages(stages.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete stage:', err);
    }
  };

  const handleSaveSource = async () => {
    if (!user?.tenantId || !sourceForm.name.trim()) return;

    if (editingSource) {
      const updated = await updateLeadSource(editingSource.id, sourceForm);
      if (updated) {
        setLeadSources(leadSources.map(s => s.id === editingSource.id ? updated : s));
      }
    } else {
      const newSource = await createLeadSource({
        ...sourceForm,
        tenantId: user.tenantId,
      });
      setLeadSources([...leadSources, newSource]);
    }
    setShowSourceModal(false);
    setEditingSource(null);
    setSourceForm({ name: '' });
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('确定要删除这个线索来源吗？')) return;
    try {
      await deleteLeadSource(id);
      setLeadSources(leadSources.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  const handleSaveLevel = async () => {
    if (!user?.tenantId || !levelForm.name.trim() || !levelForm.code.trim()) return;

    if (editingLevel) {
      const updated = await updateCustomerLevel(editingLevel.id, levelForm);
      if (updated) {
        setCustomerLevels(customerLevels.map(l => l.id === editingLevel.id ? updated : l));
      }
    } else {
      const newLevel = await createCustomerLevel({
        ...levelForm,
        tenantId: user.tenantId,
      });
      setCustomerLevels([...customerLevels, newLevel]);
    }
    setShowLevelModal(false);
    setEditingLevel(null);
    setLevelForm({ name: '', code: '', color: '#3b82f6' });
  };

  const handleDeleteLevel = async (id: string) => {
    if (!confirm('确定要删除这个客户等级吗？')) return;
    try {
      await deleteCustomerLevel(id);
      setCustomerLevels(customerLevels.filter(l => l.id !== id));
    } catch (err) {
      console.error('Failed to delete level:', err);
    }
  };

  const handleSaveTenant = async () => {
    if (!tenant || !tenantForm.name.trim()) return;
    try {
      const updated = await updateTenant(tenant.id, tenantForm);
      if (updated) {
        updateAuthTenant(updated);
      }
    } catch (err) {
      console.error('Failed to update tenant:', err);
    }
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'stages', label: '销售阶段', icon: <Layers size={18} /> },
    { key: 'sources', label: '线索来源', icon: <Target size={18} /> },
    { key: 'levels', label: '客户等级', icon: <User size={18} /> },
    { key: 'info', label: '基本信息', icon: <Building2 size={18} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900">系统设置</h1>
        <p className="text-slate-500 mt-1">配置系统参数和业务选项</p>
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
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'stages' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">销售阶段配置</h3>
                  <p className="text-sm text-slate-500 mt-1">管理销售漏斗的各个阶段</p>
                </div>
                <button
                  onClick={() => {
                    setEditingStage(null);
                    setStageForm({ name: '', color: '#3b82f6' });
                    setShowStageModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  添加阶段
                </button>
              </div>

              <div className="space-y-2">
                {stages.map((stage, index) => (
                  <div
                    key={stage.id}
                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                  >
                    <div className="cursor-grab text-slate-400 hover:text-slate-600">
                      <GripVertical size={18} />
                    </div>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{stage.name}</p>
                      <p className="text-xs text-slate-500">排序：{stage.order}</p>
                    </div>
                    {stage.isWin && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                        赢单阶段
                      </span>
                    )}
                    {stage.isLoss && (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-medium rounded">
                        输单阶段
                      </span>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingStage(stage);
                          setStageForm({ name: stage.name, color: stage.color });
                          setShowStageModal(true);
                        }}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors"
                      >
                        <Edit2 size={16} className="text-slate-500" />
                      </button>
                      {!stage.isWin && !stage.isLoss && (
                        <button
                          onClick={() => handleDeleteStage(stage.id)}
                          className="p-1.5 hover:bg-danger-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} className="text-danger-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sources' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">线索来源配置</h3>
                  <p className="text-sm text-slate-500 mt-1">管理线索的来源渠道</p>
                </div>
                <button
                  onClick={() => {
                    setEditingSource(null);
                    setSourceForm({ name: '' });
                    setShowSourceModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  添加来源
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {leadSources.map((source) => (
                  <div
                    key={source.id}
                    className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900">{source.name}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingSource(source);
                            setSourceForm({ name: source.name });
                            setShowSourceModal(true);
                          }}
                          className="p-1 hover:bg-white rounded transition-colors"
                        >
                          <Edit2 size={14} className="text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteSource(source.id)}
                          className="p-1 hover:bg-danger-100 rounded transition-colors"
                        >
                          <Trash2 size={14} className="text-danger-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'levels' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">客户等级配置</h3>
                  <p className="text-sm text-slate-500 mt-1">管理客户的等级分类</p>
                </div>
                <button
                  onClick={() => {
                    setEditingLevel(null);
                    setLevelForm({ name: '', code: '', color: '#3b82f6' });
                    setShowLevelModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  添加等级
                </button>
              </div>

              <div className="space-y-2">
                {customerLevels.map((level) => (
                  <div
                    key={level.id}
                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: level.color }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{level.name}</p>
                        <span
                          className="px-2 py-0.5 text-xs font-medium rounded"
                          style={{ backgroundColor: level.color + '20', color: level.color }}
                        >
                          {level.code}级
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingLevel(level);
                          setLevelForm({ name: level.name, code: level.code, color: level.color });
                          setShowLevelModal(true);
                        }}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors"
                      >
                        <Edit2 size={16} className="text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteLevel(level.id)}
                        className="p-1.5 hover:bg-danger-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} className="text-danger-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">基本信息</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    租户名称
                  </label>
                  <input
                    type="text"
                    value={tenantForm.name}
                    onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    所属行业
                  </label>
                  <input
                    type="text"
                    value={tenantForm.industry}
                    onChange={(e) => setTenantForm({ ...tenantForm, industry: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    时区
                  </label>
                  <select
                    value={tenantForm.timezone}
                    onChange={(e) => setTenantForm({ ...tenantForm, timezone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                    <option value="America/New_York">America/New_York (UTC-5)</option>
                    <option value="Europe/London">Europe/London (UTC+0)</option>
                  </select>
                </div>
                <button
                  onClick={handleSaveTenant}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
                >
                  <Save size={16} />
                  保存设置
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showStageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 animate-slide-up">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">
              {editingStage ? '编辑阶段' : '添加阶段'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  阶段名称
                </label>
                <input
                  type="text"
                  value={stageForm.name}
                  onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入阶段名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  颜色标识
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setStageForm({ ...stageForm, color })}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        stageForm.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowStageModal(false);
                  setEditingStage(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveStage}
                disabled={!stageForm.name.trim()}
                className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showSourceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 animate-slide-up">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">
              {editingSource ? '编辑线索来源' : '添加线索来源'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  来源名称
                </label>
                <input
                  type="text"
                  value={sourceForm.name}
                  onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入来源名称"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowSourceModal(false);
                  setEditingSource(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveSource}
                disabled={!sourceForm.name.trim()}
                className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showLevelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 animate-slide-up">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">
              {editingLevel ? '编辑客户等级' : '添加客户等级'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  等级名称
                </label>
                <input
                  type="text"
                  value={levelForm.name}
                  onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="例如：重点客户"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  等级代码
                </label>
                <input
                  type="text"
                  value={levelForm.code}
                  onChange={(e) => setLevelForm({ ...levelForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="例如：A"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  颜色标识
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setLevelForm({ ...levelForm, color })}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        levelForm.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowLevelModal(false);
                  setEditingLevel(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveLevel}
                disabled={!levelForm.name.trim() || !levelForm.code.trim()}
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
