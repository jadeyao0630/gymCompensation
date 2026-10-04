import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Sliders,
  Calculator,
  BarChart3,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';

type ActiveKey =
  | 'config'
  | 'simulation'
  | 'payroll'
  | 'marketing'
  | 'monthly'
  | 'dingtalk';   // ⭐ 新增

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

  const baseCls =
    'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all';
  const activeCls = 'ring-2 ring-offset-2 cursor-default';
  const clickCls = 'active:scale-[0.97]';

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
              : `bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 ${clickCls}`
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
              : `bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/20 ${clickCls}`
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
              : `bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/20 ${clickCls}`
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
              : `bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white shadow-fuchsia-500/20 ${clickCls}`
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
              : `bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white shadow-rose-500/20 ${clickCls}`
          }`}
        >
          <TrendingUp className="w-4 h-4" /> 月综合报告
        </button>
      )}

      {/* ⭐ 钉钉报销 */}
      {hasPermission('report:monthly:view', storeId) && (
        <button
          onClick={() => active !== 'dingtalk' && go('/dingtalk-report')}
          disabled={active === 'dingtalk'}
          className={`${baseCls} ${
            active === 'dingtalk'
              ? `bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sky-500/30 ${activeCls} ring-sky-300`
              : `bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-sky-500/20 ${clickCls}`
          }`}
        >
          <FileText className="w-4 h-4" /> 钉钉报销
        </button>
      )}
    </div>
  );
};

export default NavButtons;