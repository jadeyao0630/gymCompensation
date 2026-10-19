import React from 'react';
import { dingTalkTableClass, dingTalkTableHeadClass, dingTalkTableCellClass, dingTalkTableHeaderCellClass } from './tableStyles';
import type { DingTalkReportItem } from '../../../api/dingtalk';
import { monthlyAmount } from '../accounting';
import CategoryAssignCell from '../CategoryAssignCell';
import StoreAssignCell from '../../../pages/dingtalk/components/StoreAssignCell';
import StatusBadge from '../../../pages/dingtalk/components/StatusBadge';
import { extractItems } from '../../../pages/dingtalk/utils/extract';
import { getStoreFromPaymentUnit } from '../../../pages/dingtalk/utils/constants';

export type DingTalkColumn = 'title'|'templateName'|'items'|'amount'|'payeeAccount'|'storeName'|'paymentUnit'|'status'|'createTime'|'finishTime'|'category';
export interface DingTalkTableRow { item: DingTalkReportItem; amount?: number; automaticCategory?: string; storeName?: string; rowKey?: string; }
interface Props {
 rows: DingTalkTableRow[];
 columns?: DingTalkColumn[];
 selectedIds?: Set<string>;
 onToggleSelected?: (id:string)=>void;
 storeOptions?: string[];
 onManualStoreChanged?: (id:string,store:string|null,manual:boolean)=>void|Promise<void>;
 onManualCategoriesChanged?: (ids:string[],category:string|null)=>void|Promise<void>;
 categorySaving?: boolean;
}
const headings:Record<DingTalkColumn,string>={title:'标题',templateName:'流程类型',items:'事项 / 明细',amount:'金额（元）',payeeAccount:'收款账户',storeName:'门店',paymentUnit:'付款单位',status:'状态',createTime:'创建时间',finishTime:'完成时间',category:'费用分类'};
const defaults:DingTalkColumn[]=['title','templateName','items','amount','payeeAccount','storeName','paymentUnit','status','createTime','finishTime','category'];
export default function DingTalkDataTable({rows,columns=defaults,selectedIds,onToggleSelected,storeOptions=[],onManualStoreChanged,onManualCategoriesChanged,categorySaving=false}:Props){
 const hasSelection=!!onToggleSelected;
 return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className={dingTalkTableClass}><thead className={dingTalkTableHeadClass}><tr>
 {hasSelection&&<th className={`${dingTalkTableHeaderCellClass} text-left`}>选择</th>}
 {columns.map(c=><th key={c} className={`${dingTalkTableHeaderCellClass} ${c==='amount'?'text-right':'text-left'}`}>{headings[c]}</th>)}
 </tr></thead><tbody >{rows.map(({item,amount,automaticCategory,storeName,rowKey},index)=>{
 const id=item.processInstanceId||'';
 const store=storeName||(item as any)._storeName||getStoreFromPaymentUnit(item.paymentUnit||'')||'';
 const cells:Record<DingTalkColumn,React.ReactNode>={
 title:item.title||'-',templateName:item.templateName||'-',items:extractItems(item.templateName||'',item.formValues||{})||'-',
 amount:<span className="tabular-nums">¥{(amount??monthlyAmount(item)).toLocaleString('zh-CN',{maximumFractionDigits:2})}</span>,
 payeeAccount:item.payeeAccount||'-',
 storeName:onManualStoreChanged?<StoreAssignCell processInstanceId={id} storeName={store} assignReason={(item as any)._assignReason||''} isManual={(item as any)._manualStore===true} storeOptions={storeOptions} onChanged={(next,manual)=>void onManualStoreChanged(id,next,manual)}/>:store||'-',
 paymentUnit:item.paymentUnit||'-',
 status:<StatusBadge status={item.status} result={item.result} operationRecords={item.operationRecords} originatorName={item.originatorName} pendingApprovers={item.pendingApprovers}/>,
 createTime:item.createTime||'-',finishTime:item.finishTime||'-',
 category:onManualCategoriesChanged?<CategoryAssignCell processInstanceId={id} category={(item as any)._manualCategory||null} automaticCategory={automaticCategory||item.templateName||'其它'} disabled={categorySaving} onChange={c=>onManualCategoriesChanged([id],c)}/>:automaticCategory||item.templateName||'-'
 };
 return <tr key={rowKey||id||`row-${index}`} className="hover:bg-indigo-50/30 transition-colors">
 {hasSelection&&<td className={dingTalkTableCellClass}><input aria-label="选择流程" type="checkbox" disabled={!id} checked={!!id&&selectedIds?.has(id)===true} onChange={()=>id&&onToggleSelected?.(id)}/></td>}
 {columns.map(c=><td key={c} className={`${dingTalkTableCellClass} ${c==='amount'?'text-right font-medium':'text-gray-700'}`}>{cells[c]}</td>)}
 </tr>;
 })}</tbody></table></div>;
}
