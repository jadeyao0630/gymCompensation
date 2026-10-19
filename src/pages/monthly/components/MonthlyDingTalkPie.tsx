import React, { useMemo } from 'react';
import { GitBranch } from 'lucide-react';
import type { DingTalkReportItem } from '../../../api/dingtalk';

import { monthlyAmount, monthlyCategorySummary, validMonthlyItems } from '../utils/dingtalkAccounting';

type Slice = { label: string; value: number; count: number; color: string };
const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1'];
interface Props { items: DingTalkReportItem[]; storeLabel?: string; title?: string }
export const MonthlyDingTalkPie: React.FC<Props> = ({items,storeLabel,title='钉钉流程分类占比'}) => {
  const {slices, totalAmount, totalCount, rawTotal} = useMemo(() => {
    const valid = validMonthlyItems(items);
    const slices: Slice[] = monthlyCategorySummary(valid).map((s, i) => ({
      label: s.category, value: s.total, count: s.count, color: COLORS[i % COLORS.length],
    }));
    return {
      slices,
      totalAmount: slices.reduce((a, b) => a + b.value, 0),
      totalCount: valid.length,
      rawTotal: valid.reduce((a, r) => a + monthlyAmount(r), 0),
    };
  }, [items]);
  const size=200, center=100, outer=98, inner=60;
  let angle=-Math.PI/2;
  const arcs = slices.filter(s=>s.value>0).map(s=>{
    const start=angle;
    const span=totalAmount>0?s.value/totalAmount*2*Math.PI:0;
    angle+=span;
    const end=angle;
    if (span>=2*Math.PI-1e-8) return {slice:s,d:`M ${center+outer} ${center} A ${outer} ${outer} 0 1 1 ${center-outer} ${center} A ${outer} ${outer} 0 1 1 ${center+outer} ${center} M ${center+inner} ${center} A ${inner} ${inner} 0 1 0 ${center-inner} ${center} A ${inner} ${inner} 0 1 0 ${center+inner} ${center} Z`};
    const xy=(r:number,a:number)=>`${center+r*Math.cos(a)} ${center+r*Math.sin(a)}`;
    const large=span>Math.PI?1:0;
    return {slice:s,d:`M ${xy(outer,start)} A ${outer} ${outer} 0 ${large} 1 ${xy(outer,end)} L ${xy(inner,end)} A ${inner} ${inner} 0 ${large} 0 ${xy(inner,start)} Z`};
  });
  const money=(v:number)=>Math.round(v).toLocaleString('zh-CN');
  return <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><GitBranch className="w-4 h-4 text-indigo-600"/>{title}{storeLabel && <span className="text-[11px] font-normal text-gray-400">· {storeLabel}</span>}</h3>
      <span className="text-[11px] text-gray-400">共 {totalCount} 笔 · <span className="font-semibold text-indigo-700 tabular-nums">¥{money(totalAmount)}</span></span>
    </div>
    {Math.abs(rawTotal-totalAmount)>0.02 && <div className="mb-3 text-xs text-amber-700">金额校验：原始流程 ¥{money(rawTotal)}，分类汇总 ¥{money(totalAmount)}，差额 ¥{money(totalAmount-rawTotal)}</div>}
    {slices.length===0 ? <div className="text-xs text-gray-400 text-center py-10">当月无钉钉流程数据</div> : <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width={size} height={size} viewBox="0 0 200 200" className="shrink-0">{arcs.map(({slice,d})=><path key={slice.label} d={d} fill={slice.color} fillRule="evenodd" stroke="#fff" strokeWidth={2}><title>{slice.label} ¥{money(slice.value)}</title></path>)}{totalAmount===0 && <circle cx={100} cy={100} r={98} fill="#e5e7eb"/>}</svg>
      <div className="flex-1 w-full space-y-1.5">{slices.map(s=><div key={s.label} className="flex items-center gap-2 text-xs"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor:s.color}}/><span className="text-gray-700 flex-1 truncate" title={s.label}>{s.label}</span><span className="text-gray-500 tabular-nums">{s.count} 笔</span><span className="text-gray-800 font-semibold tabular-nums w-24 text-right">¥{money(s.value)}</span><span className="text-gray-400 tabular-nums w-12 text-right">{totalAmount>0?(s.value/totalAmount*100).toFixed(1):'0.0'}%</span></div>)}</div>
    </div>}
  </div>;
};
export default MonthlyDingTalkPie;
