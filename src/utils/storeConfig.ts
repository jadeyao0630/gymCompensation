/* ============================================================
 * ⭐ 门店配置（前端）：从后端 API 读取 + 内存缓存
 *   - 门店名归一化：去掉结尾的「店」
 *   - paymentUnits：支持「公司 + 有效时间段」
 * ============================================================ */
import type { StoreInfo, PaymentUnitEntry } from '../constants/stores';

export function normalizeStoreName(name: string | null | undefined): string {
  const raw = name == null ? '' : String(name).trim();
  if (!raw) return '';
  return raw.replace(/店$/, '').trim();
}

/* ⭐ 兼容解析 paymentUnits */
export function parsePaymentUnits(raw: any): PaymentUnitEntry[] {
  if (raw == null) return [];
  let arr: any = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];

  const out: PaymentUnitEntry[] = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      const company = item.trim();
      if (company) out.push({ company, validFrom: null, validTo: null });
      continue;
    }
    if (item && typeof item === 'object') {
      const company = String(item.company || item.name || '').trim();
      if (!company) continue;
      out.push({
        company,
        validFrom: item.validFrom ? String(item.validFrom) : null,
        validTo: item.validTo ? String(item.validTo) : null,
      });
    }
  }
  return out;
}

function toDateStr(v: string | null | undefined): string | null {
  if (v == null || v === '') return null;
  const s = String(v).trim().replace(/\//g, '-');
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function isCompanyValidAt(
  entry: PaymentUnitEntry,
  atDate?: string | null
): boolean {
  if (!atDate) return true;
  const from = toDateStr(entry.validFrom);
  const to = toDateStr(entry.validTo);
  const at = toDateStr(atDate);
  if (!at) return true;
  if (from && at < from) return false;
  if (to && at > to) return false;
  return true;
}

let CACHE: StoreInfo[] | null = null;

const FALLBACK_STORES: StoreInfo[] = [
  {
    id: '12279',
    name: '富贵园',
    shortName: '富贵园',
    paymentUnits: [
      { company: '北京林朗韵动体育管理有限公司' },
      { company: '北京林朗体育管理有限公司东花市大街分公司' },
    ],
    keywords: ['富贵园', '富贵', '东花市'],
    isDefault: true,
  },
  {
    id: '11536',
    name: '哈德门',
    shortName: '哈德门',
    paymentUnits: [
      { company: '北京林朗悦动体育管理有限公司' },
      { company: '北京林朗体育管理有限公司' },
    ],
    keywords: ['哈德门', '哈德'],
  },
];

function cloneFallback(): StoreInfo[] {
  return FALLBACK_STORES.map((s) => ({
    ...s,
    paymentUnits: s.paymentUnits.map((p) => ({ ...p })),
    keywords: [...s.keywords],
  }));
}

export async function fetchStores(): Promise<StoreInfo[]> {
  try {
    const res = await fetch('/api/dingtalk/store-config');
    const json = await res.json();
    if (json.errorcode === 0 && Array.isArray(json.data?.stores)) {
      const list: StoreInfo[] = json.data.stores.map((s: any) => ({
        ...s,
        name: normalizeStoreName(s.name) || s.name,
        shortName: normalizeStoreName(s.shortName || s.name) || s.shortName,
        paymentUnits: parsePaymentUnits(s.paymentUnits),
        keywords: Array.isArray(s.keywords) ? s.keywords : [],
      }));
      CACHE = list;
      return list;
    }
  } catch (e) {
    console.warn('[storeConfig] fetchStores 失败', e);
  }
  if (!CACHE) CACHE = cloneFallback();
  return CACHE;
}

export async function saveStores(list: StoreInfo[]): Promise<StoreInfo[]> {
  const res = await fetch('/api/dingtalk/store-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stores: list.map((s) => ({
        ...s,
        name: normalizeStoreName(s.name) || s.name,
        shortName: normalizeStoreName(s.shortName || s.name) || s.shortName,
        paymentUnits: parsePaymentUnits(s.paymentUnits),
      })),
    }),
  });
  const json = await res.json();
  if (json.errorcode !== 0) throw new Error(json.errormsg || '保存失败');

  const raw = Array.isArray(json.data?.stores) ? json.data.stores : list;
  const next: StoreInfo[] = raw.map((s: any) => ({
    ...s,
    name: normalizeStoreName(s.name) || s.name,
    shortName: normalizeStoreName(s.shortName || s.name) || s.shortName,
    paymentUnits: parsePaymentUnits(s.paymentUnits),
    keywords: Array.isArray(s.keywords) ? s.keywords : [],
  }));
  CACHE = next;
  return next;
}

export function getStores(): StoreInfo[] {
  if (!CACHE) return cloneFallback();
  return CACHE;
}

/* ⭐ 付款公司 → 门店 */
export function resolveStoreByPaymentUnit(
  paymentUnit: string | null | undefined
): string {
  const raw = paymentUnit == null ? '' : String(paymentUnit).trim();
  if (!raw) return '';
  const stores = getStores();

  for (const s of stores) {
    for (const u of s.paymentUnits) {
      if (raw === u.company) return normalizeStoreName(s.name) || s.name;
    }
  }
  for (const s of stores) {
    for (const u of s.paymentUnits) {
      if (raw.includes(u.company) || u.company.includes(raw)) {
        return normalizeStoreName(s.name) || s.name;
      }
    }
  }
  for (const s of stores) {
    const name = normalizeStoreName(s.name) || s.name;
    const short = normalizeStoreName(s.shortName || s.name) || s.shortName;
    if (raw.includes(name) || (short && raw.includes(short))) return name;
  }
  return '';
}

/* ⭐ 门店 + 发起时间 → 该门店下有效公司 */
export function resolveCompanyInStore(
  storeName: string | null | undefined,
  atDate?: string | null
): {
  storeName: string;
  company: string;
  validFrom?: string | null;
  validTo?: string | null;
  fallback?: boolean;
} | null {
  const clean = normalizeStoreName(storeName) || (storeName || '');
  if (!clean) return null;
  const stores = getStores();
  const store = stores.find(
    (s) => (normalizeStoreName(s.name) || s.name) === clean
  );
  if (!store) return null;

  for (const entry of store.paymentUnits) {
    if (isCompanyValidAt(entry, atDate)) {
      return {
        storeName: clean,
        company: entry.company,
        validFrom: entry.validFrom || null,
        validTo: entry.validTo || null,
      };
    }
  }
  if (store.paymentUnits.length > 0) {
    const first = store.paymentUnits[0];
    return {
      storeName: clean,
      company: first.company,
      validFrom: first.validFrom || null,
      validTo: first.validTo || null,
      fallback: true,
    };
  }
  return null;
}

/* 旧名兼容 */
export function matchStoreByPaymentUnit(
  paymentUnit: string | null | undefined
): string {
  return resolveStoreByPaymentUnit(paymentUnit);
}

export function matchStoreByText(text: string | null | undefined): string {
  const t = text == null ? '' : String(text);
  if (!t) return '';
  const stores = getStores();
  let bestStore = '';
  let bestIdx = Number.POSITIVE_INFINITY;
  for (const s of stores) {
    for (const k of s.keywords) {
      if (!k) continue;
      const idx = t.indexOf(k);
      if (idx !== -1 && idx < bestIdx) {
        bestIdx = idx;
        bestStore = normalizeStoreName(s.name) || s.name;
      }
    }
  }
  return bestStore;
}

export function matchStoreByItem(item: any): string {
  const byUnit = resolveStoreByPaymentUnit(item?.paymentUnit);
  if (byUnit) return byUnit;

  const parts: string[] = [];
  if (Array.isArray(item?.items)) {
    item.items.forEach((it: any) => {
      if (it?.content) parts.push(String(it.content));
    });
  }
  const fv = item?.formValues || {};
  [
    '付款内容提要', '借款提要', '事项', '事项/明细', '报销事由',
    '费用类型', '明细', '备注', '用途', '摘要', '事由', '说明',
  ].forEach((k) => {
    const v = fv[k];
    if (v == null || v === 'null' || v === '') return;
    if (typeof v === 'object') {
      try { parts.push(JSON.stringify(v)); } catch {}
    } else {
      parts.push(String(v));
    }
  });
  const rawDetail = fv['明细列表'];
  if (typeof rawDetail === 'string' && rawDetail && rawDetail !== 'null') {
    try {
      const parsed = JSON.parse(rawDetail);
      if (Array.isArray(parsed)) {
        parsed.forEach((row: any) => {
          (row?.rowValue || []).forEach((f: any) => {
            if (f?.value != null && f.value !== 'null') {
              parts.push(String(f.value));
            }
          });
        });
      }
    } catch { /* ignore */ }
  }
  if (item?.title) parts.push(String(item.title));

  return matchStoreByText(parts.join(' '));
}