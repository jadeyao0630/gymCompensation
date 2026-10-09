import React from 'react';
import type { PositionConfig } from '../../../types/compensation';
import { resolveCalcFlags } from '../../../types/compensation';

const FLAG_COLORS: Record<string, { on: string; off: string }> = {
  emerald: {
    on: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    off: 'bg-white text-gray-400 border-gray-200',
  },
  sky: {
    on: 'bg-sky-50 text-sky-700 border-sky-200',
    off: 'bg-white text-gray-400 border-gray-200',
  },
  blue: {
    on: 'bg-blue-50 text-blue-700 border-blue-200',
    off: 'bg-white text-gray-400 border-gray-200',
  },
  cyan: {
    on: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    off: 'bg-white text-gray-400 border-gray-200',
  },
  violet: {
    on: 'bg-violet-50 text-violet-700 border-violet-200',
    off: 'bg-white text-gray-400 border-gray-200',
  },
};

interface Props {
  position: PositionConfig;
  readOnly: boolean;
  onUpdate: (u: Partial<PositionConfig>) => void;
}

export const PositionCalcFlagsRow: React.FC<Props> = ({
  position,
  readOnly,
  onUpdate,
}) => {
  const flags = resolveCalcFlags(position);

  const setFlag = (key: keyof typeof flags, value: boolean) => {
    if (readOnly) return;
    onUpdate({
      calcFlags: {
        ...position.calcFlags,
        [key]: value,
      },
    });
  };

  const items: {
    key: keyof typeof flags;
    label: string;
    color: keyof typeof FLAG_COLORS;
  }[] = [
    { key: 'includePerformance', label: '业绩', color: 'emerald' },
    { key: 'includeSalesCommission', label: '佣金', color: 'sky' },
    { key: 'includeBaseSalary', label: '底薪', color: 'blue' },
    { key: 'includeClassAmount', label: '上课金额', color: 'cyan' },
    { key: 'includeClassCommission', label: '课提', color: 'violet' },
  ];

  return (
    <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center gap-3">
      <span className="text-xs font-medium text-slate-600">参与计算项：</span>
      {items.map((it) => {
        const active = flags[it.key];
        const c = FLAG_COLORS[it.color];
        return (
          <label
            key={it.key}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              active ? c.on : c.off
            } ${readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              checked={active}
              disabled={readOnly}
              onChange={(e) => setFlag(it.key, e.target.checked)}
              className="accent-current"
            />
            {it.label}
          </label>
        );
      })}
    </div>
  );
};

export default PositionCalcFlagsRow;