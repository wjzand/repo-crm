import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  Menu,
  User,
  LogOut,
  Settings,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

export default function Header() {
  const { user, tenant, clearAuth } = useAuthStore();
  const { toggleMobileSidebar, notificationCount } = useUIStore();
  const { getRoleLabel } = usePermissions();
  const navigate = useNavigate();
  
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const notifications = [
    { id: 1, title: '新线索分配', content: '您有3条新线索待跟进', time: '5分钟前', read: false },
    { id: 2, title: '商机提醒', content: '华信金融CRM项目预计30天内成交', time: '1小时前', read: false },
    { id: 3, title: '团队通知', content: '本月销售目标已更新', time: '昨天', read: true },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Menu size={20} />
        </button>

        <div className="hidden md:flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 w-80">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="搜索客户、商机、线索..."
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-slate-400"
          />
          <span className="text-xs text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
            ⌘K
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 mr-2">
          <Building2 size={16} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-700">{tenant?.name || '未选择租户'}</span>
        </div>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors relative"
          >
            <Bell size={20} className="text-slate-600" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-card-hover border border-slate-200 overflow-hidden animate-slide-up z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">通知</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      'px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0',
                      !notif.read && 'bg-primary-50/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 mt-2 rounded-full bg-primary-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{notif.content}</p>
                        <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-slate-100">
                <button className="w-full text-sm text-primary-600 font-medium hover:text-primary-700">
                  查看全部通知
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 pl-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{getRoleLabel()}</p>
            </div>
            <ChevronDown size={16} className="text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-card-hover border border-slate-200 overflow-hidden animate-slide-up z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="font-medium text-slate-900">{user?.name}</p>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
              <div className="py-1">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <User size={16} />
                  个人设置
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings size={16} />
                  系统设置
                </button>
              </div>
              <div className="border-t border-slate-100 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
