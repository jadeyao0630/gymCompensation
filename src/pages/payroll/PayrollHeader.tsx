import React from 'react';
import { Sparkles, Store, Calendar, UserX } from 'lucide-react';

interface Props {
  storeName: string;
  month: string;
  excludedCount: number;
  /** ⭐ 已废弃：跳转由 GlobalNav 处理 */
  onGoSimulation?: () => void;
  /** ⭐ 已废弃 */
  onBackToConfig?: () => void;
}

export const PayrollHeader: React.FC<Props> = ({
  storeName,
  month,
  excludedCount,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 shadow-2xl shadow-emerald-500/20 p-8 sm:p-10 mb-8 text-white">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold tracking-widest uppercase">
            Payroll Calculation
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          薪酬计算
        </h1>
        <p className="text-sm text-emerald-100/90 mt-3 max-w-md">
          根据本月方案配置，拉取销售、消课数据并计算员工薪酬
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/25">
            <Store className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{storeName}</span>
          </div>

          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/25">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{month}</span>
          </div>

          {excludedCount > 0 && (
            <div className="inline-flex items-center gap-2 bg-amber-400/20 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-amber-300/30">
              <UserX className="w-3.5 h-3.5 text-amber-200" />
              <span className="text-sm font-medium text-amber-100">
                已排除 {excludedCount} 人
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};