import React from 'react';
import { ArrowLeft, Calculator, Store, Sliders, UserX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';

interface Props {
  storeName: string;
  month: string;
  excludedCount: number;
  onGoSimulation: () => void;
  onBackToConfig: () => void;
}

export const PayrollHeader: React.FC<Props> = ({
  storeName,
  month,
  excludedCount,
  onGoSimulation,
  onBackToConfig,
}) => {
  const { hasPermission } = useAuth();
  const { storeId } = useStore();

  /* ⭐ 有 simulation:access 权限就显示「去测算」 */
  const canGoSimulation = hasPermission('simulation:access', storeId);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 shadow-2xl shadow-emerald-500/20 p-8 sm:p-10 mb-8 text-white">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="relative flex items-start justify-between flex-wrap gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
            <Calculator className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold tracking-widest uppercase">
              Payroll Calculation
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">薪酬佣金计算</h1>
          <p className="text-sm text-emerald-100/90 mt-3 max-w-md">
            基于所选月份的薪酬配置，拉取售卡售课与消课数据，自动计算每位员工的底薪、销提、课提
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/25">
            <Store className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{storeName}</span>
            {excludedCount > 0 && (
              <span className="ml-1 inline-flex items-center gap-1 text-[10px] bg-white/20 rounded px-1.5 py-0.5">
                <UserX className="w-3 h-3" /> 已排除 {excludedCount} 人
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ⭐ 去测算：有 simulation:access 权限就显示 */}
          {canGoSimulation && (
            <button
              onClick={onGoSimulation}
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition"
            >
              <Sliders className="w-4 h-4" />
              <span className="text-sm font-medium">去测算</span>
            </button>
          )}

          <button
            onClick={onBackToConfig}
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">返回配置</span>
          </button>
        </div>
      </div>
    </div>
  );
};