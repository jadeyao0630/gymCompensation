import { useCallback, useEffect, useState } from 'react';

export interface DingTalkFiltersState {
  paymentUnits: string[];
  templateTypes: string[];
  onlyApproved: boolean;
  /* ⭐ 收款账户排除规则 */
  excludeAccounts: string[];
  excludeKeywords: string[];
}

const DEFAULT_STATE: DingTalkFiltersState = {
  paymentUnits: [],
  templateTypes: [],
  onlyApproved: false, // ⭐ 默认「全部状态」
  excludeAccounts: [],
  excludeKeywords: [],
};

function normalizeState(parsed: any): DingTalkFiltersState {
  return {
    paymentUnits: Array.isArray(parsed?.paymentUnits) ? parsed.paymentUnits : [],
    templateTypes: Array.isArray(parsed?.templateTypes) ? parsed.templateTypes : [],
    onlyApproved: !!parsed?.onlyApproved,
    excludeAccounts: Array.isArray(parsed?.excludeAccounts)
      ? parsed.excludeAccounts
      : [],
    excludeKeywords: Array.isArray(parsed?.excludeKeywords)
      ? parsed.excludeKeywords
      : [],
  };
}

/**
 * 钉钉报表筛选条件持久化
 * key = `gym_dingtalk_filters_v1_${storeId}`
 */
export function useDingTalkFilters(storeId: string) {
  const storageKey = `gym_dingtalk_filters_v1_${storeId || 'default'}`;

  const [state, setState] = useState<DingTalkFiltersState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return normalizeState(parsed);
        }
      }
    } catch (e) {
      console.warn('[useDingTalkFilters] 读取失败', e);
    }
    return { ...DEFAULT_STATE };
  });

  /* 写 localStorage */
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('[useDingTalkFilters] 写入失败', e);
    }
  }, [storageKey, state]);

  /* 门店切换 → 读该门店的配置 */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setState(normalizeState(parsed));
          return;
        }
      }
    } catch (e) {
      console.warn('[useDingTalkFilters] 门店切换读取失败', e);
    }
    setState({ ...DEFAULT_STATE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const togglePaymentUnit = useCallback((unit: string) => {
    setState((prev) => ({
      ...prev,
      paymentUnits: prev.paymentUnits.includes(unit)
        ? prev.paymentUnits.filter((u) => u !== unit)
        : [...prev.paymentUnits, unit],
    }));
  }, []);

  const setPaymentUnits = useCallback((units: string[]) => {
    setState((prev) => ({ ...prev, paymentUnits: units }));
  }, []);

  const toggleTemplateType = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      templateTypes: prev.templateTypes.includes(name)
        ? prev.templateTypes.filter((n) => n !== name)
        : [...prev.templateTypes, name],
    }));
  }, []);

  const setTemplateTypes = useCallback((names: string[]) => {
    setState((prev) => ({ ...prev, templateTypes: names }));
  }, []);

  const toggleOnlyApproved = useCallback(() => {
    setState((prev) => ({ ...prev, onlyApproved: !prev.onlyApproved }));
  }, []);

  /* ⭐ 收款账户排除规则 */
  const addExcludeAccount = useCallback((v: string) => {
    const s = String(v || '').trim();
    if (!s) return;
    setState((prev) => ({
      ...prev,
      excludeAccounts: prev.excludeAccounts.includes(s)
        ? prev.excludeAccounts
        : [...prev.excludeAccounts, s],
    }));
  }, []);

  const removeExcludeAccount = useCallback((v: string) => {
    setState((prev) => ({
      ...prev,
      excludeAccounts: prev.excludeAccounts.filter((x) => x !== v),
    }));
  }, []);

  const addExcludeKeyword = useCallback((v: string) => {
    const s = String(v || '').trim();
    if (!s) return;
    setState((prev) => ({
      ...prev,
      excludeKeywords: prev.excludeKeywords.includes(s)
        ? prev.excludeKeywords
        : [...prev.excludeKeywords, s],
    }));
  }, []);

  const removeExcludeKeyword = useCallback((v: string) => {
    setState((prev) => ({
      ...prev,
      excludeKeywords: prev.excludeKeywords.filter((x) => x !== v),
    }));
  }, []);

  const clearExcludeRules = useCallback(() => {
    setState((prev) => ({ ...prev, excludeAccounts: [], excludeKeywords: [] }));
  }, []);

  return {
    paymentUnits: state.paymentUnits,
    templateTypes: state.templateTypes,
    onlyApproved: state.onlyApproved,
    excludeAccounts: state.excludeAccounts,
    excludeKeywords: state.excludeKeywords,
    togglePaymentUnit,
    setPaymentUnits,
    toggleTemplateType,
    setTemplateTypes,
    toggleOnlyApproved,
    addExcludeAccount,
    removeExcludeAccount,
    addExcludeKeyword,
    removeExcludeKeyword,
    clearExcludeRules,
  };
}