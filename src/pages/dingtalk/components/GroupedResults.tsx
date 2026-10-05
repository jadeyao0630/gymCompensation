import React, { useEffect, useState } from 'react';
import {
  Building2, ChevronDown, ChevronRight, Store,
} from 'lucide-react';
import { fmtMoney } from '../utils/extract';
import type { ColumnKey } from '../utils/constants';
import ResultsTable from './ResultsTable';
import type { DingTalkReportItem } from '../../../api/dingtalk';

interface GroupUnit {
  unitName: string;
  storeName: string;
  count: number;
  total: number;
  items: DingTalkReportItem[];
}

interface Group {
  typeName: string;
  totalCount: number;
  units: GroupUnit[];
}

interface Props {
  grouped: Group[];
  isColVisible: (key: ColumnKey) => boolean;
  /** ⭐ 选中的类型（扇形图联动） */
  selectedType?: string | null;
}

export const GroupedResults: React.FC<Props> = ({
  grouped,
  isColVisible,
  selectedType,
}) => {
  /* ⭐ 过滤：只显示选中的类型 */
  const visibleGroups = selectedType
    ? grouped.filter((g) => g.typeName === selectedType)
    : grouped;

  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(
    () => new Set(visibleGroups.map((g) => g.typeName))
  );
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(
    () =>
      new Set(
        visibleGroups.flatMap((g) =>
          g.units.map((u) => `${g.typeName}__${u.unitName}`)
        )
      )
  );

  /* ⭐ 当 selectedType 变化时，重新展开 */
  useEffect(() => {
    setExpandedTypes(new Set(visibleGroups.map((g) => g.typeName)));
    setExpandedUnits(
      new Set(
        visibleGroups.flatMap((g) =>
          g.units.map((u) => `${g.typeName}__${u.unitName}`)
        )
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  const toggleType = (name: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleUnit = (key: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (visibleGroups.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
        该类型下暂无明细
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleGroups.map((g) => {
        const isTypeExpanded = expandedTypes.has(g.typeName);
        return (
          <div key={g.typeName} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleType(g.typeName)}
              className="w-full px-5 py-4 flex items-center gap-3 hover:bg-blue-50/50 transition text-left border-b border-gray-100"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center shrink-0">
                {isTypeExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-800">{g.typeName}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {g.units.length} 个付款单位 · {g.totalCount} 条明细
                </div>
              </div>
            </button>

            {isTypeExpanded && (
              <div className="p-4 space-y-3 bg-gray-50/40">
                {g.units.map((u) => {
                  const unitKey = `${g.typeName}__${u.unitName}`;
                  const isUnitExpanded = expandedUnits.has(unitKey);
                  return (
                    <div key={unitKey} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <button
                        onClick={() => toggleUnit(unitKey)}
                        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-amber-50/40 transition text-left"
                      >
                        <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                          {u.storeName && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <Store className="w-3 h-3" />
                              {u.storeName}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-gray-700 truncate">
                            {u.unitName}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 whitespace-nowrap">
                          {u.count} 条 · {fmtMoney(u.total)}
                        </div>
                        {isUnitExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {isUnitExpanded && (
                        <ResultsTable
                          items={u.items}
                          visibleColumns={new Set()}
                          isColVisible={isColVisible}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroupedResults;