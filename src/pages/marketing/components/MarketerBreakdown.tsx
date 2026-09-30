import React from 'react';
import { User } from 'lucide-react';
import type { OverallSummary } from '../utils/aggregate';

const fmtMoney = (v: number) =>
  `¥${Math.round(v).toLocaleString('zh-CN')}`;

export const MarketerBreakdown: React.FC<{ summary: OverallSummary }> = ({
  summary,
}) => {
  if (summary.marketers.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">
          业绩归属人排行（按业绩金额）
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium w-12">排名</th>
              <th className="px-4 py-2.5 text-left font-medium">姓名</th>
              <th className="px-4 py-2.5 text-right font-medium">参与订单数</th>
              <th className="px-4 py-2.5 text-right font-medium">业绩金额</th>
              <th className="px-4 py-2.5 text-right font-medium">占比</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.marketers.map((m, i) => {
              const total = summary.marketers.reduce(
                (s, x) => s + x.amount,
                0
              );
              const pct = total > 0 ? (m.amount / total) * 100 : 0;
              return (
                <tr key={m.name} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                        i === 0
                          ? 'bg-amber-100 text-amber-700'
                          : i === 1
                          ? 'bg-gray-200 text-gray-700'
                          : i === 2
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-50 text-gray-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium text-gray-800">
                        {m.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
                    {m.count}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-600">
                    {fmtMoney(m.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                    {pct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};