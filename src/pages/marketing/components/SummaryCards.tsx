import React from 'react';
import { TrendingUp, Wallet, CreditCard, Hash } from 'lucide-react';
import type { OverallSummary } from '../utils/aggregate';

const fmtMoney = (v: number) =>
  `¥${Math.round(v).toLocaleString('zh-CN')}`;

export const SummaryCards: React.FC<{ summary: OverallSummary }> = ({
  summary,
}) => {
  const cards = [
    {
      icon: <Hash className="w-5 h-5" />,
      label: '订单总数',
      value: String(summary.totalCount),
      gradient: 'from-blue-500 to-indigo-500',
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      label: '卡金额合计',
      value: fmtMoney(summary.totalCardAmount),
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      icon: <Wallet className="w-5 h-5" />,
      label: '实收金额合计',
      value: fmtMoney(summary.totalIncomeAmount),
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: '客单价',
      value:
        summary.totalCount > 0
          ? fmtMoney(summary.totalIncomeAmount / summary.totalCount)
          : '¥0',
      gradient: 'from-violet-500 to-fuchsia-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4"
        >
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.gradient} text-white flex items-center justify-center shadow-sm`}
          >
            {c.icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-500 mb-0.5">{c.label}</div>
            <div className="text-xl font-bold text-gray-800 tabular-nums truncate">
              {c.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};