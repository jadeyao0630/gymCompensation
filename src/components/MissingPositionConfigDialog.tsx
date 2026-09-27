import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  X,
  Check,
  Plus,
  Trash2,
  User,
  UserRound,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  PositionConfig,
  CommissionTier,
  BaseSalaryTier,
  GenderSalaryTier,
} from '../types/compensation';
import type { MissingPositionInfo } from '../utils/payroll';
import { uid } from '../utils/id';

interface MissingPositionConfigDialogProps {
  missing: string[];
  existing: PositionConfig[];
  details?: MissingPositionInfo[];
  onConfirm: (result: Record<string, PositionConfig>) => void;
  onCancel: () => void;
}

const MissingPositionConfigDialog: React.FC<
  MissingPositionConfigDialogProps
> = ({ missing, existing, details, onConfirm, onCancel }) => {
  const [drafts, setDrafts] = useState<Record<string, PositionConfig>>(() => {
    const init: Record<string, PositionConfig> = {};
    missing.forEach((name) => {
      init[name] = makeEmptyPosition(name);
    });
    return init;
  });

  const [activeName, setActiveName] = useState<string>(missing[0] || '');
  const draft = drafts[activeName];

  /* 详情映射 */
  const detailMap = useMemo(() => {
    const m = new Map<string, MissingPositionInfo>();
    (details || []).forEach((d) => m.set(d.positionTitle, d));
    return m;
  }, [details]);

  const updateDraft = (updates: Partial<PositionConfig>) => {
    setDrafts((prev) => ({
      ...prev,
      [activeName]: { ...prev[activeName], ...updates },
    }));
  };

  const copyFromExisting = (title: string) => {
    const src = existing.find((p) => p.title === title);
    if (!src) return;
    updateDraft({
      commissionTiers: src.commissionTiers.map((t) => ({ ...t, id: uid() })),
      baseSalaryTiers: src.baseSalaryTiers.map((t) => ({ ...t, id: uid() })),
      genderSalaryTiers: src.genderSalaryTiers?.map((t) => ({
        ...t,
        id: uid(),
      })),
      courseCommissions: src.courseCommissions?.map((t) => ({
        ...t,
        id: uid(),
      })),
      extraNote: src.extraNote,
    });
  };

  const handleConfirm = () => {
    for (const name of missing) {
      const d = drafts[name];
      if (!d.title.trim()) {
        alert(`职位「${name}」的名称不能为空`);
        setActiveName(name);
        return;
      }
    }
    onConfirm(drafts);
  };

  const isSwimCoach = useMemo(() => {
    const t = draft?.title || '';
    return t.includes('泳教') || t.includes('游泳');
  }, [draft]);

  const activeDetail = detailMap.get(activeName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">
              发现未配置的职位
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              请为以下职位设置名称、佣金阶梯和底薪阶梯，下方显示对应人员名单
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 主体 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧列表 */}
          <aside className="w-56 border-r border-gray-100 bg-gray-50/50 overflow-y-auto shrink-0">
            <div className="px-3 py-3 text-xs font-medium text-gray-500">
              待配置职位
            </div>
            {missing.map((name) => {
              const d = drafts[name];
              const detail = detailMap.get(name);
              const count = detail?.employees.length || 0;
              const ok =
                d.title.trim() !== '' &&
                (d.commissionTiers.length > 0 ||
                  d.baseSalaryTiers.length > 0 ||
                  (d.genderSalaryTiers?.length ?? 0) > 0);
              const isActive = activeName === name;

              return (
                <button
                  key={name}
                  onClick={() => setActiveName(name)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-white text-blue-700 font-medium border-l-2 border-blue-600'
                      : 'text-gray-600 hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{d.title || name}</span>
                    {ok ? (
                      <span className="text-[10px] text-emerald-600 shrink-0">
                        ✓
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 shrink-0">
                        ⚠
                      </span>
                    )}
                  </div>
                  {count > 0 && (
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {count} 人
                    </div>
                  )}
                </button>
              );
            })}
          </aside>

          {/* 右侧编辑区 */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {!draft ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                请选择左侧的职位进行配置
              </div>
            ) : (
              <>
                {/* ⭐ 人员名单 */}
                {activeDetail && activeDetail.employees.length > 0 && (
                  <section className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                    <h4 className="text-xs font-semibold text-blue-800 flex items-center gap-1.5 mb-2">
                      <Users className="w-3.5 h-3.5" />
                      对应人员名单（{activeDetail.employees.length} 人）
                    </h4>
                    <div className="space-y-1.5">
                      {activeDetail.employees.map((e) => (
                        <div
                          key={e.staffId || e.staffName}
                          className="flex flex-wrap items-center gap-2 bg-white border border-blue-100 rounded-lg px-2.5 py-1.5 text-xs"
                        >
                          <User className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="font-medium text-gray-800">
                            {e.staffName || '—'}
                          </span>
                          {e.staffPhone && (
                            <span className="text-gray-400">
                              {e.staffPhone}
                            </span>
                          )}
                          <span className="ml-auto flex items-center gap-2 text-[10px]">
                            <span className="text-gray-500">
                              销售：
                              <span className="text-gray-700 tabular-nums">
                                ¥{e.salesAmount.toLocaleString()}
                              </span>
                            </span>
                            <span className="text-gray-500">
                              消课：
                              <span className="text-gray-700 tabular-nums">
                                {e.classCount}节
                              </span>
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 职位名称 */}
                <section>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    职位名称
                  </label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => updateDraft({ title: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {existing.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        快速复制：
                      </span>
                      <select
                        onChange={(e) => {
                          if (e.target.value)
                            copyFromExisting(e.target.value);
                          e.target.value = '';
                        }}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">选择已有职位…</option>
                        {existing.map((p) => (
                          <option key={p.id} value={p.title}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </section>

                {/* 佣金阶梯 */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">
                      佣金阶梯
                    </h4>
                    <button
                      onClick={() =>
                        updateDraft({
                          commissionTiers: [
                            ...draft.commissionTiers,
                            { id: uid(), threshold: 0, rate: 0 },
                          ],
                        })
                      }
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> 添加
                    </button>
                  </div>

                  {draft.commissionTiers.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">
                      暂无佣金阶梯
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {draft.commissionTiers.map((t) => (
                        <CommissionTierRow
                          key={t.id}
                          tier={t}
                          onChange={(u) =>
                            updateDraft({
                              commissionTiers: draft.commissionTiers.map(
                                (x) => (x.id === t.id ? { ...x, ...u } : x)
                              ),
                            })
                          }
                          onRemove={() =>
                            updateDraft({
                              commissionTiers: draft.commissionTiers.filter(
                                (x) => x.id !== t.id
                              ),
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* 底薪阶梯 */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">
                      底薪阶梯
                    </h4>
                    <button
                      onClick={() =>
                        updateDraft({
                          baseSalaryTiers: [
                            ...draft.baseSalaryTiers,
                            { id: uid(), threshold: 0, amount: 0 },
                          ],
                        })
                      }
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> 添加
                    </button>
                  </div>

                  {draft.baseSalaryTiers.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">
                      暂无底薪阶梯
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {draft.baseSalaryTiers.map((t) => (
                        <BaseSalaryTierRow
                          key={t.id}
                          tier={t}
                          onChange={(u) =>
                            updateDraft({
                              baseSalaryTiers: draft.baseSalaryTiers.map(
                                (x) => (x.id === t.id ? { ...x, ...u } : x)
                              ),
                            })
                          }
                          onRemove={() =>
                            updateDraft({
                              baseSalaryTiers:
                                draft.baseSalaryTiers.filter(
                                  (x) => x.id !== t.id
                                ),
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* 泳教性别底薪 */}
                {isSwimCoach && (
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">
                        性别底薪（泳教专用）
                      </h4>
                      <button
                        onClick={() =>
                          updateDraft({
                            genderSalaryTiers: [
                              ...(draft.genderSalaryTiers || []),
                              {
                                id: uid(),
                                threshold: 0,
                                male: 0,
                                female: 0,
                                newbie: 0,
                              },
                            ],
                          })
                        }
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> 添加
                      </button>
                    </div>

                    {!draft.genderSalaryTiers?.length ? (
                      <p className="text-xs text-gray-400 italic py-2">
                        暂无性别底薪阶梯
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {draft.genderSalaryTiers.map((t) => (
                          <GenderTierRow
                            key={t.id}
                            tier={t}
                            onChange={(u) =>
                              updateDraft({
                                genderSalaryTiers:
                                  draft.genderSalaryTiers!.map((x) =>
                                    x.id === t.id ? { ...x, ...u } : x
                                  ),
                              })
                            }
                            onRemove={() =>
                              updateDraft({
                                genderSalaryTiers:
                                  draft.genderSalaryTiers!.filter(
                                    (x) => x.id !== t.id
                                  ),
                              })
                            }
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* 备注 */}
                <section>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    备注
                  </label>
                  <input
                    type="text"
                    value={draft.extraNote || ''}
                    onChange={(e) =>
                      updateDraft({ extraNote: e.target.value })
                    }
                    placeholder="如：经理职位、上一休一…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </section>
              </>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <span className="text-xs text-gray-500">
            共 {missing.length} 个待配置职位
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition active:scale-[0.97]"
            >
              <Check className="w-4 h-4" />
              保存并重新计算
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
 * 子组件
 * ============================================================ */
const CommissionTierRow: React.FC<{
  tier: CommissionTier;
  onChange: (u: Partial<CommissionTier>) => void;
  onRemove: () => void;
}> = ({ tier, onChange, onRemove }) => (
  <div className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
    <span className="text-[11px] text-gray-500">业绩≥</span>
    <input
      type="number"
      value={tier.threshold}
      onChange={(e) => onChange({ threshold: parseInt(e.target.value) || 0 })}
      className="w-20 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
    <span className="text-[11px] text-gray-500">销提</span>
    <input
      type="number"
      step="0.1"
      value={(tier.rate * 100).toFixed(1)}
      onChange={(e) =>
        onChange({ rate: (parseFloat(e.target.value) || 0) / 100 })
      }
      className="w-14 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
    <span className="text-[11px] text-gray-500">%</span>
    <span className="text-[11px] text-gray-500 ml-2">课提</span>
    <input
      type="number"
      step="0.1"
      value={((tier.classRate ?? 0) * 100).toFixed(1)}
      onChange={(e) =>
        onChange({ classRate: (parseFloat(e.target.value) || 0) / 100 })
      }
      className="w-14 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
    <span className="text-[11px] text-gray-500">%</span>
    <input
      type="text"
      value={tier.note || ''}
      onChange={(e) => onChange({ note: e.target.value })}
      placeholder="备注"
      className="flex-1 min-w-[80px] text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
    <button
      onClick={onRemove}
      className="p-1 text-red-400 hover:text-red-600"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);

const BaseSalaryTierRow: React.FC<{
  tier: BaseSalaryTier;
  onChange: (u: Partial<BaseSalaryTier>) => void;
  onRemove: () => void;
}> = ({ tier, onChange, onRemove }) => (
  <div className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
    <span className="text-[11px] text-gray-500">业绩≥</span>
    <input
      type="number"
      value={tier.threshold}
      onChange={(e) => onChange({ threshold: parseInt(e.target.value) || 0 })}
      className="w-20 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
    <span className="text-[11px] text-gray-500">底薪</span>
    <input
      type="number"
      value={tier.amount}
      onChange={(e) => onChange({ amount: parseInt(e.target.value) || 0 })}
      className="w-24 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
    <input
      type="text"
      value={tier.note || ''}
      onChange={(e) => onChange({ note: e.target.value })}
      placeholder="备注"
      className="flex-1 min-w-[80px] text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
    <button
      onClick={onRemove}
      className="p-1 text-red-400 hover:text-red-600"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);

const GenderTierRow: React.FC<{
  tier: GenderSalaryTier;
  onChange: (u: Partial<GenderSalaryTier>) => void;
  onRemove: () => void;
}> = ({ tier, onChange, onRemove }) => (
  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
    <input
      type="number"
      value={tier.threshold}
      onChange={(e) => onChange({ threshold: parseInt(e.target.value) || 0 })}
      placeholder="业绩"
      className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
    <div className="flex items-center gap-1">
      <User className="w-3 h-3 text-blue-500 shrink-0" />
      <input
        type="number"
        value={tier.male}
        onChange={(e) => onChange({ male: parseInt(e.target.value) || 0 })}
        placeholder="男"
        className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
    <div className="flex items-center gap-1">
      <UserRound className="w-3 h-3 text-pink-500 shrink-0" />
      <input
        type="number"
        value={tier.female}
        onChange={(e) => onChange({ female: parseInt(e.target.value) || 0 })}
        placeholder="女"
        className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
    <div className="flex items-center gap-1">
      <Sparkles className="w-3 h-3 text-violet-500 shrink-0" />
      <input
        type="number"
        value={tier.newbie}
        onChange={(e) => onChange({ newbie: parseInt(e.target.value) || 0 })}
        placeholder="新人"
        className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
    <input
      type="text"
      value={tier.note || ''}
      onChange={(e) => onChange({ note: e.target.value })}
      placeholder="备注"
      className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
    <button
      onClick={onRemove}
      className="justify-self-end p-1 text-red-400 hover:text-red-600"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);

function makeEmptyPosition(title: string): PositionConfig {
  return {
    id: `virtual_${title}_${Date.now()}`,
    title,
    category: 'membership',
    headcount: 0,
    performanceTarget: 0,
    performanceSource: 'self',
    totalBaseSalary: 0,
    commissionTiers: [],
    baseSalaryTiers: [],
    genderSalaryTiers: undefined,
    extraNote: '',
    courseCommissions: [],
  };
}

export default MissingPositionConfigDialog;