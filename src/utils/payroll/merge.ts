import type { EmployeePerformance, CoachInfo } from '../../types/payroll';
import type { MergeInput } from '../../types/payroll';
import { pickId, pickName, pickPhone, pickSaleAmount, pickGender, isInvalidId, sexToGender } from './pick';
import { pickPayDetail, mergePayDetail } from './payDetail';
import { parseClassList } from './classParser';

export function mergePerformance(
  salesGroups: MergeInput[],
  classGroups: MergeInput[]
): EmployeePerformance[] {
  const map = new Map<string, EmployeePerformance>();
  const keyOf = (r: Record<string, any>, posTitle: string) => {
    const id = pickId(r);
    const name = pickName(r);
    return !isInvalidId(id) ? `id:${id}` : `${posTitle}__${name}`;
  };
  const getOrCreate = (r: Record<string, any>, posTitle: string): EmployeePerformance => {
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
        payDetail: [],
      };
      map.set(key, cur);
    }
    if (!cur.staffName) cur.staffName = pickName(r);
    if (!cur.staffPhone) cur.staffPhone = pickPhone(r);
    if (!cur.staffId) cur.staffId = pickId(r);
    if (!cur.classMemberDetail) cur.classMemberDetail = [];
    if (!cur.payDetail) cur.payDetail = [];
    return cur;
  };

  salesGroups.forEach(({ positionTitle, records }) => {
    records.forEach((r) => {
      if (isInvalidId(pickId(r))) return;
      const cur = getOrCreate(r, positionTitle);
      cur.salesAmount += pickSaleAmount(r);
      if (!cur.positionTitle) cur.positionTitle = positionTitle;
      const payDetail = pickPayDetail(r);
      if (payDetail.length > 0) {
        cur.payDetail = mergePayDetail(cur.payDetail, payDetail);
      }
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
      const payDetail = pickPayDetail(r);
      if (payDetail.length > 0) {
        cur.payDetail = mergePayDetail(cur.payDetail, payDetail);
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

export function normalizeCoachList(records: Record<string, any>[]): CoachInfo[] {
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