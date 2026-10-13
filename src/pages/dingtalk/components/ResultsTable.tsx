import React, { useEffect, useState } from 'react';
import {
  extractAmount, extractPayeeAccount, extractItems, fmtMoney,
} from '../utils/extract';
import { COLUMNS, type ColumnKey } from '../utils/constants';
import type { DingTalkReportItem } from '../../../api/dingtalk';
import { getStores } from '../../../utils/storeConfig';
import StatusBadge from './StatusBadge';

interface Props {
  items: DingTalkReportItem[];
  visibleColumns?: Set<ColumnKey>;
  isColVisible: (key: ColumnKey) => boolean;
  /* ⭐ 手动归属后的回调 */
  onManualStoreChanged?: (
    processInstanceId: string,
    storeName: string | null
  ) => Promise<void> | void;
}

/* ⭐ 手动归属下拉 */
const ManualStoreSelect: React.FC<{
  item: DingTalkReportItem;
  onChanged?: (
    processInstanceId: string,
    storeName: string | null
  ) => Promise<void> | void;
}> = ({ item, onChanged }) => {
  const stores = getStores();

  /* ⭐ 用 _storeName（门店名），不是 _manualStore（boolean） */
  const initial: string =
    (item as any)._manualStore === true
      ? ((item as any)._storeName as string) || ''
      : '';

  const [value, setValue] = useState<string>(initial);
  const [saving, setSaving] = useState(false);

  /* ⭐ 外部 item 变化时同步（例如查询刷新） */
  useEffect(() => {
    const next: string =
      (item as any)._manualStore === true
        ? ((item as any)._storeName as string) || ''
        : '';
    setValue(next);
  }, [(item as any)._storeName, (item as any)._manualStore]);

  const handleChange = async (next: string) => {
    const prev = value;
    setValue(next);
    setSaving(true);
    try {
      await onChanged?.(item.processInstanceId || '', next || null);
    } catch (e) {
      console.warn('[ManualStore] 保存失败', e);
      setValue(prev);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving || !item.processInstanceId}
      className={`text-[11px] px-2 py-1 rounded border focus:outline-none ${
        value
          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
          : 'border-gray-200 bg-white text-gray-500'
      }`}
      title={saving ? '保存中…' : '手动指定门店'}
    >
      <option value="">未指定</option>
      {stores.map((s) => (
        <option key={s.id} value={s.name}>
          {s.name}
        </option>
      ))}
    </select>
  );
};

export const ResultsTable: React.FC<Props> = ({
  items,
  isColVisible,
  onManualStoreChanged,
}) => {
  const visibleColCount =
    COLUMNS.filter((c) => isColVisible(c.key)).length + 1 || 1;

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
            {/* ⭐ 手动归属列 */}
            <th className="px-3 py-2 font-medium text-left whitespace-nowrap">
              手动归属
            </th>
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

            const templateName: string = r.templateName || '';
            const formValues = r.formValues || {};
            const amount = extractAmount(templateName, formValues);
            const payee = extractPayeeAccount(formValues);
            const itemsText = extractItems(templateName, formValues);

            return (
              <tr
                key={r.processInstanceId || `row-${idx}`}
                className="hover:bg-blue-50/30"
              >
                {isColVisible('title') && (
                  <td
                    className="px-3 py-2 text-gray-700 max-w-xs truncate"
                    title={r.title || ''}
                  >
                    {r.title || '—'}
                  </td>
                )}
                {isColVisible('templateName') && (
                  <td className="px-3 py-2 text-gray-600">
                    {r.templateName || '—'}
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
                {isColVisible('payeeAccount') && (
                  <td className="px-3 py-2 text-gray-600">{payee || '—'}</td>
                )}
                {isColVisible('storeName') && (
                  <td className="px-3 py-2 text-gray-600">
                    {((r as any)._storeName as string) ||
                      ((r as any)._manualStore === true ? '未指定' : '—')}
                  </td>
                )}
                {isColVisible('paymentUnit') && (
                  <td className="px-3 py-2 text-gray-600">
                    {r.paymentUnit || '—'}
                  </td>
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

                {/* ⭐ 手动归属 */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <ManualStoreSelect
                    item={r}
                    onChanged={onManualStoreChanged}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;