import { useCallback } from 'react';
import type { PayrollResult, Department, ClassMemberDetail } from '../utils/payroll';
import { calcEmployeePayroll, findPositionByTitle } from '../utils/payroll';
import type { MonthlyCompensationPlan, PositionConfig } from '../types/compensation';

interface UsePayrollCalculationProps {
  storeId: string;
  currentPlan?: MonthlyCompensationPlan;
  newbieSet: Set<string>;
  performancesByStore: Record<string, any[]>;
  setResultsByStore: React.Dispatch<React.SetStateAction<Record<string, PayrollResult[]>>>;
}

export function usePayrollCalculation({
  storeId,
  currentPlan,
  newbieSet,
  performancesByStore,
  setResultsByStore,
}: UsePayrollCalculationProps) {

  // 重算班级提成
  const recomputeClassCommission = useCallback((
    r: PayrollResult,
    members: ClassMemberDetail[]
  ): { classCommission: number; classCommissionDetail: Record<string, number> } => {
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
  }, []);

  // 更新单个成员的提成配置
  const handleUpdateMemberCommission = useCallback((
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

        return {
          ...r,
          classMemberDetail: nextMembers,
          classCommission: recomputed.classCommission,
          classCommissionDetail: recomputed.classCommissionDetail,
          total: Math.max(0, r.baseSalary + r.salesCommission + recomputed.classCommission - r.absentDeduction),
        };
      });
      return { ...prev, [storeId]: next };
    });
  }, [storeId, setResultsByStore, recomputeClassCommission]);

  // 更新出勤扣款
  const updateAttendance = useCallback((
    staffId: string,
    updates: { fullAttendance: boolean; absentDays: number }
  ) => {
    setResultsByStore((prev) => {
      const list = prev[storeId] || [];
      const next = list.map((r) => {
        if (r.staffId !== staffId) return r;
        const absentDeduction =
          !updates.fullAttendance && updates.absentDays > 0 && r.baseSalary > 0
            ? (r.baseSalary / 30) * updates.absentDays
            : 0;
        return {
          ...r,
          fullAttendance: updates.fullAttendance,
          absentDays: updates.absentDays,
          absentDeduction,
          total: Math.max(0, r.baseSalary + r.salesCommission + r.classCommission - absentDeduction),
        };
      });
      return { ...prev, [storeId]: next };
    });
  }, [storeId, setResultsByStore]);

  // 切换新人状态并重算
  const toggleNewbie = useCallback((
    staffId: string,
    onToggle: (staffId: string, willBeNewbie: boolean) => void
  ) => {
    // 注意：这里的状态更新逻辑依赖于外部的 setNewbieByStore，为了保持 hook 简洁，通过回调暴露出去
    // 在 PayrollPage 中处理 newbieSet 的更新，这里只负责重算
    const willBeNewbie = !newbieSet.has(staffId);
    onToggle(staffId, willBeNewbie);

    const perfs = performancesByStore[storeId] || [];
    const perf = perfs.find((p) => p.staffId === staffId);
    
    if (perf && currentPlan) {
      const position = findPositionByTitle(currentPlan.positions, perf.positionTitle);
      if (position) {
        const newResult = calcEmployeePayroll(position, perf, willBeNewbie);
        setResultsByStore((rPrev) => {
          const list = rPrev[storeId] || [];
          const nextList = list.map((r) => r.staffId === staffId ? newResult : r);
          return { ...rPrev, [storeId]: nextList };
        });
      }
    }
  }, [storeId, currentPlan, newbieSet, performancesByStore, setResultsByStore]);

  // 保存职位并重算
  const handleSavePosition = useCallback((
    staffId: string,
    newTitle: string,
    overrides: Record<string, string>,
    setOverridesByStore: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>
  ) => {
    const nextOverrides = { ...overrides, [staffId]: newTitle };
    setOverridesByStore((prev) => {
      const next = { ...prev, [storeId]: nextOverrides };
      localStorage.setItem('gym_position_overrides_v1', JSON.stringify(next));
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

    const nextPerf = { ...perf, positionTitle: newTitle };
    if (newTitle === '运营主管') {
      const storePerf = perfs.find((p) => p.positionTitle === '店长' || p.positionTitle.includes('门店经理'));
      nextPerf.managerSalesBase = storePerf?.salesAmount ?? 0;
    }

    const newResult = calcEmployeePayroll(effectivePosition, nextPerf, newbieSet.has(staffId));
    setResultsByStore((prev) => {
      const list = prev[storeId] || [];
      const next = list.map((r) => (r.staffId === staffId ? newResult : r));
      return { ...prev, [storeId]: next };
    });
  }, [storeId, currentPlan, newbieSet, performancesByStore, setResultsByStore]);

  return {
    updateAttendance,
    handleUpdateMemberCommission,
    toggleNewbie,
    handleSavePosition,
  };
}