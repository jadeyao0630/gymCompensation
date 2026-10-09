import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type {
  PositionConfig,
  SimulationEmployeeBreakdown,
} from '../../../types/compensation';
import { resolveCalcFlags } from '../../../types/compensation';
import EmployeeBreakdownRows from './EmployeeBreakdownRows';
import CourseBreakdownRows, { type CourseRow } from './CourseBreakdownRows';

const isStoreManager = (p: PositionConfig) =>
  p.title.includes('店长') || p.title.includes('门店经理');

const isManager = (p: PositionConfig) =>
  p.title.includes('经理') && !isStoreManager(p);

const hasCommission = (p: PositionConfig) =>
  p.hasCommission !== undefined
    ? p.hasCommission
    : p.commissionTiers.length > 0;

const formatMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

export interface PositionRow {
  positionId: string;
  title: string;
  headcount: number;
  baseSalary: number;
  allocatedRevenue: number;
  commissionRate: number;
  commission: number;
  perEmployee?: SimulationEmployeeBreakdown[];
}

interface Props {
  positionRows: PositionRow[];
  courseRows: CourseRow[];
  positions: PositionConfig[];
  revenue: number;
  totalBase: number;
  totalPositionCommission: number;
  totalClassCommission: number;
  totalCommission: number;
  expandedKeys: Set<string>;
  onToggleExpand: (key: string) => void;
}

export const BreakdownTable: React.FC<Props> = ({
  positionRows,
  courseRows,
  positions,
  revenue,
  totalBase,
  totalPositionCommission,
  totalClassCommission,
  totalCommission,
  expandedKeys,
  onToggleExpand,
}) => {
  return (
    <div className="bg-gray-50/60 backdrop-blur rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-100 bg-white/70">
            <th className="text-left px-3 py-2 font-medium">职位 / 课程</th>
            <th className="text-right px-3 py-2 font-medium">人数</th>
            <th className="text-right px-3 py-2 font-medium">底薪</th>
            <th className="text-right px-3 py-2 font-medium">分摊业绩</th>
            <th className="text-right px-3 py-2 font-medium">销提比例</th>
            <th className="text-right px-3 py-2 font-medium">销提</th>
            <th className="text-right px-3 py-2 font-medium">课提比例</th>
            <th className="text-right px-3 py-2 font-medium">课提</th>
            <th className="text-center px-3 py-2 font-medium w-10">明细</th>
          </tr>
        </thead>
        <tbody>
          {positionRows.map((b) => {
            const pos = positions.find((p) => p.id === b.positionId);
            const isStore = pos ? isStoreManager(pos) : false;
            const isMgr = pos ? isManager(pos) : false;
            const isOps = pos ? pos.title === '运营主管' : false;
            const noCommission = pos ? !hasCommission(pos) : false;

            const perEmployee = b.perEmployee;
            const hasPerEmployee = perEmployee && perEmployee.length > 0;
            const rowKey = b.positionId;
            const isExpanded = expandedKeys.has(rowKey);

            return (
              <React.Fragment key={b.positionId}>
                <tr
                  className={`border-b border-gray-100 last:border-0 hover:bg-white/80 ${
                    noCommission ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-gray-700 font-medium">
                    {b.title}
                    {isMgr && (
                      <span className="ml-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        经理
                      </span>
                    )}
                    {isStore && (
                      <span className="ml-1 text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                        汇总
                      </span>
                    )}
                    {isOps && (
                      <span className="ml-1 text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                        运营
                      </span>
                    )}
                    {noCommission && (
                      <span className="ml-1 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        无佣金
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
                    {b.headcount || '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600 tabular-nums">
                    {b.baseSalary > 0 ? formatMoney(b.baseSalary) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                    {b.allocatedRevenue > 0
                      ? formatMoney(b.allocatedRevenue)
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-sky-600 tabular-nums">
                    {b.commissionRate > 0
                      ? `${(b.commissionRate * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-600 tabular-nums">
                    {b.commission > 0 ? formatMoney(b.commission) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-300">—</td>
                  <td className="px-3 py-2 text-right text-gray-300">—</td>
                  <td className="px-3 py-2 text-center">
                    {hasPerEmployee ? (
                      <button
                        onClick={() => onToggleExpand(rowKey)}
                        title={
                          isExpanded
                            ? '收起分摊明细'
                            : `展开 ${perEmployee!.length} 人分摊明细`
                        }
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-md transition ${
                          isExpanded
                            ? 'text-purple-700 bg-purple-50'
                            : 'text-purple-500 hover:bg-purple-50'
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>

                {isExpanded && hasPerEmployee && (
                  <EmployeeBreakdownRows
                    colSpan={9}
                    title={b.title}
                    perEmployee={perEmployee!}
                  />
                )}
              </React.Fragment>
            );
          })}

          <CourseBreakdownRows rows={courseRows} />
        </tbody>
        <tfoot>
          <tr className="bg-white/80 font-semibold text-gray-700 border-t-2 border-gray-200">
            <td className="px-3 py-2" colSpan={2}>
              合计
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatMoney(totalBase)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatMoney(revenue)}
            </td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right text-amber-600 tabular-nums">
              {formatMoney(totalPositionCommission)}
            </td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right text-purple-700 tabular-nums">
              {formatMoney(totalClassCommission)}
            </td>
            <td className="px-3 py-2" />
          </tr>
          <tr className="bg-gray-50 font-semibold text-gray-700">
            <td className="px-3 py-2" colSpan={8}>
              总佣金（销提 + 课提）
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-indigo-700">
              {formatMoney(totalCommission)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default BreakdownTable;