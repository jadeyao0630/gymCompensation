import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  User,
  UserRound,
  Sparkles,
  Layers,
  Wallet,
} from 'lucide-react';
import type { GenderSalaryTier } from '../types/compensation';
import { uid } from '../utils/id';

interface GenderTierEditorProps {
  tiers: GenderSalaryTier[];
  /** ⭐ 只读模式 */
  readOnly?: boolean;
  onChange: (tiers: GenderSalaryTier[]) => void;
}

const GenderTierEditor: React.FC<GenderTierEditorProps> = ({
  tiers,
  readOnly = false,
  onChange,
}) => {
  const [activeId, setActiveId] = useState<string | undefined>(tiers[0]?.id);

  useEffect(() => {
    if (tiers.length === 0) {
      setActiveId(undefined);
      return;
    }
    if (!activeId || !tiers.find((t) => t.id === activeId)) {
      setActiveId(tiers[0].id);
    }
  }, [tiers, activeId]);

  const current = tiers.find((t) => t.id === activeId);
  const isUnified = !!current?.base && current.base > 0;

  const newbieFixed = tiers.some((t) => t.newbieFixed);
  const fixedNewbieValue = tiers.find((t) => t.newbieFixed)?.newbie ?? 3000;

  const add = () => {
    if (readOnly) return;
    const newTier: GenderSalaryTier = {
      id: uid(),
      threshold: 0,
      male: 0,
      female: 0,
      newbie: newbieFixed ? fixedNewbieValue : 0,
      newbieFixed,
    };
    onChange([...tiers, newTier]);
    setActiveId(newTier.id);
  };

  const update = (id: string, u: Partial<GenderSalaryTier>) => {
    if (readOnly) return;
    onChange(tiers.map((t) => (t.id === id ? { ...t, ...u } : t)));
  };

  const updateNewbie = (id: string, value: number) => {
    if (readOnly) return;
    if (newbieFixed) {
      onChange(
        tiers.map((t) => ({ ...t, newbie: value, newbieFixed: true }))
      );
    } else {
      update(id, { newbie: value });
    }
  };

  const toggleNewbieFixed = (checked: boolean) => {
    if (readOnly) return;
    if (checked) {
      const v = current?.newbie ?? 3000;
      onChange(tiers.map((t) => ({ ...t, newbie: v, newbieFixed: true })));
    } else {
      onChange(tiers.map((t) => ({ ...t, newbieFixed: false })));
    }
  };

  const remove = (id: string) => {
    if (readOnly) return;
    const next = tiers.filter((t) => t.id !== id);
    onChange(next);
    if (id === activeId) setActiveId(next[0]?.id);
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-violet-50/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500" />
          底薪阶梯 · 含性别
        </h3>
        {!readOnly && (
          <button
            onClick={add}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/70 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> 添加阶梯
          </button>
        )}
      </div>

      {tiers.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-white/60 rounded-xl">
          <p className="text-xs text-gray-400">
            暂无底薪阶梯{!readOnly && '，点击右上角添加'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3">
          {/* 左：阶梯列表 */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-indigo-500 mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              业绩阶梯
            </p>
            {tiers.map((t) => {
              const active = t.id === activeId;
              const unified = !!t.base && t.base > 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={`w-full text-left rounded-xl px-3 py-2 text-xs transition-all border ${
                    active
                      ? 'bg-white border-indigo-300 shadow-sm ring-2 ring-indigo-200'
                      : 'bg-white/60 border-transparent hover:bg-white hover:border-indigo-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">
                      ≥ {t.threshold.toLocaleString()}
                    </span>
                    {active && (
                      <span className="text-[10px] text-indigo-500 font-medium">
                        编辑中
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5 tabular-nums">
                    {unified
                      ? `统一 ${t.base}`
                      : `男 ${t.male} · 女 ${t.female} · 新 ${t.newbie}`}
                  </div>
                  {t.note && (
                    <div
                      className="text-[10px] text-amber-600 mt-0.5 truncate"
                      title={t.note}
                    >
                      {t.note}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 右：编辑 */}
          {current && (
            <div className="bg-white/80 backdrop-blur rounded-xl border border-white p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-gray-500">
                  当前阶梯：
                  <span className="font-semibold text-indigo-600 ml-1">
                    ≥ {current.threshold.toLocaleString()}
                  </span>
                </span>
                {!readOnly && (
                  <button
                    onClick={() => remove(current.id)}
                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="删除该阶梯"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 业绩门槛 */}
              <div className="flex items-center gap-2 bg-gray-50/80 rounded-lg border border-gray-100 px-2.5 py-1.5 mb-2">
                <span className="text-xs text-gray-500 w-20">业绩门槛</span>
                <input
                  type="number"
                  value={current.threshold}
                  disabled={readOnly}
                  onChange={(e) =>
                    update(current.id, {
                      threshold: parseInt(e.target.value) || 0,
                    })
                  }
                  className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition tabular-nums disabled:cursor-not-allowed"
                />
                <span className="text-[11px] text-gray-400">元</span>
              </div>

              {/* 统一底薪 */}
              <div className="flex items-center gap-2 bg-gray-50/80 rounded-lg border border-gray-100 px-2.5 py-1.5 mb-2">
                <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-medium text-gray-600 w-20">
                  统一底薪
                </span>
                <input
                  type="number"
                  value={current.base ?? 0}
                  disabled={readOnly}
                  onChange={(e) =>
                    update(current.id, {
                      base: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="不分性别时填这里"
                  className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition tabular-nums placeholder:text-gray-300 disabled:cursor-not-allowed"
                />
                <span className="text-[11px] text-gray-400">元</span>
              </div>

              {/* 性别底薪 */}
              <div
                className={`space-y-2 ${
                  isUnified ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                <div className="flex items-center gap-2 bg-gray-50/80 rounded-lg border border-gray-100 px-2.5 py-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-gray-600 w-20">
                    男教练
                  </span>
                  <input
                    type="number"
                    value={current.male}
                    disabled={readOnly}
                    onChange={(e) =>
                      update(current.id, {
                        male: parseInt(e.target.value) || 0,
                      })
                    }
                    className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition tabular-nums disabled:cursor-not-allowed"
                  />
                  <span className="text-[11px] text-gray-400">元</span>
                </div>

                <div className="flex items-center gap-2 bg-gray-50/80 rounded-lg border border-gray-100 px-2.5 py-1.5">
                  <UserRound className="w-3.5 h-3.5 text-pink-600" />
                  <span className="text-xs font-medium text-gray-600 w-20">
                    女教练
                  </span>
                  <input
                    type="number"
                    value={current.female}
                    disabled={readOnly}
                    onChange={(e) =>
                      update(current.id, {
                        female: parseInt(e.target.value) || 0,
                      })
                    }
                    className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition tabular-nums disabled:cursor-not-allowed"
                  />
                  <span className="text-[11px] text-gray-400">元</span>
                </div>

                <div className="flex items-center gap-2 bg-violet-50/70 rounded-lg border border-violet-100 px-2.5 py-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                  <span className="text-xs font-medium text-gray-600 w-20">
                    新人无责
                  </span>
                  <input
                    type="number"
                    value={newbieFixed ? fixedNewbieValue : current.newbie}
                    readOnly={newbieFixed}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateNewbie(current.id, parseInt(e.target.value) || 0)
                    }
                    className={`flex-1 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-2 transition tabular-nums ${
                      newbieFixed
                        ? 'bg-violet-50/80 border border-violet-100 text-violet-700 cursor-not-allowed'
                        : 'bg-white border border-gray-200 focus:ring-indigo-400/40 focus:border-indigo-400'
                    } disabled:cursor-not-allowed`}
                  />
                  <span className="text-[11px] text-gray-400">元</span>
                </div>
              </div>

              {isUnified && (
                <p className="text-[11px] text-indigo-400 mt-2 leading-relaxed">
                  当前阶梯为统一底薪，性别底薪已忽略
                </p>
              )}

              <label
                className={`flex items-center gap-2 mt-2 text-[11px] text-violet-600 select-none ${
                  readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={newbieFixed}
                  disabled={readOnly}
                  onChange={(e) => toggleNewbieFixed(e.target.checked)}
                  className="rounded border-gray-300 text-violet-500 focus:ring-violet-400 disabled:cursor-not-allowed"
                />
                新人无责底薪不随阶梯变化（所有阶梯统一为 {fixedNewbieValue}）
              </label>

              {/* 备注 */}
              <div className="flex items-start gap-2 bg-amber-50/60 rounded-lg border border-amber-100 px-2.5 py-1.5 mt-2">
                <span className="text-xs text-amber-600 w-20 pt-1">备注</span>
                <textarea
                  value={current.note || ''}
                  disabled={readOnly}
                  onChange={(e) =>
                    update(current.id, { note: e.target.value })
                  }
                  rows={2}
                  placeholder="如：男教练3000 女教练3500 新人无责底薪3000元"
                  className="flex-1 text-xs bg-white border border-amber-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition placeholder:text-amber-300 resize-none disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GenderTierEditor;