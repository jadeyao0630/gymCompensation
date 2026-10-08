import React from 'react';
import { Gift, Plus, Trash2, X, Check } from 'lucide-react';
import type {
  RewardDefinition,
  RewardMode,
  RewardConditionType,
} from '../../types/compensation';

interface Props {
  open: boolean;
  catalog: RewardDefinition[];
  onAdd: () => RewardDefinition;
  onUpdate: (id: string, patch: Partial<RewardDefinition>) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

/* ⭐ 删掉 "自定义（不自动命中）"，因为它在 rewards.ts 里永远 return false */
const CONDITION_OPTIONS: { value: RewardConditionType; label: string }[] = [
  { value: 'fullAttendance', label: '全勤' },
  { value: 'performance', label: '业绩达标' },
  { value: 'salesAmount', label: '销售金额达标' },
  { value: 'classCount', label: '消课节数达标' },
];

export const RewardsCatalogDialog: React.FC<Props> = ({
  open,
  catalog,
  onAdd,
  onUpdate,
  onRemove,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">奖罚库</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              跨月共享；可在职位 / 部门 / 临时奖罚金中引用
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {catalog.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-10">
              暂无条目，点击下方「新增奖罚」创建
            </div>
          ) : (
            catalog.map((r) => {
              const isDeduction = r.type === 'deduction';
              const isCondition = r.mode === 'condition';

              return (
                <div
                  key={r.id}
                  className={`border rounded-xl p-3 transition ${
                    isDeduction
                      ? 'border-rose-100 bg-rose-50/30 hover:border-rose-200'
                      : 'border-gray-100 hover:border-amber-200 hover:bg-amber-50/30'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* 类型 */}
                    <select
                      value={r.type ?? 'reward'}
                      onChange={(e) => {
                        const nextType = e.target.value as
                          | 'reward'
                          | 'deduction';
                        /* ⭐ 切到扣款时，如果原来是条件触发，建议改成手动 */
                        const patch: Partial<RewardDefinition> = {
                          type: nextType,
                        };
                        if (
                          nextType === 'deduction' &&
                          r.mode === 'condition'
                        ) {
                          patch.mode = 'manual';
                          patch.conditionType = undefined;
                          patch.conditionValue = undefined;
                        }
                        onUpdate(r.id, patch);
                      }}
                      className={`border rounded-lg px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 ${
                        isDeduction
                          ? 'border-rose-300 text-rose-700 bg-rose-50 focus:ring-rose-400'
                          : 'border-amber-300 text-amber-700 bg-amber-50 focus:ring-amber-400'
                      }`}
                    >
                      <option value="reward">奖励</option>
                      <option value="deduction">扣款</option>
                    </select>

                    {/* 名称 */}
                    <input
                      value={r.name}
                      onChange={(e) => onUpdate(r.id, { name: e.target.value })}
                      placeholder="名称"
                      className={`border rounded-lg px-2 py-1.5 text-sm font-semibold w-40 focus:outline-none focus:ring-2 ${
                        isDeduction
                          ? 'border-rose-200 text-rose-700 focus:ring-rose-400'
                          : 'border-gray-200 focus:ring-amber-400'
                      }`}
                    />

                    {/* 金额 */}
                    <div
                      className={`flex items-center gap-1 border rounded-lg px-2 py-1.5 ${
                        isDeduction
                          ? 'border-rose-200 bg-rose-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <span
                        className={`text-xs font-medium ${
                          isDeduction ? 'text-rose-600' : 'text-gray-500'
                        }`}
                      >
                        {isDeduction ? '-¥' : '¥'}
                      </span>
                      <input
                        type="number"
                        value={r.amount}
                        onChange={(e) =>
                          onUpdate(r.id, {
                            amount: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-20 text-sm font-semibold bg-transparent focus:outline-none tabular-nums"
                      />
                    </div>

                    {/* 触发方式 */}
                    <select
                      value={r.mode}
                      onChange={(e) => {
                        const mode = e.target.value as RewardMode;
                        onUpdate(r.id, {
                          mode,
                          conditionType:
                            mode === 'condition' ? 'fullAttendance' : undefined,
                          conditionValue:
                            mode === 'condition'
                              ? (r.conditionValue ?? 0)
                              : undefined,
                        });
                      }}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="manual">手动添加</option>
                      <option value="condition">条件触发</option>
                    </select>

                    {/* 条件 */}
                    {isCondition && (
                      <>
                        <select
                          value={r.conditionType || 'fullAttendance'}
                          onChange={(e) =>
                            onUpdate(r.id, {
                              conditionType: e.target
                                .value as RewardConditionType,
                            })
                          }
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          {CONDITION_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        {r.conditionType !== 'fullAttendance' && (
                          <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50">
                            <span className="text-xs text-gray-500">阈值</span>
                            <input
                              type="number"
                              value={r.conditionValue ?? 0}
                              onChange={(e) =>
                                onUpdate(r.id, {
                                  conditionValue:
                                    parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-24 text-sm font-semibold bg-transparent focus:outline-none tabular-nums"
                            />
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex-1" />

                    <button
                      onClick={() => onRemove(r.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 提示 */}
                  {isCondition && isDeduction && (
                    <p className="mt-2 text-[11px] text-rose-600">
                      ⚠️ 扣款用「条件触发」不常见；如需手动添加，请把触发方式改成「手动添加」。
                    </p>
                  )}

                  {/* 备注 */}
                  <input
                    value={r.note ?? ''}
                    onChange={(e) => onUpdate(r.id, { note: e.target.value })}
                    placeholder="备注（可选）"
                    className="mt-2 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              );
            })
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/60">
          <button
            onClick={() => onAdd()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
          >
            <Plus className="w-4 h-4" /> 新增奖金 / 扣款
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition active:scale-[0.97]"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardsCatalogDialog;