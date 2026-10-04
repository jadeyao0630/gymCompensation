import React, { useEffect, useRef } from 'react';
import { Settings2 } from 'lucide-react';
import { COLUMNS, type ColumnKey } from '../utils/constants';

interface Props {
  visibleColumns: Set<ColumnKey>;
  onToggle: (key: ColumnKey) => void;
  onReset: () => void;
}

export const ColumnPicker: React.FC<Props> = ({
  visibleColumns,
  onToggle,
  onReset,
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
      >
        <Settings2 className="w-4 h-4" /> 列设置
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-white rounded-xl border border-gray-200 shadow-xl p-2">
          <div className="text-[11px] text-gray-400 px-2 py-1">
            勾选要显示的列
          </div>
          {COLUMNS.map((c) => {
            const checked = visibleColumns.has(c.key);
            return (
              <label
                key={c.key}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-blue-50 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(c.key)}
                  className="accent-blue-600"
                />
                <span>{c.label}</span>
              </label>
            );
          })}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={onReset}
              className="w-full text-xs text-blue-600 hover:bg-blue-50 rounded px-2 py-1.5 text-left"
            >
              恢复默认
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnPicker;