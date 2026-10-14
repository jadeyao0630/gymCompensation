/* ============================================================
 * ⭐ 门店 & 付款公司类型
 * ============================================================ */

/* ⭐ 付款公司（含有效时间段） */
export interface PaymentUnitEntry {
  company: string;
  validFrom?: string | null; // YYYY-MM-DD
  validTo?: string | null;   // YYYY-MM-DD
}

export interface StoreInfo {
  id: string;
  name: string;
  shortName: string;
  paymentUnits: PaymentUnitEntry[];  // ⭐ 从 string[] 升级
  keywords: string[];
  isDefault?: boolean;
  sortOrder?: number;
}

/* 仅用于「首屏渲染前的兜底」和类型定义，实际配置从后端 /api/dingtalk/store-config 读 */
export const STORES: StoreInfo[] = [
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

export const DEFAULT_STORE_ID = '12279';

export function getStoreById(id: string): StoreInfo | undefined {
  return STORES.find((s) => s.id === id);
}