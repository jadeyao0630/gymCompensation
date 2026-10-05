import React from 'react';
import { BarChart3, Play, Inbox } from 'lucide-react';

interface Props {
  beginDate?: string;
  endDate?: string;
  isLoading: boolean;

  /**
   * ⭐ 两种模式：
   * - 'idle'      还没获取过（首次进入）
   * - 'no-data'   获取过，但结果为空
   */
  mode: 'idle' | 'no-data';

  onFetch: () => void;
}

export const MarketingEmptyState: React.FC<Props> = ({
  beginDate,
  endDate,
  isLoading,
  mode,
  onFetch,
}) => {
  const rangeText = beginDate && endDate ? `${beginDate} ~ ${endDate}` : '';

  /* ---------- 未获取 ---------- */
  if (mode === 'idle') {
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
  }

  /* ---------- 无数据 ---------- */
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm p-16 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-5">
        <Inbox className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-gray-700 font-semibold mb-2">
        {rangeText ? `${rangeText} 暂无数据` : '暂无数据'}
      </h3>
      <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
        该时间段内没有订单销售与定金/押金记录，换个日期范围试试
      </p>
      <button
        onClick={onFetch}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold shadow-sm transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Play className="w-4 h-4" />
        重新获取
      </button>
    </div>
  );
};

export default MarketingEmptyState;