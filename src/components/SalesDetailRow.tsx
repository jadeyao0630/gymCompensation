import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import type { PayrollResult } from '../utils/payroll';
import { needsSaleIdPrefix } from '../utils/payroll';
import { getCardOrderList, type FinancialFlowItem } from '../api/stats';

interface Props {
  result: PayrollResult;
  storeId: string;
  month: string;
  colSpan: number;
}

/** 'YYYY-MM' → { begin_date: 'YYYY-MM-01', end_date: 'YYYY-MM-月末' } */
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

/* ⭐ 收款方式单元格：展示该笔订单的所有支付方式 + 金额 */
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

/* ⭐ 业绩归属单元格：展示该笔订单所有归属人 + 占比 + 金额 */
const MarketersInline: React.FC<{
  marketers?: Array<{
    name: string;
    role: string;
    percent: string;
    amount: string;
  }>;
  /** 当前查看的职员姓名，用于高亮 */
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
            {/* 归属人姓名 */}
            <span className={isSelf ? 'font-semibold' : ''}>{m.name}</span>

            {/* 主归属/协助标签 */}
            <span
              className={`text-[9px] px-1 rounded ${
                isPrimary
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isPrimary ? '主' : '协'}
            </span>

            {/* 占比 */}
            <span className="tabular-nums text-gray-500">{m.percent}</span>

            {/* 金额 */}
            <span className="tabular-nums font-medium">
              ¥{Number(m.amount || 0).toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const SalesDetailRow: React.FC<Props> = ({
  result,
  storeId,
  month,
  colSpan,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [list, setList] = useState<FinancialFlowItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { begin_date, end_date } = getMonthRange(month);

        /* ⭐ 会籍 / 私教部门：sale_id 加 "c" 前缀 */
        const saleId = needsSaleIdPrefix(result.positionTitle)
          ? `c${result.staffId}`
          : result.staffId;

        const res = await getCardOrderList({
          bus_id: storeId,
          sale_id: saleId,
          begin_date,
          end_date,
          page_no: 1,
          page_size: 1000,
        });
        if (cancelled) return;
        setList(res.list);
        setTotalAmount(res.totalAmount);
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
  }, [result.staffId, result.positionTitle, storeId, month]);

  /* 合计：只算当前职员归属的业绩 */
  const myName = (result.staffName || '').trim();
  const myTotal = list.reduce((sum, item) => {
    const hit = item.marketers_detail?.find(
      (m) => (m.name || '').trim() === myName
    );
    if (!hit) return sum;
    return sum + (Number(hit.amount) || 0);
  }, 0);

  /* ⭐ 收款方式合计：所有订单的 pay_detail 按支付方式累加 */
  const payDetailSummary = useMemo(() => {
    const map = new Map<
      string,
      { pay_type: string; amount: number; pay_type_id: string }
    >();
    list.forEach((item) => {
      (item.pay_detail || []).forEach((p) => {
        const key = String(p.pay_type_id || p.pay_type);
        const cur = map.get(key);
        const amt = Number(p.amount) || 0;
        if (cur) {
          cur.amount += amt;
        } else {
          map.set(key, {
            pay_type: p.pay_type,
            amount: amt,
            pay_type_id: String(p.pay_type_id || ''),
          });
        }
      });
    });
    return Array.from(map.values());
  }, [list]);

  return (
    <tr className="bg-sky-50/40">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="ml-8 border-l-2 border-sky-200 pl-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="text-xs font-semibold text-sky-700">
              销售明细（{list.length} 笔 · 本人业绩合计 ¥
              {myTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}）
            </div>

            {/* ⭐ 收款方式合计 */}
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
          ) : list.length === 0 ? (
            <div className="text-xs text-gray-400 py-4">本月无销售记录</div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100 bg-gray-50/60">
                    <th className="px-3 py-1.5 text-left font-medium">
                      会员名
                    </th>
                    <th className="px-3 py-1.5 text-left font-medium">卡种</th>
                    {/* ⭐ 收款方式 */}
                    <th className="px-3 py-1.5 text-left font-medium">
                      收款方式
                    </th>
                    {/* ⭐ 业绩归属（原"占比"列被替换为完整归属明细） */}
                    <th className="px-3 py-1.5 text-left font-medium">
                      业绩归属
                    </th>
                    <th className="px-3 py-1.5 text-right font-medium">
                      卡金额
                    </th>
                    <th className="px-3 py-1.5 text-right font-medium">
                      本人业绩
                    </th>
                    <th className="px-3 py-1.5 text-left font-medium">日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((item) => {
                    const hit = item.marketers_detail?.find(
                      (m) => (m.name || '').trim() === myName
                    );
                    const performanceAmount = hit?.amount
                      ? Number(hit.amount)
                      : 0;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-1.5 text-gray-700 align-top">
                          {item.username || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-gray-600 align-top">
                          {item.card_name || '—'}
                        </td>
                        {/* ⭐ 收款方式 */}
                        <td className="px-3 py-1.5 align-top">
                          <PayDetailInline payDetail={item.pay_detail} />
                        </td>
                        {/* ⭐ 业绩归属：所有归属人 + 占比 + 金额 */}
                        <td className="px-3 py-1.5 align-top">
                          <MarketersInline
                            marketers={item.marketers_detail}
                            highlightName={myName}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-600 align-top">
                          ¥{Number(item.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium text-sky-600 align-top">
                          ¥{performanceAmount.toFixed(2)}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500 tabular-nums align-top">
                          {item.deal_time || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* 表尾合计 */}
                <tfoot className="bg-gray-50/60 font-medium text-gray-700">
                  <tr className="border-t border-gray-100">
                    <td className="px-3 py-1.5" colSpan={4}>
                      合计（{list.length} 笔）
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-800">
                      ¥
                      {list
                        .reduce((s, it) => s + Number(it.amount || 0), 0)
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-sky-700">
                      ¥
                      {myTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-1.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export default SalesDetailRow;