import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Calculator } from 'lucide-react';
import type { MonthlyCompensationPlan, CompensationStore } from '../../types/compensation';
import { usePayroll } from '../../hooks/usePayroll';
import type { PayrollResult, Department } from '../../utils/payroll';
import { exportPayrollTableToExcel } from '../../utils/exportPayrollTable';
import { fetchPlanByMonth } from '../../api/compensation';
import MissingPositionConfigDialog from '../../components/MissingPositionConfigDialog';
import StoreSwitcher from '../../components/StoreSwitcher';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { getStoreById } from '../../constants/stores';
import { PositionEditDialog } from '../../components/PositionEditDialog';

// 导入抽离的 Hooks
import { usePayrollStorage } from '../../hooks/usePayrollStorage';
import { usePayrollCalculation } from '../../hooks/usePayrollCalculation';

// 导入子组件
import { PayrollHeader } from './PayrollHeader';
import { PayrollToolbar } from './PayrollToolbar';
import { PayrollSummary } from './PayrollSummary';
import { PayrollMissingAlert } from './PayrollMissingAlert';
import { PayrollAllTable } from './PayrollAllTable';
import { PayrollDeptList } from './PayrollDeptList';
import { PayrollActionsProvider } from './PayrollActionsContext';

type ViewMode = 'all' | 'department';

const PayrollPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  const opsViewEnabled = hasPermission('ops:view', storeId);

  // 使用存储 Hook
  const {
    fullStore, setFullStore,
    overridesByStore, setOverridesByStore,
    newbieByStore, setNewbieByStore,
    persistNewbie, savePlanToStorage,
  } = usePayrollStorage();

  // 页面独有状态
  const [selectedMonth, setSelectedMonth] = useState<string>(searchParams.get('month') || '');
  const [missing, setMissing] = useState<string[]>([]);
  const [missingDialogOpen, setMissingDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('department');
  const [hideExcluded, setHideExcluded] = useState<boolean>(true);
  const [resultsByStore, setResultsByStore] = useState<Record<string, PayrollResult[]>>({});
  const [performancesByStore, setPerformancesByStore] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<Record<Department, boolean>>({
    会籍: true, 私教: true, 泳教: true, 运营: true,
  });
  const [excludedByStore, setExcludedByStore] = useState<Record<string, Set<string>>>({});
  const [editingStaff, setEditingStaff] = useState<PayrollResult | null>(null);

  /* ⭐ 防止重复拉取方案详情 */
  const fetchedKeyRef = useRef<string>('');
  /* ⭐ 月份初始化只跑一次 */
  const initializedRef = useRef(false);

  // 派生状态
  const store: CompensationStore = fullStore[storeId] || {};
  const allResults: PayrollResult[] = resultsByStore[storeId] || [];
  const excludedSet: Set<string> = excludedByStore[storeId] || new Set();
  const overrides = overridesByStore[storeId] || {};
  const newbieSet: Set<string> = newbieByStore[storeId] || new Set();
  const currentPlan: MonthlyCompensationPlan | undefined = selectedMonth ? store[selectedMonth] : undefined;

  // 使用计算 Hook
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

  // 环境变量
  const username = import.meta.env.VITE_TEST_USERNAME || '';
  const password = import.meta.env.VITE_TEST_PASSWORD || '';
  const { run, loading, error } = usePayroll({ username, password, busId: storeId });

  /* ============================================================
   * ⭐ 月份初始化：只执行一次
   *   优先级：URL > 最新月份 > 当前月
   * ============================================================ */
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const urlMonth = searchParams.get('month');
    if (urlMonth) {
      setSelectedMonth(urlMonth);
      return;
    }

    const months = Object.keys(fullStore[storeId] || {}).sort();
    if (months.length > 0) {
      setSelectedMonth(months[months.length - 1]);
      return;
    }

    const now = new Date();
    setSelectedMonth(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  /* ============================================================
   * ⭐ URL 月份变化时同步（加 m !== selectedMonth 防死循环）
   * ============================================================ */
  useEffect(() => {
    const m = searchParams.get('month');
    if (m && m !== selectedMonth) {
      setSelectedMonth(m);
      fetchedKeyRef.current = ''; // 允许重新拉取
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /* ============================================================
   * ⭐ 门店切换时重置请求标记
   * ============================================================ */
  useEffect(() => {
    fetchedKeyRef.current = '';
  }, [storeId]);

  /* ============================================================
   * ⭐ 远程拉取方案（防重复）
   *   依赖数组不含 fullStore / savePlanToStorage（如果它不稳定）
   * ============================================================ */
  useEffect(() => {
    if (!storeId || !selectedMonth) return;

    const key = `${storeId}:${selectedMonth}`;
    if (fetchedKeyRef.current === key) return;

    // 本地已有完整数据 → 直接标记，不请求
    const localPlan = fullStore[storeId]?.[selectedMonth];
    if (localPlan && localPlan.positions && localPlan.positions.length > 0) {
      fetchedKeyRef.current = key;
      return;
    }

    let cancelled = false;
    fetchedKeyRef.current = key; // 立即打标记，防 StrictMode 重复

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

  // 职位选项
  const positionOptions = useMemo(() => {
    const set = new Set<string>();
    (currentPlan?.positions || []).forEach((p) => set.add(p.title));
    ['运营主管', '运营', '店长', '会籍经理', '泳教经理', '会籍', '私教', '泳教', '前台', '保洁', '维修'].forEach((t) => set.add(t));
    return Array.from(set);
  }, [currentPlan]);

  // 汇总数据
  const summary = useMemo(() => {
    const filtered = allResults.filter((r) => !excludedSet.has(r.staffId));
    if (filtered.length === 0) return null;
    return filtered.reduce(
      (acc, r) => ({
        headcount: acc.headcount + 1,
        baseSalary: acc.baseSalary + r.baseSalary,
        salesCommission: acc.salesCommission + r.salesCommission,
        classCommission: acc.classCommission + r.classCommission,
        total: acc.total + r.total,
      }),
      { headcount: 0, baseSalary: 0, salesCommission: 0, classCommission: 0, total: 0 }
    );
  }, [allResults, excludedSet]);

  // 事件处理
  const toggleExclude = (staffId: string) => {
    setExcludedByStore((prev) => {
      const cur = new Set(prev[storeId] || []);
      if (cur.has(staffId)) cur.delete(staffId);
      else cur.add(staffId);
      return { ...prev, [storeId]: cur };
    });
  };

  const toggleDept = (dept: Department) => setExpanded((p) => ({ ...p, [dept]: !p[dept] }));

  const handleToggleNewbie = (staffId: string) => {
    setNewbieByStore((prev) => {
      const cur = new Set(prev[storeId] || []);
      const willBeNewbie = !cur.has(staffId);
      if (willBeNewbie) cur.add(staffId);
      else cur.delete(staffId);
      const next = { ...prev, [storeId]: cur };
      persistNewbie(next);
      return next;
    });
    // 触发重算
    calcToggleNewbie(staffId, (id, willBeNewbie) => {
      // 这里回调主要用于通知 Hook 状态已更新，实际重算在 Hook 内部完成
    });
  };

  const handleSavePosition = (staffId: string, newTitle: string) => {
    calcSavePosition(staffId, newTitle, overrides, setOverridesByStore);
  };

  const handleRun = async () => {
    if (!currentPlan || !selectedMonth) {
      alert('请先选择月份，并确保该月已有配置');
      return;
    }
    try {
      const res = await run(selectedMonth, currentPlan, overrides, opsViewEnabled, newbieSet);
      const filteredResults = opsViewEnabled
        ? res.results
        : res.results.filter((r) => r.positionTitle !== '运营主管');

      if (res.missingPositions.length > 0) {
        setMissing(res.missingPositions);
        setMissingDialogOpen(true);
      }
      setResultsByStore((prev) => ({ ...prev, [storeId]: filteredResults }));
      setPerformancesByStore((prev) => ({ ...prev, [storeId]: res.performances }));
    } catch (e) {
      console.error('[handleRun] 失败:', e);
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

    try {
      const res = await run(selectedMonth, nextPlan, overrides, opsViewEnabled, newbieSet);
      const filteredResults = opsViewEnabled ? res.results : res.results.filter((r) => r.positionTitle !== '运营主管');
      setResultsByStore((prev) => ({ ...prev, [storeId]: filteredResults }));
      setPerformancesByStore((prev) => ({ ...prev, [storeId]: res.performances }));
    } catch (e) {
      console.error('[重新计算失败]', e);
    }
  };

  const storeName = getStoreById(storeId)?.name || '';
  const excludedCount = allResults.length - allResults.filter((r) => !excludedSet.has(r.staffId)).length;

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
            onGoSimulation={() => navigate(`/simulation?month=${selectedMonth}`)}
            onBackToConfig={() => navigate('/compensation')}
          />

          <div className="mb-4"><StoreSwitcher /></div>

          <PayrollToolbar
            month={selectedMonth}
            months={Object.keys(store)}
            viewMode={viewMode}
            loading={loading}
            showViewToggle={allResults.length > 0}
            hideExcluded={hideExcluded}
            canExport={allResults.length > 0}
            hasPlan={!!currentPlan}
            canExportPayroll={hasPermission('export:payroll', storeId)}
            onMonthChange={(m) => {
              setSelectedMonth(m);
              fetchedKeyRef.current = ''; // ⭐ 允许重新拉取
              navigate(`/payroll?month=${m}`, { replace: true });
            }}
            onViewModeChange={setViewMode}
            onHideExcludedChange={setHideExcluded}
            onRun={handleRun}
            onExportTable={handleExportTable}
          />

          {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-700">{error}</div>}
          <PayrollMissingAlert missing={missing} onOpenDialog={() => setMissingDialogOpen(true)} />
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
            />
          )}

          {!loading && allResults.length === 0 && currentPlan && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-1">暂无计算结果</h3>
              <p className="text-sm text-gray-400 mb-4">点击「开始计算」按钮，根据本月配置拉取数据并计算薪酬</p>
              <button onClick={handleRun} disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.97]">
                <Calculator className="w-4 h-4" /> 开始计算
              </button>
            </div>
          )}

          {!loading && !currentPlan && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-1">该月份暂无薪酬配置</h3>
              <p className="text-sm text-gray-400 mb-4">请先到「薪酬配置」页面上传或导入 {selectedMonth || '当月'} 的薪酬方案</p>
              <button onClick={() => navigate('/compensation')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold shadow-sm transition-all">
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
      </div>
    </PayrollActionsProvider>
  );
};

export default PayrollPage;