import type {
  PositionConfig,
  SimulationInput,
  SimulationResult,
  SimulationPositionBreakdown,
  SimulationEmployeeBreakdown,
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

/* ⭐ 等差递增分摊：N 人，总业绩 R，返回每人分摊数组 */
function splitByArithmetic(total: number, n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [total];

  const d = (total / n) * 0.3;
  let a1 = (total - (d * (n * (n - 1))) / 2) / n;
  if (a1 < 0) a1 = 0;

  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    arr.push(Math.max(0, a1 + i * d));
  }

  /* 微调总和让 arr 合计等于 total */
  const sum = arr.reduce((s, x) => s + x, 0);
  if (sum > 0) {
    const scale = total / sum;
    for (let i = 0; i < arr.length; i++) {
      arr[i] = arr[i] * scale;
    }
  }
  return arr;
}

/* ⭐ 命中档位工具 */
function hitTier<T extends { threshold: number }>(
  tiers: T[],
  perf: number
): T | undefined {
  if (!tiers || tiers.length === 0) return undefined;
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
  let hit: T = sorted[0];
  for (const t of sorted) {
    if (perf >= t.threshold) hit = t;
    else break;
  }
  return hit;
}

/* ⭐ 单人底薪：按性别取值（该人分摊业绩决定命中档位） */
function perEmployeeBaseSalaryForGender(
  p: PositionConfig,
  allocated: number,
  gender: 'male' | 'female' | 'newbie'
): { value: number; hitThreshold?: number } {
  /* 泳教：性别底薪阶梯 */
  if (p.genderSalaryTiers?.length) {
    const hit = hitTier(p.genderSalaryTiers, allocated);
    if (!hit) return { value: 0 };
    let v = 0;
    if (gender === 'male') v = hit.male;
    else if (gender === 'female') v = hit.female;
    else v = hit.newbie;
    return { value: v, hitThreshold: hit.threshold };
  }

  /* 普通：底薪阶梯（不分性别） */
  const hit = hitTier(p.baseSalaryTiers, allocated);
  if (!hit) return { value: 0 };
  return { value: hit.amount, hitThreshold: hit.threshold };
}

/* ⭐ 按单人分摊业绩，计算单人销提 */
function perEmployeeCommission(
  p: PositionConfig,
  allocated: number
): { value: number; rate: number; hitThreshold?: number } {
  const hit = hitTier(p.commissionTiers, allocated);
  if (!hit) return { value: 0, rate: 0 };
  const rate = hit.rate ?? 0;
  return { value: allocated * rate, rate, hitThreshold: hit.threshold };
}

/* ⭐ 按顺序分配性别（male → female → newbie） */
function buildGenderList(
  headcount: number,
  genderCounts?: GenderCountConfig,
  title?: string
): ('male' | 'female' | 'newbie')[] {
  const counts = title && genderCounts ? genderCounts[title] : undefined;
  const maleCount = counts?.maleCount ?? 0;
  const femaleCount = counts?.femaleCount ?? 0;
  const newbieCount = counts?.newbieCount ?? 0;
  const totalCount = maleCount + femaleCount + newbieCount;

  const list: ('male' | 'female' | 'newbie')[] = [];

  if (totalCount > 0) {
    for (let i = 0; i < maleCount; i++) list.push('male');
    for (let i = 0; i < femaleCount; i++) list.push('female');
    for (let i = 0; i < newbieCount; i++) list.push('newbie');
    /* 人数不足时用 male 补 */
    while (list.length < headcount) list.push('male');
  } else {
    for (let i = 0; i < headcount; i++) list.push('male');
  }

  return list.slice(0, headcount);
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

  const baseTier = [...(p.baseSalaryTiers || [])].sort(
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

/* ⭐ 根据当前 revenue，计算各职位分摊业绩 + 每人明细 */
export function calcSimulationBreakdown(
  revenue: number,
  positions: PositionConfig[],
  shareConfig?: RevenueShareConfig,
  genderCounts?: GenderCountConfig,
  opsViewEnabled = true
): SimulationPositionBreakdown[] {
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

  /* 店长分摊业绩 */
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

  /* 经理自己业绩权重 */
  const selfWeight = (p: PositionConfig): number => {
    const raw = shareConfig?.[p.title];
    const w = raw !== undefined && raw > 0 ? raw : p.headcount || 0;
    const totalShareable = positions
      .filter((x) => {
        const fx = resolveCalcFlags(x);
        if (!fx.includePerformance) return false;
        if (isManagerTitle(x.title)) return false;
        if (isStoreTitle(x.title)) return false;
        return true;
      })
      .reduce((s, x) => {
        const r = shareConfig?.[x.title];
        return s + (r !== undefined && r > 0 ? r : x.headcount || 0);
      }, 0);
    return totalShareable > 0 ? w / totalShareable : 0;
  };

  const breakdown: SimulationPositionBreakdown[] = [];

  positions.forEach((p) => {
    if (!opsViewEnabled && p.title === '运营主管') return;

    const flags = resolveCalcFlags(p);
    let allocatedRevenue = 0;

    if (isStoreTitle(p.title)) {
      allocatedRevenue = storeAllocated;
    } else if (isManagerTitle(p.title)) {
      const dept = getDepartmentOf(p.title);
      if (p.managerAggregateByDept && dept !== '运营') {
        const deptRevenue = positions
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
        const selfRevenue = p.managerIncludeSelf
          ? revenue * selfWeight(p)
          : 0;
        allocatedRevenue = deptRevenue + selfRevenue;
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
      allocatedRevenue = storeAllocated;
    } else {
      const share = weights[p.title] ?? 0;
      allocatedRevenue = revenue * share;
    }

    const headcount = p.headcount || 0;

    let baseSalary = 0;
    let commission = 0;
    let rate = 0;
    let perEmployee: SimulationEmployeeBreakdown[] | undefined;

    if (
      headcount > 1 &&
      !isStoreTitle(p.title) &&
      !isManagerTitle(p.title) &&
      p.title !== '运营主管'
    ) {
      const shares = splitByArithmetic(allocatedRevenue, headcount);

      /* ⭐ 按顺序分配性别 */
      const genderList = buildGenderList(headcount, genderCounts, p.title);

      perEmployee = shares.map((alloc, idx) => {
        const gender = genderList[idx] ?? 'male';

        const baseInfo = flags.includeBaseSalary
          ? perEmployeeBaseSalaryForGender(p, alloc, gender)
          : { value: 0, hitThreshold: undefined };

        const empCommission = flags.includeSalesCommission
          ? perEmployeeCommission(p, alloc)
          : { value: 0, rate: 0, hitThreshold: undefined };

        return {
          index: idx + 1,
          allocatedRevenue: alloc,
          hitBaseThreshold: baseInfo.hitThreshold,
          baseSalary: baseInfo.value,
          hitCommissionThreshold: empCommission.hitThreshold,
          commissionRate: empCommission.rate,
          commission: empCommission.value,
        };
      });

      baseSalary = perEmployee.reduce((s, x) => s + x.baseSalary, 0);
      commission = perEmployee.reduce((s, x) => s + x.commission, 0);
      rate = allocatedRevenue > 0 ? commission / allocatedRevenue : 0;
    } else if (p.title === '运营主管') {
      baseSalary = flags.includeBaseSalary
        ? calcWeightedBaseSalary(p, genderCounts)
        : 0;
      rate = p.commissionTiers?.[0]?.rate ?? 0.03;
      commission = allocatedRevenue * rate;
    } else {
      baseSalary = flags.includeBaseSalary
        ? calcWeightedBaseSalary(p, genderCounts)
        : 0;
      rate = getCommissionRate(p, positions, allocatedRevenue);
      commission = flags.includeSalesCommission
        ? allocatedRevenue * rate
        : 0;
    }

    breakdown.push({
      positionId: p.id,
      title: p.title,
      headcount,
      baseSalary,
      allocatedRevenue,
      commissionRate: rate,
      commission,
      perEmployee,
    });
  });

  return breakdown;
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

  /* ⭐ 调用统一的分摊函数 */
  const breakdown = calcSimulationBreakdown(
    revenue,
    positions,
    shareConfig,
    genderCounts,
    opsViewEnabled
  );

  const totalBaseSalary = breakdown.reduce((s, x) => s + x.baseSalary, 0);
  const totalSalesCommission = breakdown.reduce((s, x) => s + x.commission, 0);

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