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
  );
};

export default FrontMoneySection;