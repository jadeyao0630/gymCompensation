
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Sliders,
  Calculator,
  BarChart3,
  TrendingUp,
  GitBranch,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import type { PermissionKey } from '../../constants/permissions';

type ActiveKey =
  | 'config'
  | 'simulation'
  | 'payroll'
  | 'marketing'
  | 'monthly'
  | 'dingtalk'
  | 'stores';

interface NavButtonsProps {
  active: ActiveKey;
  month?: string;
}

interface NavItem {
  key: ActiveKey;
  label: string;
  path: string;
  permission: PermissionKey;
  icon: React.ReactNode;
  gradient: string;
  shadow: string;
  ring: string;
}

export const NavButtons: React.FC<NavButtonsProps> = ({
  active,
  month,
}) => {
  const navigate = useNavigate();
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  const go = (path: string) => {
    if ((path === '/simulation' || path === '/payroll') && month) {
      navigate(`${path}?month=${month}`);
    } else {
      navigate(path);
    }
  };

  const items: NavItem[] = [
    {
      key: 'config',
      label: '薪酬配置',
      path: '/compensation',
      permission: 'plan:view',
      icon: <LayoutGrid className="w-4 h-4" />,
      gradient: 'from-blue-600 to-indigo-600',
      shadow: 'shadow-blue-500/20',
      ring: 'ring-blue-300',
    },
    {
      key: 'simulation',
      label: '去测算',
      path: '/simulation',
      permission: 'simulation:access',
      icon: <Sliders className="w-4 h-4" />,
      gradient: 'from-indigo-600 to-purple-600',
      shadow: 'shadow-indigo-500/20',
      ring: 'ring-indigo-300',
    },
    {
      key: 'payroll',
      label: '去计算薪酬',
      path: '/payroll',
      permission: 'payroll:calc',
      icon: <Calculator className="w-4 h-4" />,
      gradient: 'from-emerald-600 to-teal-600',
      shadow: 'shadow-emerald-500/20',
      ring: 'ring-emerald-300',
    },
    {
      key: 'marketing',
      label: '营销收入',
      path: '/marketing-report',
      permission: 'report:marketing:view',
      icon: <BarChart3 className="w-4 h-4" />,
      gradient: 'from-fuchsia-600 to-pink-600',
      shadow: 'shadow-fuchsia-500/20',
      ring: 'ring-fuchsia-300',
    },
    {
      key: 'monthly',
      label: '月综合报告',
      path: '/monthly-report',
      permission: 'report:monthly:view',
      icon: <TrendingUp className="w-4 h-4" />,
      gradient: 'from-rose-600 to-orange-600',
      shadow: 'shadow-rose-500/20',
      ring: 'ring-rose-300',
    },
    {
      key: 'dingtalk',
      label: '钉钉流程',
      path: '/dingtalk-report',
      permission: 'report:dingtalk:view',
      icon: <GitBranch className="w-4 h-4" />,
      gradient: 'from-sky-600 to-blue-600',
      shadow: 'shadow-sky-500/20',
      ring: 'ring-sky-300',
    },
    {
      key: 'stores',
      label: '门店配置',
      path: '/settings/stores',
      permission: 'store:view',
      icon: <Settings className="w-4 h-4" />,
      gradient: 'from-slate-600 to-gray-700',
      shadow: 'shadow-slate-500/20',
      ring: 'ring-slate-300',
    },
  ];

  const baseCls =
    'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl ' +
    'text-sm font-semibold shadow-md transition-all duration-200 transform';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items
        .filter((item) => hasPermission(item.permission, storeId))
        .map((item) => {
          const isActive = active === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => !isActive && go(item.path)}
              disabled={isActive}
              className={[
                baseCls,
                'bg-gradient-to-r',
                item.gradient,
                'text-white',
                item.shadow,
                isActive
                  ? `ring-2 ring-offset-2 cursor-default ${item.ring}`
                  : 'nav-btn-hover active:scale-[0.97]',
              ].join(' ')}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
    </div>
  );
};

export default NavButtons;
