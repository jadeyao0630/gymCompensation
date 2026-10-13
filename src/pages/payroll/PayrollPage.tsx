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

type ViewMode = 'all' | 'department';

const PayrollPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId } = useStore();
  const { hasPermission } = useAuth();
  const { data: appData, update: updateAppData } = useAppData();

  const opsViewEnabled = hasPermission('ops:view', storeId);

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

  /* ⭐ 页面级月份持久化 */
  const { month: selectedMonth, setMonth: setSelectedMonth } = usePersistedMonth(
    'payroll',
    storeId
  );

  const [missing, setMissing] = useState<string[]>([]);
  const [missingDialogOpen, setMissingDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('department');
  const [hideExcluded, setHideExcluded] = useState<boolean>(true);

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

  const initializedRef = useRef(false);

  /* ⭐ 当前门店的 store（month → plan），传给 usePayrollMonths */
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

  /* ⭐ 可用月份 + 方案加载（传单门店 store） */
  const { availableMonths, monthsLoading, invalidate } = usePayrollMonths({
    storeId,
    selectedMonth,
    store,
    savePlanToStorage,
  });

  /* ⭐ 薪酬计算 Hook */
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

  /* ⭐ 员工状态 */
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
      setResultsByStore((prev) => ({ ...prev, [storeId]: filteredResults }));
      setPerformancesByStore((prev) => ({ ...prev, [storeId]: res.performances }));
    },
    [
      run, selectedMonth, overrides, opsViewEnabled, newbieSet,
      storeId, setResultsByStore, setPerformancesByStore,
    ]
  );

  const handleRun = async () => {
    if (!currentPlan || !selectedMonth) {
      alert('请先选择月份，并确保该月已有配置');
      return;
    }
    try { await runAndUpdate(currentPlan); }
    catch (e) { console.error('[handleRun] 失败:', e); }
  };

  /* ⭐ 临时奖罚 */
  const { savingTemp, handleSaveTempRewards } = usePayrollTempRewards({
    storeId,
    selectedMonth,
    currentPlan,
    allResults,
    persistPlanToServer,
    runAndUpdate,
  });

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
            <PayrollEmptyState loading={loading} onRun={handleRun} />
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