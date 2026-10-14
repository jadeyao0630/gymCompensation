/* ============================================================
 * ⭐ 操作类型 / 结果 / 时间 格式化
 * ============================================================ */

export function getOperationLabel(
  type: string | undefined | null,
  result: string | undefined | null
): string {
  const t = String(type || '').toLowerCase();
  const r = String(result || '').toLowerCase();

  const action = (() => {
    if (t === 'start') return '发起';
    if (t === 'process') return '审批';
    if (t === 'finish') return '完成';
    if (t === 'cancel') return '撤销';
    if (t === 'redirect') return '转交';
    if (t === 'comment') return '评论';
    if (t === 'cc') return '抄送';
    return type || '操作';
  })();

  const resultLabel = (() => {
    if (r === 'agree' || r === 'approved' || r === 'pass') return '同意';
    if (r === 'refuse' || r === 'reject' || r === 'refused') return '拒绝';
    return '';
  })();

  return resultLabel ? `${action} · ${resultLabel}` : action;
}

export function fmtOperationTime(
  date: string | number | null | undefined
): string {
  if (date === null || date === undefined || date === '') return '';

  let d: Date | null = null;

  if (typeof date === 'number') {
    d = new Date(date);
  } else {
    const s = String(date).trim();
    if (!s) return '';

    if (/^\d+$/.test(s)) {
      d = new Date(Number(s));
    } else {
      const normalized = s.replace(' ', 'T');
      const t = new Date(normalized);
      d = isNaN(t.getTime()) ? null : t;
    }
  }

  if (!d || isNaN(d.getTime())) return String(date);

  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}