import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import type { PayrollResult } from '../utils/payroll';
import { needsSaleIdPrefix } from '../utils/payroll';
import { getCardOrderList, type FinancialFlowItem } from '../api/stats';
import { fmtMoney } from '../pages/payroll/PayrollBadges';

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

  return (
    <tr className="bg-sky-50/40">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="ml-8 border-l-2 border-sky-200 pl-4">
          <div className="text-xs font-semibold text-sky-700 mb-2">
            销售明细（{list.length} 笔 · 业绩合计 ¥
            {myTotal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}）
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
                    <th className="px-3 py-1.5 text-left font-medium">会员名</th>
                    <th className="px-3 py-1.5 text-left font-medium">卡种</th>
                    <th className="px-3 py-1.5 text-right font-medium">占比</th>
                    <th className="px-3 py-1.5 text-right font-medium">
                      卡金额
                    </th>
                    <th className="px-3 py-1.5 text-right font-medium">
                      业绩金额
                    </th>
                    <th className="px-3 py-1.5 text-left font-medium">日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((item) => {
                    const hit = item.marketers_detail?.find(
                      (m) => (m.name || '').trim() === myName
                    );
                    const percent = hit?.percent || '—';
                    const performanceAmount = hit?.amount
                      ? Number(hit.amount)
                      : 0;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-1.5 text-gray-700">
                          {item.username || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-gray-600">
                          {item.card_name || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">
                          {percent}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">
                          ¥{Number(item.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium text-sky-600">
                          ¥{performanceAmount.toFixed(2)}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500 tabular-nums">
                          {item.deal_time || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export default SalesDetailRow;