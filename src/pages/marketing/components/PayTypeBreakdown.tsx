import React from 'react';
import { CreditCard, Wallet, Banknote } from 'lucide-react';
import type { OverallSummary } from '../utils/aggregate';

const fmtMoney = (v: number) =>
  `¥${Math.round(v).toLocaleString('zh-CN')}`;

const PAY_ICON: Record<string, React.ReactNode> = {
  微信: <Wallet className="w-4 h-4" />,
  现金: <Banknote className="w-4 h-4" />,
  刷卡: <CreditCard className="w-4 h-4" />,
};

export const PayTypeBreakdown: React.FC<{ summary: OverallSummary }> = ({
  summary,
}) => {
  if (summary.payTypes.length === 0) return null;

  const total = summary.payTypes.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">收款方式汇总</h3>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {summary.payTypes.map((p) => {
          const pct = total > 0 ? (p.amount / total) * 100 : 0;
          return (
            <div
              key={p.payTypeId || p.payType}
              className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  {PAY_ICON[p.payType] || <Wallet className="w-4 h-4" />}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {p.payType}
                </span>
              </div>
              <div className="text-lg font-bold text-gray-800 tabular-nums">
                {fmtMoney(p.amount)}
              </div>
              <div className="text-xs text-gray-400 mt-1 tabular-nums">
                占比 {pct.toFixed(1)}%
              </div>
              {/* 进度条 */}
              <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};