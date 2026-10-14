/* ============================================================
 * ⭐ 钉钉表单字段提取工具
 *   - 事项 / 明细
 *   - 金额（含退款）
 *   - 收款账户
 * ============================================================ */

import type { DingTalkReportItem } from '../../../api/dingtalk';

/* ---------- 通用：字段名归一化（去空格、全角转半角） ---------- */
export function normalizeKey(k: string): string {
  return String(k || '')
    .replace(/\s+/g, '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/：/g, ':');
}

function normalizeFormValues(
  formValues: Record<string, any>
): Record<string, any> {
  const out: Record<string, any> = {};
  Object.keys(formValues || {}).forEach((k) => {
    out[normalizeKey(k)] = formValues[k];
  });
  return out;
}

/* ============================================================
 * ⭐ 事项 / 明细
 * ============================================================ */
export function extractItems(
  templateName: string,
  formValues: Record<string, any>
): string {
  const fv = normalizeFormValues(formValues);
  const parts: string[] = [];

  /* 1) 明细列表（JSON 字符串） */
  const rawDetail = fv['明细列表'] ?? formValues['明细列表'];
  if (rawDetail != null && rawDetail !== 'null' && rawDetail !== '') {
    if (typeof rawDetail === 'string') {
      try {
        const parsed = JSON.parse(rawDetail);
        if (Array.isArray(parsed)) {
          parsed.forEach((row: any) => {
            (row?.rowValue || []).forEach((f: any) => {
              const label = String(f?.label || '');
              const value = f?.value;
              if (value == null || value === 'null' || value === '') return;
              if (
                label.includes('事项') ||
                label.includes('内容') ||
                label.includes('名称') ||
                label.includes('用途') ||
                label.includes('说明')
              ) {
                parts.push(String(value));
              }
            });
          });
        }
      } catch {
        parts.push(String(rawDetail));
      }
    } else if (typeof rawDetail === 'object') {
      try {
        parts.push(JSON.stringify(rawDetail));
      } catch {
        /* ignore */
      }
    }
  }

  /* 2) items 数组（已解析） */
  const items = (formValues as any).items;
  if (Array.isArray(items)) {
    items.forEach((it: any) => {
      if (it?.content) parts.push(String(it.content));
    });
  }

  /* 3) 常见文本字段 */
  const textKeys = [
    '事项',
    '事项/明细',
    '报销事由',
    '费用类型',
    '明细',
    '备注',
    '事由',
    '用途',
    '摘要',
    '说明',
    '付款内容提要',
    '付款事由',
    '付款用途',
    '借款提要',
    '退款原因',
    '退卡原因',
  ];
  textKeys.forEach((k) => {
    const nk = normalizeKey(k);
    const v = fv[nk] ?? formValues[k];
    if (v == null || v === 'null' || v === '') return;
    if (typeof v === 'object') {
      try {
        parts.push(JSON.stringify(v));
      } catch {
        /* ignore */
      }
    } else {
      parts.push(String(v));
    }
  });

  /* 去重、去空 */
  const uniq = Array.from(
    new Set(parts.map((s) => s.trim()).filter(Boolean))
  );
  return uniq.join('；');
}

/* ============================================================
 * ⭐ 金额（含退款）
 * ============================================================ */
export function extractAmount(
  templateName: string,
  formValues: Record<string, any>
): number | null {
  const fv = normalizeFormValues(formValues);

  const candidates = [
    /* 退款 / 补退 */
    '补退金额(元)',
    '补退金额',
    '退款金额(元)',
    '退款金额',
    '实退金额(元)',
    '实退金额',
    '应退金额(元)',
    '应退金额',
    '退费金额(元)',
    '退费金额',

    /* 报销 / 借款 */
    '报销金额(元)',
    '报销金额',
    '借款金额(元)',
    '借款金额',
    '备用金金额(元)',
    '备用金金额',

    /* 付款 */
    '本次申请支付金额(元)',
    '本次申请支付金额',
    '付款金额(元)',
    '付款金额',
    '总价款(元)',
    '总价款',

    /* 通用 */
    '金额(元)',
    '金额',
    '合计(元)',
    '合计',
  ];

  for (const c of candidates) {
    const key = normalizeKey(c);
    const v = fv[key];
    if (v == null || v === 'null' || v === '') continue;
    const n = Number(String(v).replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n) && n !== 0) return n;
  }

  /* 明细列表里累加 */
  const rawDetail = fv['明细列表'] ?? formValues['明细列表'];
  if (typeof rawDetail === 'string' && rawDetail && rawDetail !== 'null') {
    try {
      const parsed = JSON.parse(rawDetail);
      if (Array.isArray(parsed)) {
        let sum = 0;
        parsed.forEach((row: any) => {
          (row?.rowValue || []).forEach((f: any) => {
            const label = String(f?.label || '');
            if (label.includes('金额')) {
              const n = Number(
                String(f?.value || '').replace(/[^\d.-]/g, '')
              );
              if (Number.isFinite(n)) sum += n;
            }
          });
        });
        if (sum !== 0) return sum;
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

/* ============================================================
 * ⭐ 收款账户
 * ============================================================ */
export function extractPayeeAccount(
  formValues: Record<string, any>
): string {
  const fv = normalizeFormValues(formValues);
  const candidates = [
    '收款账户',
    '收款人',
    '收款方',
    '收款单位',
    '收款账号',
    '收款账户名称',
    '收款人姓名',
    '银行卡号',
    '账户',
  ];
  for (const c of candidates) {
    const key = normalizeKey(c);
    const v = fv[key];
    if (v == null || v === 'null' || v === '') continue;
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v);
      } catch {
        continue;
      }
    }
    return String(v);
  }
  return '';
}

/* ============================================================
 * ⭐ 金额格式化
 * ============================================================ */
export function fmtMoney(n: number | null | undefined): string {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '—';
  return `¥${v.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ============================================================
 * ⭐ 其它兼容导出
 * ============================================================ */
export function pickAmountFromItem(item: DingTalkReportItem): number {
  return extractAmount(item.templateName || '', item.formValues || {}) || 0;
}