import type { PositionConfig, GenderSalaryTier } from '../../types/compensation';
import { resolveCalcFlags } from '../../types/compensation';
import { isManagerTitle } from '../../constants/positions';
import type { EmployeePerformance, PayrollResult, Gender, CourseCommissionRate } from '../../types/payroll';
import { sortByThreshold, findHitTier } from './tier';

function resolveGenderBase(gender: Gender | undefined, hit: GenderSalaryTier): number {
  const g: Gender = gender ?? 'male';
  if (g === 'female' && hit.female !== 0) return hit.female;
  if (g === 'newbie' && hit.newbie !== 0) return hit.newbie;
  if (hit.male !== 0) return hit.male;
  if (hit.base !== undefined && hit.base !== 0) return hit.base;
  return 0;
}

export function calcEmployeePayroll(
  position: PositionConfig,
  perf: EmployeePerformance,
  isNewbie = false
): PayrollResult {
  /* 运营主管 */
  if (position.title === '运营主管') {
    const managerSalesBase = perf.managerSalesBase ?? 0;
    const rate =
      position.commissionTiers?.[0]?.rate !== undefined
        ? position.commissionTiers[0].rate
        : 0.03;
    const opsCommission = Math.round(managerSalesBase * rate * 100) / 100;

    const baseTier = (position.baseSalaryTiers || [])[0];
    const baseSalary = baseTier?.amount ?? 20000;

    const fullAttendance = perf.fullAttendance ?? true;
    const absentDays = perf.absentDays ?? 0;
    const absentDeduction =
      !fullAttendance && absentDays > 0 && baseSalary > 0
        ? (baseSalary / 30) * absentDays
        : 0;

    const total = Math.max(0, baseSalary + opsCommission - absentDeduction);
    const gender: Gender = perf.gender ?? 'male';

    return {
      staffId: perf.staffId,
      staffName: perf.staffName,
      staffPhone: perf.staffPhone,
      positionTitle: position.title,
      gender,
      isNewbie: false,
      isManager: false,
      isStore: false,
      salesAmount: managerSalesBase,
      classCount: 0,
      classAmount: 0,
      hitCommissionRate: rate,
      hitCommissionNote: `店长销售 × ${(rate * 100).toFixed(1)}%`,
      hitBaseSalary: baseSalary,
      baseSalary,
      salesCommission: opsCommission,
      classCommissionDetail: undefined,
      courseCommissionRates: undefined,
      classCommission: 0,
      classMemberDetail: [],
      fullAttendance,
      absentDays,
      absentDeduction,
      total,
      payDetail: perf.payDetail ?? [],
    };
  }

  const flags = resolveCalcFlags(position);
  const isSwimCoach = position.title.includes('泳教');

  const sortedCommissionTiers = sortByThreshold(position.commissionTiers);
  const sortedBaseTiers = sortByThreshold(position.baseSalaryTiers);
  const sortedGenderTiers = sortByThreshold(position.genderSalaryTiers || []);

  const hitCommissionTier = isNewbie
    ? sortedCommissionTiers[0]
    : findHitTier(position.commissionTiers, perf.salesAmount);

  let hitBaseSalary = 0;
  if (flags.includeBaseSalary) {
    if (isNewbie) {
      if (isSwimCoach && sortedGenderTiers.length > 0) {
        hitBaseSalary = sortedGenderTiers[0].newbie || 0;
      }
      if (hitBaseSalary === 0 && sortedBaseTiers.length > 0) {
        hitBaseSalary = sortedBaseTiers[0].amount || 0;
      }
    } else {
      if (isSwimCoach && position.genderSalaryTiers?.length) {
        const hit = findHitTier(position.genderSalaryTiers, perf.salesAmount);
        if (hit) hitBaseSalary = resolveGenderBase(perf.gender, hit);
      }
      if (hitBaseSalary === 0 && position.baseSalaryTiers.length) {
        const hit = findHitTier(position.baseSalaryTiers, perf.salesAmount);
        if (hit) hitBaseSalary = hit.amount;
      }
    }
  }
  const baseSalary = hitBaseSalary;

  const hitCommissionRate = hitCommissionTier?.rate ?? 0;
  const salesCommission = flags.includeSalesCommission
    ? perf.salesAmount * hitCommissionRate
    : 0;

  let classCommission = 0;
  const classCommissionDetail: Record<string, number> = {};
  const courseCommissionRates: Record<string, CourseCommissionRate> = {};

  if (flags.includeClassCommission) {
    if (isSwimCoach && perf.classByCourse) {
      const classRate = hitCommissionTier?.classRate ?? 0;
      const oldClassFees = position.oldClassFees ?? [];
      const hitOldFee = (() => {
        if (oldClassFees.length > 0) {
          const sorted = [...oldClassFees].sort((a, b) => a.threshold - b.threshold);
          let hit = sorted[0];
          for (const f of sorted) {
            if (perf.salesAmount >= f.threshold) hit = f;
            else break;
          }
          return hit?.fee;
        }
        return position.oldClassFee;
      })();

      Object.keys(perf.classByCourse).forEach((course) => {
        const isOld = /老课/.test(course);
        if (isOld && hitOldFee !== undefined) {
          courseCommissionRates[course] = { rate: hitOldFee, mode: 'fixed' };
        } else if (classRate > 0) {
          courseCommissionRates[course] = { rate: classRate, mode: 'percent' };
        }
      });
    } else {
      const courseCommissions = position.courseCommissions ?? [];
      if (courseCommissions.length > 0 && perf.classByCourse) {
        Object.keys(perf.classByCourse).forEach((course) => {
          const rule =
            courseCommissions.find((c) => c.courseName === course) ||
            courseCommissions.find(
              (c) => course.includes(c.courseName) || c.courseName.includes(course)
            );
          if (rule) {
            courseCommissionRates[course] = { rate: rule.value, mode: rule.mode };
          }
        });
      }
      if (
        Object.keys(courseCommissionRates).length === 0 &&
        hitCommissionTier?.classRate !== undefined &&
        perf.classByCourse
      ) {
        const mode = hitCommissionTier.classMode || 'percent';
        Object.keys(perf.classByCourse).forEach((course) => {
          courseCommissionRates[course] = {
            rate: hitCommissionTier.classRate as number,
            mode,
          };
        });
      }
    }

    if (perf.classMemberDetail && perf.classMemberDetail.length > 0) {
      perf.classMemberDetail.forEach((m) => {
        const course = m.courseName;
        const fallback = courseCommissionRates[course];
        const mode = m.mode ?? fallback?.mode ?? 'percent';
        const value = m.value ?? fallback?.rate ?? 0;

        const fee = mode === 'percent' ? m.amount * value : m.signNum * value;

        classCommission += fee;
        classCommissionDetail[course] = (classCommissionDetail[course] ?? 0) + fee;
      });
    } else if (perf.classByCourse) {
      Object.entries(perf.classByCourse).forEach(([course, v]) => {
        const r = courseCommissionRates[course];
        if (!r) return;
        const fee = r.mode === 'percent' ? v.amount * r.rate : v.count * r.rate;
        classCommission += fee;
        classCommissionDetail[course] = fee;
      });
    }
  }

  const fullAttendance = perf.fullAttendance ?? true;
  const absentDays = perf.absentDays ?? 0;
  const absentDeduction =
    !fullAttendance && absentDays > 0 && baseSalary > 0
      ? (baseSalary / 30) * absentDays
      : 0;

  const gender: Gender = perf.gender ?? 'male';
  const isNewbieOut = isNewbie;
  const isManager = isManagerTitle(position.title);
  const isStore =
    position.title.includes('店长') || position.title.includes('门店经理');

  return {
    staffId: perf.staffId,
    staffName: perf.staffName,
    staffPhone: perf.staffPhone,
    positionTitle: position.title,
    gender,
    isNewbie: isNewbieOut,
    isManager,
    isStore,
    salesAmount: perf.salesAmount,
    classCount: perf.classCount,
    classAmount: perf.classAmount,
    hitCommissionRate,
    hitCommissionNote: hitCommissionTier
      ? hitCommissionTier.salesMode === 'fixed'
        ? `${hitCommissionTier.rate.toFixed(2)} 元/元`
        : hitCommissionTier.note
      : undefined,
    hitBaseSalary,
    baseSalary,
    salesCommission,
    classCommissionDetail,
    courseCommissionRates,
    classCommission,
    classMemberDetail: perf.classMemberDetail ?? [],
    fullAttendance,
    absentDays,
    absentDeduction,
    total: Math.max(
      0,
      baseSalary + salesCommission + classCommission - absentDeduction
    ),
    payDetail: perf.payDetail ?? [],
  };
}