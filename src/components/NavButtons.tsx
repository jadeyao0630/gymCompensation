import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Sliders,
  Calculator,
  BarChart3,
  TrendingUp,
  GitBranch,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';

type ActiveKey =
  | 'config'
  | 'simulation'
  | 'payroll'
  | 'marketing'
  | 'monthly'
  | 'dingtalk';

interface NavButtonsProps {
  active: ActiveKey;
  month?: string;
}

export const NavButtons: React.FC<NavButtonsProps> = ({ active, month }) => {
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

  /* ⭐ 基础样式：加大圆角、过渡、悬停浮起 */
  const baseCls =
    'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md ' +
    'transition-all duration-200 transform';
  const activeCls = 'ring-2 ring-offset-2 cursor-default';
  const clickCls = 'active:scale-[0.97]';

  /* ⭐ 统一的悬停效果：上浮 + 放大阴影 + 亮度提升 */
  const hoverCls = 'nav-btn-hover';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 薪酬配置 */}
      {hasPermission('plan:view', storeId) && (
        <button
          onClick={() => active !== 'config' && go('/compensation')}
          disabled={active === 'config'}
          className={`${baseCls} ${
            active === 'config'
              ? `bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 ${activeCls} ring-blue-300`
              : `bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/20 ${hoverCls} ${clickCls}`
          }`}
        >
          <LayoutGrid className="w-4 h-4" /> 薪酬配置
        </button>
      )}

      {/* 去测算 */}
      {hasPermission('simulation:access', storeId) && (
        <button
          onClick={() => active !== 'simulation' && go('/simulation')}
          disabled={active === 'simulation'}
          className={`${baseCls} ${
            active === 'simulation'
              ? `bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/30 ${activeCls} ring-indigo-300`
              : `bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/20 ${hoverCls} ${clickCls}`
          }`}
        >
          <Sliders className="w-4 h-4" /> 去测算
        </button>
      )}

      {/* 去计算薪酬 */}
      {hasPermission('payroll:calc', storeId) && (
        <button
          onClick={() => active !== 'payroll' && go('/payroll')}
          disabled={active === 'payroll'}
          className={`${baseCls} ${
            active === 'payroll'
              ? `bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/30 ${activeCls} ring-emerald-300`
              : `bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/20 ${hoverCls} ${clickCls}`
          }`}
        >
          <Calculator className="w-4 h-4" /> 去计算薪酬
        </button>
      )}

      {/* 营销收入 */}
      {hasPermission('report:marketing:view', storeId) && (
        <button
          onClick={() => active !== 'marketing' && go('/marketing-report')}
          disabled={active === 'marketing'}
          className={`${baseCls} ${
            active === 'marketing'
              ? `bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-fuchsia-500/30 ${activeCls} ring-fuchsia-300`
              : `bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-fuchsia-500/20 ${hoverCls} ${clickCls}`
          }`}
        >
          <BarChart3 className="w-4 h-4" /> 营销收入
        </button>
      )}

      {/* 月综合报告 */}
      {hasPermission('report:monthly:view', storeId) && (
        <button
          onClick={() => active !== 'monthly' && go('/monthly-report')}
          disabled={active === 'monthly'}
          className={`${baseCls} ${
            active === 'monthly'
              ? `bg-gradient-to-r from-rose-600 to-orange-600 text-white shadow-rose-500/30 ${activeCls} ring-rose-300`
              : `bg-gradient-to-r from-rose-600 to-orange-600 text-white shadow-rose-500/20 ${hoverCls} ${clickCls}`
          }`}
        >
          <TrendingUp className="w-4 h-4" /> 月综合报告
        </button>
      )}

      {/* 钉钉流程 */}
      {hasPermission('report:dingtalk:view', storeId) && (
        <button
          onClick={() => active !== 'dingtalk' && go('/dingtalk-report')}
          disabled={active === 'dingtalk'}
          className={`${baseCls} ${
            active === 'dingtalk'
              ? `bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sky-500/30 ${activeCls} ring-sky-300`
              : `bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sky-500/20 ${hoverCls} ${clickCls}`
          }`}
        >
          <GitBranch className="w-4 h-4" /> 钉钉流程
        </button>
      )}
    </div>
  );
};

export default NavButtons;