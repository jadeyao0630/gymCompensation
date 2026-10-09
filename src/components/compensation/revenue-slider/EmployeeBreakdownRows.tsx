import React from 'react';
import type { SimulationEmployeeBreakdown } from '../../../types/compensation';
import PayDetailCell from '../PayDetailCell';

interface Props {
  colSpan: number;
  title: string;
  perEmployee: SimulationEmployeeBreakdown[];
}

export const EmployeeBreakdownRows: React.FC<Props> = ({
  colSpan,
  title,
  perEmployee,
}) => {
  const totalBase = perEmployee.reduce((s, x) => s + x.baseSalary, 0);
  const totalCommission = perEmployee.reduce((s, x) => s + x.commission, 0);

  return (
    <tr className="bg-slate-50/60">
      <td colSpan={colSpan} className="px-3 py-2">
        <div className="ml-6 border-l-2 border-purple-200 pl-4">
          <div className="text-xs font-semibold text-purple-700 mb-2">
            {title} · 单人分摊明细（{perEmployee.length} 人）
          </div>
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 bg-gray-50/60">
                  <th className="px-3 py-1.5 text-left font-medium">序号</th>
                  <th className="px-3 py-1.5 text-right font-medium">
                    销售金额
                  </th>
                  <th className="px-3 py-1.5 text-left font-medium">
                    收款方式
                  </th>
                  <th className="px-3 py-1.5 text-right font-medium">
                    底薪档位
                  </th>
                  <th className="px-3 py-1.5 text-right font-medium">底薪</th>
                  <th className="px-3 py-1.5 text-right font-medium">
                    销提档位
                  </th>
                  <th className="px-3 py-1.5 text-right font-medium">
                    销提提点
                  </th>
                  <th className="px-3 py-1.5 text-right font-medium">
                    销提金额
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {perEmployee.map((emp) => (
                  <tr key={emp.index} className="hover:bg-gray-50/50">
                    <td className="px-3 py-1.5 text-gray-600">{emp.index}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">
                      ¥{Math.round(emp.allocatedRevenue).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-left align-top">
                      <PayDetailCell payDetail={emp.payDetail} />
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">
                      {emp.hitBaseThreshold !== undefined
                        ? `≥${emp.hitBaseThreshold}`
                        : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">
                      ¥{Math.round(emp.baseSalary).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">
                      {emp.hitCommissionThreshold !== undefined
                        ? `≥${emp.hitCommissionThreshold}`
                        : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-sky-600">
                      {(emp.commissionRate * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium text-amber-600">
                      ¥{Math.round(emp.commission).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50/60 font-medium text-gray-700">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-1.5" colSpan={4}>
                    小计
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    ¥{Math.round(totalBase).toLocaleString()}
                  </td>
                  <td className="px-3 py-1.5" />
                  <td className="px-3 py-1.5" />
                  <td className="px-3 py-1.5 text-right tabular-nums text-amber-700">
                    ¥{Math.round(totalCommission).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </td>
    </tr>
  );
};

export default EmployeeBreakdownRows;