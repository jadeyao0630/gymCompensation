import type { MonthlyCompensationPlan } from '../../types/compensation';
import type { PayrollResult, DepartmentStats, Department } from '../../types/payroll';
import { getDepartmentOf } from './department';

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