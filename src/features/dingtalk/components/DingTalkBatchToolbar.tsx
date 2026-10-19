import React from 'react';
import StyledDropdown from './StyledDropdown';
import { MANUAL_CATEGORIES } from '../manualCategory';
interface Props {ids:string[];selectedIds:Set<string>;onSelect:(ids:Set<string>)=>void;bulkCategory:string;onBulkCategoryChange:(v:string)=>void;onChange:(ids:string[],category:string|null)=>void|Promise<void>;saving?:boolean;error?:string;}
export default function DingTalkBatchToolbar({ids,selectedIds,onSelect,bulkCategory,onBulkCategoryChange,onChange,saving=false,error=''}:Props){
 const unique=[...new Set(ids.filter(Boolean))];
 const selected=unique.filter(id=>selectedIds.has(id));
 return <div className="dt-batch-toolbar flex flex-wrap gap-2 items-center text-xs text-slate-600">
 <label className="inline-flex items-center gap-1"><input type="checkbox" checked={unique.length>0&&unique.every(id=>selectedIds.has(id))} onChange={e=>onSelect(e.target.checked?new Set(unique):new Set())}/> 全选</label>
 <span>已选 {selected.length} 笔</span>
 <StyledDropdown ariaLabel="批量费用分类" className="w-[150px]" value={bulkCategory} onChange={onBulkCategoryChange} disabled={saving} options={MANUAL_CATEGORIES.map(c=>({value:c,label:c}))} />
 <button type="button" className="h-8 px-3 rounded-lg bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" disabled={!selected.length||saving} onClick={()=>void onChange(selected,bulkCategory)}>批量修改分类</button>
 <button type="button" className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" disabled={!selected.length||saving} onClick={()=>void onChange(selected,null)}>恢复自动分类</button>
 {saving&&<span>保存中…</span>}{error&&<span className="text-red-600">{error}</span>}
 </div>;
}
