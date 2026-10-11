import React from 'react';
import { Store, Tag } from 'lucide-react';
import { extractAmount, extractPayeeAccount, extractItems, fmtMoney } from '../utils/extract';
import { COLUMNS, type ColumnKey } from '../utils/constants';
import type { DingTalkReportItem } from '../../../api/dingtalk';
import StatusBadge from './StatusBadge';

interface Props {
  items: DingTalkReportItem[];
  visibleColumns: Set<ColumnKey>;
  isColVisible: (key: ColumnKey) => boolean;
}

/* ⭐ 兜底：把 ISO 时间格式化成 "YYYY-MM-DD HH:mm:ss" */
function formatDateTime(input?: string | null): string {
  if (!input) return '';
  if (!input.includes('T')) return input;
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/* ⭐ 与页面保持一致的类别覆盖规则 */
const PAYEE_CATEGORY_OVERRIDES: Array<{ payee: string; category: string }> = [
  { payee: '山东云优人力资源服务有限公司', category: '薪酬佣金' },
];

function resolveCategoryOverride(
  payeeAccount: string | null | undefined
): string | null {
  const raw = payeeAccount == null ? '' : String(payeeAccount).trim();
  if (!raw) return null;
  for (const rule of PAYEE_CATEGORY_OVERRIDES) {
    if (raw === rule.payee) return rule.category;
  }
  return null;
}

export const ResultsTable: React.FC<Props> = ({ items, isColVisible }) => {
  const visibleColCount =
    COLUMNS.filter((c) => isColVisible(c.key)).length || 1;

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

            const templateName = r.templateName || '';
            const formValues = r.formValues || {};
            const amount = extractAmount(templateName, formValues);
            const payee = extractPayeeAccount(formValues);
            const itemsText = extractItems(templateName, formValues);

            /* ⭐ 门店归属标记 */
            const autoAssigned =
              (r as any)._autoAssigned === true ||
              formValues.__autoAssigned === '1';
            const storeName =
              (r as any)._storeName ||
              formValues.__storeName ||
              formValues['门店'] ||
              '';

            /* ⭐ 类别覆盖标记 */
            const categoryOverride = resolveCategoryOverride(payee);

            const rowCls = autoAssigned
              ? 'bg-amber-50/40 hover:bg-amber-50/70'
              : categoryOverride
              ? 'bg-violet-50/40 hover:bg-violet-50/70'
              : 'hover:bg-blue-50/30';

            return (
              <tr
                key={r.processInstanceId || `row-${idx}`}
                className={rowCls}
              >
                {isColVisible('title') && (
                  <td
                    className="px-3 py-2 text-gray-700 max-w-xs"
                    title={r.title || ''}
                  >
                    <div className="truncate">{r.title || '—'}</div>

                    {/* ⭐ 门店归属徽标 */}
                    {autoAssigned && (
                      <div className="mt-0.5">
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300"
                          title={`已按门店「${storeName}」自动归属付款单位`}
                        >
                          <Store className="w-3 h-3" />
                          门店归属{storeName ? `：${storeName}` : ''}
                        </span>
                      </div>
                    )}

                    {/* ⭐ 类别覆盖徽标 */}
                    {categoryOverride && (
                      <div className="mt-0.5">
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[10px] font-medium bg-violet-100 text-violet-800 border border-violet-300"
                          title={`收款账户为「${payee}」，已归入类别「${categoryOverride}」`}
                        >
                          <Tag className="w-3 h-3" />
                          类别：{categoryOverride}
                        </span>
                      </div>
                    )}
                  </td>
                )}
                {isColVisible('items') && (
                  <td
                    className="px-3 py-2 text-gray-600 max-w-md"
                    title={itemsText}
                  >
                    <span className="line-clamp-2">{itemsText || '—'}</span>
                  </td>
                )}
                {isColVisible('amount') && (
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                    {amount !== null && amount !== undefined
                      ? fmtMoney(amount)
                      : '—'}
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
                    {formatDateTime(r.createTime) || '—'}
                  </td>
                )}
                {isColVisible('finishTime') && (
                  <td className="px-3 py-2 text-gray-500 tabular-nums whitespace-nowrap">
                    {formatDateTime(r.finishTime) || '—'}
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