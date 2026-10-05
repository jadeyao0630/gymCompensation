import React from 'react';
import { BarChart3, Play } from 'lucide-react';

interface Props {
  /** 当前日期范围（用于展示） */
  beginDate?: string;
  endDate?: string;
  isLoading: boolean;
  onFetch: () => void;
}

export const MarketingEmptyState: React.FC<Props> = ({
  beginDate,
  endDate,
  isLoading,
  onFetch,
}) => {
  const rangeText = beginDate && endDate ? `${beginDate} ~ ${endDate}` : '';

  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm p-16 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center mb-5">
        <BarChart3 className="w-7 h-7 text-rose-500" />
      </div>
      <h3 className="text-gray-700 font-semibold mb-2">
        {rangeText
          ? `点击「获取」查看 ${rangeText} 的营销收入数据`
          : '点击「获取」查看营销收入数据'}
      </h3>
      <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
        系统将拉取该时间段内的订单销售、定金/押金明细，并按类型、卡种、收款方式汇总
      </p>
      <button
        onClick={onFetch}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white rounded-xl text-sm font-semibold shadow-lg transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Play className="w-4 h-4" />
        获取数据
      </button>
    </div>
  );
};

export default MarketingEmptyState;