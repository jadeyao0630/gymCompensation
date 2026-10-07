import React, { memo, useState } from 'react';
import { Percent, Hash } from 'lucide-react';
import type { PayrollResult } from '../../../utils/payroll';
import { usePayrollActions } from './PayrollActionsContext';

interface Props {
  result: PayrollResult;
  colSpan: number;
}

interface RowWithIdx {
  courseName: string;
  memberName: string;
  signNum: number;
  price: number;
  amount: number;
  mode?: 'percent' | 'fixed';
  value?: number;
  _globalIdx: number;
}

const ClassMemberDetailRowBase: React.FC<Props> = ({ result, colSpan }) => {
  /* ⭐ 从 Context 取回调，不再依赖 props 传递 */
  const { updateMemberCommission } = usePayrollActions();

  const details = result.classMemberDetail || [];
  const rates = result.courseCommissionRates || {};

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState<'percent' | 'fixed'>('percent');
  const [draftValue, setDraftValue] = useState<string>('');

  if (details.length === 0) {
    return (
      <tr className="bg-slate-50/60">
        <td colSpan={colSpan} className="px-4 py-3">
          <div className="ml-8 text-xs text-gray-400">该员工本月无消课记录</div>
        </td>
      </tr>
    );
  }

  /* 按课程分组 */
  const grouped: Record<string, RowWithIdx[]> = {};
  details.forEach((d, globalIdx) => {
    const row: RowWithIdx = {
      courseName: d.courseName,
      memberName: d.memberName,
      signNum: d.signNum,
      price: d.price,
      amount: d.amount,
      mode: d.mode,
      value: d.value,
      _globalIdx: globalIdx,
    };
    if (!grouped[d.courseName]) grouped[d.courseName] = [];
    grouped[d.courseName].push(row);
  });

  const courseStats = Object.entries(grouped).map(([course, list]) => {
    const count = list.reduce((s, d) => s + d.signNum, 0);
    const amount = list.reduce((s, d) => s + d.amount, 0);
    const classCommissionAmount = result.classCommissionDetail?.[course] ?? 0;
    return { course, list, count, amount, classCommissionAmount };
  });

  const grandCount = details.reduce((s, d) => s + d.signNum, 0);
  const grandAmount = details.reduce((s, d) => s + d.amount, 0);
  const grandClassCommission = courseStats.reduce(
    (s, c) => s + c.classCommissionAmount,
    0
  );

  const fmtRate = (r?: { rate: number; mode: 'percent' | 'fixed' }) => {
    if (!r) return '—';
    if (r.mode === 'percent') return `${(r.rate * 100).toFixed(2)}%`;
    return `¥${r.rate.toFixed(2)}/节`;
  };

  const makeKey = (course: string, idx: number) => `${course}#${idx}`;

  const startEdit = (row: RowWithIdx, fallback: any) => {
    const key = makeKey(row.courseName, row._globalIdx);
    setEditingKey(key);
    const mode = row.mode ?? fallback?.mode ?? 'percent';
    const val = row.value ?? fallback?.rate ?? 0;
    setDraftMode(mode);
    setDraftValue(
      mode === 'percent' ? (val * 100).toFixed(2) : val.toFixed(2)
    );
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraftValue('');
  };

  const saveEdit = (row: RowWithIdx) => {
    const num = parseFloat(draftValue) || 0;
    const finalValue = draftMode === 'percent' ? num / 100 : num;

    updateMemberCommission(result.staffId, row._globalIdx, {
      mode: draftMode,
      value: finalValue,
    });

    setEditingKey(null);
    setDraftValue('');
  };

  /* ⭐ 新增：恢复为课程默认费率（清除该条自定义设置） */
  const resetToDefault = (row: RowWithIdx) => {
    updateMemberCommission(result.staffId, row._globalIdx, {
      mode: undefined,
      value: undefined,
    });
    if (editingKey === makeKey(row.courseName, row._globalIdx)) {
      setEditingKey(null);
      setDraftValue('');
    }
  };

  return (
    <tr className="bg-slate-50/60">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="ml-8 border-l-2 border-purple-200 pl-4">
          <div className="text-xs font-semibold text-purple-700 mb-2">
            消课明细（{courseStats.length} 门课程 · 共 {grandCount} 节 · ¥
            {grandAmount.toFixed(2)} · 课提合计 ¥
            {grandClassCommission.toFixed(2)}）
          </div>

          <div className="space-y-3">
            {courseStats.map(
              ({ course, list, count, amount, classCommissionAmount }) => {
                const fallbackRate = rates[course];
                return (
                  <div
                    key={course}
                    className="bg-white rounded-lg border border-gray-100 overflow-hidden"
                  >
                    <div className="px-3 py-2 bg-purple-50/60 border-b border-purple-100 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-purple-900">
                          {course}
                        </span>
                        {fallbackRate && (
                          <span className="text-[10px] text-purple-700 bg-purple-100/80 border border-purple-200 px-1.5 py-0.5 rounded">
                            默认 {fmtRate(fallbackRate)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-purple-600 flex-wrap">
                        <span>
                          {list.length} 位会员 · 共 {count} 节 · 消课 ¥
                          {amount.toFixed(2)}
                        </span>
                        <span className="text-violet-700 font-medium">
                          课提 ¥{classCommissionAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-100">
                            <th className="px-3 py-1.5 text-left font-medium">
                              会员姓名
                            </th>
                            <th className="px-3 py-1.5 text-right font-medium">
                              节数
                            </th>
                            <th className="px-3 py-1.5 text-right font-medium">
                              单价
                            </th>
                            <th className="px-3 py-1.5 text-right font-medium">
                              金额
                            </th>
                            <th className="px-3 py-1.5 text-right font-medium">
                              课提方式
                            </th>
                            <th className="px-3 py-1.5 text-right font-medium">
                              课提金额
                            </th>
                            <th className="px-3 py-1.5 text-center font-medium w-32">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {list.map((row) => {
                            const rowKey = makeKey(
                              row.courseName,
                              row._globalIdx
                            );
                            const custom =
                              row.mode != null && row.value != null;
                            const mode =
                              row.mode ?? fallbackRate?.mode ?? 'percent';
                            const value =
                              row.value ?? fallbackRate?.rate ?? 0;
                            const fee =
                              mode === 'percent'
                                ? row.amount * value
                                : row.signNum * value;
                            const isEditing = editingKey === rowKey;

                            return (
                              <tr key={rowKey} className="hover:bg-gray-50/50">
                                <td className="px-3 py-1.5 text-gray-700">
                                  {row.memberName || '—'}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">
                                  {row.signNum}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">
                                  ¥{row.price.toFixed(2)}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums font-medium text-gray-800">
                                  ¥{row.amount.toFixed(2)}
                                </td>

                                <td className="px-3 py-1.5 text-right tabular-nums">
                                  {isEditing ? (
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setDraftMode('percent')}
                                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                          draftMode === 'percent'
                                            ? 'bg-purple-600 text-white border-purple-600'
                                            : 'bg-white text-purple-600 border-purple-200'
                                        }`}
                                        title="按比例"
                                      >
                                        <Percent className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDraftMode('fixed')}
                                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                          draftMode === 'fixed'
                                            ? 'bg-purple-600 text-white border-purple-600'
                                            : 'bg-white text-purple-600 border-purple-200'
                                        }`}
                                        title="按固定金额"
                                      >
                                        <Hash className="w-3 h-3" />
                                      </button>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={draftValue}
                                        onChange={(e) =>
                                          setDraftValue(e.target.value)
                                        }
                                        className="w-16 border border-purple-200 rounded px-1 py-0.5 text-[11px] text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-purple-400"
                                        autoFocus
                                      />
                                      <span className="text-[10px] text-gray-500">
                                        {draftMode === 'percent'
                                          ? '%'
                                          : '元/节'}
                                      </span>
                                    </div>
                                  ) : (
                                    <span
                                      className={
                                        custom
                                          ? 'text-purple-700 font-medium'
                                          : 'text-gray-500'
                                      }
                                    >
                                      {mode === 'percent'
                                        ? `${(value * 100).toFixed(2)}%`
                                        : `¥${value.toFixed(2)}/节`}
                                      {custom && (
                                        <span className="text-[9px] ml-1 text-purple-400">
                                          (自定义)
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </td>

                                <td className="px-3 py-1.5 text-right tabular-nums font-medium text-violet-700">
                                  ¥{fee.toFixed(2)}
                                </td>

                                <td className="px-3 py-1.5 text-center">
                                  {isEditing ? (
                                    /* ⭐ 编辑态：保存 / 取消 / 返回初始（纯文字，无图标） */
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => saveEdit(row)}
                                        className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-medium hover:bg-emerald-700"
                                      >
                                        保存
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium hover:bg-gray-200"
                                      >
                                        取消
                                      </button>
                                      {custom && (
                                        <button
                                          type="button"
                                          onClick={() => resetToDefault(row)}
                                          className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium hover:bg-amber-100"
                                          title={`恢复为课程默认 ${fmtRate(
                                            fallbackRate
                                          )}`}
                                        >
                                          返回初始
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    /* ⭐ 非编辑态：编辑 / 返回初始（纯文字，无图标） */
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          startEdit(row, fallbackRate)
                                        }
                                        className="text-[10px] px-2 py-0.5 rounded border border-purple-200 text-purple-600 hover:bg-purple-50"
                                      >
                                        编辑
                                      </button>
                                      {custom && (
                                        <button
                                          type="button"
                                          onClick={() => resetToDefault(row)}
                                          className="text-[10px] px-2 py-0.5 rounded border border-amber-200 text-amber-700 hover:bg-amber-50"
                                          title={`恢复为课程默认 ${fmtRate(
                                            fallbackRate
                                          )}`}
                                        >
                                          返回初始
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-gray-50/60 font-medium text-gray-700">
                          <tr className="border-t border-gray-100">
                            <td className="px-3 py-1.5" colSpan={3}>
                              小计
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {count}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              ¥{amount.toFixed(2)}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-violet-700">
                              ¥{classCommissionAmount.toFixed(2)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

const ClassMemberDetailRow = memo(ClassMemberDetailRowBase);

export default ClassMemberDetailRow;