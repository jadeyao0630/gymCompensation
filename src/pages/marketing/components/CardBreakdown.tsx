import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Package, FileText } from 'lucide-react';
import type { OverallSummary, CardSummary, CardOrderItem } from '../utils/aggregate';

const fmtMoney = (v: number) =>
  `¥${Math.round(v).toLocaleString('zh-CN')}`;

export const CardBreakdown: React.FC<{ summary: OverallSummary }> = ({
  summary,
}) => {
  /* 二级展开：卡种 */
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  /* 一级展开：其他主开关 */
  const [otherExpanded, setOtherExpanded] = useState(false);
  /* 二级展开：其他下的每个子类 */
  const [expandedOthers, setExpandedOthers] = useState<Set<string>>(new Set());
  /* ⭐ 三级展开：每笔订单 */
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleOther = (key: string) => {
    setExpandedOthers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* ⭐ 三级：展开某卡种下的订单明细 */
  const toggleOrders = (key: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* ⭐ 按 label 分组 */
  const grouped = useMemo(() => {
    const acc: Record<string, CardSummary[]> = {};
    summary.cards.forEach((c) => {
      const key = c.label;
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
    });
    Object.keys(acc).forEach((k) => {
      acc[k].sort((a, b) => b.incomeAmount - a.incomeAmount);
    });
    return acc;
  }, [summary.cards]);

  /* ⭐ 分组：常规 / 其他 */
  const { normalLabels, otherLabels, otherTotal } = useMemo(() => {
    const normal: string[] = [];
    const others: string[] = [];
    Object.keys(grouped).forEach((label) => {
      if (label.startsWith('其他')) others.push(label);
      else normal.push(label);
    });
    const order = ['购卡', '购泳教', '购私教'];
    normal.sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    others.sort((a, b) => {
      const sa = (grouped[a] || []).reduce((s, c) => s + c.incomeAmount, 0);
      const sb = (grouped[b] || []).reduce((s, c) => s + c.incomeAmount, 0);
      return sb - sa;
    });
    const total = others.reduce((s, label) => {
      const cards = grouped[label] || [];
      return s + cards.reduce((ss, c) => ss + c.incomeAmount, 0);
    }, 0);
    return { normalLabels: normal, otherLabels: others, otherTotal: total };
  }, [grouped]);

  if (summary.cards.length === 0) return null;

  /* ⭐ 渲染"具体卡种"行（点击可展开该卡种的订单） */
  const renderCardRows = (label: string) => {
    const cards = grouped[label] || [];
    return cards.map((c) => {
      const orderKey = `${label}__${c.cardName}`;
      const isOrderExpanded = expandedOrders.has(orderKey);

      return (
        <React.Fragment key={orderKey}>
          {/* ⭐ 卡种行：点击展开订单明细 */}
          <tr
            className="bg-white hover:bg-gray-50 cursor-pointer border-b border-gray-100"
            onClick={() => toggleOrders(orderKey)}
          >
            <td className="px-4 py-2 text-center text-gray-400">
              {isOrderExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 inline" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 inline" />
              )}
            </td>
            <td className="px-4 py-2 text-gray-700 pl-14">
              {c.cardName}
              <span className="ml-2 text-[10px] text-gray-400">
                ({c.count} 笔)
              </span>
            </td>
            <td className="px-4 py-2 text-gray-500 text-xs" title={c.label}>
              {c.label}
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-gray-600">
              {c.count}
            </td>
            <td className="px-4 py-2 text-right tabular-nums text-gray-600">
              {fmtMoney(c.cardAmount)}
            </td>
            <td className="px-4 py-2 text-right tabular-nums font-medium text-emerald-600">
              {fmtMoney(c.incomeAmount)}
            </td>
            <td className="px-4 py-2 text-right text-gray-400 tabular-nums">
              {summary.totalIncomeAmount > 0
                ? (
                    (c.incomeAmount / summary.totalIncomeAmount) *
                    100
                  ).toFixed(1) + '%'
                : '—'}
            </td>
          </tr>

          {/* ⭐ 三级展开：逐笔订单 */}
          {isOrderExpanded && c.orders.length > 0 && (
            <tr className="bg-slate-50/70">
              <td colSpan={7} className="px-4 py-3">
                <div className="ml-8 border-l-2 border-slate-300 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-700">
                      {c.cardName} · 订单明细（{c.orders.length} 笔）
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
                          <th className="px-3 py-1.5 text-right font-medium">
                            卡金额
                          </th>
                          <th className="px-3 py-1.5 text-right font-medium">
                            实收
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium">
                            收款方式
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium">
                            业绩归属
                          </th>
                          {/* ⭐ 备注单独一列 */}
                          <th className="px-3 py-1.5 text-left font-medium">
                            备注
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {c.orders.map((o: CardOrderItem, i) => (
                          <tr
                            key={o.id || i}
                            className="hover:bg-slate-50/50"
                          >
                            <td className="px-3 py-1.5 text-slate-400">
                              {i + 1}
                            </td>
                            <td className="px-3 py-1.5 text-slate-600 tabular-nums whitespace-nowrap">
                              {o.dealTime || '—'}
                            </td>
                            <td className="px-3 py-1.5 text-slate-700">
                              {o.memberName || '—'}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">
                              {fmtMoney(o.cardAmount)}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums font-medium text-emerald-600">
                              {fmtMoney(o.incomeAmount)}
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex flex-wrap gap-1">
                                {o.payDetail.map((p, j) => (
                                  <span
                                    key={j}
                                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap"
                                  >
                                    {p.pay_type}
                                    <span className="font-medium tabular-nums">
                                      ¥{Number(p.amount).toLocaleString()}
                                    </span>
                                  </span>
                                ))}
                                {o.payDetail.length === 0 && (
                                  <span className="text-slate-300">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex flex-col gap-0.5">
                                {o.marketers.map((m, j) => (
                                  <span
                                    key={j}
                                    className="text-[10px] text-slate-600 whitespace-nowrap"
                                  >
                                    {m.name}
                                    <span
                                      className={`ml-1 px-1 rounded text-[9px] ${
                                        m.role === '主归属'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-amber-100 text-amber-700'
                                      }`}
                                    >
                                      {m.role === '主归属' ? '主' : '协'}
                                    </span>
                                    <span className="ml-1 text-slate-400">
                                      {m.percent}
                                    </span>
                                    <span className="ml-1 font-medium text-slate-700">
                                      ¥{Number(m.amount || 0).toLocaleString()}
                                    </span>
                                  </span>
                                ))}
                                {o.marketers.length === 0 && (
                                  <span className="text-slate-300">—</span>
                                )}
                              </div>
                            </td>
                            {/* ⭐ 备注单独一列 */}
                            <td className="px-3 py-1.5">
                              {o.remark ? (
                                <span
                                  className="inline-block max-w-[240px] text-[11px] text-slate-600 truncate align-middle"
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
                    </table>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
  };

  /* ⭐ 渲染常规分组（购卡 / 购泳教 / 购私教） */
  const renderNormalGroup = (label: string) => {
    const cards = grouped[label] || [];
    const labelTotal = cards.reduce((s, c) => s + c.incomeAmount, 0);
    const labelCount = cards.reduce((s, c) => s + c.count, 0);
    const labelCardAmount = cards.reduce((s, c) => s + c.cardAmount, 0);
    const groupKey = `label__${label}`;
    const isExpanded = expandedGroups.has(groupKey);

    return (
      <React.Fragment key={label}>
        <tr
          className="bg-indigo-50/40 hover:bg-indigo-50/60 cursor-pointer"
          onClick={() => toggleGroup(groupKey)}
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
            title={label}
          >
            {label} 小计
          </td>
          <td className="px-4 py-2.5 text-right font-semibold text-indigo-700 tabular-nums">
            {labelCount}
          </td>
          <td className="px-4 py-2.5 text-right font-semibold text-indigo-700 tabular-nums">
            {fmtMoney(labelCardAmount)}
          </td>
          <td className="px-4 py-2.5 text-right font-semibold text-indigo-700 tabular-nums">
            {fmtMoney(labelTotal)}
          </td>
          <td className="px-4 py-2.5 text-right text-indigo-500 tabular-nums">
            {summary.totalIncomeAmount > 0
              ? ((labelTotal / summary.totalIncomeAmount) * 100).toFixed(1) +
                '%'
              : '—'}
          </td>
        </tr>
        {isExpanded && renderCardRows(label)}
      </React.Fragment>
    );
  };

  /* ⭐ 渲染"其他"下的一个子类 */
  const renderOtherSubGroup = (label: string) => {
    const cards = grouped[label] || [];
    const labelTotal = cards.reduce((s, c) => s + c.incomeAmount, 0);
    const labelCount = cards.reduce((s, c) => s + c.count, 0);
    const labelCardAmount = cards.reduce((s, c) => s + c.cardAmount, 0);
    const groupKey = `other__${label}`;
    const isExpanded = expandedOthers.has(groupKey);

    return (
      <React.Fragment key={label}>
        <tr
          className="bg-white hover:bg-gray-50 cursor-pointer border-b border-gray-100"
          onClick={() => toggleOther(groupKey)}
        >
          <td className="px-4 py-2.5"></td>
          <td
            className="px-4 py-2.5 font-medium text-gray-700"
            colSpan={2}
            title={label}
          >
            <span className="inline-flex items-center gap-1.5">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              )}
              <span className="pl-2">{label}</span>
            </span>
          </td>
          <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
            {labelCount}
          </td>
          <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
            {fmtMoney(labelCardAmount)}
          </td>
          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-700">
            {fmtMoney(labelTotal)}
          </td>
          <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">
            {summary.totalIncomeAmount > 0
              ? ((labelTotal / summary.totalIncomeAmount) * 100).toFixed(1) +
                '%'
              : '—'}
          </td>
        </tr>
        {isExpanded && renderCardRows(label)}
      </React.Fragment>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-700">卡种细分</h3>
        <div className="text-xs text-gray-400">
          点击卡片可展开订单明细
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium w-10"></th>
              <th className="px-4 py-2.5 text-left font-medium">卡种 / 分组</th>
              <th className="px-4 py-2.5 text-left font-medium">业务类型</th>
              <th className="px-4 py-2.5 text-right font-medium">数量</th>
              <th className="px-4 py-2.5 text-right font-medium">卡金额</th>
              <th className="px-4 py-2.5 text-right font-medium">实收金额</th>
              <th className="px-4 py-2.5 text-right font-medium">占比</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {normalLabels.map((label) => renderNormalGroup(label))}

            {otherLabels.length > 0 && (
              <>
                <tr
                  className="bg-amber-50/50 hover:bg-amber-50/80 cursor-pointer border-t-2 border-amber-100"
                  onClick={() => setOtherExpanded((v) => !v)}
                >
                  <td className="px-4 py-3 text-center text-amber-500">
                    {otherExpanded ? (
                      <ChevronDown className="w-4 h-4 inline" />
                    ) : (
                      <ChevronRight className="w-4 h-4 inline" />
                    )}
                  </td>
                  <td
                    className="px-4 py-3 font-semibold text-amber-700"
                    colSpan={2}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      其他（{otherLabels.length} 种）
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-700 tabular-nums">
                    {otherLabels.reduce(
                      (s, l) =>
                        s +
                        (grouped[l] || []).reduce((ss, c) => ss + c.count, 0),
                      0
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-700 tabular-nums">
                    {fmtMoney(
                      otherLabels.reduce(
                        (s, l) =>
                          s +
                          (grouped[l] || []).reduce(
                            (ss, c) => ss + c.cardAmount,
                            0
                          ),
                        0
                      )
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-700 tabular-nums">
                    {fmtMoney(otherTotal)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600 tabular-nums">
                    {summary.totalIncomeAmount > 0
                      ? ((otherTotal / summary.totalIncomeAmount) * 100).toFixed(
                          1
                        ) + '%'
                      : '—'}
                  </td>
                </tr>

                {otherExpanded &&
                  otherLabels.map((label) => renderOtherSubGroup(label))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};