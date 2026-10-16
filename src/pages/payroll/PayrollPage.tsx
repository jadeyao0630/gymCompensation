import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  MonthlyCompensationPlan,
  CompensationStore,
  RewardsCatalog,
} from '../../types/compensation';
import { usePayroll } from '../../hooks/usePayroll';
import type { PayrollResult, Department } from '../../utils/payroll';
import { exportPayrollTableToExcel } from '../../utils/exportPayrollTable';
import { loadRewardsCatalog } from '../../utils/payrollStorage';
import MissingPositionConfigDialog from '../../components/compensation/MissingPositionConfigDialog';
import StoreSwitcher from '../../components/layout/StoreSwitcher';
import StoreStatusBadge from '../../components/layout/StoreStatusBadge';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAppData } from '../../contexts/AppDataContext';
import { getStoreById } from '../../constants/stores';
import { PositionEditDialog } from '../../components/compensation/PositionEditDialog';

import { usePayrollStorage } from '../../hooks/usePayrollStorage';
import { usePayrollCalculation } from '../../hooks/usePayrollCalculation';
import { usePersistedMonth } from '../../hooks/usePersistedMonth';

import { usePayrollMonths } from './hooks/usePayrollMonths';
import { usePayrollStaffStatus } from './hooks/usePayrollStaffStatus';
import { usePayrollTempRewards } from './hooks/usePayrollTempRewards';

import { PayrollHeader } from './components/PayrollHeader';
import { PayrollToolbar } from './components/PayrollToolbar';
import { PayrollSummary } from './components/PayrollSummary';
import { PayrollMissingAlert } from './components/PayrollMissingAlert';
import { PayrollAllTable } from './components/PayrollAllTable';
import { PayrollDeptList } from './components/PayrollDeptList';
import { PayrollActionsProvider } from './components/PayrollActionsContext';
import { PayrollEmptyState } from './components/PayrollEmptyState';
import { PayrollNoPlanState } from './components/PayrollNoPlanState';
import { SavingTempOverlay } from './components/SavingTempOverlay';

import {
  submitSettlement,
  fetchSettlement,
  checkSettlement,
  deleteSettlement,
} from '../../api/payrollSettlement';

import { fetchPayrollDraft, savePayrollDraft, deletePayrollDraft } from '../../api/payrollDraft';

type ViewMode = 'all' | 'department';

const PayrollPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId } = useStore();
  const { hasPermission } = useAuth();
  const { data: appData, update: updateAppData } = useAppData();

  const opsViewEnabled = hasPermission('ops:view', storeId);
  const canSettle = hasPermission('payroll:settle', storeId);
  const canReverse = hasPermission('payroll:reverse', storeId);
  const canRestore = hasPermission('payroll:restore', storeId);

  const {
    fullStore,
    overridesByStore, setOverridesByStore,
    newbieByStore, setNewbieByStore,
    excludedByStore, setExcludedByStore,
    persistNewbie,
    persistExcluded,
    savePlanToStorage,
    persistPlanToServer,
  } = usePayrollStorage();

  const { month: selectedMonth, setMonth: setSelectedMonth } = usePersistedMonth(
    'payroll',
    storeId
  );

  const [missing, setMissing] = useState<string[]>([]);
  const [missingDialogOpen, setMissingDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('department');
  const [hideExcluded, setHideExcluded] = useState<boolean>(true);

  /* ⭐ 结算相关 state */
  const [hasSettlement, setHasSettlement] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [planOutdated, setPlanOutdated] = useState(false);

  const resultsByStore = appData.payrollResultsByStore;
  const performancesByStore = appData.performancesByStore;

  const setResultsByStore = useCallback(
    (updater: React.SetStateAction<Record<string, PayrollResult[]>>) => {
      updateAppData('payrollResultsByStore', (prev) =>
        typeof updater === 'function' ? (updater as any)(prev) : updater
      );
    },
    [updateAppData]
  );
  const setPerformancesByStore = useCallback(
    (updater: React.SetStateAction<Record<string, any[]>>) => {
      updateAppData('performancesByStore', (prev) =>
        typeof updater === 'function' ? (updater as any)(prev) : updater
      );
    },
    [updateAppData]
  );

  /* ⭐ 用 ref 保存 setter，避免 useEffect 依赖不稳定导致死循环 */
  const setResultsByStoreRef = useRef(setResultsByStore);
  useEffect(() => {
    setResultsByStoreRef.current = setResultsByStore;
  }, [setResultsByStore]);

  const [expanded, setExpanded] = useState<Record<Department, boolean>>({
    会籍: true, 私教: true, 泳教: true, 运营: true,
  });
  const [editingStaff, setEditingStaff] = useState<PayrollResult | null>(null);

  const [rewardsCatalog, setRewardsCatalog] = useState<RewardsCatalog>([]);

  const initializedRef = useRef(false);
  const recalculatingRef = useRef(false);
  const [recalculating, setRecalculating] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'loading' | 'saved' | 'saving' | 'error' | 'idle'>('loading');
  const draftReadyRef = useRef<string | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftGenerationRef = useRef(0);
  const draftLatestRef = useRef<{ key: string; results: PayrollResult[]; overrides: Record<string, string> } | null>(null);
  const draftInFlightRef = useRef<Promise<void> | null>(null);
  const draftSavedSnapshotRef = useRef<{ key: string; json: string } | null>(null);
  const draftQueueRef = useRef<Promise<void>>(Promise.resolve());
  const draftHydratingRef = useRef(false);
  const draftSavingDisabledRef = useRef(false);

  // 每个保存请求排队执行，防止较早的请求覆盖较新的草稿。
  const persistDraft = (key: string, results: PayrollResult[], values: Record<string, string>) => {
    const json = JSON.stringify({ results, overrides: values });
    if (draftSavedSnapshotRef.current?.key === key && draftSavedSnapshotRef.current.json === json) {
      return Promise.resolve();
    }
    const [draftStoreId, draftMonth] = key.split(':');
    const task = draftQueueRef.current.catch(() => {}).then(async () => {
      if (draftSavedSnapshotRef.current?.key === key && draftSavedSnapshotRef.current.json === json) return;
      await savePayrollDraft(draftStoreId, draftMonth, results, values);
      draftSavedSnapshotRef.current = { key, json };
    });
    draftQueueRef.current = task.catch(() => {});
    draftInFlightRef.current = task;
    void task.finally(() => {
      if (draftInFlightRef.current === task) draftInFlightRef.current = null;
    }).catch(() => {});
    return task;
  };
  const [draftRevision, setDraftRevision] = useState(0);

  const store: CompensationStore = fullStore[storeId] || {};
  const allResults: PayrollResult[] = resultsByStore[storeId] || [];
  const excludedSet: Set<string> = excludedByStore[storeId] || new Set();
  const overrides = overridesByStore[storeId] || {};
  const newbieSet: Set<string> = newbieByStore[storeId] || new Set();
  const currentPlan: MonthlyCompensationPlan | undefined = selectedMonth
    ? store[selectedMonth]
    : undefined;

  useEffect(() => {
    setRewardsCatalog(loadRewardsCatalog());
  }, [storeId]);

  const { availableMonths, monthsLoading, invalidate } = usePayrollMonths({
    storeId,
    selectedMonth,
    store,
    savePlanToStorage,
  });

  const {
    updateAttendance,
    handleUpdateMemberCommission,
    handleUpdateSalesCommission,
    handleSetSalesDetail,
    loadDetailsFromServer,
    toggleNewbie: calcToggleNewbie,
    handleSavePosition: calcSavePosition,
  } = usePayrollCalculation({
    storeId,
    selectedMonth,
    currentPlan,
    newbieSet,
    performancesByStore,
    setResultsByStore,
  });

  const username = import.meta.env.VITE_TEST_USERNAME || '';
  const password = import.meta.env.VITE_TEST_PASSWORD || '';
  const { run, loading, error } = usePayroll({ username, password, busId: storeId });

  const { toggleExclude, toggleNewbie } = usePayrollStaffStatus({
    storeId,
    selectedMonth,
    newbieSet,
    excludedSet,
    setNewbieByStore,
    setExcludedByStore,
    persistNewbie,
    persistExcluded,
  });

  /* ⭐ 首次进入：无持久化月份 → 选最近可用月份 */
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (selectedMonth) return;
    const months = Object.keys(fullStore[storeId] || {}).sort();
    if (months.length > 0) setSelectedMonth(months[months.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  /* 切换月份：先判断正式结算，再恢复未结算草稿 */
  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    const key = `${storeId}:${selectedMonth}`;
    let cancelled = false;
    draftGenerationRef.current += 1;
    draftReadyRef.current = null;
    draftLatestRef.current = null;
    draftSavedSnapshotRef.current = null;
    draftHydratingRef.current = true;
    draftSavingDisabledRef.current = false;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    setDraftStatus('loading');
    setResultsByStoreRef.current((prev) => ({ ...prev, [storeId]: [] }));
    setIsLoaded(false);
    setHasSettlement(false);
    setPlanOutdated(false);
    (async () => {
      try {
        const info = await checkSettlement(storeId, selectedMonth);
        if (cancelled) return;
        setHasSettlement(info.hasSettlement);
        if (!info.hasSettlement && canSettle) {
          const draft = await fetchPayrollDraft(storeId, selectedMonth);
          if (cancelled) return;
          if (draft) {
            // 后台恢复属于初始化，不是用户修改；先记录快照以免立刻回写。
            draftSavedSnapshotRef.current = {
              key,
              json: JSON.stringify({ results: draft.results, overrides: draft.overrides || {} }),
            };
            setResultsByStoreRef.current((prev) => ({ ...prev, [storeId]: draft.results }));
            {
              setOverridesByStore((prev) => {
                const next = { ...prev, [storeId]: draft.overrides };
                localStorage.setItem('gym_position_overrides_v1', JSON.stringify(next));
                return next;
              });
            }
          }
        }
        draftReadyRef.current = key;
        draftHydratingRef.current = false;
        setDraftStatus('idle');
      } catch (e) {
        if (!cancelled) {
          console.error('[payroll.draft.load]', e);
          draftHydratingRef.current = false;
          draftSavingDisabledRef.current = true;
          setDraftStatus('error');
          // 读取失败时禁止自动保存，以免空结果覆盖远端草稿
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, selectedMonth, canSettle]);

  /* 自动保存：只有数据内容真正改变时才写入 MySQL。 */
  useEffect(() => {
    const key = `${storeId}:${selectedMonth || ''}`;
    if (!selectedMonth || !canSettle || isLoaded || hasSettlement ||
        draftHydratingRef.current || draftSavingDisabledRef.current ||
        draftReadyRef.current !== key || allResults.length === 0) return;

    const json = JSON.stringify({ results: allResults, overrides });
    if (draftSavedSnapshotRef.current?.key === key && draftSavedSnapshotRef.current.json === json) return;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    const generation = draftGenerationRef.current;
    draftLatestRef.current = { key, results: allResults, overrides };
    setDraftStatus('saving');
    draftTimerRef.current = setTimeout(() => {
      draftTimerRef.current = null;
      const data = draftLatestRef.current;
      if (!data || data.key !== key || draftGenerationRef.current !== generation) return;
      void persistDraft(key, data.results, data.overrides).then(() => {
        if (draftGenerationRef.current === generation) setDraftStatus('saved');
      }).catch((e) => {
        console.error('[payroll.draft.save]', e);
        if (draftGenerationRef.current === generation) setDraftStatus('error');
      });
    }, 800);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [storeId, selectedMonth, canSettle, isLoaded, hasSettlement, allResults, overrides, draftRevision]);

  /* 提交结算前，确保最后一次草稿保存完成。 */
  const flushDraft = async () => {
    if (!selectedMonth || !canSettle || isLoaded || hasSettlement || !allResults.length) return;
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
    await persistDraft(`${storeId}:${selectedMonth}`, allResults, overrides);
    setDraftStatus('saved');
  };

  const positionOptions = useMemo(() => {
    const set = new Set<string>();
    (currentPlan?.positions || []).forEach((p) => set.add(p.title));
    ['运营主管', '运营', '店长', '会籍经理', '泳教经理', '会籍', '私教', '泳教', '前台', '保洁', '维修'].forEach((t) => set.add(t));
    return Array.from(set);
  }, [currentPlan]);

  const summary = useMemo(() => {
    const filtered = allResults.filter((r) => !excludedSet.has(r.staffId));
    if (filtered.length === 0) return null;
    return filtered.reduce(
      (acc, r) => ({
        headcount: acc.headcount + 1,
        baseSalary: acc.baseSalary + r.baseSalary,
        salesCommission: acc.salesCommission + r.salesCommission,
        classCommission: acc.classCommission + r.classCommission,
        rewardsTotal: acc.rewardsTotal + (r.rewardsTotal ?? 0),
        total: acc.total + r.total,
      }),
      { headcount: 0, baseSalary: 0, salesCommission: 0, classCommission: 0, rewardsTotal: 0, total: 0 }
    );
  }, [allResults, excludedSet]);

  const toggleDept = (dept: Department) =>
    setExpanded((p) => ({ ...p, [dept]: !p[dept] }));

  const handleToggleNewbie = (staffId: string) => {
    toggleNewbie(staffId, () => calcToggleNewbie(staffId, () => {}));
  };

  const handleSavePosition = (staffId: string, newTitle: string) => {
    calcSavePosition(staffId, newTitle, overrides, setOverridesByStore);
  };

  const runAndUpdate = useCallback(
    async (planToUse: MonthlyCompensationPlan) => {
      const catalog = loadRewardsCatalog();
      setRewardsCatalog(catalog);

      const res = await run(
        selectedMonth,
        planToUse,
        overrides,
        opsViewEnabled,
        newbieSet,
        {
          rewardsCatalog: catalog,
          departmentRewards: planToUse.departmentRewards,
          tempRewardsByStaff: planToUse.tempRewards,
        }
      );

      const filteredResults = opsViewEnabled
        ? res.results
        : res.results.filter((r) => r.positionTitle !== '运营主管');

      if (res.missingPositions.length > 0) {
        setMissing(res.missingPositions);
        setMissingDialogOpen(true);
      }

      /* ⭐ 先写入结果 + 标记未结算，再异步加载草稿明细
       *    这样即使 loadDetailsFromServer 抛错，也不会卡在「重新计算」态 */
      setResultsByStore((prev) => ({ ...prev, [storeId]: filteredResults }));
      setPerformancesByStore((prev) => ({ ...prev, [storeId]: res.performances }));
      setIsLoaded(false);

      try {
        await loadDetailsFromServer();
      } catch (e) {
        console.warn('[runAndUpdate] loadDetailsFromServer 失败', e);
      }
    },
    [
      run, selectedMonth, overrides, opsViewEnabled, newbieSet,
      storeId, setResultsByStore, setPerformancesByStore,
      loadDetailsFromServer,
    ]
  );

  /* 开始计算：绝不删除已存在的正式结算 */
  const handleRun = async () => {
    if (recalculatingRef.current || loading) return;
    if (!currentPlan || !selectedMonth) {
      alert('请先选择月份，并确保该月已有配置');
      return;
    }
    recalculatingRef.current = true;
    setRecalculating(true);
    try {
      const state = await checkSettlement(storeId, selectedMonth);
      if (state.hasSettlement) {
        setHasSettlement(true);
        alert('本月已有正式结算，请先使用“反结算”功能。');
        return;
      }
      await runAndUpdate(currentPlan);
      setDraftRevision((v) => v + 1);
    } catch (e: any) {
      console.error('[handleRun]', e);
      alert('计算失败：' + (e?.response?.data?.errormsg || e?.message || '未知错误'));
    } finally {
      recalculatingRef.current = false;
      setRecalculating(false);
    }
  };

  /* 反结算：仅撤销正式结算，不重新拉取或重新计算 */
  const handleReverseSettlement = async () => {
    if (!selectedMonth || !canReverse || recalculatingRef.current || loading) return;
    if (!window.confirm(
      `确定反结算 ${selectedMonth} 吗？\\n\\n` +
      '将删除当前门店、当前月份在 MySQL 中的正式结算记录。' +
      '薪酬方案及临时奖扣不会删除，且不会自动重新计算。'
    )) return;
    recalculatingRef.current = true;
    setRecalculating(true);
    try {
      // 如果当前尚未加载正式结算，先读取快照，以便撤销后保留可编辑结果。
      let preserved = allResults;
      if (!isLoaded || preserved.length === 0) {
        const existing = await fetchSettlement(storeId, selectedMonth);
        if (existing?.results?.length) preserved = existing.results;
      }
      await deleteSettlement(storeId, selectedMonth);
      setResultsByStore((prev) => ({ ...prev, [storeId]: preserved }));
      setHasSettlement(false);
      setIsLoaded(false);
      setPlanOutdated(false);
      // 反结算后主动建立草稿，防止刷新页面丢失当前结果。
      // 草稿接口仍由 payroll:settle 控制；无草稿权限时仅保留本地结果。
      if (preserved.length && canSettle) {
        try {
          await persistDraft(`${storeId}:${selectedMonth}`, preserved, overrides);
          setDraftStatus('saved');
        } catch (draftError) {
          console.error('[reverse.saveDraft]', draftError);
          setDraftStatus('error');
          alert('反结算成功，但草稿保存失败，请勿关闭页面。');
          return;
        }
      }
      setDraftRevision((v) => v + 1);
      alert('反结算成功，正式结算已撤销，当前数据处于未结算状态。');
    } catch (e: any) {
      console.error('[handleReverseSettlement]', e);
      alert('反结算失败：' + (e?.response?.data?.errormsg || e?.message || '未知错误'));
    } finally {
      recalculatingRef.current = false;
      setRecalculating(false);
    }
  };

  /* 获取 / 恢复正式结算 */
  const handleFetchSettlement = async () => {
    if (!storeId || !selectedMonth || !canRestore) return;
    try {
      const data = await fetchSettlement(storeId, selectedMonth);
      if (!data) {
        alert('后台未找到该月结算数据');
        setHasSettlement(false);
        return;
      }
      setResultsByStore((prev) => ({ ...prev, [storeId]: data.results }));
      setHasSettlement(true);
      setIsLoaded(true);
    } catch (e) {
      console.error('[handleFetchSettlement]', e);
      alert('恢复现有结算失败');
    }
  };

  const handleRefetchSettlement = async () => {
    if (!canRestore) return;
    if (!window.confirm('将丢弃当前本地修改，从 MySQL 恢复现有正式结算，是否继续？')) return;
    await handleFetchSettlement();
  };

  /* ⭐ 结算提交 */
  const handleSettle = async () => {
    if (!currentPlan || !selectedMonth) return;
    if (!canSettle) {
      alert('无权限：薪酬结算');
      return;
    }
    if (allResults.length === 0) {
      alert('请先点击「开始计算」');
      return;
    }
    if (!confirm(`确定提交 ${selectedMonth} 的薪酬结算？提交后可在其他设备查看。`)) return;

    try {
      await flushDraft();
      await submitSettlement(
        storeId,
        selectedMonth,
        allResults,
        summary,
        currentPlan
      );
      setHasSettlement(true);
      setIsLoaded(true);
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      await deletePayrollDraft(storeId, selectedMonth).catch((e) => console.warn('[draft.cleanup]', e));
      alert('结算成功！');
    } catch (e: any) {
      console.error('[handleSettle] 失败', e);
      alert('结算失败：' + (e?.response?.data?.errormsg || e?.message || ''));
    }
  };

  const { savingTemp, handleSaveTempRewards } = usePayrollTempRewards({
    storeId,
    selectedMonth,
    currentPlan,
    allResults,
    persistPlanToServer,
    setResultsByStore,
  });

  const handleExportTable = () => {
    if (allResults.length === 0) {
      alert('暂无可导出的数据');
      return;
    }
    exportPayrollTableToExcel({
      allResults, excludedSet, plan: currentPlan, month: selectedMonth,
      storeName: storeName || '门店',
    });
  };

  const handleConfirmMissing = async (configs: Record<string, any>) => {
    if (!currentPlan || !selectedMonth) return;
    const newPositions = [...currentPlan.positions];
    const existingTitles = new Set(newPositions.map((p) => p.title));
    Object.entries(configs).forEach(([missingName, cfg]) => {
      const finalTitle = ((cfg?.title as string) || missingName).trim();
      if (existingTitles.has(finalTitle)) return;
      newPositions.push({
        ...(cfg || {}),
        id: cfg?.id || `virtual_${finalTitle}_${Date.now()}`,
        title: finalTitle,
      });
      existingTitles.add(finalTitle);
    });
    const nextPlan = { ...currentPlan, positions: newPositions };
    savePlanToStorage(storeId, selectedMonth, nextPlan);
    setMissing([]);
    setMissingDialogOpen(false);
    try { await runAndUpdate(nextPlan); }
    catch (e) { console.error('[重新计算失败]', e); }
  };

  const storeName = getStoreById(storeId)?.name || '';
  const excludedCount =
    allResults.length - allResults.filter((r) => !excludedSet.has(r.staffId)).length;

  const payrollActions = useMemo(() => ({
    updateMemberCommission: handleUpdateMemberCommission,
    updateSalesCommission: handleUpdateSalesCommission,
    setSalesDetail: handleSetSalesDetail,
  }), [handleUpdateMemberCommission, handleUpdateSalesCommission, handleSetSalesDetail]);

  return (
    <PayrollActionsProvider value={payrollActions}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PayrollHeader
            storeName={storeName}
            month={selectedMonth}
            excludedCount={excludedCount}
            loading={loading || recalculating}
            hasPlan={!!currentPlan}
            canExport={allResults.length > 0}
            canExportPayroll={hasPermission('export:payroll', storeId)}
            hasSettlement={hasSettlement}
            isLoaded={isLoaded}
            hasLocalResult={allResults.length > 0 && !isLoaded}
            canSettle={canSettle}
            canReverse={canReverse}
            canRestore={canRestore}
            reversingSettlement={recalculating}
            onReverse={handleReverseSettlement}
            planOutdated={planOutdated}
            onRun={handleRun}
            onFetch={handleFetchSettlement}
            onRefetch={handleRefetchSettlement}
            onSettle={handleSettle}
            onExport={handleExportTable}
          />

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <StoreSwitcher />
            <StoreStatusBadge dbOnline saveStatus="idle" lastSavedAt={null} />
            {canSettle && !isLoaded && !hasSettlement && (
              <span className="text-xs text-slate-500" role="status">
                草稿：{draftStatus === 'loading' ? '读取中' : draftStatus === 'saving' ? '保存中' :
                  draftStatus === 'saved' ? '已保存至后台' : draftStatus === 'error' ? '保存/读取失败，请勿关闭页面' : '待修改'}
              </span>
            )}
            <div className="flex-1" />
          </div>

          <PayrollToolbar
            month={selectedMonth}
            availableMonths={availableMonths}
            monthsLoading={monthsLoading}
            viewMode={viewMode}
            showViewToggle={allResults.length > 0}
            hideExcluded={hideExcluded}
            hasPlan={!!currentPlan}
            onMonthChange={(m) => {
              setSelectedMonth(m);
              invalidate();
            }}
            onViewModeChange={setViewMode}
            onHideExcludedChange={setHideExcluded}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700">
              {error}
            </div>
          )}
          <PayrollMissingAlert
            missing={missing}
            onOpenDialog={() => setMissingDialogOpen(true)}
          />
          <PayrollSummary summary={summary} />

          {allResults.length > 0 && viewMode === 'all' && (
            <PayrollAllTable
              results={allResults}
              excludedSet={excludedSet}
              overrides={overrides}
              plan={currentPlan}
              month={selectedMonth}
              storeId={storeId}
              summary={summary}
              hideExcluded={hideExcluded}
              canExportPersonal={hasPermission('export:personal', storeId)}
              newbieSet={newbieSet}
              onToggleNewbie={handleToggleNewbie}
              onToggleExclude={toggleExclude}
              onEditPosition={setEditingStaff}
              onUpdateAttendance={updateAttendance}
              rewardsCatalog={rewardsCatalog}
              tempRewardsByStaff={currentPlan?.tempRewards}
              onSaveTempRewards={handleSaveTempRewards}
            />
          )}

          {allResults.length > 0 && viewMode === 'department' && (
            <PayrollDeptList
              allResults={allResults}
              excludedSet={excludedSet}
              overrides={overrides}
              plan={currentPlan}
              month={selectedMonth}
              storeId={storeId}
              expanded={expanded}
              hideExcluded={hideExcluded}
              canExportPersonal={hasPermission('export:personal', storeId)}
              newbieSet={newbieSet}
              onToggleNewbie={handleToggleNewbie}
              onToggleDept={toggleDept}
              onToggleExclude={toggleExclude}
              onEditPosition={setEditingStaff}
              onUpdateAttendance={updateAttendance}
              rewardsCatalog={rewardsCatalog}
              tempRewardsByStaff={currentPlan?.tempRewards}
              onSaveTempRewards={handleSaveTempRewards}
            />
          )}

          {allResults.length === 0 && currentPlan && (
            <PayrollEmptyState
              loading={loading || recalculating}
              hasSettlement={hasSettlement}
              onRun={hasSettlement ? handleFetchSettlement : handleRun}
            />
          )}

          {!currentPlan && (
            <PayrollNoPlanState
              month={selectedMonth}
              onGoConfig={() => navigate('/compensation')}
            />
          )}
        </div>

        {missingDialogOpen && missing.length > 0 && (
          <MissingPositionConfigDialog
            missing={missing}
            existing={currentPlan?.positions || []}
            onCancel={() => setMissingDialogOpen(false)}
            onConfirm={handleConfirmMissing}
          />
        )}

        <PositionEditDialog
          open={!!editingStaff}
          onClose={() => setEditingStaff(null)}
          staffName={editingStaff?.staffName || ''}
          currentTitle={editingStaff?.positionTitle || ''}
          options={positionOptions}
          onSave={(newTitle) => {
            if (editingStaff) handleSavePosition(editingStaff.staffId, newTitle);
          }}
        />

        <SavingTempOverlay
          active={savingTemp.active}
          staffName={savingTemp.staffName}
        />
      </div>
    </PayrollActionsProvider>
  );
};

export default PayrollPage;