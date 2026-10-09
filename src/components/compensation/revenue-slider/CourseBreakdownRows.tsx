import React from 'react';
import { Percent, Hash } from 'lucide-react';

export interface CourseRow {
  positionId: string;
  title: string;
  headcount: number;
  classMode?: 'percent' | 'fixed';
  classValue?: number;
  classCommission?: number;
}

interface Props {
  rows: CourseRow[];
}

const formatMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

export const CourseBreakdownRows: React.FC<Props> = ({ rows }) => (
  <>
    {rows.map((c) => (
      <tr
        key={c.positionId}
        className="border-b border-gray-100 last:border-0 bg-purple-50/40 hover:bg-purple-50/60"
      >
        <td className="px-3 py-2 text-purple-700 font-medium">
          {c.title}
          <span className="ml-1 text-[10px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
            课提
          </span>
        </td>
        <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
          {c.headcount || '—'}
        </td>
        <td className="px-3 py-2 text-right text-gray-300">—</td>
        <td className="px-3 py-2 text-right text-gray-300">—</td>
        <td className="px-3 py-2 text-right text-gray-300">—</td>
        <td className="px-3 py-2 text-right text-gray-300">—</td>
        <td className="px-3 py-2 text-right text-purple-600 tabular-nums">
          {c.classMode === 'fixed' ? (
            <span className="inline-flex items-center gap-1 justify-end">
              <Hash className="w-3 h-3" />
              {c.classValue} 元/节
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 justify-end">
              <Percent className="w-3 h-3" />
              {((c.classValue || 0) * 100).toFixed(1)}%
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-right text-purple-700 font-semibold tabular-nums">
          {formatMoney(c.classCommission || 0)}
        </td>
        <td className="px-3 py-2 text-center text-gray-300">—</td>
      </tr>
    ))}
  </>
);

export default CourseBreakdownRows;