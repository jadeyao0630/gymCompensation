import React, { useEffect, useRef, useState } from 'react';
import { Gift, X, Check, Trash2 } from 'lucide-react';
import type {
  RewardsCatalog,
  StaffRewardRef,
} from '../../types/compensation';

interface Props {
  staffId: string;
  staffName: string;
  catalog: RewardsCatalog;
  current: StaffRewardRef[];
  onSave: (next: StaffRewardRef[]) => void;
  onClose: () => void;
}

export const QuickRewardPopover: React.FC<Props> = ({
  staffId,
  staffName,
  catalog,
  current,
  onSave,
  onClose,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<StaffRewardRef[]>(current);

  useEffect(() => {
    setList(current);
  }, [current, staffId]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const add = () => {
    const used = new Set(list.map((r) => r.rewardId));
    const def = catalog.find((c) => !used.has(c.id));
    if (!def) return alert('奖金库中已无更多可添加的奖金');
    setList([
      ...list,
      {
        rewardId: def.id,
        enabled: def.mode === 'manual' ? true : undefined,
      },
    ]);
  };

  const update = (idx: number, patch: Partial<StaffRewardRef>) => {
    setList(list.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const remove = (idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave(list);
    onClose();
  };

  return (
    <div
      ref={wrapRef}
      className="absolute right-0 top-full mt-2 z-50 w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 mb-2">
        <Gift className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-gray-800 truncate">
          {staffName} · 奖金
        </span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-xs text-gray-400 mb-2">暂无奖金</p>
      ) : (
        <div className="space-y-1.5 mb-2 max-h-64 overflow-y-auto">
          {list.map((r, idx) => {
            const def = catalog.find((c) => c.id === r.rewardId);
            if (!def) return null;
            const isManual = def.mode === 'manual';
            return (
              <div
                key={idx}
                className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5"
              >
                <select
                  value={r.rewardId}
                  onChange={(e) => update(idx, { rewardId: e.target.value })}
                  className="border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none max-w-[110px]"
                >
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 border border-gray-200 rounded px-1.5 py-1 bg-white">
                  <span className="text-[10px] text-gray-500">¥</span>
                  <input
                    type="number"
                    value={r.amountOverride ?? def.amount}
                    onChange={(e) =>
                      update(idx, {
                        amountOverride: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-14 text-xs font-semibold bg-transparent focus:outline-none tabular-nums"
                  />
                </div>
                {isManual && (
                  <label className="inline-flex items-center gap-1 text-[10px] text-violet-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.enabled === true}
                      onChange={(e) =>
                        update(idx, { enabled: e.target.checked })
                      }
                      className="accent-violet-600"
                    />
                    启用
                  </label>
                )}
                {def.mode === 'condition' && (
                  <span className="text-[9px] text-gray-400">
                    {def.conditionType}
                  </span>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => remove(idx)}
                  className="p-0.5 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={add}
          className="px-2.5 py-1 text-xs rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 font-medium"
        >
          + 添加
        </button>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
        >
          <Check className="w-3 h-3" /> 保存并重算
        </button>
      </div>
    </div>
  );
};

export default QuickRewardPopover;