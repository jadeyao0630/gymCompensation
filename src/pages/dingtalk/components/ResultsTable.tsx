import React from 'react';
import { extractAmount, extractPayeeAccount, extractItems, fmtMoney } from '../utils/extract';
import { COLUMNS, type ColumnKey } from '../utils/constants';
import type { DingTalkReportItem } from '../../../api/dingtalk';
import StatusBadge from './StatusBadge';

interface Props {
  items: DingTalkReportItem[];
  visibleColumns: Set<ColumnKey>;
  isColVisible: (key: ColumnKey) => boolean;
}

export const ResultsTable: React.FC<Props> = ({
  items,
  isColVisible,
}) => {
  const visibleColCount = COLUMNS.filter((c) => isColVisible(c.key)).length || 1;

  return (
    <div className="border-t border-gray-100 overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            {COLUMNS.map((c) =>
              isColVisible(c.key) ? (
                <th
                  key={c.key}
                  className={`px-3 py-2 font-medium ${
                    c.key === 'amount' ? 'text-right' : 'text-left'
                  }`}
                >
                  {c.label}
                </th>
              ) : null
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((r, idx) => {
            /* ⭐ 防御 1：数据本身缺失 */
            if (!r) {
              return (
                <tr key={`empty-${idx}`}>
                  <td
                    colSpan={visibleColCount}
                    className="px-3 py-2 text-rose-600 text-[11px]"
                  >
                    ⚠️ 数据缺失
                  </td>
                </tr>
              );
            }

            /* ⭐ 防御 2：拉取失败的实例 */
            if (r.error) {
              return (
                <tr key={r.processInstanceId || `err-${idx}`}>
                  <td
                    colSpan={visibleColCount}
                    className="px-3 py-2 text-rose-600 text-[11px]"
                  >
                    ⚠️ 实例 {r.processInstanceId?.slice(0, 16) || ''} 拉取失败：
                    {r.error}
                  </td>
                </tr>
              );
            }

            /* ⭐ 防御 3：字段缺失的兜底 */
            const templateName = r.templateName || '';
            const formValues = r.formValues || {};
            const amount = extractAmount(templateName, formValues);
            const payee = extractPayeeAccount(formValues);
            const itemsText = extractItems(templateName, formValues);

            return (
              <tr key={r.processInstanceId || `row-${idx}`} className="hover:bg-blue-50/30">
                {isColVisible('title') && (
                  <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={r.title || ''}>
                    {r.title || '—'}
                  </td>
                )}
                {isColVisible('items') && (
                  <td className="px-3 py-2 text-gray-600 max-w-md" title={itemsText}>
                    <span className="line-clamp-2">{itemsText || '—'}</span>
                  </td>
                )}
                {isColVisible('amount') && (
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                    {amount !== null && amount !== undefined ? fmtMoney(amount) : '—'}
                  </td>
                )}
                {isColVisible('payee') && (
                  <td className="px-3 py-2 text-gray-600">{payee || '—'}</td>
                )}
                {isColVisible('status') && (
                  <td className="px-3 py-2">
                    <StatusBadge
                      status={r.status}
                      result={r.result}
                      operationRecords={r.operationRecords}
                      originatorName={r.originatorName}
                      pendingApprovers={r.pendingApprovers}
                    />
                  </td>
                )}
                {isColVisible('createTime') && (
                  <td className="px-3 py-2 text-gray-500 tabular-nums whitespace-nowrap">
                    {r.createTime || '—'}
                  </td>
                )}
                {isColVisible('finishTime') && (
                  <td className="px-3 py-2 text-gray-500 tabular-nums whitespace-nowrap">
                    {r.finishTime || '—'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;