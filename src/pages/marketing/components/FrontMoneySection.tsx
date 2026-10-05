import React from 'react';
import { Wallet, ChevronRight } from 'lucide-react';
import type { FrontMoneyItem } from '../../../api/stats';
import { aggregateFrontMoney } from '../utils/aggregate';

const fmtMoney = (v: number) =>
  `¥${Math.round(v).toLocaleString('zh-CN')}`;

export type FrontMoneyFilter = 'all' | 'startUsing' | 'notStart' | 'drawback';

interface Props {
  frontMoneyList: FrontMoneyItem[];
  onOpenDialog: (filter: FrontMoneyFilter, title: string) => void;
}

export const FrontMoneySection: React.FC<Props> = ({
  frontMoneyList,
  onOpenDialog,
}) => {
  if (frontMoneyList.length === 0) return null;

  const s = aggregateFrontMoney(frontMoneyList);

  return (
    <>
      {/* 汇总卡片 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-500" />
            定金 / 押金汇总
          </h3>
          <span className="text-xs text-gray-400">点击卡片查看明细</span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onOpenDialog('all', '定金 / 押金明细')}
            className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-left transition hover:border-amber-300 hover:shadow-md active:scale-[0.98] group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-amber-600">
                定金金额合计（{s.totalCount} 笔）
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="text-xl font-bold text-amber-700 tabular-nums">
              {fmtMoney(s.totalAmount)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenDialog('startUsing', '已启用定金明细')}
            className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-left transition hover:border-emerald-300 hover:shadow-md active:scale-[0.98] group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-emerald-600">
                已启用（{s.startUsingCount} 笔）
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="text-xl font-bold text-emerald-700 tabular-nums">
              {fmtMoney(s.startUsingAmount)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenDialog('notStart', '未启用定金明细')}
            className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-left transition hover:border-gray-300 hover:shadow-md active:scale-[0.98] group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-500">
                未启用（{s.notStartCount} 笔）
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="text-xl font-bold text-gray-700 tabular-nums">
              {fmtMoney(s.notStartAmount)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenDialog('drawback', '已退款定金明细')}
            className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-left transition hover:border-rose-300 hover:shadow-md active:scale-[0.98] group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-rose-600">
                已退款（{s.drawbackCount} 笔）
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-rose-400 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="text-xl font-bold text-rose-700 tabular-nums">
              {fmtMoney(s.drawbackAmount)}
            </div>
          </button>
        </div>
      </div>

      {/* 明细表 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            定金 / 押金明细（{frontMoneyList.length} 笔）
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium">日期</th>
                <th className="px-3 py-2.5 text-left font-medium">会员名</th>
                <th className="px-3 py-2.5 text-left font-medium">手机</th>
                <th className="px-3 py-2.5 text-right font-medium">金额</th>
                <th className="px-3 py-2.5 text-center font-medium">状态</th>
                <th className="px-3 py-2.5 text-left font-medium">收款方式</th>
                <th className="px-3 py-2.5 text-left font-medium">收款人</th>
                <th className="px-3 py-2.5 text-left font-medium">启用/退款时间</th>
                <th className="px-3 py-2.5 text-left font-medium">描述</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {frontMoneyList.map((it) => {
                const isRefund = Number(it.refund_time || 0) > 0;
                const statusText = isRefund
                  ? '已退款'
                  : it.status === '1'
                  ? '已启用'
                  : '未启用';
                const statusCls = isRefund
                  ? 'bg-rose-50 text-rose-700 border-rose-100'
                  : it.status === '1'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-gray-50 text-gray-600 border-gray-200';

                return (
                  <tr key={it.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-500 tabular-nums whitespace-nowrap">
                      {it.date || it.create_time || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{it.username || '—'}</td>
                    <td className="px-3 py-2 text-gray-500 tabular-nums">
                      {it.phone || '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-amber-700">
                      {fmtMoney(Number(it.amount || 0))}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[10px] border ${statusCls}`}
                      >
                        {statusText}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(it.new_pay_type || []).map((p, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100"
                          >
                            {p.pay_type_name}
                            <span className="font-medium tabular-nums">
                              ¥{Number(p.amount).toLocaleString()}
                            </span>
                          </span>
                        ))}
                        {(!it.new_pay_type || it.new_pay_type.length === 0) && (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {it.marketers_name || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-500 tabular-nums whitespace-nowrap">
                      {it.start_refund_date || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      <span
                        className="inline-block max-w-[280px] truncate align-middle"
                        title={it.description}
                      >
                        {it.description || '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default FrontMoneySection;