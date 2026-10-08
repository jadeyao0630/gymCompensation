import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Calculator, Loader2 } from 'lucide-react';
import type {
  MonthlyCompensationPlan,
  CompensationStore,
  RewardsCatalog,
  TempReward,
} from '../../types/compensation';
import { usePayroll } from '../../hooks/usePayroll';
import type { PayrollResult, Department } from '../../utils/payroll';
import { exportPayrollTableToExcel } from '../../utils/exportPayrollTable';
import { fetchPlanByMonth, fetchPlanList } from '../../api/compensation';
import {
  fetchStaffStatus,
  saveStaffStatus,
  type StaffStatusItem,
} from '../../api/payrollStatus';
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

import { PayrollHeader } from './components/PayrollHeader';
import { PayrollToolbar } from './components/PayrollToolbar';
import { PayrollSummary } from './components/PayrollSummary';
import { PayrollMissingAlert } from './components/PayrollMissingAlert';
import { PayrollAllTable } from './components/PayrollAllTable';
import { PayrollDeptList } from './components/PayrollDeptList';
import { PayrollActionsProvider } from './components/PayrollActionsContext';

type ViewMode = 'all' | 'department';

const PayrollPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { storeId } = useStore();
  const { hasPermission } = useAuth();
  const { data: appData, update: updateAppData } = useAppData();

  const opsViewEnabled = hasPermission('ops:view', storeId);

  const {
    fullStore, setFullStore,
    overridesByStore, setOverridesByStore,
    newbieByStore, setNewbieByStore,
    excludedByStore, setExcludedByStore,
    persistNewbie,
    persistExcluded,
    savePlanToStorage,
    persistPlanToServer,
  } = usePayrollStorage();

  /* ⭐ 页面级月份持久化：key = gym_payroll_month_v1_<storeId> */
  const { month: selectedMonth, setMonth: setSelectedMonth } = usePersistedMonth(
    'payroll',
    storeId
  );

  const [missing, setMissing] = useState<string[]>([]);
  const [missingDialogOpen, setMissingDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('department');
  const [hideExcluded, setHideExcluded] = useState<boolean>(true);

  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [monthsLoading, setMonthsLoading] = useState(false);

  /* ⭐ 从全局 store 取结果 */
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

  const [expanded, setExpanded] = useState<Record<Department, boolean>>({
    会籍: true, 私教: true, 泳教: true, 运营: true,
  });
  const [editingStaff, setEditingStaff] = useState<PayrollResult | null>(null);

  const [rewardsCatalog, setRewardsCatalog] = useState<RewardsCatalog>([]);

  const [savingTemp, setSavingTemp] = useState<{
    active: boolean;
    staffName?: string;
  }>({ active: false });

  const fetchedKeyRef = useRef<string>('');
  const initializedRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setMonthsLoading(true);
    (async () => {
      const localMonths = Object.keys(fullStore[storeId] || {});
      let remoteMonths: string[] = [];
      try {
        const plans = await fetchPlanList(storeId);
        remoteMonths = (plans || []).filter((p) => p.isActive !== 0).map((p) => p.month);
      } catch (e) {
        console.warn('[PayrollPage] 拉取可用月份列表失败，使用本地缓存', e);
      }
      if (cancelled) return;
      const merged = Array.from(new Set([...remoteMonths, ...localMonths])).sort();
      setAvailableMonths(merged);
      setMonthsLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, fullStore]);

  const {
    updateAttendance,
    handleUpdateMemberCommission,
    toggleNewbie: calcToggleNewbie,
    handleSavePosition: calcSavePosition,
  } = usePayrollCalculation({
    storeId,
    currentPlan,
    newbieSet,
    performancesByStore,
    setResultsByStore,
  });

  const username = import.meta.env.VITE_TEST_USERNAME || '';
  const password = import.meta.env.VITE_TEST_PASSWORD || '';
  const { run, loading, error } = usePayroll({ username, password, busId: storeId });

  const syncStaffStatusToServer = useCallback(
    (newbie: Set<string>, excluded: Set<string>) => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = window.setTimeout(async () => {
        try {
          const ids = new Set<string>([...newbie, ...excluded]);
          const statuses: StaffStatusItem[] = Array.from(ids).map((id) => ({
            staffId: id,
            isNewbie: newbie.has(id),
            isExcluded: excluded.has(id),
          }));
          await saveStaffStatus(storeId, selectedMonth, statuses);
        } catch (e) {
          console.warn('[PayrollPage] 保存员工状态到后端失败', e);
        }
      }, 600);
    },
    [storeId, selectedMonth]
  );

  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    let cancelled = false;
    (async () => {
      try {
        const statuses = await fetchStaffStatus(storeId, selectedMonth);
        if (cancelled) return;
        const newbie = new Set<string>();
        const excluded = new Set<string>();
        statuses.forEach((s) => {
          if (s.isNewbie) newbie.add(s.staffId);
          if (s.isExcluded) excluded.add(s.staffId);
        });
        if (statuses.length > 0) {
          setNewbieByStore((prev) => {
            const next = { ...prev, [storeId]: newbie };
            persistNewbie(next);
            return next;
          });
          setExcludedByStore((prev) => {
            const next = { ...prev, [storeId]: excluded };
            persistExcluded(next);
            return next;
          });
        }
      } catch (e) {
        console.warn('[PayrollPage] 拉取员工状态失败，使用本地缓存', e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, selectedMonth]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const urlMonth = searchParams.get('month');
    if (urlMonth) { setSelectedMonth(urlMonth); return; }
    const months = Object.keys(fullStore[storeId] || {}).sort();
    if (months.length > 0) { setSelectedMonth(months[months.length - 1]); return; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  useEffect(() => {
    const m = searchParams.get('month');
    if (m && m !== selectedMonth) {
      setSelectedMonth(m);
      fetchedKeyRef.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => { fetchedKeyRef.current = ''; }, [storeId]);

  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    const key = `${storeId}:${selectedMonth}`;
    if (fetchedKeyRef.current === key) return;
    const localPlan = fullStore[storeId]?.[selectedMonth];
    if (localPlan && localPlan.positions && localPlan.positions.length > 0) {
      fetchedKeyRef.current = key;
      return;
    }
    let cancelled = false;
    fetchedKeyRef.current = key;
    (async () => {
      try {
        const remote = await fetchPlanByMonth(storeId, selectedMonth);
        if (cancelled || !remote) return;
        savePlanToStorage(storeId, selectedMonth, remote);
      } catch (e) {
        console.warn('[PayrollPage] API 加载失败，使用本地缓存', e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, selectedMonth]);

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

  const toggleExclude = (staffId: string) => {
    setExcludedByStore((prev) => {
      const cur = new Set(prev[storeId] || []);
      if (cur.has(staffId)) cur.delete(staffId);
      else cur.add(staffId);
      const next = { ...prev, [storeId]: cur };
      persistExcluded(next);
      syncStaffStatusToServer(newbieSet, cur);
      return next;
    });
  };

  const toggleDept = (dept: Department) =>
    setExpanded((p) => ({ ...p, [dept]: !p[dept] }));

  const handleToggleNewbie = (staffId: string) => {
    setNewbieByStore((prev) => {
      const cur = new Set(prev[storeId] || []);
      const willBeNewbie = !cur.has(staffId);
      if (willBeNewbie) cur.add(staffId);
      else cur.delete(staffId);
      const next = { ...prev, [storeId]: cur };
      persistNewbie(next);
      syncStaffStatusToServer(cur, excludedSet);
      return next;
    });
    calcToggleNewbie(staffId, () => {});
  };

  const handleSavePosition = (staffId: string, newTitle: string) => {
    calcSavePosition(staffId, newTitle, overrides, setOverridesByStore);
  };

  const runAndUpdate = async (planToUse: MonthlyCompensationPlan) => {
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
    setResultsByStore((prev) => ({ ...prev, [storeId]: filteredResults }));
    setPerformancesByStore((prev) => ({ ...prev, [storeId]: res.performances }));
  };

  const handleRun = async () => {
    if (!currentPlan || !selectedMonth) {
      alert('请先选择月份，并确保该月已有配置');
      return;
    }
    try { await runAndUpdate(currentPlan); }
    catch (e) { console.error('[handleRun] 失败:', e); }
  };

  const handleSaveTempRewards = async (staffId: string, next: TempReward[]) => {
    if (!currentPlan || !selectedMonth) return;

    const sid = String(staffId).trim();
    const staffName =
      allResults.find((r) => String(r.staffId).trim() === sid)?.staffName ||
      staffId;

    setSavingTemp({ active: true, staffName });
    const startedAt = Date.now();

    try {
      const merged: Record<string, TempReward[]> = {};
      Object.keys(currentPlan.tempRewards || {}).forEach((k) => {
        merged[String(k)] = currentPlan.tempRewards![k];
      });
      if (next.length === 0) delete merged[sid];
      else merged[sid] = next;

      const nextPlan: MonthlyCompensationPlan = {
        ...currentPlan,
        tempRewards: merged,
      };

      await persistPlanToServer(storeId, selectedMonth, nextPlan);
      await runAndUpdate(nextPlan);
    } catch (e) {
      console.error('[handleSaveTempRewards] 重算失败', e);
    } finally {
      const elapsed = Date.now() - startedAt;
      const remain = Math.max(0, 400 - elapsed);
      if (remain > 0) {
        setTimeout(() => setSavingTemp({ active: false }), remain);
      } else {
        setSavingTemp({ active: false });
      }
    }
  };

  const handleExportTable = () => {
    if (allResults.length === 0) {
      alert('暂无可导出的数据，请先点击「开始计算」');
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
  }), [handleUpdateMemberCommission]);

  return (
    <PayrollActionsProvider value={payrollActions}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PayrollHeader
            storeName={storeName}
            month={selectedMonth}
            excludedCount={excludedCount}
            loading={loading}
            hasPlan={!!currentPlan}
            canExport={allResults.length > 0}
            canExportPayroll={hasPermission('export:payroll', storeId)}
            onRun={handleRun}
            onExport={handleExportTable}
          />

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <StoreSwitcher />
            <StoreStatusBadge dbOnline saveStatus="idle" lastSavedAt={null} />
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
              fetchedKeyRef.current = '';
              navigate(`/payroll?month=${m}`, { replace: true });
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                {loading ? (
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                ) : (
                  <Calculator className="w-6 h-6 text-emerald-500" />
                )}
              </div>
              <h3 className="font-semibold text-gray-700 mb-1">
                {loading ? '正在计算…' : '暂无计算结果'}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                {loading
                  ? '正在拉取订单、员工状态、计算薪酬与成本…'
                  : '点击「开始计算」按钮，根据本月配置拉取数据并计算薪酬'}
              </p>
              <button
                onClick={handleRun}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 计算中…</>
                ) : (
                  <><Calculator className="w-4 h-4" /> 开始计算</>
                )}
              </button>
            </div>
          )}

          {!currentPlan && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-1">
                该月份暂无薪酬配置
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                请先到「薪酬配置」页面上传或导入 {selectedMonth || '当月'} 的薪酬方案
              </p>
              <button
                onClick={() => navigate('/compensation')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> 去配置
              </button>
            </div>
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

        {savingTemp.active && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm select-none"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-3 min-w-[260px]">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">
                  正在保存奖罚并重算
                </p>
                {savingTemp.staffName && (
                  <p className="text-xs text-gray-500 mt-1">
                    → {savingTemp.staffName}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 mt-2">
                  请稍候，正在同步方案与计算薪酬…
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PayrollActionsProvider>
  );
};

export default PayrollPage;