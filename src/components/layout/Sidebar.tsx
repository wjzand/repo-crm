import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Target,
  DollarSign,
  PieChart,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { can, isAdmin } = usePermissions();
  const location = useLocation();

  const navItems: NavItem[] = [
    { path: '/dashboard', label: '仪表盘', icon: <LayoutDashboard size={20} /> },
    { path: '/customers', label: '客户管理', icon: <Users size={20} /> },
    { path: '/leads', label: '线索池', icon: <Target size={20} /> },
    { path: '/opportunities', label: '商机管理', icon: <DollarSign size={20} /> },
    { path: '/funnel', label: '销售漏斗', icon: <PieChart size={20} /> },
  ];

  const adminItems: NavItem[] = [
    { path: '/team', label: '团队成员', icon: <UserCog size={20} />, permission: 'team:manage' },
    { path: '/settings', label: '系统设置', icon: <Settings size={20} />, permission: 'settings:manage' },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.permission || can(item.permission)
  );
  const visibleAdminItems = adminItems.filter(
    (item) => !item.permission || can(item.permission)
  );

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-slate-900 text-white transition-all duration-300 z-40',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center font-bold">
              C
            </div>
            <span className="font-display text-lg font-semibold">CRM系统</span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center font-bold">
              C
            </div>
          </div>
        )}
      </div>

      <nav className="p-2 space-y-1">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
              isActive(item.path)
                ? 'bg-primary-600 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}

        {visibleAdminItems.length > 0 && (
          <>
            {!sidebarCollapsed && (
              <div className="pt-4 pb-2">
                <div className="px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  管理
                </div>
              </div>
            )}
            {visibleAdminItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  isActive(item.path)
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <button
        onClick={toggleSidebar}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
        title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {sidebarCollapsed ? (
          <ChevronRight size={18} />
        ) : (
          <ChevronLeft size={18} />
        )}
      </button>
    </aside>
  );
}
