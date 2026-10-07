import { useCallback } from 'react';
import type {
  PayrollResult,
  Department,
  ClassMemberDetail,
  EmployeePerformance,
} from '../utils/payroll';
import { calcEmployeePayroll, findPositionByTitle } from '../utils/payroll';
import type {
  MonthlyCompensationPlan,
  PositionConfig,
  RewardsCatalog,
} from '../types/compensation';
import { applyRewards } from '../utils/payroll/rewards';
import { loadRewardsCatalog } from '../utils/payrollStorage';

interface UsePayrollCalculationProps {
  storeId: string;
  currentPlan?: MonthlyCompensationPlan;
  newbieSet: Set<string>;
  performancesByStore: Record<string, any[]>;
  setResultsByStore: React.Dispatch<
    React.SetStateAction<Record<string, PayrollResult[]>>
  >;
}

/** ⭐ 用当前 result + 覆盖字段重算奖金（不重新拉接口） */
function recomputeRewardsForResult(
  r: PayrollResult,
  plan: MonthlyCompensationPlan | undefined,
  catalog: RewardsCatalog,
  overrides: {
    fullAttendance?: boolean;
    absentDays?: number;
    positionTitle?: string;
  } = {}
): PayrollResult {
  if (!plan) return r;

  const nextTitle = overrides.positionTitle ?? r.positionTitle;
  const position: PositionConfig =
    plan.positions.find((p) => p.title === nextTitle) ||
    ({
      id: `virtual_${nextTitle}`,
      title: nextTitle,
      category: 'operations',
      headcount: 0,
      performanceTarget: 0,
      performanceSource: 'self',
      totalBaseSalary: 0,
      commissionTiers: [],
      baseSalaryTiers: [],
    } as PositionConfig);

  const nextFull = overrides.fullAttendance ?? r.fullAttendance;
  const nextAbsent = overrides.absentDays ?? r.absentDays;

  const perf: EmployeePerformance = {
    staffId: r.staffId,
    staffName: r.staffName,
    staffPhone: r.staffPhone,
    positionTitle: nextTitle,
    salesAmount: r.salesAmount,
    classCount: r.classCount,
    classAmount: r.classAmount,
    fullAttendance: nextFull,
    absentDays: nextAbsent,
  };

  const { rewards, rewardsTotal } = applyRewards(
    position,
    perf,
    catalog,
    plan.staffRewards?.[r.staffId],
    plan.departmentRewards
  );

  const absentDeduction =
    !nextFull && nextAbsent > 0 && r.baseSalary > 0
      ? (r.baseSalary / 30) * nextAbsent
      : 0;

  const total = Math.max(
    0,
    r.baseSalary +
      r.salesCommission +
      r.classCommission -
      absentDeduction +
      rewardsTotal
  );

  return {
    ...r,
    positionTitle: nextTitle,
    fullAttendance: nextFull,
    absentDays: nextAbsent,
    absentDeduction,
    rewards,
    rewardsTotal,
    total,
  };
}

export function usePayrollCalculation({
  storeId,
  currentPlan,
  newbieSet,
  performancesByStore,
  setResultsByStore,
}: UsePayrollCalculationProps) {
  // 重算班级提成
  const recomputeClassCommission = useCallback(
    (
      r: PayrollResult,
      members: ClassMemberDetail[]
    ): {
      classCommission: number;
      classCommissionDetail: Record<string, number>;
    } => {
      const rates = r.courseCommissionRates || {};
      const detail: Record<string, number> = {};
      let total = 0;

      members.forEach((m) => {
        const course = m.courseName;
        const fallback = rates[course];
        const mode = m.mode ?? fallback?.mode ?? 'percent';
        const value = m.value ?? fallback?.rate ?? 0;

        const fee = mode === 'percent' ? m.amount * value : m.signNum * value;
        total += fee;
        detail[course] = (detail[course] ?? 0) + fee;
      });

      return { classCommission: total, classCommissionDetail: detail };
    },
    []
  );

  // 更新单个成员的提成配置
  const handleUpdateMemberCommission = useCallback(
    (
      staffId: string,
      memberIndex: number,
      patch: { mode?: 'percent' | 'fixed'; value?: number }
    ) => {
      setResultsByStore((prev) => {
        const list = prev[storeId] || [];
        const next = list.map((r) => {
          if (r.staffId !== staffId) return r;

          const nextMembers = [...(r.classMemberDetail || [])];
          const target = nextMembers[memberIndex];
          if (!target) return r;

          nextMembers[memberIndex] = { ...target, ...patch };
          const recomputed = recomputeClassCommission(r, nextMembers);

          /* 消课金额变化可能触发 classCount 类奖，重算奖金 */
          const base: PayrollResult = {
            ...r,
            classMemberDetail: nextMembers,
            classCommission: recomputed.classCommission,
            classCommissionDetail: recomputed.classCommissionDetail,
          };
          const catalog = loadRewardsCatalog();
          return recomputeRewardsForResult(base, currentPlan, catalog);
        });
        return { ...prev, [storeId]: next };
      });
    },
    [storeId, setResultsByStore, recomputeClassCommission, currentPlan]
  );

  // ⭐ 更新出勤扣款 + 重算奖金
  const updateAttendance = useCallback(
    (
      staffId: string,
      updates: { fullAttendance: boolean; absentDays: number }
    ) => {
      setResultsByStore((prev) => {
        const list = prev[storeId] || [];
        const catalog = loadRewardsCatalog();
        const next = list.map((r) => {
          if (r.staffId !== staffId) return r;

          /* 1) 先更新考勤与缺勤扣款 */
          const absentDeduction =
            !updates.fullAttendance &&
            updates.absentDays > 0 &&
            r.baseSalary > 0
              ? (r.baseSalary / 30) * updates.absentDays
              : 0;

          const withAttendance: PayrollResult = {
            ...r,
            fullAttendance: updates.fullAttendance,
            absentDays: updates.absentDays,
            absentDeduction,
          };

          /* 2) 用新的考勤状态重算奖金（含全勤类自动命中） */
          return recomputeRewardsForResult(
            withAttendance,
            currentPlan,
            catalog
          );
        });
        return { ...prev, [storeId]: next };
      });
    },
    [storeId, setResultsByStore, currentPlan]
  );

  // 切换新人状态并重算
  const toggleNewbie = useCallback(
    (
      staffId: string,
      onToggle: (staffId: string, willBeNewbie: boolean) => void
    ) => {
      const willBeNewbie = !newbieSet.has(staffId);
      onToggle(staffId, willBeNewbie);

      const perfs = performancesByStore[storeId] || [];
      const perf = perfs.find((p) => p.staffId === staffId);

      if (perf && currentPlan) {
        const position = findPositionByTitle(
          currentPlan.positions,
          perf.positionTitle
        );
        if (position) {
          const catalog = loadRewardsCatalog();
          const staffRewards = currentPlan.staffRewards?.[staffId];
          const newResult = calcEmployeePayroll(
            position,
            perf,
            willBeNewbie,
            {
              rewardsCatalog: catalog,
              staffRewards,
              departmentRewards: currentPlan.departmentRewards,
            }
          );
          setResultsByStore((rPrev) => {
            const list = rPrev[storeId] || [];
            const nextList = list.map((r) =>
              r.staffId === staffId ? newResult : r
            );
            return { ...rPrev, [storeId]: nextList };
          });
        }
      }
    },
    [
      storeId,
      currentPlan,
      newbieSet,
      performancesByStore,
      setResultsByStore,
    ]
  );

  // 保存职位并重算
  const handleSavePosition = useCallback(
    (
      staffId: string,
      newTitle: string,
      overrides: Record<string, string>,
      setOverridesByStore: React.Dispatch<
        React.SetStateAction<Record<string, Record<string, string>>>
      >
    ) => {
      const nextOverrides = { ...overrides, [staffId]: newTitle };
      setOverridesByStore((prev) => {
        const next = { ...prev, [storeId]: nextOverrides };
        localStorage.setItem(
          'gym_position_overrides_v1',
          JSON.stringify(next)
        );
        return next;
      });

      const perfs = performancesByStore[storeId] || [];
      const perf = perfs.find((p) => p.staffId === staffId);
      if (!perf || !currentPlan) return;

      const position = findPositionByTitle(currentPlan.positions, newTitle);
      const effectivePosition: PositionConfig = position || {
        id: `virtual_${newTitle}`,
        title: newTitle,
        category: 'operations',
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

      const nextPerf: EmployeePerformance = {
        ...perf,
        positionTitle: newTitle,
      };
      if (newTitle === '运营主管') {
        const storePerf = perfs.find(
          (p) =>
            p.positionTitle === '店长' ||
            p.positionTitle.includes('门店经理')
        );
        nextPerf.managerSalesBase = storePerf?.salesAmount ?? 0;
      }

      const catalog = loadRewardsCatalog();
      const staffRewards = currentPlan.staffRewards?.[staffId];
      const newResult = calcEmployeePayroll(
        effectivePosition,
        nextPerf,
        newbieSet.has(staffId),
        {
          rewardsCatalog: catalog,
          staffRewards,
          departmentRewards: currentPlan.departmentRewards,
        }
      );

      setResultsByStore((prev) => {
        const list = prev[storeId] || [];
        const next = list.map((r) =>
          r.staffId === staffId ? newResult : r
        );
        return { ...prev, [storeId]: next };
      });
    },
    [
      storeId,
      currentPlan,
      newbieSet,
      performancesByStore,
      setResultsByStore,
    ]
  );

  return {
    updateAttendance,
    handleUpdateMemberCommission,
    toggleNewbie,
    handleSavePosition,
  };
}