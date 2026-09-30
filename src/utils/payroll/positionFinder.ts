import type { PositionConfig } from '../../types/compensation';
import { normalizePositionTitle } from '../../constants/positions';

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

export function makeEmptyPosition(title: string): PositionConfig {
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