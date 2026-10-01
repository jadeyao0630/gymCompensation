import React from 'react';
import { fmtMoney } from '../utils/date';

/* ---------- 大卡片 ---------- */
export const BigCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  gradient: string;
}> = ({ icon, label, value, sub, gradient }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-center gap-3 mb-3">
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-sm`}
      >
        {icon}
      </div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
    </div>
    <div className="text-2xl font-bold text-gray-800 tabular-nums truncate">
      {value}
    </div>
    {sub && <div className="text-[11px] text-gray-400 mt-1 truncate">{sub}</div>}
  </div>
);

/* ---------- 小行 ---------- */
export const Row: React.FC<{
  label: string;
  value: number | string;
  color?: string;
  bold?: boolean;
  big?: boolean;
  isMoney?: boolean;
}> = ({ label, value, color = 'text-gray-700', bold, big, isMoney = true }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span
      className={`tabular-nums ${color} ${
        big ? 'text-lg font-bold' : bold ? 'font-semibold' : 'font-medium'
      }`}
    >
      {isMoney && typeof value === 'number' ? fmtMoney(value) : value}
    </span>
  </div>
);