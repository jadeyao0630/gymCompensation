import React from 'react';
import {
  Sparkles, UserX, Calculator, Download, Loader2,
} from 'lucide-react';
import NavButtons from '../../../components/layout/NavButtons';
import UserMenu from '../../../components/auth/UserMenu';

interface Props {
  storeName?: string;
  month?: string;
  excludedCount: number;
  loading?: boolean;
  hasPlan?: boolean;
  canExport?: boolean;
  canExportPayroll?: boolean;
  dbOnline?: boolean;
  saveStatus?: any;
  lastSavedAt?: Date | null;
  onRun: () => void;
  onExport: () => void;
}

export const PayrollHeader: React.FC<Props> = ({
  month,
  excludedCount,
  loading,
  hasPlan,
  canExport,
  canExportPayroll = true,
  onRun,
  onExport,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 shadow-2xl shadow-emerald-500/20 p-8 sm:p-10 mb-8 text-white">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold tracking-widest uppercase">
                Payroll Calculation
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              薪酬计算
            </h1>
            <p className="text-sm text-emerald-100/90 mt-3 max-w-md leading-relaxed">
              根据本月方案配置，拉取销售、消课数据并计算员工薪酬
            </p>

            {excludedCount > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 bg-amber-400/20 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-amber-300/30">
                  <UserX className="w-3.5 h-3.5 text-amber-200" />
                  <span className="text-sm font-medium text-amber-100">
                    已排除 {excludedCount} 人
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <UserMenu variant="dark" />

            <div className="flex items-center gap-2">
              <button
                onClick={onRun}
                disabled={loading || !hasPlan}
                title={!hasPlan ? '该月份暂无薪酬配置' : '开始计算'}
                className="inline-flex items-center gap-2 bg-white text-emerald-700 hover:bg-white/90 rounded-2xl px-5 py-2.5 shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 计算中…</>
                ) : (
                  <><Calculator className="w-4 h-4" /> 开始计算</>
                )}
              </button>

              {canExportPayroll && (
                <button
                  onClick={onExport}
                  disabled={loading || !canExport}
                  title={!canExport ? '暂无可导出的数据' : '导出整表为 Excel'}
                  className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">导出整表</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <NavButtons active="payroll" month={month} />
        </div>
      </div>
    </div>
  );
};