import React from 'react';
import type { OverallSummary } from '../utils/aggregate';

const fmtMoney = (v: number) =>
  `¥${Math.round(v).toLocaleString('zh-CN')}`;

const TYPE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  购卡: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100' },
  购泳教: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-100',
  },
  购私教: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-100',
  },
  其他: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100' },
};

export const TypeBreakdown: React.FC<{ summary: OverallSummary }> = ({
  summary,
}) => {
  if (summary.types.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">按业务类型</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-5">
        {summary.types.map((t) => {
          const style = TYPE_STYLE[t.type] || TYPE_STYLE['其他'];
          return (
            <div
              key={t.type}
              className={`rounded-xl border ${style.border} ${style.bg} p-4`}
            >
              <div className="text-xs font-medium text-gray-500 mb-2">
                {t.type}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">订单数</span>
                  <span className={`font-semibold ${style.text} tabular-nums`}>
                    {t.count}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">卡金额</span>
                  <span className="font-medium text-gray-700 tabular-nums">
                    {fmtMoney(t.cardAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">实收</span>
                  <span className={`font-bold ${style.text} tabular-nums`}>
                    {fmtMoney(t.incomeAmount)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};