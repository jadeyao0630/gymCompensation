import React, { useMemo, useState } from 'react';
import { Users, Plus, Trash2, Search, X, Check } from 'lucide-react';
import type {
  MonthlyCompensationPlan,
  RewardsCatalog,
  StaffRewardRef,
} from '../../types/compensation';

interface StaffOption {
  staffId: string;
  staffName: string;
  positionTitle: string;
}

interface Props {
  open: boolean;
  plan: MonthlyCompensationPlan;
  catalog: RewardsCatalog;
  staffOptions: StaffOption[];
  onChange: (next: Record<string, StaffRewardRef[]>) => void;
  onClose: () => void;
}

export const StaffRewardsDialog: React.FC<Props> = ({
  open,
  plan,
  catalog,
  staffOptions,
  onChange,
  onClose,
}) => {
  const [keyword, setKeyword] = useState('');
  const staffRewards = plan.staffRewards || {};

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return staffOptions;
    return staffOptions.filter(
      (s) =>
        s.staffName.toLowerCase().includes(kw) ||
        s.positionTitle.toLowerCase().includes(kw)
    );
  }, [staffOptions, keyword]);

  if (!open) return null;

  const updateStaff = (staffId: string, next: StaffRewardRef[]) => {
    const merged = { ...staffRewards };
    if (next.length === 0) delete merged[staffId];
    else merged[staffId] = next;
    onChange(merged);
  };

  const addForStaff = (staffId: string) => {
    const list = staffRewards[staffId] || [];
    const used = new Set(list.map((r) => r.rewardId));
    const def = catalog.find((c) => !used.has(c.id));
    if (!def) {
      alert('奖金库中已无更多可添加的奖金');
      return;
    }
    updateStaff(staffId, [
      ...list,
      { rewardId: def.id, enabled: def.mode === 'manual' ? false : undefined },
    ]);
  };

  const updateRef = (
    staffId: string,
    idx: number,
    patch: Partial<StaffRewardRef>
  ) => {
    const list = staffRewards[staffId] || [];
    updateStaff(
      staffId,
      list.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };

  const removeRef = (staffId: string, idx: number) => {
    const list = staffRewards[staffId] || [];
    updateStaff(
      staffId,
      list.filter((_, i) => i !== idx)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">个人奖金</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              为该月特定员工配置奖金；手动类需勾选启用
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索 */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索员工姓名 / 职位"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-10">
              暂无员工
            </div>
          ) : (
            filtered.map((s) => {
              const list = staffRewards[s.staffId] || [];
              return (
                <div
                  key={s.staffId}
                  className="border border-gray-100 rounded-xl p-3 hover:border-violet-200 transition"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {s.staffName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {s.positionTitle}
                    </span>
                    <div className="flex-1" />
                    <button
                      onClick={() => addForStaff(s.staffId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-100 text-violet-800 hover:bg-violet-200 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> 添加
                    </button>
                  </div>

                  {list.length > 0 && (
                    <div className="space-y-1.5">
                      {list.map((r, idx) => {
                        const def = catalog.find((c) => c.id === r.rewardId);
                        const isManual = def?.mode === 'manual';
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                          >
                            <select
                              value={r.rewardId}
                              onChange={(e) =>
                                updateRef(s.staffId, idx, {
                                  rewardId: e.target.value,
                                })
                              }
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
                            >
                              {catalog.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}（¥{c.amount}）
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 bg-white">
                              <span className="text-[10px] text-gray-500">¥</span>
                              <input
                                type="number"
                                value={r.amountOverride ?? def?.amount ?? 0}
                                onChange={(e) =>
                                  updateRef(s.staffId, idx, {
                                    amountOverride:
                                      parseInt(e.target.value) || 0,
                                  })
                                }
                                className="w-16 text-xs font-semibold bg-transparent focus:outline-none tabular-nums"
                              />
                            </div>

                            {isManual && (
                              <label className="inline-flex items-center gap-1 text-xs text-violet-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!r.enabled}
                                  onChange={(e) =>
                                    updateRef(s.staffId, idx, {
                                      enabled: e.target.checked,
                                    })
                                  }
                                  className="accent-violet-600"
                                />
                                本月启用
                              </label>
                            )}

                            {def?.mode === 'condition' && (
                              <span className="text-[10px] text-gray-400">
                                条件：{def.conditionType}
                                {def.conditionValue ? ` ≥ ${def.conditionValue}` : ''}
                              </span>
                            )}

                            <div className="flex-1" />

                            <button
                              onClick={() => removeRef(s.staffId, idx)}
                              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end bg-gray-50/60">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md transition active:scale-[0.97]"
          >
            <Check className="w-4 h-4" /> 完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffRewardsDialog;