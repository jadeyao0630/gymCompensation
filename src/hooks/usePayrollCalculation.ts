import { useCallback, useRef } from 'react';
import type {
  PayrollResult,
  Department,
  ClassMemberDetail,
  SalesMemberDetail,
  EmployeePerformance,
} from '../types/payroll';
import { calcEmployeePayroll, findPositionByTitle } from '../utils/payroll';
import type {
  MonthlyCompensationPlan,
  PositionConfig,
  RewardsCatalog,
  TempReward,
} from '../types/compensation';
import { applyRewards } from '../utils/payroll/rewards';
import { loadRewardsCatalog } from '../utils/payrollStorage';
import {
  fetchSalesDetail,
  fetchClassDetail,
  saveSalesDetail,
  saveClassDetail,
} from '../api/payrollDetail';

interface UsePayrollCalculationProps {
  storeId: string;
  selectedMonth?: string;
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

  const sid = String(r.staffId ?? '').trim();
  const tempRewardsForStaff: TempReward[] = plan.tempRewards?.[sid] || [];

  const { rewards, rewardsTotal } = applyRewards(
    position,
    perf,
    catalog,
    plan.departmentRewards,
    tempRewardsForStaff
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

/** ⭐ 按销售明细逐笔计算销提 */
function recomputeSalesCommission(
  r: PayrollResult,
  details: SalesMemberDetail[]
): { salesCommission: number; resolved: SalesMemberDetail[] } {
  const defaultMode = 'percent' as const;
  const defaultRate = r.hitCommissionRate ?? 0;
  let total = 0;
  const resolved = details.map((d) => {
    const mode = d.mode ?? defaultMode;
    const value = d.value ?? defaultRate;
    const fee = mode === 'percent' ? d.amount * value : value;
    total += fee;
    return { ...d, mode, value };
  });
  return { salesCommission: total, resolved };
}

export function usePayrollCalculation({
  storeId,
  selectedMonth,
  currentPlan,
  newbieSet,
  performancesByStore,
  setResultsByStore,
}: UsePayrollCalculationProps) {
  /* ⭐ 防抖定时器 */
  const salesSaveTimerRef = useRef<Record<string, number>>({});
  const classSaveTimerRef = useRef<Record<string, number>>({});

  const saveSalesToServer = useCallback(
    (
      staffId: string,
      orderId: string,
      mode: 'percent' | 'fixed' | null,
      value: number | null
    ) => {
      if (!selectedMonth) return;
      const key = `${storeId}_${staffId}_${orderId}`;
      if (salesSaveTimerRef.current[key]) {
        window.clearTimeout(salesSaveTimerRef.current[key]);
      }
      salesSaveTimerRef.current[key] = window.setTimeout(async () => {
        try {
          await saveSalesDetail(storeId, selectedMonth, {
            staffId,
            orderId,
            mode,
            value,
          });
        } catch (e) {
          console.warn('[saveSalesDetail] 保存失败', e);
        }
      }, 600);
    },
    [storeId, selectedMonth]
  );

  const saveClassToServer = useCallback(
    (
      staffId: string,
      courseName: string,
      memberId: string,
      mode: 'percent' | 'fixed' | null,
      value: number | null
    ) => {
      if (!selectedMonth) return;
      const key = `${storeId}_${staffId}_${courseName}_${memberId}`;
      if (classSaveTimerRef.current[key]) {
        window.clearTimeout(classSaveTimerRef.current[key]);
      }
      classSaveTimerRef.current[key] = window.setTimeout(async () => {
        try {
          await saveClassDetail(storeId, selectedMonth, {
            staffId,
            courseName,
            memberId,
            mode,
            value,
          });
        } catch (e) {
          console.warn('[saveClassDetail] 保存失败', e);
        }
      }, 600);
    },
    [storeId, selectedMonth]
  );

  /* 重算班级提成 */
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

  /* 更新单个成员的提成配置（课提） */
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

          /* ⭐ 同步保存到后台 */
          saveClassToServer(
            staffId,
            target.courseName,
            target.memberId,
            patch.mode ?? null,
            patch.value ?? null
          );

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
    [storeId, setResultsByStore, recomputeClassCommission, currentPlan, saveClassToServer]
  );

  /* ⭐ 更新单笔销售的提点方式 */
  const handleUpdateSalesCommission = useCallback(
    (
      staffId: string,
      orderIndex: number,
      patch: { mode?: 'percent' | 'fixed'; value?: number }
    ) => {
      setResultsByStore((prev) => {
        const list = prev[storeId] || [];
        const next = list.map((r) => {
          if (r.staffId !== staffId) return r;

          const nextDetails = [...(r.salesDetail || [])];
          const target = nextDetails[orderIndex];
          if (!target) return r;

          nextDetails[orderIndex] = { ...target, ...patch };

          /* ⭐ 同步保存到后台 */
          saveSalesToServer(
            staffId,
            target.orderId,
            patch.mode ?? null,
            patch.value ?? null
          );

          const { salesCommission, resolved } = recomputeSalesCommission(
            r,
            nextDetails
          );

          const base: PayrollResult = {
            ...r,
            salesDetail: resolved,
            salesCommission,
          };
          const catalog = loadRewardsCatalog();
          return recomputeRewardsForResult(base, currentPlan, catalog);
        });
        return { ...prev, [storeId]: next };
      });
    },
    [storeId, setResultsByStore, currentPlan, saveSalesToServer]
  );

  /* ⭐ 回写销售明细（懒加载后存进 result，不存后台） */
  const handleSetSalesDetail = useCallback(
    (staffId: string, details: SalesMemberDetail[]) => {
      setResultsByStore((prev) => {
        const list = prev[storeId] || [];
        const next = list.map((r) => {
          if (r.staffId !== staffId) return r;
          const { salesCommission, resolved } = recomputeSalesCommission(
            r,
            details
          );
          return { ...r, salesDetail: resolved, salesCommission };
        });
        return { ...prev, [storeId]: next };
      });
    },
    [storeId, setResultsByStore]
  );

  /* ⭐ 从后台加载自定义明细并合并进 result
   *    重要：只有 result 已有对应明细时才重算，否则保持原值，
   *    避免重新计算后（明细为空）把 salesCommission / classCommission 清零 */
  const loadDetailsFromServer = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const [sales, classes] = await Promise.all([
        fetchSalesDetail(storeId, selectedMonth),
        fetchClassDetail(storeId, selectedMonth),
      ]);
      if (sales.length === 0 && classes.length === 0) return;

      setResultsByStore((prev) => {
        const list = prev[storeId] || [];
        const next = list.map((r) => {
          let nextR = r;

          /* ⭐ 只在 result 已有销售明细时，才匹配后台自定义并重算 */
          if (r.salesDetail && r.salesDetail.length > 0 && sales.length > 0) {
            const sd = r.salesDetail.map((d) => {
              const hit = sales.find(
                (s) => s.staffId === r.staffId && s.orderId === d.orderId
              );
              return hit
                ? {
                    ...d,
                    mode: hit.mode ?? undefined,
                    value: hit.value ?? undefined,
                  }
                : d;
            });
            const { salesCommission, resolved } = recomputeSalesCommission(r, sd);
            nextR = { ...nextR, salesDetail: resolved, salesCommission };
          }

          /* ⭐ 消课同理：只有已有明细才重算 */
          if (
            r.classMemberDetail &&
            r.classMemberDetail.length > 0 &&
            classes.length > 0
          ) {
            const cd = r.classMemberDetail.map((c) => {
              const hit = classes.find(
                (s) =>
                  s.staffId === r.staffId &&
                  s.courseName === c.courseName &&
                  s.memberId === c.memberId
              );
              return hit
                ? {
                    ...c,
                    mode: hit.mode ?? undefined,
                    value: hit.value ?? undefined,
                  }
                : c;
            });
            const rec = recomputeClassCommission(r, cd);
            nextR = {
              ...nextR,
              classMemberDetail: cd,
              classCommission: rec.classCommission,
              classCommissionDetail: rec.classCommissionDetail,
            };
          }

          return nextR;
        });
        return { ...prev, [storeId]: next };
      });
    } catch (e) {
      console.warn('[loadDetailsFromServer] 加载失败', e);
    }
  }, [storeId, selectedMonth, setResultsByStore, recomputeClassCommission]);

  /* ⭐ 更新出勤扣款 + 重算奖金 */
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

  /* 切换新人状态并重算 */
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
          const sid = String(staffId).trim();
          const tempRewardsForStaff: TempReward[] =
            currentPlan.tempRewards?.[sid] || [];

          const newResult = calcEmployeePayroll(
            position,
            perf,
            willBeNewbie,
            {
              rewardsCatalog: catalog,
              departmentRewards: currentPlan.departmentRewards,
              tempRewards: tempRewardsForStaff,
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

  /* 保存职位并重算 */
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
      const sid = String(staffId).trim();
      const tempRewardsForStaff: TempReward[] =
        currentPlan.tempRewards?.[sid] || [];

      const newResult = calcEmployeePayroll(
        effectivePosition,
        nextPerf,
        newbieSet.has(staffId),
        {
          rewardsCatalog: catalog,
          departmentRewards: currentPlan.departmentRewards,
          tempRewards: tempRewardsForStaff,
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
    handleUpdateSalesCommission,
    handleSetSalesDetail,
    loadDetailsFromServer,
    toggleNewbie,
    handleSavePosition,
  };
}