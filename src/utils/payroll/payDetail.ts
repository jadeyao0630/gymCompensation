import type { PayDetailItem } from '../../types/payroll';

export function normalizePayDetail(raw: any): PayDetailItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => ({
      pay_type: String(p?.pay_type ?? p?.payType ?? '').trim(),
      amount: String(p?.amount ?? '0'),
      pay_type_id: String(p?.pay_type_id ?? p?.payTypeId ?? ''),
    }))
    .filter((p) => p.pay_type);
}

/** 从多个字段里提取 pay_detail */
export function pickPayDetail(r: Record<string, any>): PayDetailItem[] {
  const raw =
    r.pay_detail ??
    r.payDetail ??
    r.pay_details ??
    r.payDetails ??
    r.payments ??
    [];
  return normalizePayDetail(raw);
}

/** 合并两个 payDetail 数组（按 pay_type_id + pay_type 累加） */
export function mergePayDetail(
  a: PayDetailItem[] | undefined,
  b: PayDetailItem[] | undefined
): PayDetailItem[] {
  const map = new Map<string, PayDetailItem>();
  [...(a || []), ...(b || [])].forEach((item) => {
    const key = `${item.pay_type_id || item.pay_type}`;
    const cur = map.get(key);
    if (cur) {
      cur.amount = String(Number(cur.amount) + Number(item.amount));
    } else {
      map.set(key, { ...item });
    }
  });
  return Array.from(map.values());
}