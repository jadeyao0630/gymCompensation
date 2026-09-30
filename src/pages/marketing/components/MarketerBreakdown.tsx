import React, { useState } from 'react';
import { User, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import type { OverallSummary, MarketerOrderItem } from '../utils/aggregate';

const fmtMoney = (v: number) =>
  `¥${Math.round(v).toLocaleString('zh-CN')}`;

/* ⭐ 职位徽章样式 */
const positionBadgeClass = (position: string) => {
  if (position.includes('会籍')) return 'bg-sky-50 text-sky-700 border-sky-100';
  if (position.includes('泳教')) return 'bg-cyan-50 text-cyan-700 border-cyan-100';
  if (position.includes('私教')) return 'bg-violet-50 text-violet-700 border-violet-100';
  if (position.includes('运营')) return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-gray-50 text-gray-600 border-gray-200';
};

export const MarketerBreakdown: React.FC<{ summary: OverallSummary }> = ({
  summary,
}) => {
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());

  const toggle = (name: string) => {
    setExpandedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (summary.marketers.length === 0) return null;

  const total = summary.marketers.reduce((s, x) => s + x.amount, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-700">
          业绩归属人排行（按业绩金额）
        </h3>
        <div className="text-xs text-gray-400">
          点击任意行查看该归属人的订单明细
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium w-10"></th>
              <th className="px-4 py-2.5 text-left font-medium w-12">排名</th>
              <th className="px-4 py-2.5 text-left font-medium">姓名</th>
              {/* ⭐ 新增：职位 */}
              <th className="px-4 py-2.5 text-left font-medium">职位</th>
              <th className="px-4 py-2.5 text-right font-medium">参与订单数</th>
              <th className="px-4 py-2.5 text-right font-medium">业绩金额</th>
              <th className="px-4 py-2.5 text-right font-medium">占比</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.marketers.map((m, i) => {
              const pct = total > 0 ? (m.amount / total) * 100 : 0;
              const isExpanded = expandedNames.has(m.name);
              const hasMultiplePositions = m.positions.length > 1;

              return (
                <React.Fragment key={m.name}>
                  {/* ⭐ 主行：可点击展开 */}
                  <tr
                    className="hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => toggle(m.name)}
                  >
                    <td className="px-4 py-2.5 text-center text-gray-400">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 inline" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 inline" />
                      )}
                    </td>
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
                        <span className="text-[10px] text-gray-400">
                          ({m.orders.length} 笔)
                        </span>
                      </div>
                    </td>
                    {/* ⭐ 职位列 */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] border ${positionBadgeClass(
                            m.position
                          )}`}
                        >
                          {m.position}
                        </span>
                        {hasMultiplePositions && (
                          <span
                            className="text-[10px] text-gray-400 cursor-help"
                            title={`该归属人参与过的所有职位：${m.positions.join('、')}`}
                          >
                            +{m.positions.length - 1}
                          </span>
                        )}
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

                  {/* ⭐ 展开：订单明细 */}
                  {isExpanded && m.orders.length > 0 && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="ml-8 border-l-2 border-slate-300 pl-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs font-semibold text-slate-700">
                              {m.name} · 订单明细（{m.orders.length} 笔）
                            </span>
                          </div>
                          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                  <th className="px-3 py-1.5 text-left font-medium w-12">
                                    #
                                  </th>
                                  <th className="px-3 py-1.5 text-left font-medium">
                                    日期
                                  </th>
                                  <th className="px-3 py-1.5 text-left font-medium">
                                    会员名
                                  </th>
                                  <th className="px-3 py-1.5 text-left font-medium">
                                    卡名
                                  </th>
                                  <th className="px-3 py-1.5 text-left font-medium">
                                    类型
                                  </th>
                                  <th className="px-3 py-1.5 text-right font-medium">
                                    卡金额
                                  </th>
                                  <th className="px-3 py-1.5 text-right font-medium">
                                    实收
                                  </th>
                                  <th className="px-3 py-1.5 text-right font-medium">
                                    我的占比
                                  </th>
                                  <th className="px-3 py-1.5 text-right font-medium">
                                    我的业绩
                                  </th>
                                  <th className="px-3 py-1.5 text-left font-medium">
                                    备注
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {m.orders.map((o: MarketerOrderItem, j) => (
                                  <tr
                                    key={o.id || j}
                                    className="hover:bg-slate-50/50"
                                  >
                                    <td className="px-3 py-1.5 text-slate-400">
                                      {j + 1}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-600 tabular-nums whitespace-nowrap">
                                      {o.dealTime || '—'}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-700">
                                      {o.memberName || '—'}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-700">
                                      {o.cardName || '—'}
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <span
                                        className={`inline-flex px-1.5 py-0.5 rounded text-[10px] border ${
                                          o.businessLabel === '购卡'
                                            ? 'bg-sky-50 text-sky-700 border-sky-100'
                                            : o.businessLabel === '购泳教'
                                            ? 'bg-cyan-50 text-cyan-700 border-cyan-100'
                                            : o.businessLabel === '购私教'
                                            ? 'bg-violet-50 text-violet-700 border-violet-100'
                                            : 'bg-gray-50 text-gray-600 border-gray-200'
                                        }`}
                                      >
                                        {o.businessLabel}
                                      </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">
                                      {fmtMoney(o.cardAmount)}
                                    </td>
                                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">
                                      {fmtMoney(o.incomeAmount)}
                                    </td>
                                    <td className="px-3 py-1.5 text-right tabular-nums text-amber-600">
                                      {o.myPercent}
                                    </td>
                                    <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-emerald-600">
                                      {fmtMoney(o.myAmount)}
                                    </td>
                                    <td className="px-3 py-1.5">
                                      {o.remark ? (
                                        <span
                                          className="inline-block max-w-[220px] text-[11px] text-slate-600 truncate align-middle"
                                          title={o.remark}
                                        >
                                          {o.remark}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-slate-50/70 font-medium text-slate-700">
                                <tr className="border-t border-slate-200">
                                  <td className="px-3 py-1.5" colSpan={6}>
                                    小计
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums">
                                    {fmtMoney(
                                      m.orders.reduce(
                                        (s, x) => s + x.incomeAmount,
                                        0
                                      )
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5" />
                                  <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">
                                    {fmtMoney(m.amount)}
                                  </td>
                                  <td className="px-3 py-1.5" />
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};