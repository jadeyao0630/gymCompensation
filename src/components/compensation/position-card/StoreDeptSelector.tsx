import React from 'react';
import { Store } from 'lucide-react';
import type { PositionConfig, DepartmentKey } from '../../../types/compensation';

const ALL_DEPTS: DepartmentKey[] = ['会籍', '私教', '泳教', '运营'];
const DEFAULT_STORE_DEPTS: DepartmentKey[] = ['会籍', '私教', '泳教'];

interface Props {
  position: PositionConfig;
  readOnly: boolean;
  onUpdate: (u: Partial<PositionConfig>) => void;
}

export const StoreDeptSelector: React.FC<Props> = ({
  position,
  readOnly,
  onUpdate,
}) => {
  const toggleDept = (dept: DepartmentKey) => {
    if (readOnly) return;
    const current = position.includedDepartments ?? DEFAULT_STORE_DEPTS;
    const next = current.includes(dept)
      ? current.filter((d) => d !== dept)
      : [...current, dept];
    onUpdate({ includedDepartments: next });
  };

  return (
    <div className="px-5 py-3 bg-violet-50/60 border-b border-violet-100">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-violet-700">
          <Store className="w-3.5 h-3.5" />
          <span className="text-xs font-medium whitespace-nowrap">
            店长业绩包含部门
          </span>
        </div>

        {ALL_DEPTS.map((dept) => {
          const active = (
            position.includedDepartments ?? DEFAULT_STORE_DEPTS
          ).includes(dept);
          return (
            <button
              key={dept}
              onClick={() => toggleDept(dept)}
              disabled={readOnly}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                active
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {dept}
            </button>
          );
        })}

        <label className="flex items-center gap-1.5 text-xs text-violet-700 ml-2 cursor-pointer">
          <input
            type="checkbox"
            checked={position.includeSelf ?? false}
            disabled={readOnly}
            onChange={(e) => onUpdate({ includeSelf: e.target.checked })}
            className="accent-violet-600 disabled:cursor-not-allowed"
          />
          含自己业绩
        </label>

        <span className="text-[10px] text-violet-500 ml-auto">
          永远不含任何经理
        </span>
      </div>
    </div>
  );
};

export default StoreDeptSelector;