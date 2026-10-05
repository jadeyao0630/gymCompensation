import React, { useMemo, useState } from 'react';
import { PieChart as PieIcon, List, CreditCard } from 'lucide-react';
import { PieChartCard, type PieDatum } from './PieChartCard';

/* ---------------- 调色板 ---------------- */
const PALETTE = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
  '#14b8a6', // teal
];

interface PayTypeItem {
  payType: string;
  amount: number;
}

interface Props {
  summary: {
    payTypes: PayTypeItem[];
    totalIncomeAmount: number;
    totalCardAmount: number;
  };
}

type ViewMode = 'chart' | 'list';

export const PayTypeBreakdown: React.FC<Props> = ({ summary }) => {
  const [view, setView] = useState<ViewMode>('chart');

  const payTypes = summary.payTypes || [];
  const total = payTypes.reduce((s, p) => s + (p.amount || 0), 0);

  const pieData: PieDatum[] = useMemo(
    () =>
      payTypes.map((p, i) => ({
        name: p.payType || '未分类',
        value: p.amount || 0,
        color: PALETTE[i % PALETTE.length],
      })),
    [payTypes]
  );

  const fmt = (v: number) =>
    `¥${Math.round(v).toLocaleString('zh-CN')}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-500" />
          收款方式汇总
          {total > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              合计 {fmt(total)}
            </span>
          )}
        </h3>

        {/* 视图切换 */}
        <div className="inline-flex rounded-xl bg-gray-100 p-0.5">
          <button
            type="button"
            onClick={() => setView('chart')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              view === 'chart'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            饼图
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              view === 'list'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            列表
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {payTypes.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            暂无收款数据
          </div>
        ) : view === 'chart' ? (
          <PieChartCard data={pieData} height={300} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">收款方式</th>
                  <th className="px-3 py-2.5 text-right font-medium">金额</th>
                  <th className="px-3 py-2.5 text-right font-medium">占比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payTypes.map((p, i) => {
                  const percent = total > 0 ? (p.amount / total) * 100 : 0;
                  return (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ background: PALETTE[i % PALETTE.length] }}
                        />
                        <span className="text-gray-700">
                          {p.payType || '未分类'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-800 font-medium">
                        {fmt(p.amount)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                        {percent.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50/70 font-semibold">
                  <td className="px-3 py-2 text-gray-700">合计</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                    {fmt(total)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                    100%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayTypeBreakdown;