export const MANUAL_CATEGORIES = ['工资底薪佣金','物业费','电费','水费','修理','日常支出','退费','其它'] as const;
const endpoint = '/api/dingtalk/manual-category';
async function parse(res: Response) { const data = await res.json(); if (!res.ok || data.errorcode !== 0) throw new Error(data.errormsg || '操作失败'); return data.data; }
export async function loadManualCategories(ids: string[]): Promise<Record<string,string>> {
  if (!ids.length) return {};
  const all: Record<string,string> = {};
  for (let i=0; i<ids.length; i+=150) {
    const qs = new URLSearchParams({ids: ids.slice(i,i+150).join(',')});
    Object.assign(all, (await parse(await fetch(`${endpoint}?${qs}`))).categories || {});
  }
  return all;
}
export async function saveManualCategories(ids: string[], category: string | null): Promise<void> {
  await parse(await fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ids,category})}));
}
