/**
 * 钉钉审批流程节点类型 → 中文
 */
export function getOperationLabel(type: string, result: string): string {
  const t = String(type || '').toUpperCase();
  const r = String(result || '').toLowerCase();

  if (t === 'START') return '发起申请';
  if (t === 'AGREE' || r === 'agree') return '同意';
  if (t === 'REFUSE' || r === 'refuse') return '拒绝';
  if (t === 'REDIRECT') return '转交';
  if (t === 'COMMENT') return '评论';
  if (t === 'FINISH') return '完成';
  if (t === 'CANCEL') return '撤销';
  return type || '操作';
}

/**
 * 毫秒时间戳 → "MM-DD HH:mm"
 */
export function fmtOperationTime(ts: number | null | undefined): string {
  if (!ts) return '';
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}