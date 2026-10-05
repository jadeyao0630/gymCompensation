import React from 'react';
import type { PositionCategory, PositionConfig } from '../../types/compensation';
import { CATEGORY_TABS } from '../../constants/categories';

interface CategoryTabsProps {
  positions: PositionConfig[];
  active: PositionCategory;
  onChange: (key: PositionCategory) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  positions,
  active,
  onChange,
}) => (
  <div className="px-4 sm:px-6 pt-5 pb-1">
    <div className="inline-flex p-1 bg-gray-100/80 rounded-2xl gap-1">
      {CATEGORY_TABS.map((tab) => {
        const totalHeadcount = positions
          .filter((p) => p.category === tab.key)
          .reduce((sum, p) => sum + (p.headcount || 0), 0);
        const positionCount = positions.filter(
          (p) => p.category === tab.key
        ).length;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
            }`}
            title={`${positionCount} 个职位，共 ${totalHeadcount} 人`}
          >
            <span
              className={`w-2 h-2 rounded-full bg-gradient-to-br ${tab.color} ${
                isActive ? '' : 'opacity-60'
              }`}
            />
            {tab.label}
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-200/70 text-gray-500'
              }`}
            >
              {totalHeadcount}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

export default CategoryTabs;
