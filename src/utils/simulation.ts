import type {
  PositionConfig,
  SimulationInput,
  SimulationResult,
  SimulationPositionBreakdown,
  SimulationCourseBreakdown,
  CourseCommissionInputs,
  RevenueShareConfig,
  GenderCountConfig,
  DepartmentKey,
} from '../types/compensation';
import { resolveCalcFlags } from '../types/compensation';
import { getCommissionRate, getClassCommission } from './salary';

type Department = '会籍' | '私教' | '泳教' | '运营';

function getDepartmentOf(title: string): Department {
  if (!title) return '运营';
  if (title.includes('会籍')) return '会籍';
  if (
    title.includes('私教') ||
    title.includes('私人教练') ||
    title.includes('瑜伽') ||
    title.includes('舞蹈') ||
    title.includes('团操') ||
    title.includes('团体操')
  ) {
    return '私教';
  }
  if (title.includes('泳教') || title.includes('游泳')) return '泳教';
  return '运营';
}

const isManagerTitle = (title: string) =>
  title.includes('经理') && !title.includes('店长');

const isStoreTitle = (title: string) =>
  title.includes('店长') || title.includes('门店经理');

export function calcFixedCost(input: SimulationInput): number {
  return (
    (input.propertyFee || 0) +
    (input.electricityFee || 0) +
    (input.rent || 0) +
    (input.waterFee || 0) +
    (input.networkFee || 0) +
    (input.otherFee || 0)
  );
}

function calcWeightedBaseSalary(
  p: PositionConfig,
  genderCounts?: GenderCountConfig
): number {
  const headcount = p.headcount || 0;
  if (headcount === 0) return 0;

  const counts = genderCounts?.[p.title];
  const maleCount = counts?.maleCount ?? headcount;
  const femaleCount = counts?.femaleCount ?? 0;
  const newbieCount = counts?.newbieCount ?? 0;

  if (p.genderSalaryTiers?.length) {
    const hit = [...p.genderSalaryTiers].sort(
      (a, b) => a.threshold - b.threshold
    )[0];
    if (hit) {
      return (
        hit.male * maleCount +
        hit.female * femaleCount +
        (hit.newbie || 0) * newbieCount
      );
    }
  }

  /* ⭐ 按 tiered 过滤 */
  const baseTiers =
    p.baseSalaryTiered === false
      ? (p.baseSalaryTiers || []).slice(0, 1)
      : p.baseSalaryTiers || [];

  const baseTier = [...baseTiers].sort(
    (a, b) => a.threshold - b.threshold
  )[0];
  const amount = baseTier?.amount ?? 0;
  return amount * headcount;
}

export function calcCourseBreakdown(
  courseInputs: CourseCommissionInputs | undefined,
  positions: PositionConfig[]
): SimulationCourseBreakdown[] {
  if (!courseInputs) return [];

  const result: SimulationCourseBreakdown[] = [];

  Object.values(courseInputs).forEach((c) => {
    const pos =
      positions.find((p) => p.title === c.positionTitle) ||
      positions.find(
        (p) =>
          c.positionTitle &&
          p.title.includes(c.positionTitle) &&
          !p.title.includes('经理')
      );
    if (!pos) return;

    const flags = resolveCalcFlags(pos);
    if (!flags.includeClassCommission) return;

    const info = getClassCommission(pos, positions);
    const commission =
      info.mode === 'percent'
        ? c.averagePrice * c.classCount * info.value
        : c.classCount * info.value;

    result.push({
      courseName: c.note || pos.title,
      averagePrice: c.averagePrice,
      classCount: c.classCount,
      headcount: pos.headcount || 0,
      mode: info.mode,
      value: info.value,
      commission,
    });
  });

  return result;
}

export function buildShareWeights(
  positions: PositionConfig[],
  shareConfig?: RevenueShareConfig
): Record<string, number> {
  const shareable = positions.filter((p) => {
    const flags = resolveCalcFlags(p);
    if (!flags.includePerformance) return false;
    if (isManagerTitle(p.title)) return false;
    if (isStoreTitle(p.title)) return false;
    return true;
  });

  const weights: Record<string, number> = {};
  let total = 0;

  shareable.forEach((p) => {
    const raw = shareConfig?.[p.title];
    const w = raw !== undefined && raw > 0 ? raw : p.headcount || 0;
    weights[p.title] = w;
    total += w;
  });

  if (total > 0) {
    Object.keys(weights).forEach((k) => {
      weights[k] = weights[k] / total;
    });
  }

  return weights;
}

function calcTotalCost(
  revenue: number,
  positions: PositionConfig[],
  input: SimulationInput,
  courseInputs?: CourseCommissionInputs,
  shareConfig?: RevenueShareConfig,
  genderCounts?: GenderCountConfig,
  opsViewEnabled = true
) {
  const fixedCost = calcFixedCost(input);
  const weights = buildShareWeights(positions, shareConfig);

  const deptSales: Record<Department, number> = {
    会籍: 0,
    私教: 0,
    泳教: 0,
    运营: 0,
  };

  positions.forEach((p) => {
    if (!opsViewEnabled && p.title === '运营主管') return;
    const flags = resolveCalcFlags(p);
    if (!flags.includePerformance) return;
    if (isStoreTitle(p.title)) return;
    const dept = getDepartmentOf(p.title);
    if (dept === '运营') return;

    const share = weights[p.title] ?? 0;
    const allocatedRevenue = revenue * share;

    if (isManagerTitle(p.title)) {
      if (p.managerAggregateByDept) return;
      deptSales[dept] += allocatedRevenue;
      return;
    }

    deptSales[dept] += allocatedRevenue;
  });

  const breakdown: SimulationPositionBreakdown[] = [];
  let totalBaseSalary = 0;
  let totalSalesCommission = 0;

  /* ⭐ 先算店长分摊业绩，供运营主管复用 */
  let storeAllocated = 0;
  const storePos = positions.find((x) => isStoreTitle(x.title));
  if (storePos) {
    const included: DepartmentKey[] =
      storePos.includedDepartments ?? ['会籍', '私教', '泳教'];
    storeAllocated = included.reduce(
      (s, d) => s + (deptSales[d as Department] || 0),
      0
    );
  }

  positions.forEach((p) => {
    if (!opsViewEnabled && p.title === '运营主管') return;

    const flags = resolveCalcFlags(p);
    let allocatedRevenue = 0;

    if (isStoreTitle(p.title)) {
      allocatedRevenue = storeAllocated;
    } else if (isManagerTitle(p.title)) {
      const dept = getDepartmentOf(p.title);
      if (p.managerAggregateByDept && dept !== '运营') {
        allocatedRevenue = positions
          .filter((x) => {
            if (x.id === p.id) return false;
            if (isManagerTitle(x.title)) return false;
            if (isStoreTitle(x.title)) return false;
            if (getDepartmentOf(x.title) !== dept) return false;
            const fx = resolveCalcFlags(x);
            return fx.includePerformance;
          })
          .reduce((sum, x) => {
            const share = weights[x.title] ?? 0;
            return sum + revenue * share;
          }, 0);
      } else {
        const keyword = p.title.replace('经理', '');
        const source = positions.find(
          (x) =>
            x.id !== p.id &&
            !isManagerTitle(x.title) &&
            !isStoreTitle(x.title) &&
            x.title.includes(keyword)
        );
        if (source) {
          const share = weights[source.title] ?? 0;
          allocatedRevenue = revenue * share;
        }
      }
    } else if (p.title === '运营主管') {
      /* ⭐ 运营主管：分摊业绩 = 店长分摊业绩 */
      allocatedRevenue = storeAllocated;
    } else {
      const share = weights[p.title] ?? 0;
      allocatedRevenue = revenue * share;
    }

    const baseSalary = flags.includeBaseSalary
      ? calcWeightedBaseSalary(p, genderCounts)
      : 0;

    /* ⭐ 运营主管佣金：按 commissionTiers[0].rate 算 */
    let rate = 0;
    let commission = 0;
    if (p.title === '运营主管') {
      rate = p.commissionTiers?.[0]?.rate ?? 0.03;
      commission = allocatedRevenue * rate;
    } else {
      rate = getCommissionRate(p, positions, allocatedRevenue);
      commission = flags.includeSalesCommission
        ? allocatedRevenue * rate
        : 0;
    }

    totalBaseSalary += baseSalary;
    totalSalesCommission += commission;

    breakdown.push({
      positionId: p.id,
      title: p.title,
      headcount: p.headcount || 0,
      baseSalary,
      allocatedRevenue,
      commissionRate: rate,
      commission,
    });
  });

  const courseBreakdown = calcCourseBreakdown(courseInputs, positions);
  const totalClassCommission = courseBreakdown.reduce(
    (s, c) => s + c.commission,
    0
  );

  const totalCommission = totalSalesCommission + totalClassCommission;
  const totalCost = fixedCost + totalBaseSalary + totalCommission;

  return {
    totalCost,
    baseSalary: totalBaseSalary,
    salesCommission: totalSalesCommission,
    classCommission: totalClassCommission,
    breakdown,
    courseBreakdown,
  };
}

export function calcSimulation(
  positions: PositionConfig[],
  input: SimulationInput,
  courseInputs?: CourseCommissionInputs,
  shareConfig?: RevenueShareConfig,
  genderCounts?: GenderCountConfig,
  opsViewEnabled = true
): SimulationResult {
  const fixedCost = calcFixedCost(input);

  let lo = 0;
  let hi = 100_000_000;
  let iterations = 0;

  for (let i = 0; i < 40; i++) {
    iterations = i + 1;
    const mid = (lo + hi) / 2;
    const { totalCost } = calcTotalCost(
      mid,
      positions,
      input,
      courseInputs,
      shareConfig,
      genderCounts,
      opsViewEnabled
    );
    if (totalCost < mid) hi = mid;
    else lo = mid;
  }

  const requiredRevenue = (lo + hi) / 2;
  const cost = calcTotalCost(
    requiredRevenue,
    positions,
    input,
    courseInputs,
    shareConfig,
    genderCounts,
    opsViewEnabled
  );

  return {
    fixedCost,
    totalBaseSalary: cost.baseSalary,
    totalCommission: cost.salesCommission + cost.classCommission,
    totalClassCommission: cost.classCommission,
    requiredRevenue,
    iterations,
    breakdown: cost.breakdown,
    courseBreakdown: cost.courseBreakdown,
  };
}