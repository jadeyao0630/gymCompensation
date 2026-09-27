export interface StoreInfo {
  id: string;
  name: string;
  shortName: string;
}

export const STORES: StoreInfo[] = [
  { id: '12279', name: '富贵园', shortName: '富贵园' },
  { id: '11536', name: '哈德门', shortName: '哈德门' },
];

export const DEFAULT_STORE_ID = '12279';

export function getStoreById(id: string): StoreInfo | undefined {
  return STORES.find((s) => s.id === id);
}