import React from 'react';
import {
  BarChart3,
  Loader2,
  Download,
  RefreshCw,
} from 'lucide-react';
import NavButtons from '../../../components/layout/NavButtons';
import UserMenu from '../../../components/auth/UserMenu';

interface Props {
  loading?: boolean;
  hasData?: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

export const MarketingHeader: React.FC<Props> = ({
  loading,
  hasData,
  onRefresh,
  onExport,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 shadow-2xl shadow-indigo-500/20 p-8 sm:p-10 mb-8 text-white">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold tracking-widest uppercase">
                Marketing Report
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              营销收入报告
            </h1>
            <p className="text-sm text-indigo-100/90 mt-3 max-w-md leading-relaxed">
              汇总订单销售 + 定金/押金，按类型、卡种、收款方式分析
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <UserMenu variant="dark" />

            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-white/90 rounded-2xl px-5 py-2.5 shadow-lg transition disabled:opacity-50 font-semibold text-sm"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 加载中…</>
                ) : (
                  <><RefreshCw className="w-4 h-4" /> 刷新</>
                )}
              </button>

              <button
                onClick={onExport}
                disabled={!hasData}
                className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">导出 Excel</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <NavButtons active="marketing" />
        </div>
      </div>
    </div>
  );
};

export default MarketingHeader;