import type { PositionConfig } from '../../types/compensation';
import type { EmployeePerformance, MissingPositionInfo } from '../../types/payroll';
import { findPositionByTitle } from './positionFinder';

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