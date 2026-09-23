import type { PositionConfig, ClassCommissionMode } from '../types/compensation';
import { resolvePerformanceTarget } from './performance';

function sortByThreshold<T extends { threshold: number }>(tiers: T[]): T[] {
  return [...tiers].sort((a, b) => a.threshold - b.threshold);
}

/**
 * 找到命中的阶梯
 * - 严格大于：业绩正好等于门槛时，命中更低一档
 * - 初始值取第一档兜底（业绩 < 第一档门槛时也返回第一档）
 */
function findHitTier<T extends { threshold: number }>(
  tiers: T[],
  performance: number
): T | undefined {
  if (tiers.length === 0) return undefined;
  const sorted = sortByThreshold(tiers);
  let hit: T = sorted[0];
  for (const t of sorted) {
    if (performance > t.threshold) hit = t;
    else break;
  }
  return hit;
}

export function calcBaseSalary(
  position: PositionConfig,
  allPositions: PositionConfig[],
  overridePerformance?: number
): number {
  if (!position.baseSalaryTiers.length) return 0;

  const tiered = position.baseTiered !== false;
  const target =
    overridePerformance !== undefined
      ? overridePerformance
      : resolvePerformanceTarget(position, allPositions);

  const hit = tiered
    ? findHitTier(position.baseSalaryTiers, target)
    : position.baseSalaryTiers[0];

  return hit ? hit.amount * position.headcount : 0;
}

/**
 * 泳教性别底薪
 * - 命中档有 base（统一底薪）→ 用 base
 * - 否则用【男教练】底薪（不再男女平均）
 */
export function calcGenderBaseSalary(
  position: PositionConfig,
  allPositions: PositionConfig[],
  overridePerformance?: number
): number {
  if (!position.genderSalaryTiers?.length) return 0;

  const tiered = position.baseTiered !== false;
  const target =
    overridePerformance !== undefined
      ? overridePerformance
      : resolvePerformanceTarget(position, allPositions);

  const hit = tiered
    ? findHitTier(position.genderSalaryTiers, target)
    : position.genderSalaryTiers[0];

  if (!hit) return 0;

  if (hit.base && hit.base > 0) {
    return hit.base * position.headcount;
  }

  // 按男教练底薪 × 人数
  return hit.male * position.headcount;
}

export function calcTotalBaseSalary(
  position: PositionConfig,
  allPositions: PositionConfig[],
  overridePerformance?: number
): number {
  const isSwimCoach =
    position.title.includes('泳教') && !position.title.includes('经理');
  if (isSwimCoach)
    return calcGenderBaseSalary(position, allPositions, overridePerformance);
  return calcBaseSalary(position, allPositions, overridePerformance);
}

export function getCommissionRate(
  position: PositionConfig,
  allPositions: PositionConfig[],
  overridePerformance?: number
): number {
  if (!position.commissionTiers.length) return 0;

  const tiered = position.commissionTiered !== false;
  const target =
    overridePerformance !== undefined
      ? overridePerformance
      : resolvePerformanceTarget(position, allPositions);

  const hit = tiered
    ? findHitTier(position.commissionTiers, target)
    : position.commissionTiers[0];

  return hit ? hit.rate : 0;
}

export function getClassCommission(
  position: PositionConfig,
  allPositions: PositionConfig[],
  overridePerformance?: number
): { mode: ClassCommissionMode; value: number } {
  if (!position.commissionTiers.length) {
    return { mode: position.classCommissionMode || 'percent', value: 0 };
  }

  const tiered = position.commissionTiered !== false;
  const target =
    overridePerformance !== undefined
      ? overridePerformance
      : resolvePerformanceTarget(position, allPositions);

  const hit = tiered
    ? findHitTier(position.commissionTiers, target)
    : position.commissionTiers[0];

  const mode: ClassCommissionMode =
    hit?.classMode || position.classCommissionMode || 'percent';

  return { mode, value: hit?.classRate ?? 0 };
}

export function getOldClassFee(position: PositionConfig): number {
  return position.oldClassFee ?? 0;
}

export function getCourseCommission(
  position: PositionConfig,
  courseName: string
): { mode: ClassCommissionMode; value: number } | undefined {
  const c = position.courseCommissions?.find(
    (x) => x.courseName === courseName
  );
  if (!c) return undefined;
  return { mode: c.mode, value: c.value };
}