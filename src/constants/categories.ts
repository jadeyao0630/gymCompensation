import type { PositionCategory } from '../types/compensation';

export interface CategoryTab {
  key: PositionCategory;
  label: string;
  color: string;
}

export const CATEGORY_TABS: CategoryTab[] = [
  { key: 'membership', label: '会籍', color: 'from-sky-500 to-blue-500' },
  { key: 'personalTraining', label: '私教', color: 'from-violet-500 to-purple-500' },
  { key: 'swim', label: '泳教', color: 'from-cyan-500 to-teal-500' },
  { key: 'operations', label: '运营', color: 'from-amber-500 to-orange-500' },
];

export const getCategoryLabel = (cat: PositionCategory): string =>
  CATEGORY_TABS.find((t) => t.key === cat)?.label || '';
