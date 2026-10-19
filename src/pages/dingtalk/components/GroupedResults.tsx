import React, {useState} from 'react';
import { Store } from 'lucide-react';
import type { DingTalkReportItem } from '../../../api/dingtalk';
import type { ColumnKey } from '../utils/constants';
import DingTalkDataTable, {type DingTalkColumn} from '../../../features/dingtalk/components/DingTalkDataTable';
import DingTalkBatchToolbar from '../../../features/dingtalk/components/DingTalkBatchToolbar';
interface UnitGroup {storeName:string;unitName:string;total:number;count:number;items:DingTalkReportItem[]}
interface TypeGroup {typeName:string;total:number;count:number;totalCount:number;units:UnitGroup[]}
interface Props {grouped:TypeGroup[];isColVisible:(key:ColumnKey)=>boolean;selectedType:string|null;storeOptions?:string[];onManualStoreChanged?:(id:string,store:string|null,manual:boolean)=>void;onManualCategoriesChanged?:(ids:string[],category:string|null)=>Promise<void>;categorySaving?:boolean;categoryError?:string}
const columns:DingTalkColumn[]=['title','templateName','items','amount','payeeAccount','storeName','paymentUnit','status','createTime','finishTime'];
export default function GroupedResults({grouped,isColVisible,selectedType,storeOptions=[],onManualStoreChanged,onManualCategoriesChanged,categorySaving=false,categoryError=''}:Props){
 const [selected,setSelected]=useState<Set<string>>(new Set());const [bulk,setBulk]=useState('修理');
 const shown=grouped.filter(g=>!selectedType||g.typeName===selectedType);
 const ids=[...new Set(shown.flatMap(g=>g.units.flatMap(u=>u.items.map(r=>r.processInstanceId||''))).filter(Boolean))];
 const change=async(selectedIds:string[],category:string|null)=>{if(!onManualCategoriesChanged)return;await onManualCategoriesChanged(selectedIds,category);setSelected(new Set());};
 if(!shown.length)return null;
 return <div className="space-y-6">
 {onManualCategoriesChanged&&<div className="bg-white rounded-xl border border-solid border-slate-200 overflow-visible shadow-none"><DingTalkBatchToolbar ids={ids} selectedIds={selected} onSelect={setSelected} bulkCategory={bulk} onBulkCategoryChange={setBulk} onChange={change} saving={categorySaving} error={categoryError}/></div>}
 {shown.map(g=><div key={g.typeName} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
 <div className="px-5 py-3 bg-gray-50/60 text-sm font-semibold">{g.typeName} <span className="text-xs font-normal text-gray-400">{g.totalCount} 笔 · ¥{Math.round(g.total).toLocaleString('zh-CN')}</span></div>
 {g.units.map(u=><div key={`${u.storeName}||${u.unitName}`} className="border-t border-gray-100">
 <div className="px-5 py-2 bg-emerald-50/40 flex gap-2 items-center text-xs"><Store className="w-3 h-3"/><span>{u.storeName}</span><span className="text-gray-500">{u.unitName}</span><span className="ml-auto">{u.count} 笔 · ¥{Math.round(u.total).toLocaleString('zh-CN')}</span></div>
 <DingTalkDataTable rows={u.items.map((item,index)=>({item,automaticCategory:g.typeName,storeName:u.storeName,rowKey:`${item.processInstanceId||index}-${g.typeName}`}))} columns={[...columns.filter(c=>c==='storeName'||isColVisible(c as ColumnKey)), 'category']} selectedIds={selected} onToggleSelected={onManualCategoriesChanged?(id)=>setSelected(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next;}):undefined} storeOptions={storeOptions} onManualStoreChanged={onManualStoreChanged} onManualCategoriesChanged={onManualCategoriesChanged} categorySaving={categorySaving}/>
 </div>)}
 </div>)}
 </div>;
}
