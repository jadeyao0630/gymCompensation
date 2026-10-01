import React, { useEffect, useMemo } from 'react';
import { X, Wallet } from 'lucide-react';
import type { FrontMoneyItem } from '../../../api/stats';

const fmtMoney = (v: number) =>
  `¥${Math.round(v).toLocaleString('zh-CN')}`;

type StatusFilter = 'all' | 'startUsing' | 'notStart' | 'drawback';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 弹窗标题（如"已启用定金明细"） */
  title: string;
  /** 筛选类型 */
  filter: StatusFilter;
  /** 全量定金列表 */
  list: FrontMoneyItem[];
}

/** 判断单条定金的状态 */
function getStatus(it: FrontMoneyItem): StatusFilter {
  const isRefund = Number(it.refund_time || 0) > 0;
  if (isRefund) return 'drawback';
  if (it.status === '1') return 'startUsing';
  return 'notStart';
}

export const FrontMoneyDialog: React.FC<Props> = ({
  open,
  onClose,
  title,
  filter,
  list,
}) => {
  /* ⭐ 按筛选条件过滤 */
  const filtered = useMemo(() => {
    if (filter === 'all') return list;
    return list.filter((it) => getStatus(it) === filter);
  }, [list, filter]);

  /* 合计 */
  const totalAmount = useMemo(
    () => filtered.reduce((s, it) => s + Number(it.amount || 0), 0),
    [filtered]
  );

  /* 键盘 ESC 关闭 */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              共 {filtered.length} 笔 · 合计{' '}
              <span className="font-semibold text-amber-600 tabular-nums">
                {fmtMoney(totalAmount)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              该状态下暂无定金记录
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">日期</th>
                  <th className="px-3 py-2.5 text-left font-medium">会员名</th>
                  <th className="px-3 py-2.5 text-left font-medium">手机</th>
                  <th className="px-3 py-2.5 text-right font-medium">金额</th>
                  <th className="px-3 py-2.5 text-center font-medium">状态</th>
                  <th className="px-3 py-2.5 text-left font-medium">收款方式</th>
                  <th className="px-3 py-2.5 text-left font-medium">收款人</th>
                  <th className="px-3 py-2.5 text-left font-medium">
                    启用/退款时间
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium">描述</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((it) => {
                  const st = getStatus(it);
                  const statusText =
                    st === 'drawback'
                      ? '已退款'
                      : st === 'startUsing'
                      ? '已启用'
                      : '未启用';
                  const statusCls =
                    st === 'drawback'
                      ? 'bg-rose-50 text-rose-700 border-rose-100'
                      : st === 'startUsing'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-gray-50 text-gray-600 border-gray-200';

                  return (
                    <tr key={it.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-gray-500 tabular-nums whitespace-nowrap">
                        {it.date || it.create_time || '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {it.username || '—'}
                      </td>
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
                          {(!it.new_pay_type ||
                            it.new_pay_type.length === 0) && (
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
                          className="inline-block max-w-[260px] truncate align-middle"
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
          )}
        </div>

        {/* 底部 */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <span className="text-[11px] text-gray-400">
            合计 <span className="font-semibold text-amber-700 tabular-nums">
              {fmtMoney(totalAmount)}
            </span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default FrontMoneyDialog;