/**
 * 钉钉审批实例状态 → 中文展示
 */
export interface StatusDisplay {
  label: string;
  className: string;
}

export function getStatusDisplay(
  status: string | undefined | null,
  result: string | undefined | null
): StatusDisplay {
  const s = String(status || '').toUpperCase();
  const r = String(result || '').toLowerCase();

  if (s === 'RUNNING') {
    return {
      label: '审批中',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  if (s === 'COMPLETED') {
    if (r === 'agree' || r === 'approved' || r === 'pass') {
      return {
        label: '已通过',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    if (r === 'refuse' || r === 'reject' || r === 'refused') {
      return {
        label: '已拒绝',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }
    return {
      label: '已完成',
      className: 'bg-gray-50 text-gray-600 border-gray-200',
    };
  }

  if (s === 'CANCELED' || s === 'CANCELLED') {
    return {
      label: '已撤销',
      className: 'bg-gray-50 text-gray-500 border-gray-200',
    };
  }

  if (s === 'TERMINATED') {
    return {
      label: '已终止',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  return {
    label: status || '未知',
    className: 'bg-gray-50 text-gray-500 border-gray-200',
  };
}

export function getStatusLabel(
  status: string | undefined | null,
  result: string | undefined | null
): string {
  return getStatusDisplay(status, result).label;
}