import type {
  PositionConfig,
  ClassCommissionMode,
} from '../types/compensation';
import { resolvePerformanceTarget } from './performance';

function sortByThreshold<T extends { threshold: number }>(tiers: T[]): T[] {
  return [...tiers].sort((a, b) => a.threshold - b.threshold);
}

function findHitTier<T extends { threshold: number }>(
  tiers: T[],
  performance: number
): T | undefined {
  if (tiers.length === 0) return undefined;
  const sorted = sortByThreshold(tiers);
  let hit: T = sorted[0];
  for (const t of sorted) {
    if (performance >= t.threshold) hit = t;
    else break;
  }
  return hit;
}

/* ⭐ 按 tiered 过滤阶梯 */
function effectiveCommissionTiers(position: PositionConfig) {
  return position.commissionTiered === false
    ? position.commissionTiers.slice(0, 1)
    : position.commissionTiers;
}
function effectiveBaseTiers(position: PositionConfig) {
  return position.baseSalaryTiered === false
    ? position.baseSalaryTiers.slice(0, 1)
    : position.baseSalaryTiers;
}

export function calcBaseSalary(
  position: PositionConfig,
  allPositions: PositionConfig[],
  overridePerformance?: number
): number {
  const tiers = effectiveBaseTiers(position);
  if (!tiers.length) return 0;
  const target =
    overridePerformance !== undefined
      ? overridePerformance
      : resolvePerformanceTarget(position, allPositions);
  const hit = findHitTier(tiers, target);
  if (!hit) return 0;
  return hit.amount * position.headcount;
}

export function calcGenderBaseSalary(
  position: PositionConfig,
  allPositions: PositionConfig[],
  overridePerformance?: number
): number {
  if (!position.genderSalaryTiers?.length) return 0;
  const target =
    overridePerformance !== undefined
      ? overridePerformance
      : resolvePerformanceTarget(position, allPositions);
  const hit = findHitTier(position.genderSalaryTiers, target);
  if (!hit) return 0;
  const avg = (hit.male + hit.female) / 2;
  return avg * position.headcount;
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
  const tiers = effectiveCommissionTiers(position);
  const target =
    overridePerformance !== undefined
      ? overridePerformance
      : resolvePerformanceTarget(position, allPositions);
  const hit = findHitTier(tiers, target);
  return hit ? hit.rate : 0;
}

export function getClassCommission(
  position: PositionConfig,
  allPositions: PositionConfig[]
): { mode: ClassCommissionMode; value: number } {
  const tiers = effectiveCommissionTiers(position);
  const target = resolvePerformanceTarget(position, allPositions);
  const hit = findHitTier(tiers, target);

  if (hit?.classRate !== undefined) {
    return {
      mode: hit.classMode || position.classCommissionMode || 'percent',
      value: hit.classRate,
    };
  }

  const course = position.courseCommissions?.[0];
  if (course) {
    return { mode: course.mode, value: course.value };
  }

  return { mode: 'percent', value: 0 };
}

export function getOldClassFee(position: PositionConfig): number {
  return position.oldClassFee ?? 0;
}

export function getCourseCommission(
  position: PositionConfig,
  courseName: string
): { mode: ClassCommissionMode; value: number } | undefined {
  const c = position.courseCommissions?.find((x) => x.courseName === courseName);
  if (!c) return undefined;
  return { mode: c.mode, value: c.value };
}