import React, { useMemo, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import type { FinancialFlowItem } from '../../../api/stats';
import {
  getBusinessType,
  getBusinessTypeLabel,
  getCardAmount,
  getIncomeAmount,
} from '../utils/aggregate';

const fmtMoney = (v: number) =>
  `¥${Math.round(v).toLocaleString('zh-CN')}`;

/* ⭐ 类型徽章样式 */
const typeBadgeClass = (type: string) => {
  if (type === '购卡') return 'bg-sky-50 text-sky-700 border-sky-100';
  if (type === '购泳教') return 'bg-cyan-50 text-cyan-700 border-cyan-100';
  if (type === '购私教') return 'bg-violet-50 text-violet-700 border-violet-100';
  return 'bg-gray-50 text-gray-600 border-gray-200';
};

interface Props {
  list: FinancialFlowItem[];
}

export const OrderDetailTable: React.FC<Props> = ({ list }) => {
  const [keyword, setKeyword] = useState('');
  const [labelFilter, setLabelFilter] = useState<string>('');

  /* ⭐ 从 list 里动态提取所有出现过的 label */
  const { normalLabels, otherLabels } = useMemo(() => {
    const labels = new Set<string>();
    list.forEach((item) => {
      labels.add(getBusinessTypeLabel(item));
    });

    const normal: string[] = [];
    const others: string[] = [];
    labels.forEach((l) => {
      if (l.startsWith('其他')) others.push(l);
      else normal.push(l);
    });

    const order = ['购卡', '购泳教', '购私教'];
    normal.sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    others.sort();

    return { normalLabels: normal, otherLabels: others };
  }, [list]);

  const filtered = useMemo(() => {
    let arr = list;

    if (labelFilter) {
      arr = arr.filter((it) => getBusinessTypeLabel(it) === labelFilter);
    }

    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      arr = arr.filter(
        (it) =>
          String(it.username || '').toLowerCase().includes(kw) ||
          String(it.card_name || '').toLowerCase().includes(kw) ||
          String(it.flow_sn || '').toLowerCase().includes(kw) ||
          /* ⭐ 支持按备注搜索 */
          String(it.remark || '').toLowerCase().includes(kw)
      );
    }
    return arr;
  }, [list, keyword, labelFilter]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">
          订单明细（{filtered.length} / {list.length} 笔）
        </h3>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="会员 / 卡名 / 单号 / 备注"
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              className="pl-7 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            >
              <option value="">全部类型（{list.length}）</option>

              {normalLabels.map((l) => {
                const count = list.filter(
                  (it) => getBusinessTypeLabel(it) === l
                ).length;
                return (
                  <option key={l} value={l}>
                    {l}（{count}）
                  </option>
                );
              })}

              {otherLabels.length > 0 && (
                <optgroup label="其他">
                  {otherLabels.map((l) => {
                    const count = list.filter(
                      (it) => getBusinessTypeLabel(it) === l
                    ).length;
                    return (
                      <option key={l} value={l}>
                        {l}（{count}）
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">日期</th>
              <th className="px-3 py-2.5 text-left font-medium">会员名</th>
              <th className="px-3 py-2.5 text-left font-medium">卡名</th>
              {/* ⭐ 新增：备注列 */}
              <th className="px-3 py-2.5 text-left font-medium">备注</th>
              <th className="px-3 py-2.5 text-left font-medium">类型</th>
              <th className="px-3 py-2.5 text-left font-medium">收款方式</th>
              <th className="px-3 py-2.5 text-left font-medium">业绩归属</th>
              <th className="px-3 py-2.5 text-right font-medium">卡金额</th>
              <th className="px-3 py-2.5 text-right font-medium">实收</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  {labelFilter || keyword
                    ? '无符合条件的记录，请调整筛选'
                    : '暂无数据'}
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const type = getBusinessType(item);
                const label = getBusinessTypeLabel(item);
                const cardAmount = getCardAmount(item);
                const income = getIncomeAmount(item);
                const remark = String(item.remark || '').trim();

                return (
                  <tr
                    key={item.id || item.flow_sn}
                    className="hover:bg-gray-50/50"
                  >
                    <td className="px-3 py-2 text-gray-500 tabular-nums whitespace-nowrap">
                      {item.deal_time || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {item.username || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {item.card_name || '—'}
                    </td>
                    {/* ⭐ 备注列：空显示"—"；长文本用 title 悬停显示全文 */}
                    <td className="px-3 py-2 text-gray-500">
                      {remark ? (
                        <span
                          className="inline-block max-w-[200px] truncate align-middle"
                          title={remark}
                        >
                          {remark}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[10px] border ${typeBadgeClass(
                          type
                        )}`}
                        title={label}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(item.pay_detail || []).map((p, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap"
                          >
                            {p.pay_type}
                            <span className="font-medium tabular-nums">
                              ¥{Number(p.amount).toLocaleString()}
                            </span>
                          </span>
                        ))}
                        {(!item.pay_detail || item.pay_detail.length === 0) && (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        {(item.marketers_detail || []).map((m, i) => (
                          <span
                            key={i}
                            className="text-[10px] text-gray-600 whitespace-nowrap"
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
                            <span className="ml-1 text-gray-400">
                              {m.percent}
                            </span>
                            <span className="ml-1 font-medium text-gray-700">
                              ¥{Number(m.amount || 0).toLocaleString()}
                            </span>
                          </span>
                        ))}
                        {(!item.marketers_detail ||
                          item.marketers_detail.length === 0) && (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {fmtMoney(cardAmount)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700">
                      {fmtMoney(income)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};