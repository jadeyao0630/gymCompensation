// src/utils/payrollStorage.ts
import type { CompensationStore } from '../types/compensation';
import type { PayrollResult, EmployeePerformance } from './payroll';

export const STORAGE_KEY = 'gym_compensation_store_v2';
export const OVERRIDES_KEY = 'gym_position_overrides_v1';
export const NEWBIE_KEY = 'gym_newbie_staff_v1';

type FullStore = Record<string, CompensationStore>;

export const loadFullStore = (): FullStore => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('[payrollStorage] 解析失败', e);
    return {};
  }
};

export const saveFullStore = (store: FullStore) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('[payrollStorage] 保存失败', e);
  }
};

export const loadOverrides = (): Record<string, Record<string, string>> => {
  try {
    const saved = localStorage.getItem(OVERRIDES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('[payrollStorage] 覆盖表解析失败', e);
    return {};
  }
};

export const loadNewbie = (): Record<string, Set<string>> => {
  try {
    const saved = localStorage.getItem(NEWBIE_KEY);
    if (!saved) return {};
    const raw = JSON.parse(saved) as Record<string, string[]>;
    const next: Record<string, Set<string>> = {};
    Object.entries(raw).forEach(([sid, ids]) => {
      next[sid] = new Set(ids);
    });
    return next;
  } catch (e) {
    console.error('[payrollStorage] 新人表解析失败', e);
    return {};
  }
};

export const saveNewbie = (next: Record<string, Set<string>>) => {
  try {
    const raw: Record<string, string[]> = {};
    Object.entries(next).forEach(([sid, set]) => {
      raw[sid] = Array.from(set);
    });
    localStorage.setItem(NEWBIE_KEY, JSON.stringify(raw));
  } catch (e) {
    console.error('[payrollStorage] 写新人表失败', e);
  }
};