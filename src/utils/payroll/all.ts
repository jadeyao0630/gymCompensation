import type {
  MonthlyCompensationPlan,
  RewardsCatalog,
  DepartmentRewards,
  TempReward,
} from '../../types/compensation';
import type { EmployeePerformance, PayrollResult } from '../../types/payroll';
import { isManagerTitle } from '../../constants/positions';
import { isInvalidId } from './pick';
import { getDepartmentOf } from './department';
import { findPositionByTitle, makeEmptyPosition } from './positionFinder';
import { calcEmployeePayroll } from './employee';

export interface CalcPayrollForAllOptions {
  opsViewEnabled?: boolean;
  newbieIds?: Set<string>;
  rewardsCatalog?: RewardsCatalog;
  departmentRewards?: DepartmentRewards;
  tempRewardsByStaff?: Record<string, TempReward[]>;
}

export function calcPayrollForAll(
  plan: MonthlyCompensationPlan,
  performances: EmployeePerformance[],
  options: CalcPayrollForAllOptions = {}
): PayrollResult[] {
  const {
    opsViewEnabled = true,
    newbieIds = new Set<string>(),
    rewardsCatalog = [],
    departmentRewards,
    tempRewardsByStaff,
  } = options;

  const results: PayrollResult[] = [];

  for (const perf of performances) {
    if (isInvalidId(perf.staffId)) continue;
    if (!opsViewEnabled && perf.positionTitle === '运营主管') continue;

    const salesAmount = Number(perf.salesAmount) || 0;
    const classCount = Number(perf.classCount) || 0;
    const classAmount = Number(perf.classAmount) || 0;

    const title = perf.positionTitle || '会籍';
    const dept = getDepartmentOf(title);
    const isManager = isManagerTitle(title);
    const isStore = title.includes('店长') || title.includes('门店经理');
    const isFixed = title.includes('前台') || title.includes('保洁');
    const isOpsManager = title === '运营主管';
    const isOps = dept === '运营';

    if (
      !isManager &&
      !isStore &&
      !isFixed &&
      !isOpsManager &&
      !isOps &&
      salesAmount === 0 &&
      classCount === 0
    ) {
      continue;
    }

    let position = findPositionByTitle(plan.positions, title);
    if (!position) position = makeEmptyPosition(title);

    const sid = String(perf.staffId ?? '').trim();
    const tempRewards = tempRewardsByStaff?.[sid] || [];

    results.push(
      calcEmployeePayroll(
        position,
        {
          ...perf,
          salesAmount,
          classCount,
          classAmount,
          fullAttendance: perf.fullAttendance ?? true,
          absentDays: perf.absentDays ?? 0,
        },
        newbieIds.has(sid) || newbieIds.has(perf.staffId as any),
        {
          rewardsCatalog,
          departmentRewards,
          tempRewards,
        }
      )
    );
  }

  return results;
}