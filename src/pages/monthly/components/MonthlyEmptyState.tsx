import React from 'react';
import { TrendingUp, Play, Loader2 } from 'lucide-react';

interface Props {
  month: string;
  isLoading: boolean;
  onFetch: () => void;
}

export const MonthlyEmptyState: React.FC<Props> = ({
  month,
  isLoading,
  onFetch,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm p-16 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center mb-5">
        <TrendingUp className="w-7 h-7 text-rose-500" />
      </div>
      <h3 className="text-gray-700 font-semibold mb-2">
        点击「获取报告」查看 {month} 月度综合数据
      </h3>
      <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
        系统将拉取当月营销收入、薪酬佣金（含新人/排除状态）、固定成本，计算净利润
      </p>
      <button
        onClick={onFetch}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white rounded-xl text-sm font-semibold shadow-lg transition active:scale-[0.97]"
      >
        <Play className="w-4 h-4" />
        获取报告
      </button>
    </div>
  );
};