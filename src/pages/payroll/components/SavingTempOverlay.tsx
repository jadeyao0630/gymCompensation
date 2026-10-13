import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  active: boolean;
  staffName?: string;
}

export const SavingTempOverlay: React.FC<Props> = ({ active, staffName }) => {
  if (!active) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm select-none"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-3 min-w-[260px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">正在保存奖罚并重算</p>
          {staffName && (
            <p className="text-xs text-gray-500 mt-1">→ {staffName}</p>
          )}
          <p className="text-[11px] text-gray-400 mt-2">
            请稍候，正在同步方案与计算薪酬…
          </p>
        </div>
      </div>
    </div>
  );
};

export default SavingTempOverlay;