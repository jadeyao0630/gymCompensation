import React, { useEffect, useRef, useState } from 'react';
import { Gift, MinusCircle, X, Check, Trash2 } from 'lucide-react';
import type {
  RewardsCatalog,
  RewardDefinition,
  StaffRewardRef,
} from '../../../types/compensation';

interface Props {
  staffId: string;
  staffName: string;
  catalog: RewardsCatalog;
  current: StaffRewardRef[];
  onSave: (next: StaffRewardRef[]) => void;
  onClose: () => void;
}

type LocalRow = StaffRewardRef;

export const QuickRewardPopover: React.FC<Props> = ({
  staffId,
  staffName,
  catalog,
  current,
  onSave,
  onClose,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<LocalRow[]>(() =>
    current.map((r) => ({ ...r, enabled: true }))
  );

  useEffect(() => {
    setList(current.map((r) => ({ ...r, enabled: true })));
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

  const addFromCatalog = () => {
    const used = new Set(list.map((r) => r.rewardId));
    const def: RewardDefinition | undefined = catalog.find(
      (c: RewardDefinition) => !used.has(c.id)
    );
    if (!def) return alert('奖金库中已无更多可添加的条目');
    setList([
      ...list,
      {
        rewardId: def.id,
        enabled: true,
        customName: undefined,
        customType: undefined,
      },
    ]);
  };

  const addCustom = () => {
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setList([
      ...list,
      {
        rewardId: id,
        enabled: true,
        customName: '自定义扣款',
        customType: 'deduction',
        amountOverride: -0,
      },
    ]);
  };

  const update = (idx: number, patch: Partial<LocalRow>) => {
    setList(list.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const remove = (idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    /* ⭐ 强制 enabled = true（不再有开关） */
    const cleaned = list.map((r) => ({ ...r, enabled: true }));
    onSave(cleaned);
    onClose();
  };

  return (
    <div
      ref={wrapRef}
      className="absolute right-0 top-full mt-2 z-50 w-96 bg-white rounded-2xl border border-gray-200 shadow-2xl p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 mb-2">
        <Gift className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-gray-800 truncate">
          {staffName} · 奖金 / 扣款
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
        <p className="text-xs text-gray-400 mb-2">暂无条目</p>
      ) : (
        <div className="space-y-1.5 mb-2 max-h-72 overflow-y-auto">
          {list.map((r, idx) => {
            const isCustom = !!(r.customName && r.customName.trim());
            const catalogDef: RewardDefinition | undefined = isCustom
              ? undefined
              : catalog.find((c: RewardDefinition) => c.id === r.rewardId);

            const isDeduction = isCustom
              ? r.customType === 'deduction'
              : catalogDef?.type === 'deduction';

            return (
              <div
                key={idx}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border ${
                  isDeduction
                    ? 'bg-rose-50/40 border-rose-100'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                {isCustom ? (
                  <>
                    <select
                      value={r.customType ?? 'deduction'}
                      onChange={(e) =>
                        update(idx, {
                          customType: e.target.value as 'reward' | 'deduction',
                        })
                      }
                      className={`border rounded px-1.5 py-1 text-xs focus:outline-none ${
                        isDeduction
                          ? 'border-rose-200 text-rose-700'
                          : 'border-gray-200'
                      }`}
                    >
                      <option value="reward">奖励</option>
                      <option value="deduction">扣款</option>
                    </select>

                    <input
                      type="text"
                      value={r.customName ?? ''}
                      onChange={(e) =>
                        update(idx, { customName: e.target.value })
                      }
                      placeholder="名称"
                      className="border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none w-24"
                    />
                  </>
                ) : (
                  <select
                    value={r.rewardId}
                    onChange={(e) =>
                      update(idx, { rewardId: e.target.value })
                    }
                    className="border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none max-w-[130px]"
                  >
                    {catalog.map((c: RewardDefinition) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.type === 'deduction' ? '（扣）' : ''}
                      </option>
                    ))}
                  </select>
                )}

                <div
                  className={`flex items-center gap-1 border rounded px-1.5 py-1 bg-white ${
                    isDeduction ? 'border-rose-200' : 'border-gray-200'
                  }`}
                >
                  <span
                    className={`text-[10px] ${
                      isDeduction ? 'text-rose-500' : 'text-gray-500'
                    }`}
                  >
                    {isDeduction ? '-¥' : '¥'}
                  </span>
                  <input
                    type="number"
                    value={Math.abs(
                      r.amountOverride ?? catalogDef?.amount ?? 0
                    )}
                    onChange={(e) => {
                      const abs = Math.abs(parseInt(e.target.value) || 0);
                      update(idx, {
                        amountOverride: isDeduction ? -abs : abs,
                      });
                    }}
                    className="w-16 text-xs font-semibold bg-transparent focus:outline-none tabular-nums"
                  />
                </div>

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

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={addFromCatalog}
            className="px-2.5 py-1 text-xs rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 font-medium"
          >
            + 从奖金库
          </button>
          <button
            onClick={addCustom}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 font-medium"
          >
            <MinusCircle className="w-3 h-3" /> + 自定义
          </button>
        </div>
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