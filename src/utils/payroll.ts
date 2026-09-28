import type {
  MonthlyCompensationPlan,
  PositionConfig,
  GenderSalaryTier,
  DepartmentKey,
} from '../types/compensation';
import { resolveCalcFlags } from '../types/compensation';
import type { AnyRecord } from '../api/types';
import { normalizePositionTitle, isManagerTitle } from '../constants/positions';

export type Gender = 'male' | 'female' | 'newbie';

export interface ClassMemberDetail {
  courseName: string;
  memberName: string;
  memberId: string;
  signNum: number;
  price: number;
  amount: number;
  mode?: 'percent' | 'fixed';
  value?: number;
}

export interface CourseCommissionRate {
  rate: number;
  mode: 'percent' | 'fixed';
}

export interface EmployeePerformance {
  staffId: string;
  staffName: string;
  staffPhone: string;
  positionTitle: string;
  gender?: Gender;
  salesAmount: number;
  classCount: number;
  classAmount: number;
  classByCourse?: Record<string, { count: number; amount: number }>;
  classMemberDetail?: ClassMemberDetail[];
  managerSalesBase?: number;
  fullAttendance?: boolean;
  absentDays?: number;
}

export interface PayrollResult {
  staffId: string;
  staffName: string;
  staffPhone: string;
  positionTitle: string;
  gender: Gender;
  isNewbie: boolean;
  isManager: boolean;
  isStore: boolean;

  salesAmount: number;
  classCount: number;
  classAmount: number;
  hitCommissionRate: number;
  hitCommissionNote?: string;
  hitBaseSalary: number;
  baseSalary: number;
  salesCommission: number;

  classCommissionDetail?: Record<string, number>;
  courseCommissionRates?: Record<string, CourseCommissionRate>;
  classCommission: number;

  classMemberDetail?: ClassMemberDetail[];

  fullAttendance: boolean;
  absentDays: number;
  absentDeduction: number;

  total: number;
}

export interface MergeInput {
  positionTitle: string;
  records: AnyRecord[];
}

export interface CoachInfo {
  id: string;
  phone?: string;
  sex?: string | number;
  positionId?: string | number;
  positionTitle?: string;
  positions?: string[];
  raw: AnyRecord;
}

export type Department = '会籍' | '私教' | '泳教' | '运营';

export function getDepartmentOf(title: string): Department {
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

function pickId(r: AnyRecord): string {
  return String(
    r.id ?? r.coach_id ?? r.staff_id ?? r.employee_id ?? r.user_id ?? r.coachId ?? ''
  ).trim();
}
function pickName(r: AnyRecord): string {
  return String(
    r.name ?? r.staff_name ?? r.coach_name ?? r.employee_name ?? r.username ?? ''
  ).trim();
}
function pickPhone(r: AnyRecord): string {
  return String(r.phone ?? r.mobile ?? r.tel ?? '');
}
function pickSaleAmount(r: AnyRecord): number {
  const v =
    r.achievement ?? r.sale_amount ?? r.amount ?? r.total_amount ?? r.sales ?? r.money ?? 0;
  return Number(v) || 0;
}
function pickGender(r: AnyRecord): Gender {
  const raw = String(r.gender ?? r.sex ?? r.coach_gender ?? r.coach_sex ?? '')
    .toLowerCase()
    .trim();
  if (!raw) return 'male';
  if (raw.includes('新人') || raw.includes('newbie') || raw === 'new') return 'newbie';
  if (raw === 'female' || raw === 'f' || raw.includes('女')) return 'female';
  return 'male';
}
export function sexToGender(sex: string | number | undefined): Gender | undefined {
  if (sex === undefined || sex === null || sex === '') return undefined;
  const s = String(sex).trim();
  if (s === '1' || s === 'male' || s === '男') return 'male';
  if (s === '2' || s === 'female' || s === '女') return 'female';
  if (s === '3' || s === 'newbie' || s === '新人') return 'newbie';
  return undefined;
}
function isInvalidId(id: string): boolean {
  if (!id) return true;
  if (id === '0') return true;
  const num = Number(id);
  return Number.isNaN(num) || num <= 0;
}

interface ClassSummary {
  totalCount: number;
  totalAmount: number;
  byCourse: Record<string, { count: number; amount: number }>;
  members: ClassMemberDetail[];
}

function parseClassList(record: AnyRecord): ClassSummary {
  const summary: ClassSummary = {
    totalCount: 0,
    totalAmount: 0,
    byCourse: {},
    members: [],
  };
  const classList: AnyRecord[] =
    record.class_list ?? record.classList ?? record.classes ?? [];
  if (!Array.isArray(classList)) return summary;

  classList.forEach((cls) => {
    const cardName = String(
      cls.card_name ?? cls.cardName ?? cls.course_name ?? '未命名课程'
    );
    const classCount = Number(cls.class_count ?? cls.classCount ?? cls.count ?? 0);
    summary.totalCount += classCount || 0;
    if (!summary.byCourse[cardName]) {
      summary.byCourse[cardName] = { count: 0, amount: 0 };
    }
    summary.byCourse[cardName].count += classCount || 0;

    const userList: AnyRecord[] = cls.user_list ?? cls.userList ?? [];
    let courseAmount = 0;

    if (Array.isArray(userList) && userList.length > 0) {
      userList.forEach((u) => {
        const memberName = String(u.username ?? u.name ?? u.user_name ?? '').trim();
        const memberId = String(u.user_id ?? u.userId ?? '').trim();
        const cardUserList: AnyRecord[] = u.card_user_list ?? u.cardUserList ?? [];
        if (!Array.isArray(cardUserList)) return;
        cardUserList.forEach((cu) => {
          const price = Number(cu.price ?? 0);
          const signNum = Number(cu.sign_num ?? cu.signNum ?? 0);
          const amount = signNum * price;
          courseAmount += amount;

          if (signNum > 0) {
            summary.members.push({
              courseName: cardName,
              memberName: memberName || '—',
              memberId,
              signNum,
              price,
              amount,
            });
          }
        });
      });
    } else {
      const sp = cls.sign_price ?? cls.signPrice ?? cls.class_price ?? cls.classPrice;
      if (sp !== undefined && sp !== null && sp !== '') {
        courseAmount = Number(sp) || 0;
      }
    }

    summary.totalAmount += courseAmount;
    summary.byCourse[cardName].amount += courseAmount;
  });

  if (summary.totalAmount === 0) {
    const topSp =
      record.sign_price ?? record.signPrice ?? record.class_price ?? record.classPrice;
    if (topSp !== undefined && topSp !== null && topSp !== '') {
      summary.totalAmount = Number(topSp) || 0;
    }
  }

  return summary;
}

export function mergePerformance(
  salesGroups: MergeInput[],
  classGroups: MergeInput[]
): EmployeePerformance[] {
  const map = new Map<string, EmployeePerformance>();
  const keyOf = (r: AnyRecord, posTitle: string) => {
    const id = pickId(r);
    const name = pickName(r);
    return !isInvalidId(id) ? `id:${id}` : `${posTitle}__${name}`;
  };
  const getOrCreate = (r: AnyRecord, posTitle: string): EmployeePerformance => {
    const key = keyOf(r, posTitle);
    let cur = map.get(key);
    if (!cur) {
      cur = {
        staffId: pickId(r),
        staffName: pickName(r),
        staffPhone: pickPhone(r),
        positionTitle: posTitle,
        gender: pickGender(r),
        salesAmount: 0,
        classCount: 0,
        classAmount: 0,
        classByCourse: {},
        classMemberDetail: [],
        fullAttendance: true,
        absentDays: 0,
      };
      map.set(key, cur);
    }
    if (!cur.staffName) cur.staffName = pickName(r);
    if (!cur.staffPhone) cur.staffPhone = pickPhone(r);
    if (!cur.staffId) cur.staffId = pickId(r);
    if (!cur.classMemberDetail) cur.classMemberDetail = [];
    return cur;
  };

  salesGroups.forEach(({ positionTitle, records }) => {
    records.forEach((r) => {
      if (isInvalidId(pickId(r))) return;
      const cur = getOrCreate(r, positionTitle);
      cur.salesAmount += pickSaleAmount(r);
      if (!cur.positionTitle) cur.positionTitle = positionTitle;
    });
  });

  classGroups.forEach(({ positionTitle, records }) => {
    records.forEach((r) => {
      if (isInvalidId(pickId(r))) return;
      const cur = getOrCreate(r, positionTitle);
      const summary = parseClassList(r);
      cur.classCount += summary.totalCount;
      cur.classAmount += summary.totalAmount;
      if (!cur.classByCourse) cur.classByCourse = {};
      Object.entries(summary.byCourse).forEach(([course, v]) => {
        if (!cur.classByCourse![course]) {
          cur.classByCourse![course] = { count: 0, amount: 0 };
        }
        cur.classByCourse![course].count += v.count;
        cur.classByCourse![course].amount += v.amount;
      });
      if (summary.members.length > 0) {
        cur.classMemberDetail = [...(cur.classMemberDetail ?? []), ...summary.members];
      }
    });
  });

  return Array.from(map.values());
}

export function applyCoachInfo(
  performances: EmployeePerformance[],
  coaches: CoachInfo[]
): EmployeePerformance[] {
  const coachMap = new Map<string, CoachInfo>();
  coaches.forEach((c) => {
    if (!c.id) return;
    coachMap.set(c.id, c);
  });

  return performances.map((perf) => {
    const coach = coachMap.get(perf.staffId);
    if (!coach) return perf;
    const next: EmployeePerformance = { ...perf };
    if (coach.phone) next.staffPhone = coach.phone;
    const g = sexToGender(coach.sex);
    if (g) next.gender = g;
    if (coach.positionTitle) next.positionTitle = coach.positionTitle;
    return next;
  });
}

export function normalizeCoachList(records: AnyRecord[]): CoachInfo[] {
  return records.map((r) => {
    const rawPosition = String(r.position_name ?? r.position ?? r.title ?? '').trim();
    const positions = rawPosition
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const positionTitle =
      positions.find((p) => p.includes('经理')) ?? positions[0] ?? undefined;
    return {
      id: String(r.id ?? r.coach_id ?? r.staff_id ?? '').trim(),
      phone: String(r.phone ?? r.mobile ?? r.tel ?? '').trim() || undefined,
      sex: r.sex ?? r.gender ?? undefined,
      positionId: r.position_id ?? r.positionId ?? undefined,
      positionTitle,
      positions,
      raw: r,
    };
  });
}

export function applyManagerPerformance(
  performances: EmployeePerformance[],
  positions?: PositionConfig[]
): EmployeePerformance[] {
  const storeConfig = positions?.find((p) => p.title.includes('店长'));
  const included: DepartmentKey[] =
    storeConfig?.includedDepartments ?? ['会籍', '私教', '泳教'];
  const includeSelf = storeConfig?.includeSelf ?? false;

  const deptSales: Record<DepartmentKey, number> = {
    会籍: 0,
    私教: 0,
    泳教: 0,
    运营: 0,
  };

  const posByTitle = new Map<string, PositionConfig>();
  positions?.forEach((p) => posByTitle.set(p.title, p));

  for (const perf of performances) {
    const title = perf.positionTitle || '';
    if (title.includes('店长')) continue;
    if (title === '运营主管') continue;

    const pos = posByTitle.get(title);
    const flags = resolveCalcFlags(pos);
    if (!flags.includePerformance) continue;

    const dept = getDepartmentOf(title);
    if (dept === '运营') continue;

    const isMgr = isManagerTitle(title);

    if (isMgr) {
      if (pos?.managerAggregateByDept) continue;
      deptSales[dept] += perf.salesAmount;
      continue;
    }

    deptSales[dept] += perf.salesAmount;
  }

  const grandSales = included.reduce((s, d) => s + deptSales[d], 0);

  return performances.map((perf) => {
    const title = perf.positionTitle || '';

    if (title.includes('店长')) {
      const selfSales = includeSelf ? perf.salesAmount : 0;
      return { ...perf, salesAmount: grandSales + selfSales };
    }

    if (isManagerTitle(title)) {
      const pos = posByTitle.get(title);
      const dept = getDepartmentOf(title);

      if (pos?.managerAggregateByDept && dept !== '运营') {
        return { ...perf, salesAmount: deptSales[dept] };
      }

      return perf;
    }

    return perf;
  });
}

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
  perf: EmployeePerformance
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
      isNewbie: gender === 'newbie',
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
    };
  }

  const flags = resolveCalcFlags(position);

  /* ⭐ 按 tiered 过滤 */
  const commissionTiers =
    position.commissionTiered === false
      ? position.commissionTiers.slice(0, 1)
      : position.commissionTiers;

  const baseSalaryTiers =
    position.baseSalaryTiered === false
      ? position.baseSalaryTiers.slice(0, 1)
      : position.baseSalaryTiers;

  const isSwimCoach = position.title.includes('泳教');
  const hitCommissionTier = findHitTier(commissionTiers, perf.salesAmount);

  let hitBaseSalary = 0;
  if (flags.includeBaseSalary) {
    if (isSwimCoach && position.genderSalaryTiers?.length) {
      const hit = findHitTier(position.genderSalaryTiers, perf.salesAmount);
      if (hit) hitBaseSalary = resolveGenderBase(perf.gender, hit);
    }
    if (hitBaseSalary === 0 && baseSalaryTiers.length) {
      const hit = findHitTier(baseSalaryTiers, perf.salesAmount);
      if (hit) hitBaseSalary = hit.amount;
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
  const isNewbie = gender === 'newbie';
  const isManager = isManagerTitle(position.title);
  const isStore =
    position.title.includes('店长') || position.title.includes('门店经理');

  return {
    staffId: perf.staffId,
    staffName: perf.staffName,
    staffPhone: perf.staffPhone,
    positionTitle: position.title,
    gender,
    isNewbie,
    isManager,
    isStore,
    salesAmount: perf.salesAmount,
    classCount: perf.classCount,
    classAmount: perf.classAmount,
    hitCommissionRate,
    hitCommissionNote: hitCommissionTier?.note,
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
  };
}

export function findPositionByTitle(
  positions: PositionConfig[],
  title: string
): PositionConfig | undefined {
  if (!title) return undefined;

  let hit = positions.find((p) => p.title === title);
  if (hit) return hit;

  const normalized = normalizePositionTitle(title);
  if (normalized) {
    hit = positions.find((p) => p.title === normalized);
    if (hit) return hit;
  }

  hit = positions.find((p) => p.title.includes(title));
  if (hit) return hit;

  hit = positions.find((p) => title.includes(p.title));
  if (hit) return hit;

  const strip = (s: string) =>
    s.replace(/[（(].*?[)）]|[+＋·\s./\\-]/g, '').trim();
  const t2 = strip(title);
  if (t2) {
    hit = positions.find((p) => strip(p.title) === t2);
    if (hit) return hit;
    hit = positions.find((p) => {
      const pt = strip(p.title);
      return pt.includes(t2) || t2.includes(pt);
    });
    if (hit) return hit;
  }

  return undefined;
}

function makeEmptyPosition(title: string): PositionConfig {
  return {
    id: `virtual_${title}`,
    title,
    category: 'operations',
    headcount: 0,
    performanceTarget: 0,
    performanceSource: 'self',
    totalBaseSalary: 0,
    commissionTiers: [],
    baseSalaryTiers: [],
    genderSalaryTiers: undefined,
    extraNote: '',
    courseCommissions: [],
  };
}

export function calcPayrollForAll(
  plan: MonthlyCompensationPlan,
  performances: EmployeePerformance[],
  opsViewEnabled = true
): PayrollResult[] {
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

    results.push(
      calcEmployeePayroll(position, {
        ...perf,
        salesAmount,
        classCount,
        classAmount,
        fullAttendance: perf.fullAttendance ?? true,
        absentDays: perf.absentDays ?? 0,
      })
    );
  }

  return results;
}

export function collectMissingPositions(
  performances: EmployeePerformance[],
  positions: PositionConfig[]
): string[] {
  const missing = new Set<string>();
  for (const perf of performances) {
    const title = perf.positionTitle || '会籍';
    if (title === '运营主管') continue;
    const hit = findPositionByTitle(positions, title);
    if (!hit) missing.add(title);
  }
  return Array.from(missing);
}

export interface MissingPositionInfo {
  positionTitle: string;
  employees: {
    staffId: string;
    staffName: string;
    staffPhone: string;
    salesAmount: number;
    classCount: number;
    classAmount: number;
  }[];
}

export function collectMissingPositionDetails(
  performances: EmployeePerformance[],
  positions: PositionConfig[]
): MissingPositionInfo[] {
  const map = new Map<string, MissingPositionInfo>();

  for (const perf of performances) {
    const title = perf.positionTitle || '会籍';
    if (title === '运营主管') continue;
    const hit = findPositionByTitle(positions, title);
    if (hit) continue;

    if (!map.has(title)) {
      map.set(title, { positionTitle: title, employees: [] });
    }
    map.get(title)!.employees.push({
      staffId: perf.staffId,
      staffName: perf.staffName,
      staffPhone: perf.staffPhone,
      salesAmount: perf.salesAmount,
      classCount: perf.classCount,
      classAmount: perf.classAmount,
    });
  }

  return Array.from(map.values());
}

export interface DepartmentStats {
  department: Department;
  headcount: number;
  salesAmount: number;
  classAmount: number;
  classCount: number;
  baseSalary: number;
  salesCommission: number;
  classCommission: number;
  total: number;
  configuredHeadcount: number;
}

export function calcDepartmentStats(
  results: PayrollResult[],
  plan?: MonthlyCompensationPlan
): DepartmentStats[] {
  const map = new Map<Department, DepartmentStats>();

  const ensure = (dept: Department): DepartmentStats => {
    if (!map.has(dept)) {
      map.set(dept, {
        department: dept,
        headcount: 0,
        salesAmount: 0,
        classAmount: 0,
        classCount: 0,
        baseSalary: 0,
        salesCommission: 0,
        classCommission: 0,
        total: 0,
        configuredHeadcount: 0,
      });
    }
    return map.get(dept)!;
  };

  if (plan) {
    plan.positions.forEach((p) => {
      const dept = getDepartmentOf(p.title);
      const s = ensure(dept);
      s.configuredHeadcount += p.headcount || 0;
    });
  }

  for (const r of results) {
    const dept = getDepartmentOf(r.positionTitle);
    const s = ensure(dept);

    if (r.positionTitle === '运营主管') {
      s.baseSalary += r.baseSalary;
      s.salesAmount += r.salesAmount;
      s.salesCommission += r.salesCommission;
      s.total += r.total;
      continue;
    }

    if (r.isManager && !r.isStore) continue;

    s.headcount += 1;

    if (r.isStore) {
      s.baseSalary += r.baseSalary;
      s.salesCommission += r.salesCommission;
      s.classCommission += r.classCommission;
      s.total += r.baseSalary + r.salesCommission + r.classCommission;
      continue;
    }

    s.salesAmount += r.salesAmount;
    s.classAmount += r.classAmount;
    s.classCount += r.classCount;
    s.baseSalary += r.baseSalary;
    s.salesCommission += r.salesCommission;
    s.classCommission += r.classCommission;
    s.total += r.total;
  }

  const order: Department[] = ['会籍', '私教', '泳教', '运营'];
  return order
    .map((d) => map.get(d))
    .filter((x): x is DepartmentStats => !!x);
}