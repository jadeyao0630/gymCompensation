import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  Settings2,
  Sparkles,
  UserCheck,
  UserX,
  UserPlus,
  Gift,
  MinusCircle,
  Plus,
} from 'lucide-react';
import type { PayrollResult, Department } from '../../../utils/payroll';
import type {
  MonthlyCompensationPlan,
  RewardsCatalog,
  StaffRewardRef,
} from '../../../types/compensation';
import { getDepartmentOf, calcDepartmentStats } from '../../../utils/payroll';
import { exportEmployeePayrollToExcel } from '../../../utils/exportPayroll';
import {
  GenderBadge,
  ManagerBadge,
  PositionBadge,
  fmtMoney,
  fmtNumber,
  DEPT_STYLE,
  DEPT_FIELDS,
  DEPT_DETAIL_FIELDS,
} from './PayrollBadges';
import ClassMemberDetailRow from './ClassMemberDetailRow';
import SalesDetailRow from '../../../components/compensation/SalesDetailRow';
import QuickRewardPopover from './QuickRewardPopover';
import {
  rewardSourceLabel,
  rewardTriggerLabel,
} from '../../../utils/payroll/rewardStyle';

interface Props {
  allResults: PayrollResult[];
  excludedSet: Set<string>;
  overrides: Record<string, string>;
  plan?: MonthlyCompensationPlan;
  month: string;
  storeId: string;
  expanded: Record<Department, boolean>;
  hideExcluded: boolean;
  canExportPersonal: boolean;
  newbieSet: Set<string>;
  onToggleNewbie: (staffId: string) => void;
  onToggleDept: (d: Department) => void;
  onToggleExclude: (staffId: string) => void;
  onEditPosition: (r: PayrollResult) => void;
  onUpdateAttendance: (
    staffId: string,
    updates: { fullAttendance: boolean; absentDays: number }
  ) => void;
  rewardsCatalog?: RewardsCatalog;
  canEditRewards?: boolean;
  onSaveStaffRewards?: (staffId: string, next: StaffRewardRef[]) => void;
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

const InfoCell: React.FC<{
  label: string;
  value: string;
  sub?: string;
  emphasize?: boolean;
  textClass?: string;
}> = ({ label, value, sub, emphasize, textClass }) => (
  <div className="min-w-0">
    <div className="text-[10px] text-gray-400 truncate">{label}</div>
    <div
      className={`text-sm font-semibold tabular-nums truncate ${
        emphasize ? textClass || 'text-gray-800' : 'text-gray-700'
      }`}
    >
      {value}
    </div>
    {sub && <div className="text-[10px] text-gray-400 truncate">{sub}</div>}
  </div>
);

export const PayrollDeptList: React.FC<Props> = ({
  allResults,
  excludedSet,
  overrides,
  plan,
  month,
  storeId,
  expanded,
  hideExcluded,
  canExportPersonal,
  newbieSet,
  onToggleNewbie,
  onToggleDept,
  onToggleExclude,
  onEditPosition,
  onUpdateAttendance,
  rewardsCatalog = [],
  canEditRewards = false,
  onSaveStaffRewards,
}) => {
  const results = allResults.filter((r) => !excludedSet.has(r.staffId));
  const deptStats = calcDepartmentStats(results, plan);

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

  const [expandedRewardKeys, setExpandedRewardKeys] = useState<Set<string>>(
    new Set()
  );
  const toggleRewardExpand = (key: string) => {
    setExpandedRewardKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const [quickRewardFor, setQuickRewardFor] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {deptStats.map((d) => {
        const style = DEPT_STYLE[d.department];
        const fields = DEPT_FIELDS[d.department];
        const detailFields = DEPT_DETAIL_FIELDS[d.department];
        const isOpen = expanded[d.department];

        const deptAllResults = allResults.filter(
          (r) => getDepartmentOf(r.positionTitle) === d.department
        );
        const deptVisibleResults = hideExcluded
          ? deptAllResults.filter((r) => !excludedSet.has(r.staffId))
          : deptAllResults;
        const deptResults = results.filter(
          (r) => getDepartmentOf(r.positionTitle) === d.department
        );
        const excludedInDept = deptAllResults.length - deptResults.length;

        const configuredHeadcount = (plan?.positions || [])
          .filter((p) => getDepartmentOf(p.title) === d.department)
          .reduce((s, p) => s + (p.headcount || 0), 0);
        const isOver = d.headcount > configuredHeadcount;

        const visibleCount = [
          fields.salesAmount,
          fields.classAmount,
          true,
          fields.salesCommission,
          fields.classCommission,
          true,
        ].filter(Boolean).length;
        const gridCols =
          visibleCount >= 6
            ? 'sm:grid-cols-6'
            : visibleCount === 5
            ? 'sm:grid-cols-5'
            : visibleCount === 4
            ? 'sm:grid-cols-4'
            : visibleCount === 3
            ? 'sm:grid-cols-3'
            : 'sm:grid-cols-2';
        const showPositionBadge = d.department === '运营';

        const colCount =
          6 +
          (detailFields.salesAmount ? 1 : 0) +
          (detailFields.classAmount ? 2 : 0) +
          1 +
          (detailFields.salesCommission ? 1 : 0) +
          (detailFields.classCommission ? 1 : 0) +
          1 +
          (canExportPersonal ? 1 : 0);

        /* ⭐ 部门是否有任何奖金条目 */
        const deptHasRewards = deptResults.some(
          (r) => (r.rewards?.length ?? 0) > 0
        );

        return (
          <div
            key={d.department}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <button
              onClick={() => onToggleDept(d.department)}
              className="w-full px-4 sm:px-5 py-4 flex flex-wrap items-center gap-3 hover:bg-gray-50/60 transition text-left"
            >
              <div className="shrink-0 text-gray-400">
                {isOpen ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${style.gradient} text-white flex items-center justify-center shadow-sm`}
                >
                  {style.icon}
                </span>
                <span className="font-semibold text-gray-800">
                  {d.department}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${style.lightBg} ${style.text} border ${style.border}`}
                >
                  {d.headcount} 人
                </span>
                {isOver && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                    <AlertTriangle className="w-3 h-3" />超出{' '}
                    {d.headcount - configuredHeadcount} 人
                  </span>
                )}
              </div>
              <div
                className={`flex-1 grid grid-cols-2 ${gridCols} gap-2 sm:gap-4 text-left`}
              >
                {fields.salesAmount && (
                  <InfoCell
                    label="销售金额"
                    value={fmtMoney(d.salesAmount)}
                  />
                )}
                {fields.classAmount && (
                  <InfoCell
                    label="上课金额"
                    value={fmtMoney(d.classAmount)}
                    sub={d.classCount > 0 ? `${d.classCount} 节` : undefined}
                  />
                )}
                <InfoCell label="底薪" value={fmtMoney(d.baseSalary)} />
                {fields.salesCommission && (
                  <InfoCell
                    label="销提"
                    value={fmtMoney(d.salesCommission)}
                  />
                )}
                {fields.classCommission && (
                  <InfoCell
                    label="课提"
                    value={fmtMoney(d.classCommission)}
                  />
                )}
                {/* ⭐ 有奖金条目就显示（金额 0 也显示） */}
                {deptHasRewards && (
                  <InfoCell
                    label="奖金 / 扣款"
                    value={fmtMoney(d.rewardsTotal)}
                    emphasize
                    textClass={
                      d.rewardsTotal < 0 ? 'text-rose-700' : 'text-amber-700'
                    }
                  />
                )}
                <InfoCell
                  label="总计"
                  value={fmtMoney(d.total)}
                  emphasize
                  textClass={style.text}
                />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 bg-gray-50/40">
                {deptVisibleResults.length === 0 ? (
                  <div className="px-5 py-6 text-center text-sm text-gray-400">
                    {hideExcluded && excludedInDept > 0
                      ? `该部门 ${excludedInDept} 人全部被排除。`
                      : '该部门暂无员工数据'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-gray-500 text-xs">
                        <tr className="border-b border-gray-100">
                          <th className="px-3 py-2 text-center font-medium w-12">
                            计入
                          </th>
                          <th className="px-3 py-2 text-center font-medium w-12">
                            新人
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            员工
                          </th>
                          <th className="px-4 py-2 text-center font-medium">
                            职位设置
                          </th>
                          <th className="px-4 py-2 text-center font-medium">
                            考勤 / 缺勤天数
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            标签
                          </th>
                          {detailFields.salesAmount && (
                            <th className="px-4 py-2 text-right font-medium">
                              销售金额
                            </th>
                          )}
                          {detailFields.classAmount && (
                            <>
                              <th className="px-4 py-2 text-right font-medium">
                                消课节数
                              </th>
                              <th className="px-4 py-2 text-right font-medium">
                                消课金额
                              </th>
                            </>
                          )}
                          <th className="px-4 py-2 text-right font-medium">
                            底薪
                          </th>
                          {detailFields.salesCommission && (
                            <th className="px-4 py-2 text-right font-medium">
                              销提
                            </th>
                          )}
                          {detailFields.classCommission && (
                            <th className="px-4 py-2 text-right font-medium">
                              课提
                            </th>
                          )}
                          <th className="px-4 py-2 text-right font-medium">
                            奖金 / 扣款
                          </th>
                          <th className="px-4 py-2 text-right font-medium">
                            合计
                          </th>
                          {canExportPersonal && (
                            <th className="px-4 py-2 text-center font-medium">
                              导出
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {deptVisibleResults.map((r) => {
                          const included = !excludedSet.has(r.staffId);
                          const isOverridden = !!overrides[r.staffId];
                          const rowKey = r.staffId || r.staffName;
                          const isExpanded = expandedKeys.has(rowKey);
                          const hasDetails =
                            (r.classMemberDetail || []).length > 0;
                          const isSalesExpanded =
                            expandedSalesKeys.has(rowKey);
                          const isNewbie = newbieSet.has(r.staffId);
                          const canClickClass = hasDetails;
                          const isRewardsExpanded =
                            expandedRewardKeys.has(rowKey);
                          /* ⭐ 有奖金条目就显示（0 也显示） */
                          const hasRewards = (r.rewards?.length ?? 0) > 0;
                          const rewardsTotal = r.rewardsTotal ?? 0;
                          const isRewardsNegative = rewardsTotal < 0;
                          const isQuickOpen = quickRewardFor === r.staffId;

                          const currentStaffRewards: StaffRewardRef[] =
                            plan?.staffRewards?.[String(r.staffId)] ||
                            plan?.staffRewards?.[r.staffId] ||
                            [];

                          return (
                            <React.Fragment key={rowKey}>
                              <tr
                                className={`hover:bg-white/70 transition ${
                                  included
                                    ? ''
                                    : 'opacity-50 bg-gray-100/40'
                                }`}
                              >
                                <td className="px-3 py-2.5 text-center">
                                  <IncludeIconButton
                                    included={included}
                                    onToggle={() =>
                                      onToggleExclude(r.staffId)
                                    }
                                  />
                                </td>

                                <td className="px-3 py-2.5 text-center">
                                  <NewbieIconButton
                                    isNewbie={isNewbie}
                                    onToggle={() =>
                                      onToggleNewbie(r.staffId)
                                    }
                                  />
                                </td>

                                <td className="px-4 py-2.5">
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
                                    <div className="text-[11px] text-gray-400">
                                      {r.staffPhone}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditPosition(r);
                                    }}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition ${
                                      isOverridden
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-gray-50 text-gray-500 border-gray-200'
                                    }`}
                                  >
                                    <Settings2 className="w-3 h-3" />{' '}
                                    {isOverridden ? '已改' : '职位'}
                                  </button>
                                </td>
                                <td className="px-4 py-2.5 text-center">
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
                                <td className="px-4 py-2.5">
                                  <div className="flex flex-wrap gap-1">
                                    <GenderBadge gender={r.gender} />
                                    {r.isNewbie && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 text-violet-700 border border-violet-200">
                                        <Sparkles className="w-3 h-3" /> 新人
                                      </span>
                                    )}
                                    {r.isManager && <ManagerBadge />}
                                    {showPositionBadge && (
                                      <PositionBadge
                                        title={r.positionTitle}
                                      />
                                    )}
                                  </div>
                                </td>

                                {detailFields.salesAmount && (
                                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
                                    {r.salesAmount > 0 ? (
                                      <button
                                        onClick={() =>
                                          toggleSalesExpand(rowKey)
                                        }
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
                                )}

                                {detailFields.classAmount && (
                                  <>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
                                      {canClickClass ? (
                                        <button
                                          onClick={() =>
                                            toggleExpand(rowKey)
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

                                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
                                      {canClickClass ? (
                                        <button
                                          onClick={() =>
                                            toggleExpand(rowKey)
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
                                  </>
                                )}

                                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                                  <div>{fmtMoney(r.baseSalary)}</div>
                                  {r.hitCommissionRate > 0 && (
                                    <div className="text-[10px] text-gray-400">
                                      档位{' '}
                                      {(r.hitCommissionRate * 100).toFixed(
                                        1
                                      )}
                                      %
                                    </div>
                                  )}
                                  {!r.fullAttendance &&
                                    r.absentDeduction > 0 && (
                                      <div className="text-[10px] text-red-500">
                                        -¥
                                        {Math.round(
                                          r.absentDeduction
                                        ).toLocaleString()}
                                      </div>
                                    )}
                                </td>

                                {detailFields.salesCommission && (
                                  <td className="px-4 py-2.5 text-right tabular-nums text-sky-600">
                                    {fmtMoney(r.salesCommission)}
                                  </td>
                                )}

                                {detailFields.classCommission && (
                                  <td className="px-4 py-2.5 text-right tabular-nums text-violet-600">
                                    {canClickClass ? (
                                      <button
                                        onClick={() =>
                                          toggleExpand(rowKey)
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
                                )}

                                {/* ⭐ 奖金列：有奖金条目就显示（金额 0 也显示） */}
                                <td className="px-4 py-2.5 text-right tabular-nums relative">
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    {hasRewards ? (
                                      <button
                                        onClick={() =>
                                          toggleRewardExpand(rowKey)
                                        }
                                        title="点击查看奖金 / 扣款明细"
                                        className={`inline-flex items-center gap-1 font-medium transition hover:underline ${
                                          isRewardsNegative
                                            ? isRewardsExpanded
                                              ? 'text-rose-800'
                                              : 'text-rose-600 hover:text-rose-800'
                                            : isRewardsExpanded
                                            ? 'text-amber-800'
                                            : 'text-amber-600 hover:text-amber-800'
                                        }`}
                                      >
                                        {isRewardsNegative ? (
                                          <MinusCircle className="w-3.5 h-3.5" />
                                        ) : (
                                          <Gift className="w-3.5 h-3.5" />
                                        )}
                                        {fmtMoney(rewardsTotal)}
                                      </button>
                                    ) : (
                                      <span className="text-gray-300">—</span>
                                    )}

                                    {canEditRewards && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setQuickRewardFor(
                                            isQuickOpen ? null : r.staffId
                                          );
                                        }}
                                        title="添加/编辑个人奖金 / 扣款"
                                        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>

                                  {isQuickOpen && (
                                    <QuickRewardPopover
                                      staffId={r.staffId}
                                      staffName={r.staffName}
                                      catalog={rewardsCatalog}
                                      current={currentStaffRewards}
                                      onSave={(next: StaffRewardRef[]) => {
                                        if (onSaveStaffRewards) {
                                          onSaveStaffRewards(
                                            r.staffId,
                                            next
                                          );
                                        }
                                      }}
                                      onClose={() =>
                                        setQuickRewardFor(null)
                                      }
                                    />
                                  )}
                                </td>

                                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-700">
                                  {fmtMoney(r.total)}
                                </td>

                                {canExportPersonal && (
                                  <td className="px-4 py-2.5 text-center">
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
                                  colSpan={colCount}
                                />
                              )}

                              {isExpanded && hasDetails && (
                                <ClassMemberDetailRow
                                  result={r}
                                  colSpan={colCount}
                                />
                              )}

                              {/* 奖金明细展开 */}
                              {isRewardsExpanded && hasRewards && (
                                <tr>
                                  <td
                                    colSpan={colCount}
                                    className="px-4 py-3 bg-amber-50/40 border-t border-amber-100"
                                  >
                                    <div className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                                      <Gift className="w-3.5 h-3.5" /> 奖金 / 扣款明细
                                    </div>
                                    <div className="space-y-1">
                                      {(r.rewards || []).map((h, i) => {
                                        const isDeduction =
                                          h.amount < 0 ||
                                          h.type === 'deduction';
                                        return (
                                          <div
                                            key={i}
                                            className={`flex items-center gap-3 text-xs rounded-lg px-3 py-1.5 border ${
                                              isDeduction
                                                ? 'bg-rose-50/70 border-rose-100'
                                                : 'bg-white border-amber-100'
                                            }`}
                                          >
                                            <span
                                              className={`font-medium ${
                                                isDeduction
                                                  ? 'text-rose-900'
                                                  : 'text-gray-800'
                                              }`}
                                            >
                                              {h.name}
                                            </span>
                                            <span
                                              className={`font-semibold tabular-nums ${
                                                isDeduction
                                                  ? 'text-rose-700'
                                                  : 'text-amber-700'
                                              }`}
                                            >
                                              {isDeduction ? '-' : '+'}¥
                                              {Math.abs(
                                                Math.round(h.amount)
                                              ).toLocaleString()}
                                            </span>
                                            <span className="text-gray-400">
                                              {rewardSourceLabel(h)}
                                            </span>
                                            <span className="text-gray-400">
                                              {rewardTriggerLabel(h)}
                                            </span>
                                            {h.note && (
                                              <span className="text-gray-400">
                                                · {h.note}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-white/80 font-semibold text-gray-700 text-xs">
                        <tr className="border-t border-gray-100">
                          <td className="px-4 py-2.5" colSpan={6}>
                            合计（计入 {d.headcount} 人
                            {excludedInDept > 0
                              ? ` · 排除 ${excludedInDept} 人`
                              : ''}
                            ）
                          </td>
                          {detailFields.salesAmount && (
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {fmtMoney(d.salesAmount)}
                            </td>
                          )}
                          {detailFields.classAmount && (
                            <>
                              <td className="px-4 py-2.5 text-right tabular-nums">
                                {fmtNumber(d.classCount)}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums">
                                {fmtMoney(d.classAmount)}
                              </td>
                            </>
                          )}
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {fmtMoney(d.baseSalary)}
                          </td>
                          {detailFields.salesCommission && (
                            <td className="px-4 py-2.5 text-right tabular-nums text-sky-700">
                              {fmtMoney(d.salesCommission)}
                            </td>
                          )}
                          {detailFields.classCommission && (
                            <td className="px-4 py-2.5 text-right tabular-nums text-violet-700">
                              {fmtMoney(d.classCommission)}
                            </td>
                          )}
                          <td
                            className={`px-4 py-2.5 text-right tabular-nums ${
                              d.rewardsTotal < 0
                                ? 'text-rose-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {deptHasRewards ? fmtMoney(d.rewardsTotal) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">
                            {fmtMoney(d.total)}
                          </td>
                          {canExportPersonal && <td />}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PayrollDeptList;