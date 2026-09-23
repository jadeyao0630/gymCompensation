import type { PositionConfig, ClassCommissionMode } from '../types/compensation';
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

  return ((hit.male + hit.female) / 2) * position.headcount;
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