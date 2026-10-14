import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertCircle, Percent, Hash, Users } from 'lucide-react';
import type { PayrollResult } from '../../utils/payroll';
import { needsSaleIdPrefix } from '../../utils/payroll';
import type { SalesMemberDetail } from '../../types/payroll';
import { getCardOrderList } from '../../api/stats';
import { usePayrollActions } from '../../pages/payroll/components/PayrollActionsContext';

interface Props {
  result: PayrollResult;
  storeId: string;
  month: string;
  colSpan: number;
}

/** 'YYYY-MM' → { begin_date, end_date } */
function getMonthRange(month: string): { begin_date: string; end_date: string } {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  return { begin_date: fmt(first), end_date: fmt(last) };
}

/* ---------------- 收款方式 ---------------- */
const PayDetailInline: React.FC<{
  payDetail?: { pay_type: string; amount: string; pay_type_id: string }[];
}> = ({ payDetail }) => {
  if (!payDetail || payDetail.length === 0) {
    return <span className="text-gray-300 text-[10px]">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {payDetail.map((p, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100 whitespace-nowrap"
          title={`${p.pay_type} ¥${p.amount}`}
        >
          {p.pay_type}
          <span className="text-sky-600 font-medium tabular-nums">
            ¥{Number(p.amount).toLocaleString()}
          </span>
        </span>
      ))}
    </div>
  );
};

/* ---------------- 业绩归属 ---------------- */
const MarketersInline: React.FC<{
  marketers?: Array<{
    name: string;
    role: string;
    percent: string;
    amount: string;
  }>;
  highlightName?: string;
}> = ({ marketers, highlightName }) => {
  if (!marketers || marketers.length === 0) {
    return <span className="text-gray-300 text-[10px]">—</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {marketers.map((m, i) => {
        const isSelf =
          highlightName && (m.name || '').trim() === highlightName.trim();
        const isPrimary = m.role === '主归属';
        return (
          <div
            key={i}
            className={`inline-flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${
              isSelf
                ? 'bg-sky-50 text-sky-800 border-sky-200 font-medium'
                : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}
            title={`${m.name}（${m.role}）${m.percent} ¥${m.amount}`}
          >
            <span className={isSelf ? 'font-semibold' : ''}>{m.name}</span>
            <span
              className={`text-[9px] px-1 rounded ${
                isPrimary
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isPrimary ? '主' : '协'}
            </span>
            <span className="tabular-nums text-gray-500">{m.percent}</span>
            <span className="tabular-nums font-medium">
              ¥{Number(m.amount || 0).toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- 主组件 ---------------- */
const SalesDetailRow: React.FC<Props> = ({ result, storeId, month, colSpan }) => {
  const { setSalesDetail, updateSalesCommission } = usePayrollActions();

  /* ⭐ 本地 state 缓存拉取到的明细 */
  const [localDetails, setLocalDetails] = useState<SalesMemberDetail[] | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetched, setFetched] = useState(false);

  /* ⭐ 编辑态 */
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState<'percent' | 'fixed'>('percent');
  const [draftValue, setDraftValue] = useState<string>('');

  /* ⭐ 数据源列表：每个 source 带自己的职位，便于逐个判断前缀 */
  const sourceList =
    result.salesSourceStaffIds && result.salesSourceStaffIds.length > 0
      ? result.salesSourceStaffIds
      : [
          {
            id: result.staffId,
            name: result.staffName,
            positionTitle: result.positionTitle,
          },
        ];
  const isAggregated = sourceList.length > 1;

  /* ⭐ 优先用本地 state；本地没有时用 result 里的 */
  const details = localDetails ?? result.salesDetail ?? [];

  /* ⭐ 懒加载 */
  useEffect(() => {
    if (fetched) return;
    if (details.length > 0) {
      setFetched(true);
      return;
    }
    if (!sourceList.length) return;

    setFetched(true);
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const { begin_date, end_date } = getMonthRange(month);

        /* ⭐ 每个 source 用自己的 positionTitle 判断 sale_id 前缀 */
        const tasks = sourceList.map(async (src) => {
          const saleId = needsSaleIdPrefix(src.positionTitle)
            ? `c${src.id}`
            : src.id;
          const res = await getCardOrderList({
            bus_id: storeId,
            sale_id: saleId,
            begin_date,
            end_date,
            page_no: 1,
            page_size: 1000,
          });
          return { sid: src.id, owner: src.name, list: res.list };
        });

        const settled = await Promise.all(tasks);
        if (cancelled) return;

        const merged: SalesMemberDetail[] = [];
        settled.forEach(({ sid, owner, list }) => {
          list.forEach((item) => {
            const marketers = item.marketers_detail || [];
            const hit = marketers.find(
              (m) => (m.name || '').trim() === (owner || '').trim()
            );
            const myAmount = hit?.amount ? Number(hit.amount) : 0;

            /* 聚合模式：有归属就展示；单人模式：必须本人是归属人 */
            if (isAggregated) {
              if (myAmount <= 0 && !hit) return;
            } else {
              if (!hit) return;
            }

            merged.push({
              orderId: String(item.id),
              memberName: item.username || '—',
              cardName: item.card_name || '—',
              amount: myAmount,
              cardAmount: Number(item.amount || 0),
              dealTime: item.deal_time || '',
              sourceStaffId: sid,
              sourceStaffName: owner,
              marketers: marketers.map((m) => ({
                name: m.name,
                role: m.role,
                percent: m.percent,
                amount: m.amount,
              })),
              payDetail: item.pay_detail,
            });
          });
        });

        if (cancelled) return;
        setLocalDetails(merged);
        setSalesDetail(result.staffId, merged);
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.response?.data?.errormsg || e?.message || '加载销售明细失败'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.staffId, month, storeId]);

  /* ---------------- 合计 ---------------- */
  const myTotal = useMemo(
    () => details.reduce((s, d) => s + d.amount, 0),
    [details]
  );

  const totalCommission = useMemo(
    () =>
      details.reduce((s, d) => {
        const mode = d.mode ?? 'percent';
        const value = d.value ?? result.hitCommissionRate ?? 0;
        return s + (mode === 'percent' ? d.amount * value : value);
      }, 0),
    [details, result.hitCommissionRate]
  );

  /* ⭐ 按来源分组（聚合模式时展示"来自 XXX"） */
  const grouped = useMemo(() => {
    if (!isAggregated) return null;
    const map = new Map<string, SalesMemberDetail[]>();
    details.forEach((d) => {
      const key = d.sourceStaffName || d.sourceStaffId || '未知';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return Array.from(map.entries());
  }, [details, isAggregated]);

  /* ⭐ 收款方式合计 */
  const payDetailSummary = useMemo(() => {
    const map = new Map<
      string,
      { pay_type: string; amount: number; pay_type_id: string }
    >();
    details.forEach((item) => {
      (item.payDetail || []).forEach((p) => {
        const key = String(p.pay_type_id || p.pay_type);
        const cur = map.get(key);
        const amt = Number(p.amount) || 0;
        if (cur) cur.amount += amt;
        else
          map.set(key, {
            pay_type: p.pay_type,
            amount: amt,
            pay_type_id: String(p.pay_type_id || ''),
          });
      });
    });
    return Array.from(map.values());
  }, [details]);

  /* ---------------- 编辑逻辑 ---------------- */
  const makeKey = (orderId: string, idx: number) => `${orderId}#${idx}`;

  const startEdit = (row: SalesMemberDetail, globalIdx: number) => {
    setEditingKey(makeKey(row.orderId, globalIdx));
    const mode = row.mode ?? 'percent';
    const value = row.value ?? result.hitCommissionRate ?? 0;
    setDraftMode(mode);
    setDraftValue(
      mode === 'percent' ? (value * 100).toFixed(2) : value.toFixed(2)
    );
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraftValue('');
  };

  const saveEdit = (globalIdx: number) => {
    const num = parseFloat(draftValue) || 0;
    const finalValue = draftMode === 'percent' ? num / 100 : num;

    /* 同步更新本地 + result */
    const next = [...details];
    if (next[globalIdx]) {
      next[globalIdx] = {
        ...next[globalIdx],
        mode: draftMode,
        value: finalValue,
      };
      setLocalDetails(next);
    }
    updateSalesCommission(result.staffId, globalIdx, {
      mode: draftMode,
      value: finalValue,
    });
    setEditingKey(null);
    setDraftValue('');
  };

  const resetToDefault = (globalIdx: number) => {
    const next = [...details];
    if (next[globalIdx]) {
      next[globalIdx] = { ...next[globalIdx], mode: undefined, value: undefined };
      setLocalDetails(next);
    }
    updateSalesCommission(result.staffId, globalIdx, {
      mode: undefined,
      value: undefined,
    });
    if (editingKey === makeKey(details[globalIdx]?.orderId, globalIdx)) {
      setEditingKey(null);
      setDraftValue('');
    }
  };

  /* ---------------- 渲染表格 ---------------- */
  const renderTable = (list: SalesMemberDetail[], baseGlobalIdx: number) => (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-100 bg-gray-50/60">
            <th className="px-3 py-1.5 text-left font-medium">会员名</th>
            <th className="px-3 py-1.5 text-left font-medium">卡种</th>
            <th className="px-3 py-1.5 text-left font-medium">收款方式</th>
            <th className="px-3 py-1.5 text-left font-medium">业绩归属</th>
            <th className="px-3 py-1.5 text-right font-medium">卡金额</th>
            <th className="px-3 py-1.5 text-right font-medium">本人业绩</th>
            <th className="px-3 py-1.5 text-right font-medium">提点方式</th>
            <th className="px-3 py-1.5 text-right font-medium">销提金额</th>
            <th className="px-3 py-1.5 text-center font-medium w-32">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {list.map((row, localIdx) => {
            const globalIdx = baseGlobalIdx + localIdx;
            const rowKey = makeKey(row.orderId, globalIdx);
            const custom = row.mode != null && row.value != null;
            const mode = row.mode ?? 'percent';
            const value = row.value ?? result.hitCommissionRate ?? 0;
            const fee = mode === 'percent' ? row.amount * value : value;
            const isEditing = editingKey === rowKey;

            return (
              <tr key={rowKey} className="hover:bg-gray-50/50">
                <td className="px-3 py-1.5 text-gray-700 align-top">
                  {row.memberName || '—'}
                </td>
                <td className="px-3 py-1.5 text-gray-600 align-top">
                  {row.cardName || '—'}
                </td>
                <td className="px-3 py-1.5 align-top">
                  <PayDetailInline payDetail={row.payDetail} />
                </td>
                <td className="px-3 py-1.5 align-top">
                  <MarketersInline
                    marketers={row.marketers}
                    highlightName={row.sourceStaffName || result.staffName}
                  />
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-gray-600 align-top">
                  ¥{row.cardAmount.toFixed(2)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums font-medium text-sky-600 align-top">
                  ¥{row.amount.toFixed(2)}
                </td>

                <td className="px-3 py-1.5 text-right tabular-nums align-top">
                  {isEditing ? (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDraftMode('percent')}
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          draftMode === 'percent'
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-sky-600 border-sky-200'
                        }`}
                        title="按比例"
                      >
                        <Percent className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftMode('fixed')}
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          draftMode === 'fixed'
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-sky-600 border-sky-200'
                        }`}
                        title="按固定金额"
                      >
                        <Hash className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        className="w-16 border border-sky-200 rounded px-1 py-0.5 text-[11px] text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-sky-400"
                        autoFocus
                      />
                      <span className="text-[10px] text-gray-500">
                        {draftMode === 'percent' ? '%' : '元'}
                      </span>
                    </div>
                  ) : (
                    <span
                      className={
                        custom ? 'text-sky-700 font-medium' : 'text-gray-500'
                      }
                    >
                      {mode === 'percent'
                        ? `${(value * 100).toFixed(2)}%`
                        : `¥${value.toFixed(2)}`}
                      {custom && (
                        <span className="text-[9px] ml-1 text-sky-400">
                          (自定义)
                        </span>
                      )}
                    </span>
                  )}
                </td>

                <td className="px-3 py-1.5 text-right tabular-nums font-medium text-sky-700 align-top">
                  ¥{fee.toFixed(2)}
                </td>

                <td className="px-3 py-1.5 text-center align-top">
                  {isEditing ? (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => saveEdit(globalIdx)}
                        className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-medium hover:bg-emerald-700"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium hover:bg-gray-200"
                      >
                        取消
                      </button>
                      {custom && (
                        <button
                          type="button"
                          onClick={() => resetToDefault(globalIdx)}
                          className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium hover:bg-amber-100"
                        >
                          返回初始
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(row, globalIdx)}
                        className="text-[10px] px-2 py-0.5 rounded border border-sky-200 text-sky-600 hover:bg-sky-50"
                      >
                        编辑
                      </button>
                      {custom && (
                        <button
                          type="button"
                          onClick={() => resetToDefault(globalIdx)}
                          className="text-[10px] px-2 py-0.5 rounded border border-amber-200 text-amber-700 hover:bg-amber-50"
                        >
                          返回初始
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <tr className="bg-sky-50/40">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="ml-8 border-l-2 border-sky-200 pl-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="text-xs font-semibold text-sky-700 flex items-center gap-2">
              销售明细（{details.length} 笔 · 本人业绩合计 ¥
              {myTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} · 销提合计 ¥
              {totalCommission.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}）
              {isAggregated && (
                <span className="inline-flex items-center gap-1 text-[10px] text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
                  <Users className="w-3 h-3" />
                  部门汇总（{sourceList.length} 人）
                </span>
              )}
            </div>

            {payDetailSummary.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="text-gray-400">收款合计：</span>
                {payDetailSummary.map((p) => (
                  <span
                    key={p.pay_type_id || p.pay_type}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100"
                  >
                    {p.pay_type}
                    <span className="font-semibold tabular-nums">
                      ¥
                      {p.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              加载中…
            </div>
          ) : error ? (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          ) : details.length === 0 ? (
            <div className="text-xs text-gray-400 py-4">本月无销售记录</div>
          ) : grouped ? (
            /* ⭐ 聚合模式：按来源员工分组 */
            <div className="space-y-3">
              {grouped.map(([owner, list], gi) => {
                const baseIdx = grouped
                  .slice(0, gi)
                  .reduce((s, [, l]) => s + l.length, 0);
                return (
                  <div key={owner}>
                    <div className="text-[11px] text-violet-700 font-medium mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      来自 {owner}（{list.length} 笔）
                    </div>
                    {renderTable(list, baseIdx)}
                  </div>
                );
              })}
            </div>
          ) : (
            renderTable(details, 0)
          )}
        </div>
      </td>
    </tr>
  );
};

export default SalesDetailRow;