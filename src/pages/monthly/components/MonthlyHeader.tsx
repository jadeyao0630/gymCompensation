import React from 'react';
import { TrendingUp, Loader2, Download, Play } from 'lucide-react';
import NavButtons from '../../../components/layout/NavButtons';
import UserMenu from '../../../components/auth/UserMenu';

interface Props {
  isLoading: boolean;
  hasLoaded: boolean;
  storeName?: string;
  dbOnline?: boolean;
  month?: string;
  onFetch: () => void;
  onExport: () => void;
}

export const MonthlyHeader: React.FC<Props> = ({
  isLoading,
  hasLoaded,
  month,
  onFetch,
  onExport,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-orange-600 to-amber-600 shadow-2xl shadow-rose-500/20 p-8 sm:p-10 mb-8 text-white">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold tracking-widest uppercase">
                Monthly Report
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              月度经营综合报告
            </h1>
            <p className="text-sm text-rose-100/90 mt-3 max-w-md leading-relaxed">
              整合薪酬佣金、营销收入与固定成本，一键查看月度净利润
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <UserMenu variant="dark" />

            <div className="flex items-center gap-2">
              <button
                onClick={onFetch}
                disabled={isLoading}
                className="inline-flex items-center gap-2 bg-white text-rose-700 hover:bg-white/90 rounded-2xl px-5 py-2.5 shadow-lg transition disabled:opacity-50 font-semibold text-sm"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 获取中…</>
                ) : (
                  <><Play className="w-4 h-4" /> 获取报告</>
                )}
              </button>

              <button
                onClick={onExport}
                disabled={isLoading || !hasLoaded}
                className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">导出 Excel</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <NavButtons active="monthly" month={month} />
        </div>
      </div>
    </div>
  );
};

export default MonthlyHeader;