import React from 'react';
import { extractAmount, extractPayeeAccount, extractItems, fmtMoney } from '../utils/extract';
import { COLUMNS, type ColumnKey } from '../utils/constants';
import type { DingTalkReportItem } from '../../../api/dingtalk';

interface Props {
  items: DingTalkReportItem[];
  visibleColumns: Set<ColumnKey>;
  isColVisible: (key: ColumnKey) => boolean;
}

export const ResultsTable: React.FC<Props> = ({
  items,
  isColVisible,
}) => {
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
          {items.map((r) => {
            const amount = extractAmount(r.templateName, r.formValues);
            const payee = extractPayeeAccount(r.formValues);
            const itemsText = extractItems(r.templateName, r.formValues);
            return (
              <tr key={r.processInstanceId} className="hover:bg-blue-50/30">
                {isColVisible('title') && (
                  <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={r.title}>
                    {r.title || '—'}
                  </td>
                )}
                {isColVisible('items') && (
                  <td className="px-3 py-2 text-gray-600 max-w-md" title={itemsText}>
                    <span className="line-clamp-2">{itemsText}</span>
                  </td>
                )}
                {isColVisible('amount') && (
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                    {amount !== null ? fmtMoney(amount) : '—'}
                  </td>
                )}
                {isColVisible('payee') && (
                  <td className="px-3 py-2 text-gray-600">{payee || '—'}</td>
                )}
                {isColVisible('status') && (
                  <td className="px-3 py-2">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] border bg-emerald-50 text-emerald-700 border-emerald-100">
                      已通过
                    </span>
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