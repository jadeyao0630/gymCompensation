import type {
  PositionConfig,
  SimulationInput,
  SimulationResult,
  SimulationBreakdown,
  RevenueShareConfig,
  CourseCommissionInputs,
  ClassCommissionMode,
} from '../types/compensation';
import { calcTotalBaseSalary, getCommissionRate, getClassCommission } from './salary';

const isStoreManager = (p: PositionConfig) => p.title.includes('店长');
const isManager = (p: PositionConfig) => p.title.includes('经理');

const hasCommission = (p: PositionConfig) =>
  p.hasCommission !== undefined
    ? p.hasCommission
    : p.commissionTiers.length > 0;

const isShareable = (p: PositionConfig) =>
  hasCommission(p) && !isStoreManager(p) && !isManager(p);

function findManagerSource(
  manager: PositionConfig,
  positions: PositionConfig[]
): PositionConfig | undefined {
  const keyword = manager.title.replace('经理', '');
  return positions.find(
    (p) =>
      p.id !== manager.id &&
      !isManager(p) &&
      !isStoreManager(p) &&
      p.title.includes(keyword)
  );
}

function findCoursePosition(
  keyword: string,
  positions: PositionConfig[]
): PositionConfig | undefined {
  return positions.find(
    (p) =>
      p.title.includes(keyword) &&
      !p.title.includes('经理')
  );
}

/** 计算课程课提明细 */
export function calcCourseBreakdown(
  courses: CourseCommissionInputs | undefined,
  positions: PositionConfig[]
): SimulationResult['courseBreakdown'] {
  if (!courses) return [];
  return Object.values(courses).map((c) => {
    const position = findCoursePosition(c.positionKeyword, positions);
    const headcount = position?.headcount ?? 0;

    const info: { mode: ClassCommissionMode; value: number } = position
      ? getClassCommission(position, positions)
      : { mode: 'percent', value: 0 };

    const commission =
      info.mode === 'percent'
        ? c.averagePrice * c.classCount * info.value
        : c.classCount * info.value;

    return {
      courseName: c.courseName,
      averagePrice: c.averagePrice,
      classCount: c.classCount,
      headcount,
      mode: info.mode,
      value: info.value,
      commission,
    };
  });
}

/** 课提总额 */
export function calcTotalClassCommission(
  courses: CourseCommissionInputs | undefined,
  positions: PositionConfig[]
): number {
  return calcCourseBreakdown(courses, positions).reduce(
    (s, c) => s + c.commission,
    0
  );
}

export function simulate(
  positions: PositionConfig[],
  input: SimulationInput,
  shareConfig?: RevenueShareConfig,
  courseCommissions?: CourseCommissionInputs
): SimulationResult {
  const fixedCost = input.propertyFee + input.electricityFee + input.rent;

  const shareablePositions = positions.filter(isShareable);
  const managers = positions.filter((p) => isManager(p) && hasCommission(p));
  const storeManagers = positions.filter(
    (p) => isStoreManager(p) && hasCommission(p)
  );
  const fixedPositions = positions.filter((p) => !hasCommission(p));

  const totalShare = shareablePositions.reduce(
    (s, p) => s + (shareConfig?.[p.title] || 0),
    0
  );
  const totalHead = shareablePositions.reduce((s, p) => s + p.headcount, 0);

  const weightOf = (p: PositionConfig): number => {
    const raw = shareConfig?.[p.title];
    if (raw !== undefined && totalShare > 0) {
      return raw / totalShare;
    }
    return totalHead > 0 ? p.headcount / totalHead : 0;
  };

  const courseBreakdown = calcCourseBreakdown(courseCommissions, positions);
  const totalClassCommission = courseBreakdown.reduce(
    (s, c) => s + c.commission,
    0
  );

  const profitAt = (
    R: number
  ): {
    profit: number;
    totalBase: number;
    commission: number;
    breakdown: SimulationBreakdown[];
  } => {
    // 1) 分摊职位
    const allocated = shareablePositions.map((position) => {
      const weight = weightOf(position);
      const allocatedRevenue = R * weight;

      const baseSalary = calcTotalBaseSalary(
        position,
        positions,
        allocatedRevenue
      );
      const rate = getCommissionRate(position, positions, allocatedRevenue);
      const commission = allocatedRevenue * rate;

      return {
        positionId: position.id,
        title: position.title,
        headcount: position.headcount,
        baseSalary,
        commissionRate: rate,
        commission,
        allocatedRevenue,
        type: 'shareable' as const,
      };
    });

    const revenueByTitle = new Map<string, number>();
    allocated.forEach((a) => revenueByTitle.set(a.title, a.allocatedRevenue));

    // 2) 经理
    const managerRows = managers.map((m) => {
      const source = findManagerSource(m, positions);
      const managerRevenue = source
        ? revenueByTitle.get(source.title) ?? 0
        : 0;

      const baseSalary = calcTotalBaseSalary(m, positions, managerRevenue);
      const rate = getCommissionRate(m, positions, managerRevenue);
      const commission = managerRevenue * rate;

      return {
        positionId: m.id,
        title: m.title,
        headcount: m.headcount,
        baseSalary,
        commissionRate: rate,
        commission,
        allocatedRevenue: managerRevenue,
        type: 'manager' as const,
      };
    });

    // 3) 店长
    const memberRevenue = allocated.reduce(
      (s, x) => s + x.allocatedRevenue,
      0
    );
    const storeManagerRows = storeManagers.map((sm) => {
      const baseSalary = calcTotalBaseSalary(sm, positions, memberRevenue);
      const rate = getCommissionRate(sm, positions, memberRevenue);
      const commission = memberRevenue * rate;

      return {
        positionId: sm.id,
        title: sm.title,
        headcount: sm.headcount,
        baseSalary,
        commissionRate: rate,
        commission,
        allocatedRevenue: memberRevenue,
        type: 'store' as const,
      };
    });

    // 4) 无佣金职位
    const fixedRows = fixedPositions.map((p) => ({
      positionId: p.id,
      title: p.title,
      headcount: p.headcount,
      baseSalary: calcTotalBaseSalary(p, positions),
      commissionRate: 0,
      commission: 0,
      allocatedRevenue: 0,
      type: 'fixed' as const,
    }));

    const breakdown = [
      ...allocated,
      ...managerRows,
      ...storeManagerRows,
      ...fixedRows,
    ] as SimulationBreakdown[];

    const totalBase = breakdown.reduce((s, x) => s + x.baseSalary, 0);
    const positionCommission = breakdown.reduce(
      (s, x) => s + x.commission,
      0
    );
    const totalCommission = positionCommission + totalClassCommission;

    const profit = R - totalBase - totalCommission - fixedCost;
    return { profit, totalBase, commission: totalCommission, breakdown };
  };

  if (
    positions.reduce((s, p) => s + calcTotalBaseSalary(p, positions), 0) +
      fixedCost <=
    0
  ) {
    return {
      fixedCost,
      totalBaseSalary: 0,
      requiredRevenue: 0,
      totalCommission: totalClassCommission,
      totalClassCommission,
      breakdown: [],
      courseBreakdown,
      feasible: true,
      iterations: 0,
    };
  }

  let lo = 0;
  let hi =
    (positions.reduce(
      (s, p) => s + calcTotalBaseSalary(p, positions),
      0
    ) +
      fixedCost) *
    100;
  let iterations = 0;
  const MAX_ITER = 60;
  const EPSILON = 1;

  while (profitAt(hi).profit < 0 && iterations < MAX_ITER) {
    hi *= 2;
    iterations++;
  }

  while (hi - lo > EPSILON && iterations < MAX_ITER) {
    const mid = (lo + hi) / 2;
    const { profit } = profitAt(mid);
    if (profit >= 0) hi = mid;
    else lo = mid;
    iterations++;
  }

  const final = profitAt(hi);

  return {
    fixedCost,
    totalBaseSalary: final.totalBase,
    requiredRevenue: hi,
    totalCommission: final.commission,
    totalClassCommission,
    breakdown: final.breakdown,
    courseBreakdown,
    feasible: final.profit >= -EPSILON,
    iterations,
  };
}