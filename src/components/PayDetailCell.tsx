import React from 'react';
import type { PayDetailItem } from '../types/compensation';

interface PayDetailCellProps {
  /** 收款方式列表 */
  payDetail?: PayDetailItem[];
  /** 空数据时的占位符，默认 "—" */
  fallback?: React.ReactNode;
  /** 尺寸 */
  size?: 'sm' | 'md';
}

/**
 * ⭐ 收款方式单元格
 * - 无论几项，均展示"方式名 + 金额"
 * - 多项自动换行
 * - 无数据时展示 fallback（默认 "—"）
 */
export const PayDetailCell: React.FC<PayDetailCellProps> = ({
  payDetail,
  fallback = <span className="text-gray-300 text-xs">—</span>,
  size = 'sm',
}) => {
  if (!payDetail || payDetail.length === 0) {
    return <>{fallback}</>;
  }

  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const padY = size === 'sm' ? 'py-0.5' : 'py-1';
  const padX = size === 'sm' ? 'px-1.5' : 'px-2';

  return (
    <div className="flex flex-wrap gap-1">
      {payDetail.map((p, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 ${textSize} ${padX} ${padY} rounded bg-sky-50 text-sky-700 border border-sky-100 whitespace-nowrap`}
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

export default PayDetailCell;