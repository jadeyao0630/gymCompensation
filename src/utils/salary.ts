import type {
  PositionConfig,
  ClassCommissionMode,
} from '../types/compensation';
import { resolvePerformanceTarget } from './performance';

/* ============================================================
 * 阶梯定位工具
 * ============================================================ */
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

/* ============================================================
 * 底薪计算
 * ============================================================ */

/**
 * 普通职位：命中底薪阶梯的 amount × 人数
 * @param overridePerformance 可选，覆盖业绩目标（用于测算）
 */
export function calcBaseSalary(
  position: PositionConfig,
  allPositions: PositionConfig[],
  overridePerformance?: number
): number {
  if (!position.baseSalaryTiers.length) return 0;
  const target =
    overridePerformance !== undefined
      ? overridePerformance
      : resolvePerformanceTarget(position, allPositions);
  const hit = findHitTier(position.baseSalaryTiers, target);
  if (!hit) return 0;
  return hit.amount * position.headcount;
}

/** 泳教：命中性别阶梯的底薪 × 人数 */
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

/** 统一入口：总底薪 */
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

/* ============================================================
 * 佣金 / 课提
 * ============================================================ */

/** 取销提比例 */
export function getCommissionRate(
  position: PositionConfig,
  allPositions: PositionConfig[],
  overridePerformance?: number
): number {
  const target =
    overridePerformance !== undefined
      ? overridePerformance
      : resolvePerformanceTarget(position, allPositions);
  const hit = findHitTier(position.commissionTiers, target);
  return hit ? hit.rate : 0;
}

/** 取课提规则 */
export function getClassCommission(
  position: PositionConfig,
  allPositions: PositionConfig[]
): { mode: ClassCommissionMode; value: number } {
  const target = resolvePerformanceTarget(position, allPositions);
  const hit = findHitTier(position.commissionTiers, target);

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

/** 老课单节费用 */
export function getOldClassFee(position: PositionConfig): number {
  return position.oldClassFee ?? 0;
}

/** 按课程名取课提 */
export function getCourseCommission(
  position: PositionConfig,
  courseName: string
): { mode: ClassCommissionMode; value: number } | undefined {
  const c = position.courseCommissions?.find((x) => x.courseName === courseName);
  if (!c) return undefined;
  return { mode: c.mode, value: c.value };
}