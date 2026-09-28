import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Calculator, X } from 'lucide-react';
import type {
  CompensationStore,
  MonthlyCompensationPlan,
  PositionConfig,
} from '../types/compensation';
import { usePayroll } from '../hooks/usePayroll';
import type {
  PayrollResult,
  Department,
  EmployeePerformance,
  ClassMemberDetail,
} from '../utils/payroll';
import {
  calcDepartmentStats,
  calcEmployeePayroll,
  findPositionByTitle,
} from '../utils/payroll';
import { exportPayrollTableToExcel } from '../utils/exportPayrollTable';
import { fetchPlanByMonth } from '../api/compensation';
import MissingPositionConfigDialog from '../components/MissingPositionConfigDialog';
import StoreSwitcher from '../components/StoreSwitcher';
import { useStore } from '../contexts/StoreContext';
import { getStoreById } from '../constants/stores';
import { PayrollHeader } from './payroll/PayrollHeader';
import { PayrollToolbar } from './payroll/PayrollToolbar';
import { PayrollSummary } from './payroll/PayrollSummary';
import { PayrollMissingAlert } from './payroll/PayrollMissingAlert';
import { PayrollAllTable } from './payroll/PayrollAllTable';
import { PayrollDeptList } from './payroll/PayrollDeptList';
import { PayrollActionsProvider } from './payroll/PayrollActionsContext';

const STORAGE_KEY = 'gym_compensation_store_v2';
const OVERRIDES_KEY = 'gym_position_overrides_v1';
type FullStore = Record<string, CompensationStore>;
type ViewMode = 'all' | 'department';

/* ============================================================
 * 职位设置对话框
 * ============================================================ */
const PositionEditDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  currentTitle: string;
  options: string[];
  staffName: string;
  onSave: (title: string) => void;
}> = ({ open, onClose, currentTitle, options, staffName, onSave }) => {
  const [value, setValue] = useState(currentTitle);

  useEffect(() => {
    if (open) setValue(currentTitle);
  }, [open, currentTitle]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">设置职位</h2>
            <p className="text-xs text-gray-500 mt-0.5">{staffName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-gray-600 mb-2 block">
            选择职位
          </label>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 mt-2">
            保存后会立即重新计算该员工薪资
          </p>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={() => {
              onSave(value);
              onClose();
            }}
            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition active:scale-[0.97]"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
 * 主页面
 * ============================================================ */
const PayrollPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { storeId } = useStore();

  const [fullStore, setFullStore] = useState<FullStore>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(
    searchParams.get('month') || ''
  );
  const [missing, setMissing] = useState<string[]>([]);
  const [missingDialogOpen, setMissingDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('department');
  const [hideExcluded, setHideExcluded] = useState<boolean>(true);

  const [resultsByStore, setResultsByStore] = useState<
    Record<string, PayrollResult[]>
  >({});
  const [performancesByStore, setPerformancesByStore] = useState<
    Record<string, EmployeePerformance[]>
  >({});
  const [expanded, setExpanded] = useState<Record<Department, boolean>>({
    会籍: true,
    私教: true,
    泳教: true,
    运营: true,
  });
  const [excludedByStore, setExcludedByStore] = useState<
    Record<string, Set<string>>
  >({});
  const [overridesByStore, setOverridesByStore] = useState<
    Record<string, Record<string, string>>
  >({});
  const [editingStaff, setEditingStaff] = useState<PayrollResult | null>(null);

  const store: CompensationStore = fullStore[storeId] || {};
  const allResults: PayrollResult[] = resultsByStore[storeId] || [];
  const excludedSet: Set<string> = excludedByStore[storeId] || new Set();
  const overrides: Record<string, string> = overridesByStore[storeId] || {};

  /* 加载本地存储 */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFullStore(JSON.parse(saved));
      } catch (e) {
        console.error('[PayrollPage] 解析失败', e);
      }
    }
    const savedOv = localStorage.getItem(OVERRIDES_KEY);
    if (savedOv) {
      try {
        setOverridesByStore(JSON.parse(savedOv));
      } catch (e) {
        console.error('[PayrollPage] 覆盖表解析失败', e);
      }
    }
  }, []);

  const username = import.meta.env.VITE_TEST_USERNAME || '';
  const password = import.meta.env.VITE_TEST_PASSWORD || '';
  const { run, loading, error } = usePayroll({
    username,
    password,
    busId: storeId,
  });

  useEffect(() => {
    const months = Object.keys(fullStore[storeId] || {}).sort();
    if (months.length > 0) {
      setSelectedMonth(months[months.length - 1]);
    } else {
      const now = new Date();
      setSelectedMonth(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  useEffect(() => {
    const m = searchParams.get('month');
    if (m) setSelectedMonth(m);
  }, [searchParams]);

  /* 切月份时从 API 拉方案 */
  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchPlanByMonth(storeId, selectedMonth);
        if (cancelled || !remote) return;
        setFullStore((prev) => {
          const next = {
            ...prev,
            [storeId]: { ...(prev[storeId] || {}), [selectedMonth]: remote },
          };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      } catch (e) {
        console.warn('[PayrollPage] API 加载失败，使用本地缓存', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId, selectedMonth]);

  const currentPlan: MonthlyCompensationPlan | undefined = selectedMonth
    ? store[selectedMonth]
    : undefined;

  const positionOptions = useMemo(() => {
    const set = new Set<string>();
    (currentPlan?.positions || []).forEach((p) => set.add(p.title));
    [
      '运营主管',
      '运营',
      '店长',
      '会籍经理',
      '泳教经理',
      '会籍',
      '私教',
      '泳教',
      '前台',
      '保洁',
      '维修',
    ].forEach((t) => set.add(t));
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
        total: acc.total + r.total,
      }),
      {
        headcount: 0,
        baseSalary: 0,
        salesCommission: 0,
        classCommission: 0,
        total: 0,
      }
    );
  }, [allResults, excludedSet]);

  const toggleExclude = (staffId: string) => {
    setExcludedByStore((prev) => {
      const cur = new Set(prev[storeId] || []);
      if (cur.has(staffId)) cur.delete(staffId);
      else cur.add(staffId);
      return { ...prev, [storeId]: cur };
    });
  };

  const toggleDept = (dept: Department) =>
    setExpanded((p) => ({ ...p, [dept]: !p[dept] }));

  const updateAttendance = (
    staffId: string,
    updates: { fullAttendance: boolean; absentDays: number }
  ) => {
    setResultsByStore((prev) => {
      const list = prev[storeId] || [];
      const next = list.map((r) => {
        if (r.staffId !== staffId) return r;
        const absentDeduction =
          !updates.fullAttendance && updates.absentDays > 0 && r.baseSalary > 0
            ? (r.baseSalary / 30) * updates.absentDays
            : 0;
        return {
          ...r,
          fullAttendance: updates.fullAttendance,
          absentDays: updates.absentDays,
          absentDeduction,
          total: Math.max(
            0,
            r.baseSalary +
              r.salesCommission +
              r.classCommission -
              absentDeduction
          ),
        };
      });
      return { ...prev, [storeId]: next };
    });
  };

  /* ⭐ 根据 classMemberDetail 重算该员工的课提 */
  const recomputeClassCommission = (
    r: PayrollResult,
    members: ClassMemberDetail[]
  ): {
    classCommission: number;
    classCommissionDetail: Record<string, number>;
  } => {
    const rates = r.courseCommissionRates || {};
    const detail: Record<string, number> = {};
    let total = 0;

    members.forEach((m) => {
      const course = m.courseName;
      const fallback = rates[course];
      const mode = m.mode ?? fallback?.mode ?? 'percent';
      const value = m.value ?? fallback?.rate ?? 0;

      const fee = mode === 'percent' ? m.amount * value : m.signNum * value;

      total += fee;
      detail[course] = (detail[course] ?? 0) + fee;
    });

    return { classCommission: total, classCommissionDetail: detail };
  };

  /* ⭐ 更新某会员某条消课记录的课提方式 */
  const handleUpdateMemberCommission = useCallback(
    (
      staffId: string,
      memberIndex: number,
      patch: { mode?: 'percent' | 'fixed'; value?: number }
    ) => {
      setResultsByStore((prev) => {
        const list = prev[storeId] || [];
        const next = list.map((r) => {
          if (r.staffId !== staffId) return r;

          const nextMembers = [...(r.classMemberDetail || [])];
          const target = nextMembers[memberIndex];
          if (!target) return r;

          nextMembers[memberIndex] = { ...target, ...patch };

          const recomputed = recomputeClassCommission(r, nextMembers);

          return {
            ...r,
            classMemberDetail: nextMembers,
            classCommission: recomputed.classCommission,
            classCommissionDetail: recomputed.classCommissionDetail,
            total: Math.max(
              0,
              r.baseSalary +
                r.salesCommission +
                recomputed.classCommission -
                r.absentDeduction
            ),
          };
        });
        return { ...prev, [storeId]: next };
      });
    },
    [storeId]
  );

  /* 保存职位覆盖 + 立即重算 */
  const handleSavePosition = (staffId: string, newTitle: string) => {
    const nextOverrides = { ...overrides, [staffId]: newTitle };
    setOverridesByStore((prev) => {
      const next = { ...prev, [storeId]: nextOverrides };
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });

    const perfs = performancesByStore[storeId] || [];
    const perf = perfs.find((p) => p.staffId === staffId);
    if (!perf || !currentPlan) return;

    const position = findPositionByTitle(currentPlan.positions, newTitle);
    const effectivePosition: PositionConfig =
      position || {
        id: `virtual_${newTitle}`,
        title: newTitle,
        category: 'operations',
        headcount: 0,
        performanceTarget: 0,
        performanceSource: 'self',
        totalBaseSalary: 0,
        commissionTiers: [],
        baseSalaryTiers: [],
        genderSalaryTiers: undefined,
        extraNote: '',
        courseCommissions: [],
      };

    const nextPerf: EmployeePerformance = {
      ...perf,
      positionTitle: newTitle,
    };
    if (newTitle === '运营主管') {
      const storePerf = perfs.find(
        (p) =>
          p.positionTitle === '店长' || p.positionTitle.includes('门店经理')
      );
      nextPerf.managerSalesBase = storePerf?.salesAmount ?? 0;
    }

    const newResult = calcEmployeePayroll(effectivePosition, nextPerf);
    setResultsByStore((prev) => {
      const list = prev[storeId] || [];
      const next = list.map((r) => (r.staffId === staffId ? newResult : r));
      return { ...prev, [storeId]: next };
    });
  };

  const handleRun = async () => {
    if (!currentPlan || !selectedMonth) {
      alert('请先选择月份，并确保该月已有配置');
      return;
    }
    try {
      const res = await run(selectedMonth, currentPlan, overrides);
      if (res.missingPositions.length > 0) {
        setMissing(res.missingPositions);
        setMissingDialogOpen(true);
      }
      setResultsByStore((prev) => ({ ...prev, [storeId]: res.results }));
      setPerformancesByStore((prev) => ({
        ...prev,
        [storeId]: res.performances,
      }));
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
      allResults,
      excludedSet,
      plan: currentPlan,
      month: selectedMonth,
      storeName: storeName || '门店',
    });
  };

  const handleConfirmMissing = async (
    configs: Record<string, PositionConfig>
  ) => {
    if (!currentPlan || !selectedMonth) return;
    const newPositions: PositionConfig[] = [...currentPlan.positions];
    const existingTitles = new Set(newPositions.map((p) => p.title));
    Object.entries(configs).forEach(([missingName, cfg]) => {
      const finalTitle = ((cfg?.title as string) || missingName).trim();
      if (existingTitles.has(finalTitle)) return;
      newPositions.push({
        ...(cfg || {}),
        id: cfg?.id || `virtual_${finalTitle}_${Date.now()}`,
        title: finalTitle,
      } as PositionConfig);
      existingTitles.add(finalTitle);
    });

    const nextPlan: MonthlyCompensationPlan = {
      ...currentPlan,
      positions: newPositions,
    };
    const nextStore: FullStore = {
      ...fullStore,
      [storeId]: { ...store, [selectedMonth]: nextPlan },
    };
    setFullStore(nextStore);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
    setMissing([]);
    setMissingDialogOpen(false);

    try {
      const res = await run(selectedMonth, nextPlan, overrides);
      setResultsByStore((prev) => ({ ...prev, [storeId]: res.results }));
      setPerformancesByStore((prev) => ({
        ...prev,
        [storeId]: res.performances,
      }));
    } catch (e) {
      console.error('[重新计算失败]', e);
    }
  };

  const storeName = getStoreById(storeId)?.name || '';
  const excludedCount =
    allResults.length -
    allResults.filter((r) => !excludedSet.has(r.staffId)).length;

  /* ⭐ Context 值：只包含「更新会员课提」 */
  const payrollActions = useMemo(
    () => ({
      updateMemberCommission: handleUpdateMemberCommission,
    }),
    [handleUpdateMemberCommission]
  );

  return (
    <PayrollActionsProvider value={payrollActions}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PayrollHeader
            storeName={storeName}
            month={selectedMonth}
            excludedCount={excludedCount}
            onGoSimulation={() =>
              navigate(`/simulation?month=${selectedMonth}`)
            }
            onBackToConfig={() => navigate('/compensation')}
          />

          <div className="mb-4">
            <StoreSwitcher />
          </div>

          <PayrollToolbar
            month={selectedMonth}
            months={Object.keys(store)}
            viewMode={viewMode}
            loading={loading}
            showViewToggle={allResults.length > 0}
            hideExcluded={hideExcluded}
            canExport={allResults.length > 0}
            hasPlan={!!currentPlan}
            onMonthChange={(m) => {
              setSelectedMonth(m);
              navigate(`/payroll?month=${m}`, { replace: true });
            }}
            onViewModeChange={setViewMode}
            onHideExcludedChange={setHideExcluded}
            onRun={handleRun}
            onExportTable={handleExportTable}
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
              summary={summary}
              hideExcluded={hideExcluded}
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
              expanded={expanded}
              hideExcluded={hideExcluded}
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
              <h3 className="font-semibold text-gray-700 mb-1">
                暂无计算结果
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                点击「开始计算」按钮，根据本月配置拉取数据并计算薪酬
              </p>
              <button
                onClick={handleRun}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.97]"
              >
                <Calculator className="w-4 h-4" />
                开始计算
              </button>
            </div>
          )}

          {!loading && !currentPlan && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-1">
                该月份暂无薪酬配置
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                请先到「薪酬配置」页面上传或导入 {selectedMonth || '当月'}{' '}
                的薪酬方案
              </p>
              <button
                onClick={() => navigate('/compensation')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                去配置
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