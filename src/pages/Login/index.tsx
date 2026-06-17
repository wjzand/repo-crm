import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { login, getTenantsByEmail } from '@/services/auth.service';
import { cn } from '@/lib/utils';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  
  const [email, setEmail] = useState('zhangwei@techcorp.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [showTenantSelect, setShowTenantSelect] = useState(false);
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckEmail = async () => {
    setError('');
    if (!email) {
      setError('请输入邮箱');
      return;
    }
    
    setLoading(true);
    try {
      const tenantList = await getTenantsByEmail(email);
      if (tenantList.length === 0) {
        setError('未找到该邮箱关联的账号');
        setLoading(false);
        return;
      }
      if (tenantList.length === 1) {
        setSelectedTenant(tenantList[0].id);
        handleLogin(tenantList[0].id);
      } else {
        setTenants(tenantList);
        setShowTenantSelect(true);
        setLoading(false);
      }
    } catch (err) {
      setError('登录失败，请重试');
      setLoading(false);
    }
  };

  const handleLogin = async (tenantId?: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password, tenantId || selectedTenant);
      if (result.success && result.user) {
        setAuth(result.user, result.tenant || null);
        navigate('/dashboard');
      } else {
        setError(result.message || '登录失败');
      }
    } catch (err) {
      setError('登录失败，请重试');
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showTenantSelect && selectedTenant) {
      handleLogin(selectedTenant);
    } else {
      handleCheckEmail();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg shadow-primary-500/30 mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">CRM 管理系统</h1>
          <p className="text-slate-400 mt-2">多租户销售漏斗管理平台</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-6">
            {showTenantSelect ? '选择租户' : '登录账号'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!showTenantSelect ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    邮箱地址
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="请输入邮箱"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    密码
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all pr-12"
                      placeholder="请输入密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-400 mb-2">
                  您的账号关联了多个租户，请选择要登录的租户：
                </p>
                {tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    type="button"
                    onClick={() => setSelectedTenant(tenant.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left',
                      selectedTenant === tenant.id
                        ? 'bg-primary-500/20 border-primary-500 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                      {tenant.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-slate-400">企业租户</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="p-3 bg-danger-500/20 border border-danger-500/30 rounded-lg text-danger-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (showTenantSelect && !selectedTenant)}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  登录中...
                </>
              ) : showTenantSelect ? (
                '确认登录'
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-slate-500 text-center">
              演示账号：zhangwei@techcorp.com / 123456
            </p>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          © 2026 CRM管理系统. All rights reserved.
        </p>
      </div>
    </div>
  );
}
