import React from 'react';
import { Gift, Plus, Trash2 } from 'lucide-react';
import type {
  PositionRewardRef,
  RewardsCatalog,
} from '../../types/compensation';

interface Props {
  rewards: PositionRewardRef[];
  catalog: RewardsCatalog;
  readOnly?: boolean;
  onChange: (next: PositionRewardRef[]) => void;
}

export const PositionRewardsEditor: React.FC<Props> = ({
  rewards,
  catalog,
  readOnly = false,
  onChange,
}) => {
  const add = () => {
    if (readOnly) return;
    const used = new Set(rewards.map((r) => r.rewardId));
    const next = catalog.find((c) => !used.has(c.id));
    if (!next) {
      alert('奖金库中已无更多可添加的奖金');
      return;
    }
    onChange([...rewards, { rewardId: next.id }]);
  };

  const update = (idx: number, patch: Partial<PositionRewardRef>) => {
    if (readOnly) return;
    onChange(rewards.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const remove = (idx: number) => {
    if (readOnly) return;
    onChange(rewards.filter((_, i) => i !== idx));
  };

  return (
    <div className="px-5 py-4 border-t border-gray-100 bg-amber-50/20">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-gray-700">
          职位奖金
        </span>
        <span className="text-xs text-gray-400">
          （该职位下所有员工按条件自动命中）
        </span>
      </div>

      {rewards.length === 0 ? (
        <p className="text-xs text-gray-400 mb-3">
          暂无奖金，可从奖金库添加
        </p>
      ) : (
        <div className="space-y-2 mb-3">
          {rewards.map((r, idx) => {
            const def = catalog.find((c) => c.id === r.rewardId);
            return (
              <div
                key={idx}
                className="flex items-center gap-3 bg-white border border-amber-100 rounded-lg px-3 py-2"
              >
                <select
                  value={r.rewardId}
                  disabled={readOnly}
                  onChange={(e) =>
                    update(idx, { rewardId: e.target.value })
                  }
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}（¥{c.amount}）
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50">
                  <span className="text-xs text-gray-500">金额</span>
                  <input
                    type="number"
                    value={r.amountOverride ?? def?.amount ?? 0}
                    disabled={readOnly}
                    onChange={(e) =>
                      update(idx, {
                        amountOverride: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-20 text-sm font-semibold bg-transparent focus:outline-none tabular-nums"
                  />
                </div>

                <div className="flex-1 text-xs text-gray-400 truncate">
                  {def?.mode === 'condition'
                    ? `条件：${def.conditionType} ${
                        def.conditionValue ?? ''
                      }`
                    : '手动类（需在个人奖金里勾选）'}
                </div>

                {!readOnly && (
                  <button
                    onClick={() => remove(idx)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <button
          onClick={add}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
        >
          <Plus className="w-3.5 h-3.5" /> 添加奖金
        </button>
      )}
    </div>
  );
};

export default PositionRewardsEditor;