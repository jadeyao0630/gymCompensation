import type {
  MonthlyCompensationPlan,
  PositionConfig,
} from '../types/compensation';
import type { AnyRecord } from '../api/types';

/* ============================================================
 * 类型
 * ============================================================ */
export interface EmployeePerformance {
  staffId: string;
  staffName: string;
  staffPhone: string;

  /** 员工所属职位标题（由接口来源决定：会籍 / 泳教 / 私教） */
  positionTitle: string;

  salesAmount: number;
  classCount: number;
  classAmount: number;
}

export interface PayrollResult {
  staffId: string;
  staffName: string;
  staffPhone: string;
  positionTitle: string;

  salesAmount: number;
  classCount: number;
  classAmount: number;

  hitCommissionRate: number;
  hitCommissionNote?: string;

  hitBaseSalary: number;
  baseSalary: number;
  salesCommission: number;
  classCommission: number;
  total: number;
}

/* ============================================================
 * 阶梯定位
 * ============================================================ */
function sortByThreshold<T extends { threshold: number }>(tiers: T[]): T[] {
  return [...tiers].sort((a, b) => a.threshold - b.threshold);
}

function findHitTier<T extends { threshold: number }>(
  tiers: T[],
  perf: number
): T | undefined {
  if (tiers.length === 0) return undefined;
  const sorted = sortByThreshold(tiers);
  let hit: T = sorted[0];
  for (const t of sorted) {
    if (perf >= t.threshold) hit = t;
    else break;
  }
  return hit;
}

/* ============================================================
 * 字段抽取
 * ============================================================ */
function pickId(r: AnyRecord): string {
  return String(r.id ?? r.staff_id ?? r.employee_id ?? r.user_id ?? '');
}

function pickName(r: AnyRecord): string {
  return String(
    r.name ??
      r.staff_name ??
      r.coach_name ??
      r.employee_name ??
      r.username ??
      ''
  ).trim();
}

function pickPhone(r: AnyRecord): string {
  return String(r.phone ?? r.mobile ?? r.tel ?? '');
}

/** 销售业绩金额：优先 achievement */
function pickSaleAmount(r: AnyRecord): number {
  const v =
    r.achievement ??
    r.sale_amount ??
    r.amount ??
    r.total_amount ??
    r.sales ??
    r.money ??
    0;
  return Number(v) || 0;
}

function pickClassCount(r: AnyRecord): number {
  const v =
    r.class_count ??
    r.count ??
    r.lesson_count ??
    r.times ??
    r.course_count ??
    0;
  return Number(v) || 0;
}

function pickClassAmount(r: AnyRecord): number {
  const v =
    r.class_amount ??
    r.lesson_amount ??
    r.course_amount ??
    r.amount ??
    0;
  return Number(v) || 0;
}

/* ============================================================
 * 合并销售 + 消课
 *
 * 关键：把「接口来源」直接写成职位，不再靠姓名猜
 * ============================================================ */
export interface MergeInput {
  /** 接口来源 → 对应职位标题 */
  positionTitle: string;
  records: AnyRecord[];
}

export function mergePerformance(
  salesGroups: MergeInput[],
  classGroups: MergeInput[]
): EmployeePerformance[] {
  const map = new Map<string, EmployeePerformance>();

  /** 用 id 优先，否则用姓名 + 职位 做 key */
  const keyOf = (r: AnyRecord, posTitle: string) => {
    const id = pickId(r);
    const name = pickName(r);
    return id ? `${id}` : `${name}__${posTitle}`;
  };

  // 销售
  salesGroups.forEach(({ positionTitle, records }) => {
    records.forEach((r) => {
      const key = keyOf(r, positionTitle);
      if (!key) return;

      const cur =
        map.get(key) ||
        ({
          staffId: pickId(r),
          staffName: pickName(r),
          staffPhone: pickPhone(r),
          positionTitle,
          salesAmount: 0,
          classCount: 0,
          classAmount: 0,
        } as EmployeePerformance);

      // 万一接口里职位不一致，以先出现的为准
      if (!cur.positionTitle) cur.positionTitle = positionTitle;

      cur.salesAmount += pickSaleAmount(r);
      if (!cur.staffName) cur.staffName = pickName(r);
      if (!cur.staffPhone) cur.staffPhone = pickPhone(r);
      map.set(key, cur);
    });
  });

  // 消课
  classGroups.forEach(({ positionTitle, records }) => {
    records.forEach((r) => {
      const key = keyOf(r, positionTitle);
      if (!key) return;

      const cur =
        map.get(key) ||
        ({
          staffId: pickId(r),
          staffName: pickName(r),
          staffPhone: pickPhone(r),
          positionTitle,
          salesAmount: 0,
          classCount: 0,
          classAmount: 0,
        } as EmployeePerformance);

      if (!cur.positionTitle) cur.positionTitle = positionTitle;

      cur.classCount += pickClassCount(r);
      cur.classAmount += pickClassAmount(r);
      if (!cur.staffName) cur.staffName = pickName(r);
      if (!cur.staffPhone) cur.staffPhone = pickPhone(r);
      map.set(key, cur);
    });
  });

  return Array.from(map.values());
}

/* ============================================================
 * 单个员工薪酬计算
 * ============================================================ */
export function calcEmployeePayroll(
  position: PositionConfig,
  perf: EmployeePerformance
): PayrollResult {
  const isSwimCoach =
    position.title.includes('泳教') && !position.title.includes('经理');

  /* 1) 命中佣金阶梯（用员工销售金额） */
  const hitCommissionTier = findHitTier(
    position.commissionTiers,
    perf.salesAmount
  );

  /* 2) 底薪（用员工销售金额命中，不乘 headcount） */
  let hitBaseSalary = 0;
  if (isSwimCoach && position.genderSalaryTiers?.length) {
    const hit = findHitTier(position.genderSalaryTiers, perf.salesAmount);
    if (hit) hitBaseSalary = (hit.male + hit.female) / 2;
  } else if (position.baseSalaryTiers.length) {
    const hit = findHitTier(position.baseSalaryTiers, perf.salesAmount);
    if (hit) hitBaseSalary = hit.amount;
  }
  const baseSalary = hitBaseSalary;

  /* 3) 销提 */
  const hitCommissionRate = hitCommissionTier?.rate ?? 0;
  const salesCommission = perf.salesAmount * hitCommissionRate;

  /* 4) 课提 */
  let classCommission = 0;
  if (hitCommissionTier?.classRate !== undefined) {
    const mode = hitCommissionTier.classMode || 'percent';
    classCommission =
      mode === 'percent'
        ? perf.classAmount * hitCommissionTier.classRate
        : perf.classCount * hitCommissionTier.classRate;
  }

  return {
    staffId: perf.staffId,
    staffName: perf.staffName,
    staffPhone: perf.staffPhone,
    positionTitle: position.title,
    salesAmount: perf.salesAmount,
    classCount: perf.classCount,
    classAmount: perf.classAmount,
    hitCommissionRate,
    hitCommissionNote: hitCommissionTier?.note,
    hitBaseSalary,
    baseSalary,
    salesCommission,
    classCommission,
    total: baseSalary + salesCommission + classCommission,
  };
}

/* ============================================================
 * 按职位标题找配置
 * ============================================================ */
export function findPositionByTitle(
  positions: PositionConfig[],
  title: string
): PositionConfig | undefined {
  // 1) 精确匹配
  let hit = positions.find((p) => p.title === title);
  if (hit) return hit;

  // 2) 包含匹配（如"会籍经理"里含"会籍"）
  hit = positions.find((p) => p.title.includes(title));
  if (hit) return hit;

  // 3) 兜底：会籍
  return positions.find((p) => p.title === '会籍') || positions[0];
}

/* ============================================================
 * 批量计算
 * ============================================================ */
export function calcPayrollForAll(
  plan: MonthlyCompensationPlan,
  performances: EmployeePerformance[]
): PayrollResult[] {
  const results: PayrollResult[] = [];

  for (const perf of performances) {
    if (perf.salesAmount === 0 && perf.classCount === 0) continue;

    const position = findPositionByTitle(
      plan.positions,
      perf.positionTitle || '会籍'
    );

    if (!position) {
      console.warn('[payroll] 未找到职位配置:', perf.positionTitle);
      continue;
    }

    results.push(calcEmployeePayroll(position, perf));
  }

  return results;
}