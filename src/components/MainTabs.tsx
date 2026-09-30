import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, Calculator, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import type { PermissionKey } from '../constants/permissions';

export type MainView = 'config' | 'simulation' | 'marketing';

interface MainTabsProps {
  /** 受控模式：当前激活的标签（可选） */
  active?: MainView;
  /** 受控模式：切换回调（可选，不传则用路由跳转） */
  onChange?: (v: MainView) => void;
}

interface TabItem {
  key: MainView;
  label: string;
  icon: React.ReactNode;
  path: string;
  permission?: PermissionKey;
}

const TABS: TabItem[] = [
  {
    key: 'config',
    label: '薪酬配置',
    icon: <LayoutGrid className="w-4 h-4" />,
    path: '/compensation',
    permission: 'plan:view',
  },
  {
    key: 'simulation',
    label: '模拟测算',
    icon: <Calculator className="w-4 h-4" />,
    path: '/simulation',
    permission: 'simulation:access',
  },
  {
    key: 'marketing',
    label: '营销收入',
    icon: <BarChart3 className="w-4 h-4" />,
    path: '/marketing-report',
    permission: 'report:marketing:view',
  },
];

/* 根据 pathname 推断当前激活标签 */
function inferActiveFromPath(pathname: string): MainView | undefined {
  if (pathname.startsWith('/compensation')) return 'config';
  if (pathname.startsWith('/simulation')) return 'simulation';
  if (pathname.startsWith('/marketing-report')) return 'marketing';
  return undefined;
}

const MainTabs: React.FC<MainTabsProps> = ({ active, onChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  /* ⭐ 调试日志 */
  console.log('[MainTabs] 渲染', {
    storeId,
    pathname: location.pathname,
    permissions: {
      plan: hasPermission('plan:view', storeId),
      simulation: hasPermission('simulation:access', storeId),
      marketing: hasPermission('report:marketing:view', storeId),
    },
  });

  /* 受控模式优先；否则从路由推断 */
  const currentActive =
    active ?? inferActiveFromPath(location.pathname) ?? 'config';

  /* ⭐ 按权限过滤 */
  const visibleTabs = TABS.filter(
    (t) => !t.permission || hasPermission(t.permission, storeId)
  );

  console.log(
    '[MainTabs] visibleTabs =',
    visibleTabs.map((t) => t.key)
  );

  const handleClick = (t: TabItem) => {
    if (onChange) {
      onChange(t.key);
      return;
    }
    navigate(t.path);
  };

  if (visibleTabs.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 p-3 mb-6 text-xs text-gray-400">
        无任何可访问的模块（请管理员分配权限）
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 p-2 mb-6">
      <div className="inline-flex p-1 bg-gray-100/80 rounded-xl gap-1">
        {visibleTabs.map((t) => {
          const isActive = currentActive === t.key;
          return (
            <button
              key={t.key}
              onClick={() => handleClick(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MainTabs;