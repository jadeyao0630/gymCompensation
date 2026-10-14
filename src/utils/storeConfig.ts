/* ============================================================
 * ⭐ 门店配置（前端）：从后端 API 读取 + 内存缓存
 *   - 门店名统一归一化：去掉结尾的「店」
 * ============================================================ */
import type { StoreInfo } from '../constants/stores';

/* ⭐ 门店名归一化：富贵园店 → 富贵园 */
export function normalizeStoreName(name: string | null | undefined): string {
  const raw = name == null ? '' : String(name).trim();
  if (!raw) return '';
  return raw.replace(/店$/, '').trim();
}

/* ---------- 内存缓存 ---------- */
let CACHE: StoreInfo[] | null = null;

/* ---------- 默认数据 ---------- */
const FALLBACK_STORES: StoreInfo[] = [
  {
    id: '12279',
    name: '富贵园',
    shortName: '富贵园',
    paymentUnits: [
      '北京林朗韵动体育管理有限公司',
      '北京林朗体育管理有限公司东花市大街分公司',
    ],
    keywords: ['富贵园', '富贵', '东花市'],
    isDefault: true,
  },
  {
    id: '11536',
    name: '哈德门',
    shortName: '哈德门',
    paymentUnits: [
      '北京林朗悦动体育管理有限公司',
      '北京林朗体育管理有限公司',
    ],
    keywords: ['哈德门', '哈德'],
  },
];

function cloneFallback(): StoreInfo[] {
  return FALLBACK_STORES.map((s) => ({ ...s }));
}

/* ---------- ⭐ 从后端拉取 ---------- */
export async function fetchStores(): Promise<StoreInfo[]> {
  try {
    const res = await fetch('/api/dingtalk/store-config');
    const json = await res.json();
    if (json.errorcode === 0 && Array.isArray(json.data?.stores)) {
      const list: StoreInfo[] = json.data.stores.map((s: StoreInfo) => ({
        ...s,
        name: normalizeStoreName(s.name) || s.name,
        shortName: normalizeStoreName(s.shortName || s.name) || s.shortName,
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

/* ---------- ⭐ 保存到后端 ---------- */
export async function saveStores(list: StoreInfo[]): Promise<StoreInfo[]> {
  const res = await fetch('/api/dingtalk/store-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stores: list.map((s) => ({
        ...s,
        name: normalizeStoreName(s.name) || s.name,
        shortName: normalizeStoreName(s.shortName || s.name) || s.shortName,
      })),
    }),
  });
  const json = await res.json();
  if (json.errorcode !== 0) throw new Error(json.errormsg || '保存失败');

  const raw = Array.isArray(json.data?.stores) ? json.data.stores : list;
  const next: StoreInfo[] = raw.map((s: StoreInfo) => ({
    ...s,
    name: normalizeStoreName(s.name) || s.name,
    shortName: normalizeStoreName(s.shortName || s.name) || s.shortName,
  }));
  CACHE = next;
  return next;
}

/* ---------- 读内存缓存（同步） ---------- */
export function getStores(): StoreInfo[] {
  if (!CACHE) return cloneFallback();
  return CACHE;
}

/* ---------- 匹配函数（同步，基于内存缓存） ---------- */
export function matchStoreByPaymentUnit(
  paymentUnit: string | null | undefined
): string {
  const raw = paymentUnit == null ? '' : String(paymentUnit).trim();
  if (!raw) return '';
  const stores = getStores();

  for (const s of stores) {
    for (const u of s.paymentUnits) {
      if (raw === u) return s.name;
    }
  }
  for (const s of stores) {
    for (const u of s.paymentUnits) {
      if (raw.includes(u) || u.includes(raw)) return s.name;
    }
  }
  for (const s of stores) {
    if (raw.includes(s.name) || raw.includes(s.shortName)) return s.name;
  }
  return '';
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
        bestStore = s.name;
      }
    }
  }
  return bestStore;
}

export function matchStoreByItem(item: any): string {
  const byUnit = matchStoreByPaymentUnit(item?.paymentUnit);
  if (byUnit) return byUnit;

  const parts: string[] = [];
  if (Array.isArray(item?.items)) {
    item.items.forEach((it: any) => {
      if (it?.content) parts.push(String(it.content));
    });
  }
  const fv = item?.formValues || {};
  [
    '付款内容提要',
    '借款提要',
    '事项',
    '事项/明细',
    '报销事由',
    '费用类型',
    '明细',
    '备注',
    '用途',
    '摘要',
    '事由',
    '说明',
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