import type { EmployeePerformance } from '../../types/payroll';
import type { PositionConfig, DepartmentKey } from '../../types/compensation';
import { resolveCalcFlags } from '../../types/compensation';
import { isManagerTitle } from '../../constants/positions';
import { getDepartmentOf } from './department';

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

  /* ⭐ 按部门收集"非经理员工"的 id + 姓名 + 职位 */
  const deptMembers: Record<
    DepartmentKey,
    Array<{ id: string; name: string; positionTitle: string }>
  > = {
    会籍: [],
    私教: [],
    泳教: [],
    运营: [],
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
      deptMembers[dept].push({
        id: perf.staffId,
        name: perf.staffName,
        positionTitle: title,
      });
      continue;
    }

    deptSales[dept] += perf.salesAmount;
    deptMembers[dept].push({
      id: perf.staffId,
      name: perf.staffName,
      positionTitle: title,
    });
  }

  const grandSales = included.reduce((s, d) => s + deptSales[d], 0);

  return performances.map((perf) => {
    const title = perf.positionTitle || '';

    if (title.includes('店长')) {
      const selfSales = includeSelf ? perf.salesAmount : 0;
      const sources: Array<{ id: string; name: string; positionTitle: string }> =
        [];
      included.forEach((d) => sources.push(...deptMembers[d]));
      if (includeSelf) {
        sources.push({
          id: perf.staffId,
          name: perf.staffName,
          positionTitle: title,
        });
      }
      return {
        ...perf,
        salesAmount: grandSales + selfSales,
        salesSourceStaffIds: sources,
      };
    }

    if (isManagerTitle(title)) {
      const pos = posByTitle.get(title);
      const dept = getDepartmentOf(title);

      if (pos?.managerAggregateByDept && dept !== '运营') {
        const selfSales = pos.managerIncludeSelf ? perf.salesAmount : 0;
        const sources = [...deptMembers[dept]];
        if (pos.managerIncludeSelf) {
          sources.push({
            id: perf.staffId,
            name: perf.staffName,
            positionTitle: title,
          });
        }
        return {
          ...perf,
          salesAmount: deptSales[dept] + selfSales,
          salesSourceStaffIds: sources,
        };
      }

      return {
        ...perf,
        salesSourceStaffIds: [
          { id: perf.staffId, name: perf.staffName, positionTitle: title },
        ],
      };
    }

    return {
      ...perf,
      salesSourceStaffIds: [
        { id: perf.staffId, name: perf.staffName, positionTitle: title },
      ],
    };
  });
}