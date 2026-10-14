import React from 'react';
import { Store } from 'lucide-react';
import type { DingTalkReportItem } from '../../../api/dingtalk';
import {
  getStoreFromPaymentUnit,
  normalizeStoreName,
  type ColumnKey,
} from '../utils/constants';
import { extractItems, extractAmount } from '../utils/extract';
import StatusBadge from './StatusBadge';
import StoreAssignCell from './StoreAssignCell';

const DEFAULT_STORE = '富贵园';

interface UnitGroup {
  storeName: string;
  unitName: string;
  total: number;
  count: number;
  items: DingTalkReportItem[];
}

interface TypeGroup {
  typeName: string;
  total: number;
  count: number;
  totalCount: number;
  units: UnitGroup[];
}

interface Props {
  grouped: TypeGroup[];
  isColVisible: (key: ColumnKey) => boolean;
  selectedType: string | null;
  storeOptions?: string[];
  onManualStoreChanged?: (
    processInstanceId: string,
    storeName: string | null,
    isManual: boolean
  ) => void;
}

const GroupedResults: React.FC<Props> = ({
  grouped,
  isColVisible,
  selectedType,
  storeOptions = [],
  onManualStoreChanged,
}) => {
  if (!grouped || grouped.length === 0) return null;

  return (
    <div className="space-y-6">
      {grouped.map((g) => (
        <div
          key={g.typeName}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible"
        >
          <div className="px-5 py-3 bg-gray-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 text-sm">
                {g.typeName}
              </span>
              <span className="text-xs text-gray-400">
                {g.totalCount} 笔 · ¥
                {Math.round(g.total).toLocaleString('zh-CN')}
              </span>
            </div>
          </div>

          {g.units.map((u) => (
            <div
              key={`${u.storeName}||${u.unitName}`}
              className="border-t border-gray-100"
            >
              <div className="px-5 py-2 bg-emerald-50/40 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-emerald-100 text-emerald-700">
                  <Store className="w-3 h-3" />
                  {u.storeName || DEFAULT_STORE}
                </span>
                <span className="text-gray-500">{u.unitName}</span>
                <span className="text-gray-400 ml-auto">
                  {u.count} 笔 · ¥{Math.round(u.total).toLocaleString('zh-CN')}
                </span>
              </div>

              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50/60 text-gray-500">
                    <tr>
                      {isColVisible('title') && (
                        <th className="px-3 py-2 text-left">标题</th>
                      )}
                      {isColVisible('templateName') && (
                        <th className="px-3 py-2 text-left">流程类型</th>
                      )}
                      {isColVisible('items') && (
                        <th className="px-3 py-2 text-left">事项 / 明细</th>
                      )}
                      {isColVisible('amount') && (
                        <th className="px-3 py-2 text-right">金额（元）</th>
                      )}
                      {isColVisible('payeeAccount') && (
                        <th className="px-3 py-2 text-left">收款账户</th>
                      )}
                      {isColVisible('storeName') && (
                        <th className="px-3 py-2 text-left">门店</th>
                      )}
                      {isColVisible('paymentUnit') && (
                        <th className="px-3 py-2 text-left">付款单位</th>
                      )}
                      {isColVisible('status') && (
                        <th className="px-3 py-2 text-left">状态</th>
                      )}
                      {isColVisible('createTime') && (
                        <th className="px-3 py-2 text-left">创建时间</th>
                      )}
                      {isColVisible('finishTime') && (
                        <th className="px-3 py-2 text-left">完成时间</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {u.items.map((item, idx) => {
                      const pid: string =
                        item.processInstanceId || `__row_${idx}`;
                      const manual: boolean =
                        (item as any)._manualStore === true;

                      const rawStoreName = (item as any)._storeName as
                        | string
                        | null
                        | undefined;
                      const storeName: string | null =
                        rawStoreName ??
                        getStoreFromPaymentUnit(item.paymentUnit || '') ??
                        null;

                      const assignReason: string =
                        (item as any)._assignReason || '';

                      const itemsText = extractItems(
                        item.templateName || '',
                        item.formValues || {}
                      );
                      const amountNum =
                        extractAmount(
                          item.templateName || '',
                          item.formValues || {}
                        ) || 0;

                      return (
                        <tr
                          key={pid}
                          className="border-t border-gray-50 hover:bg-gray-50/40"
                        >
                          {isColVisible('title') && (
                            <td className="px-3 py-2 text-gray-700">
                              {item.title || '-'}
                            </td>
                          )}
                          {isColVisible('templateName') && (
                            <td className="px-3 py-2 text-gray-600">
                              {item.templateName || '-'}
                            </td>
                          )}
                          {isColVisible('items') && (
                            <td className="px-3 py-2 text-gray-600">
                              {itemsText || '-'}
                            </td>
                          )}
                          {isColVisible('amount') && (
                            <td className="px-3 py-2 text-right tabular-nums">
                              ¥
                              {Math.round(amountNum).toLocaleString('zh-CN')}
                            </td>
                          )}
                          {isColVisible('payeeAccount') && (
                            <td className="px-3 py-2 text-gray-600">
                              {item.payeeAccount || '-'}
                            </td>
                          )}
                          {isColVisible('storeName') && (
                            <td className="px-3 py-2">
                              <StoreAssignCell
                                processInstanceId={pid}
                                storeName={
                                  storeName
                                    ? normalizeStoreName(storeName) || storeName
                                    : null
                                }
                                assignReason={assignReason}
                                isManual={manual}
                                storeOptions={storeOptions}
                                onChanged={(next, isManual) =>
                                  onManualStoreChanged?.(pid, next, isManual)
                                }
                              />
                            </td>
                          )}
                          {isColVisible('paymentUnit') && (
                            <td className="px-3 py-2 text-gray-600">
                              {item.paymentUnit || '-'}
                            </td>
                          )}
                          {isColVisible('status') && (
                            <td className="px-3 py-2">
                              <StatusBadge
                                status={item.status}
                                result={item.result}
                                operationRecords={item.operationRecords}
                                originatorName={item.originatorName}
                                pendingApprovers={item.pendingApprovers}
                              />
                            </td>
                          )}
                          {isColVisible('createTime') && (
                            <td className="px-3 py-2 text-gray-500">
                              {item.createTime || '-'}
                            </td>
                          )}
                          {isColVisible('finishTime') && (
                            <td className="px-3 py-2 text-gray-500">
                              {item.finishTime || '-'}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default GroupedResults;