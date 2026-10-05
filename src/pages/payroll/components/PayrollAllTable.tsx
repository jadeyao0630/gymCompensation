import React, { useState } from 'react';
import {
  Download,
  Settings2,
  Sparkles,
  UserCheck,
  UserX,
  UserPlus,
} from 'lucide-react';
import type { PayrollResult } from '../../../utils/payroll';
import type { MonthlyCompensationPlan } from '../../../types/compensation';
import {
  GenderBadge,
  ManagerBadge,
  PositionBadge,
  fmtMoney,
  fmtNumber,
} from './PayrollBadges';
import { exportEmployeePayrollToExcel } from '../../../utils/exportPayroll';
import ClassMemberDetailRow from './ClassMemberDetailRow';
import SalesDetailRow from '../../../components/SalesDetailRow';

interface Props {
  results: PayrollResult[];
  excludedSet: Set<string>;
  overrides: Record<string, string>;
  plan?: MonthlyCompensationPlan;
  month: string;
  storeId: string;
  summary: {
    headcount: number;
    baseSalary: number;
    salesCommission: number;
    classCommission: number;
    total: number;
  } | null;
  hideExcluded: boolean;
  canExportPersonal: boolean;
  /** ⭐ 新人集合 */
  newbieSet: Set<string>;
  /** ⭐ 切换新人 */
  onToggleNewbie: (staffId: string) => void;
  onToggleExclude: (staffId: string) => void;
  onEditPosition: (r: PayrollResult) => void;
  onUpdateAttendance: (
    staffId: string,
    updates: { fullAttendance: boolean; absentDays: number }
  ) => void;
}

const IncludeIconButton: React.FC<{
  included: boolean;
  onToggle: () => void;
}> = ({ included, onToggle }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    title={included ? '点击排除该员工' : '点击恢复计入'}
    className={`inline-flex items-center justify-center w-7 h-7 rounded-full border transition ${
      included
        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
        : 'bg-gray-100 text-gray-400 border-gray-300 hover:bg-gray-200'
    }`}
  >
    {included ? (
      <UserCheck className="w-3.5 h-3.5" />
    ) : (
      <UserX className="w-3.5 h-3.5" />
    )}
  </button>
);

/* ⭐ 新人切换按钮 */
const NewbieIconButton: React.FC<{
  isNewbie: boolean;
  onToggle: () => void;
}> = ({ isNewbie, onToggle }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    title={isNewbie ? '点击取消新人' : '点击设为新人'}
    className={`inline-flex items-center justify-center w-7 h-7 rounded-full border transition ${
      isNewbie
        ? 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100'
        : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
    }`}
  >
    {isNewbie ? (
      <Sparkles className="w-3.5 h-3.5" />
    ) : (
      <UserPlus className="w-3.5 h-3.5" />
    )}
  </button>
);

const AttendanceCell: React.FC<{
  included: boolean;
  fullAttendance: boolean;
  absentDays: number;
  onToggle: () => void;
  onChangeDays: (days: number) => void;
}> = ({ included, fullAttendance, absentDays, onToggle, onChangeDays }) => (
  <div className="inline-flex flex-col items-center gap-1">
    <button
      disabled={!included}
      onClick={onToggle}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition disabled:cursor-not-allowed disabled:opacity-60 ${
        fullAttendance
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
      }`}
    >
      {fullAttendance ? (
        <>
          <UserCheck className="w-3 h-3" /> 全勤
        </>
      ) : (
        <>
          <UserX className="w-3 h-3" /> 缺勤
        </>
      )}
    </button>
    {!fullAttendance ? (
      <input
        type="number"
        min={0}
        value={absentDays}
        disabled={!included}
        onChange={(e) => onChangeDays(parseInt(e.target.value) || 0)}
        className="w-14 text-xs text-center border border-red-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-red-400 tabular-nums disabled:opacity-60"
      />
    ) : (
      <span className="text-xs text-gray-300">—</span>
    )}
  </div>
);

export const PayrollAllTable: React.FC<Props> = ({
  results,
  excludedSet,
  overrides,
  plan,
  month,
  storeId,
  summary,
  hideExcluded,
  canExportPersonal,
  newbieSet,
  onToggleNewbie,
  onToggleExclude,
  onEditPosition,
  onUpdateAttendance,
}) => {
  const excludedCount = results.filter((r) =>
    excludedSet.has(r.staffId)
  ).length;

  const visibleRows = hideExcluded
    ? results.filter((r) => !excludedSet.has(r.staffId))
    : results;

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const [expandedSalesKeys, setExpandedSalesKeys] = useState<Set<string>>(
    new Set()
  );
  const toggleSalesExpand = (key: string) => {
    setExpandedSalesKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* ⭐ 列数：新人列 +1 */
  const COLS = canExportPersonal ? 14 : 13;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">全部员工</h2>
        <span className="text-xs text-gray-400">
          {hideExcluded
            ? `显示 ${visibleRows.length} 人（已隐藏 ${excludedCount} 人未计入）`
            : `共 ${results.length} 人${
                excludedCount > 0
                  ? ` · 计入 ${results.length - excludedCount} 人 · 排除 ${excludedCount} 人`
                  : ''
              }`}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-3 text-center font-medium w-12">计入</th>
              <th className="px-3 py-3 text-center font-medium w-12">新人</th>
              <th className="px-4 py-3 text-left font-medium">员工</th>
              <th className="px-4 py-3 text-center font-medium">职位设置</th>
              <th className="px-4 py-3 text-center font-medium">
                考勤 / 缺勤天数
              </th>
              <th className="px-4 py-3 text-left font-medium">标签</th>
              <th className="px-4 py-3 text-right font-medium">销售金额</th>
              <th className="px-4 py-3 text-right font-medium">消课节数</th>
              <th className="px-4 py-3 text-right font-medium">消课金额</th>
              <th className="px-4 py-3 text-right font-medium">底薪</th>
              <th className="px-4 py-3 text-right font-medium">销提</th>
              <th className="px-4 py-3 text-right font-medium">课提</th>
              <th className="px-4 py-3 text-right font-medium">合计</th>
              {canExportPersonal && (
                <th className="px-4 py-3 text-center font-medium">导出</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLS}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  {hideExcluded && excludedCount > 0
                    ? '当前所有员工均被排除。点击「显示未计入」可查看。'
                    : '暂无员工数据'}
                </td>
              </tr>
            ) : (
              visibleRows.map((r) => {
                const included = !excludedSet.has(r.staffId);
                const isOverridden = !!overrides[r.staffId];
                const rowKey = r.staffId || r.staffName;
                const isExpanded = expandedKeys.has(rowKey);
                const hasDetails = (r.classMemberDetail || []).length > 0;
                const isSalesExpanded = expandedSalesKeys.has(rowKey);
                const isNewbie = newbieSet.has(r.staffId);

                const canClickClass = hasDetails;

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      className={`hover:bg-gray-50/50 ${
                        included ? '' : 'opacity-50 bg-gray-50/60'
                      }`}
                    >
                      <td className="px-3 py-3 text-center">
                        <IncludeIconButton
                          included={included}
                          onToggle={() => onToggleExclude(r.staffId)}
                        />
                      </td>

                      {/* ⭐ 新人按钮 */}
                      <td className="px-3 py-3 text-center">
                        <NewbieIconButton
                          isNewbie={isNewbie}
                          onToggle={() => onToggleNewbie(r.staffId)}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div
                          className={`font-medium ${
                            included
                              ? 'text-gray-800'
                              : 'text-gray-400 line-through'
                          }`}
                        >
                          {r.staffName || '—'}
                        </div>
                        {r.staffPhone && (
                          <div className="text-xs text-gray-400">
                            {r.staffPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditPosition(r);
                          }}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition ${
                            isOverridden
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <Settings2 className="w-3 h-3" />{' '}
                          {isOverridden ? '已改' : '职位'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <AttendanceCell
                          included={included}
                          fullAttendance={r.fullAttendance}
                          absentDays={r.absentDays}
                          onToggle={() =>
                            onUpdateAttendance(r.staffId, {
                              fullAttendance: !r.fullAttendance,
                              absentDays: r.fullAttendance ? 1 : 0,
                            })
                          }
                          onChangeDays={(days) =>
                            onUpdateAttendance(r.staffId, {
                              fullAttendance: false,
                              absentDays: days,
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <GenderBadge gender={r.gender} />
                          {r.isNewbie && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 text-violet-700 border border-violet-200">
                              <Sparkles className="w-3 h-3" /> 新人
                            </span>
                          )}
                          {r.isManager && <ManagerBadge />}
                          <PositionBadge title={r.positionTitle} />
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.salesAmount > 0 ? (
                          <button
                            onClick={() => toggleSalesExpand(rowKey)}
                            title="点击查看销售明细"
                            className={`font-medium transition hover:underline ${
                              isSalesExpanded
                                ? 'text-sky-800'
                                : 'text-sky-600 hover:text-sky-800'
                            }`}
                          >
                            {fmtMoney(r.salesAmount)}
                          </button>
                        ) : (
                          fmtMoney(r.salesAmount)
                        )}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        {canClickClass ? (
                          <button
                            onClick={() => toggleExpand(rowKey)}
                            title={
                              isExpanded
                                ? '收起消课明细'
                                : `展开消课明细（${(r.classMemberDetail || []).length} 条）`
                            }
                            className={`font-medium transition hover:underline ${
                              isExpanded
                                ? 'text-purple-800'
                                : 'text-gray-700 hover:text-purple-700'
                            }`}
                          >
                            {fmtNumber(r.classCount)}
                          </button>
                        ) : (
                          fmtNumber(r.classCount)
                        )}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        {canClickClass ? (
                          <button
                            onClick={() => toggleExpand(rowKey)}
                            title={
                              isExpanded
                                ? '收起消课明细'
                                : `展开消课明细（${(r.classMemberDetail || []).length} 条）`
                            }
                            className={`font-medium transition hover:underline ${
                              isExpanded
                                ? 'text-purple-800'
                                : 'text-gray-700 hover:text-purple-700'
                            }`}
                          >
                            {fmtMoney(r.classAmount)}
                          </button>
                        ) : (
                          fmtMoney(r.classAmount)
                        )}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        <div>{fmtMoney(r.baseSalary)}</div>
                        {r.hitCommissionRate > 0 && (
                          <div className="text-xs text-gray-400">
                            档位 {(r.hitCommissionRate * 100).toFixed(1)}%
                          </div>
                        )}
                        {!r.fullAttendance && r.absentDeduction > 0 && (
                          <div className="text-xs text-red-500">
                            -¥
                            {Math.round(r.absentDeduction).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-sky-600">
                        {fmtMoney(r.salesCommission)}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums text-violet-600">
                        {canClickClass ? (
                          <button
                            onClick={() => toggleExpand(rowKey)}
                            title={
                              isExpanded
                                ? '收起消课明细'
                                : `展开消课明细（${(r.classMemberDetail || []).length} 条）`
                            }
                            className={`font-medium transition hover:underline ${
                              isExpanded
                                ? 'text-violet-900'
                                : 'text-violet-600 hover:text-violet-800'
                            }`}
                          >
                            {fmtMoney(r.classCommission)}
                          </button>
                        ) : (
                          fmtMoney(r.classCommission)
                        )}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-700">
                        {fmtMoney(r.total)}
                      </td>

                      {canExportPersonal && (
                        <td className="px-4 py-3 text-center">
                          <button
                            disabled={!plan}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!plan) return;
                              await exportEmployeePayrollToExcel(
                                r,
                                plan,
                                month,
                                storeId
                              );
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-[11px] font-medium transition disabled:opacity-50"
                          >
                            <Download className="w-3 h-3" /> 导出
                          </button>
                        </td>
                      )}
                    </tr>

                    {isSalesExpanded && (
                      <SalesDetailRow
                        result={r}
                        storeId={storeId}
                        month={month}
                        colSpan={COLS}
                      />
                    )}

                    {isExpanded && hasDetails && (
                      <ClassMemberDetailRow result={r} colSpan={COLS} />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          <tfoot className="bg-gray-50 font-semibold text-gray-800">
            <tr>
              <td className="px-4 py-3" colSpan={9}>
                合计（计入 {summary?.headcount || 0} 人
                {excludedCount > 0 ? ` · 已排除 ${excludedCount} 人` : ''}）
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {fmtMoney(summary?.baseSalary)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-sky-700">
                {fmtMoney(summary?.salesCommission)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-violet-700">
                {fmtMoney(summary?.classCommission)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                {fmtMoney(summary?.total)}
              </td>
              {canExportPersonal && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default PayrollAllTable;