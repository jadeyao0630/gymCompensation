import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { OverallSummary, CardSummary } from '../utils/aggregate';

const fmtMoney = (v: number) =>
  `¥${Math.round(v).toLocaleString('zh-CN')}`;

export const CardBreakdown: React.FC<{ summary: OverallSummary }> = ({
  summary,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('');

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* 按类型分组 */
  const grouped = summary.cards.reduce<Record<string, CardSummary[]>>(
    (acc, c) => {
      if (!acc[c.type]) acc[c.type] = [];
      acc[c.type].push(c);
      return acc;
    },
    {}
  );

  const types = Object.keys(grouped);
  const visibleTypes = filterType ? [filterType] : types;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-700">卡种细分</h3>
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilterType('')}
            className={`px-2.5 py-1 text-xs rounded-lg border transition ${
              !filterType
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            全部
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                filterType === t
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium w-10"></th>
              <th className="px-4 py-2.5 text-left font-medium">卡种</th>
              <th className="px-4 py-2.5 text-left font-medium">业务类型</th>
              <th className="px-4 py-2.5 text-right font-medium">数量</th>
              <th className="px-4 py-2.5 text-right font-medium">卡金额</th>
              <th className="px-4 py-2.5 text-right font-medium">实收金额</th>
              <th className="px-4 py-2.5 text-right font-medium">占比</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleTypes.map((type) => {
              const cards = grouped[type] || [];
              const typeTotal = cards.reduce(
                (s, c) => s + c.incomeAmount,
                0
              );
              const typeCount = cards.reduce((s, c) => s + c.count, 0);
              const typeKey = `type__${type}`;
              const isExpanded = expanded.has(typeKey);

              return (
                <React.Fragment key={type}>
                  {/* 分组标题行 */}
                  <tr
                    className="bg-indigo-50/40 hover:bg-indigo-50/60 cursor-pointer"
                    onClick={() => toggle(typeKey)}
                  >
                    <td className="px-4 py-2.5 text-center text-gray-400">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 inline" />
                      ) : (
                        <ChevronRight className="w-4 h-4 inline" />
                      )}
                    </td>
                    <td
                      className="px-4 py-2.5 font-semibold text-indigo-700"
                      colSpan={2}
                    >
                      {type} 小计
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-indigo-700 tabular-nums">
                      {typeCount}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-indigo-700 tabular-nums">
                      {fmtMoney(cards.reduce((s, c) => s + c.cardAmount, 0))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-indigo-700 tabular-nums">
                      {fmtMoney(typeTotal)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-indigo-500 tabular-nums">
                      {summary.totalIncomeAmount > 0
                        ? (
                            (typeTotal / summary.totalIncomeAmount) *
                            100
                          ).toFixed(1) + '%'
                        : '—'}
                    </td>
                  </tr>

                  {/* 展开后显示卡种明细 */}
                  {isExpanded &&
                    cards.map((c) => (
                      <tr key={`${type}__${c.cardName}`} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5"></td>
                        <td className="px-4 py-2.5 text-gray-700 pl-10">
                          {c.cardName}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">
                          {c.type}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
                          {c.count}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
                          {fmtMoney(c.cardAmount)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-emerald-600">
                          {fmtMoney(c.incomeAmount)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">
                          {summary.totalIncomeAmount > 0
                            ? (
                                (c.incomeAmount / summary.totalIncomeAmount) *
                                100
                              ).toFixed(1) + '%'
                            : '—'}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};