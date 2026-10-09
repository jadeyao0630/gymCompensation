import React from 'react';
import { BadgePercent, BookOpen, PiggyBank } from 'lucide-react';

interface Props {
  totalCommission: number;
  totalPositionCommission: number;
  totalClassCommission: number;
}

const formatMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

export const CommissionRatioCards: React.FC<Props> = ({
  totalCommission,
  totalPositionCommission,
  totalClassCommission,
}) => {
  const salesCommissionRatio =
    totalCommission > 0 ? totalPositionCommission / totalCommission : 0;
  const classCommissionRatio =
    totalCommission > 0 ? totalClassCommission / totalCommission : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
      <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
        <div className="flex items-center gap-1 text-[11px] text-amber-700 mb-0.5">
          <BadgePercent className="w-3 h-3" />
          <span className="font-medium">销提比例</span>
        </div>
        <p className="font-bold text-sm text-amber-700 tabular-nums">
          {(salesCommissionRatio * 100).toFixed(1)}%
        </p>
        <p className="text-[10px] text-amber-500 mt-0.5 tabular-nums">
          {formatMoney(totalPositionCommission)} / {formatMoney(totalCommission)}
        </p>
      </div>

      <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2.5">
        <div className="flex items-center gap-1 text-[11px] text-purple-700 mb-0.5">
          <BookOpen className="w-3 h-3" />
          <span className="font-medium">课提比例</span>
        </div>
        <p className="font-bold text-sm text-purple-700 tabular-nums">
          {(classCommissionRatio * 100).toFixed(1)}%
        </p>
        <p className="text-[10px] text-purple-500 mt-0.5 tabular-nums">
          {formatMoney(totalClassCommission)} / {formatMoney(totalCommission)}
        </p>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
        <div className="flex items-center gap-1 text-[11px] text-indigo-700 mb-0.5">
          <PiggyBank className="w-3 h-3" />
          <span className="font-medium">总佣金</span>
        </div>
        <p className="font-bold text-sm text-indigo-700 tabular-nums">
          {formatMoney(totalCommission)}
        </p>
        <p className="text-[10px] text-indigo-500 mt-0.5">销提 + 课提</p>
      </div>
    </div>
  );
};

export default CommissionRatioCards;