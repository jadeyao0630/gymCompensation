import React from 'react';
import { Gift, Plus, Trash2, X, Check } from 'lucide-react';
import type {
  DepartmentKey,
  DepartmentRewards,
  PositionRewardRef,
  RewardsCatalog,
} from '../../types/compensation';

interface Props {
  open: boolean;
  catalog: RewardsCatalog;
  value: DepartmentRewards;
  onChange: (next: DepartmentRewards) => void;
  onClose: () => void;
}

const DEPTS: DepartmentKey[] = ['会籍', '私教', '泳教', '运营'];

export const DepartmentRewardsDialog: React.FC<Props> = ({
  open,
  catalog,
  value,
  onChange,
  onClose,
}) => {
  if (!open) return null;

  const addFor = (dept: DepartmentKey) => {
    const list = value[dept] || [];
    const used = new Set(list.map((r) => r.rewardId));
    const def = catalog.find((c) => !used.has(c.id));
    if (!def) return alert('奖金库中已无更多可添加的奖金');
    onChange({ ...value, [dept]: [...list, { rewardId: def.id }] });
  };

  const updateFor = (
    dept: DepartmentKey,
    idx: number,
    patch: Partial<PositionRewardRef>
  ) => {
    const list = value[dept] || [];
    onChange({
      ...value,
      [dept]: list.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  };

  const removeFor = (dept: DepartmentKey, idx: number) => {
    const list = value[dept] || [];
    const next = list.filter((_, i) => i !== idx);
    const merged = { ...value };
    if (next.length === 0) delete merged[dept];
    else merged[dept] = next;
    onChange(merged);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">部门奖金</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              该部门下所有员工自动命中（条件类）
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {DEPTS.map((dept) => {
            const list = value[dept] || [];
            return (
              <div key={dept} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-gray-800">
                    {dept}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => addFor(dept)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-sky-100 text-sky-800 hover:bg-sky-200"
                  >
                    <Plus className="w-3 h-3" /> 添加
                  </button>
                </div>

                {list.length === 0 ? (
                  <p className="text-xs text-gray-400">暂无奖金</p>
                ) : (
                  <div className="space-y-1.5">
                    {list.map((r, idx) => {
                      const def = catalog.find((c) => c.id === r.rewardId);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5"
                        >
                          <select
                            value={r.rewardId}
                            onChange={(e) =>
                              updateFor(dept, idx, {
                                rewardId: e.target.value,
                              })
                            }
                            className="border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none"
                          >
                            {catalog.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}（¥{c.amount}）
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1 border border-gray-200 rounded px-1.5 py-1 bg-white">
                            <span className="text-[10px] text-gray-500">¥</span>
                            <input
                              type="number"
                              value={r.amountOverride ?? def?.amount ?? 0}
                              onChange={(e) =>
                                updateFor(dept, idx, {
                                  amountOverride: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-14 text-xs font-semibold bg-transparent focus:outline-none tabular-nums"
                            />
                          </div>
                          {def?.mode === 'condition' && (
                            <span className="text-[9px] text-gray-400">
                              {def.conditionType}
                            </span>
                          )}
                          <div className="flex-1" />
                          <button
                            onClick={() => removeFor(dept, idx)}
                            className="p-0.5 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/60">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md hover:from-sky-700 hover:to-indigo-700"
          >
            <Check className="w-4 h-4" /> 完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentRewardsDialog;