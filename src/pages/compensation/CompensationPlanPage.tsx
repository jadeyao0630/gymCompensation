import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Undo2, AlertCircle, Users, Wallet, Briefcase, Loader2,
  Gift, Building2,
} from 'lucide-react';
import type {
  PositionCategory,
  MonthlyCompensationPlan,
  PositionConfig,
  DepartmentRewards,
} from '../../types/compensation';
import { getCategoryLabel } from '../../constants/categories';
import { uid } from '../../utils/id';
import { formatMonthLabel } from '../../utils/format';
import { parseCompensationExcel } from '../../utils/excelParser';
import { calcTotalBaseSalary } from '../../utils/salary';
import {
  deletePlan, copyPlan, copySimulationSetting, fetchPlanByMonth,
} from '../../api/compensation';
import PageHeader from '../../components/layout/PageHeader';
import Toolbar from '../../components/layout/Toolbar';
import StatCard from '../../components/common/StatCard';
import CategoryTabs from '../../components/compensation/CategoryTabs';
import PositionCard from '../../components/compensation/PositionCard';
import PositionOverview from '../../components/compensation/PositionOverview';
import MonthPickerDialog from '../../components/compensation/MonthPickerDialog';
import StoreSwitcher from '../../components/layout/StoreSwitcher';
import StoreStatusBadge from '../../components/layout/StoreStatusBadge';
import PermissionGate from '../../components/common/PermissionGate';
import { CompensationGuideDialog } from '../../components/compensation/CompensationGuideDialog';
import { CompensationEmptyState } from '../../components/compensation/CompensationEmptyState';
import RewardsCatalogDialog from '../../components/compensation/RewardsCatalogDialog';
import DepartmentRewardsDialog from '../../components/compensation/DepartmentRewardsDialog';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRewardsCatalog } from '../../hooks/useRewardsCatalog';
import { useCompensationPlan } from './hooks/useCompensationPlan';
import { usePersistedMonth } from '../../hooks/usePersistedMonth';

const CompensationPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  const {
    fullStore, setFullStore,
    persistPlan, persistLocalOnly,
    pushUndo, handleUndo, undoDepth,
    dbOnline, saveStatus, lastSavedAt, showGuide, setShowGuide,
    isInitialSelectDoneRef,
  } = useCompensationPlan(storeId);

  const {
    catalog: rewardsCatalog,
    addReward,
    updateReward,
    removeReward,
  } = useRewardsCatalog();

  const [showCatalogDialog, setShowCatalogDialog] = useState(false);
  const [showDeptRewardsDialog, setShowDeptRewardsDialog] = useState(false);

  /* ⭐ 页面级月份持久化：key = gym_compensation_month_v1_<storeId> */
  const { month: selectedMonth, setMonth: setSelectedMonth } = usePersistedMonth(
    'compensation',
    storeId
  );

  const [activeTab, setActiveTab] = useState<PositionCategory>('membership');
  const [importing, setImporting] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const [copying, setCopying] = useState<{ active: boolean; target?: string }>({
    active: false,
  });

  const fetchedKeyRef = useRef<string>('');
  const store = fullStore[storeId] || {};

  const canViewPlan = hasPermission('plan:view', storeId);
  const canEditPlan = canViewPlan && hasPermission('plan:edit', storeId);
  const canEditTarget = canViewPlan && hasPermission('target:edit', storeId);
  const opsViewEnabled = hasPermission('ops:view', storeId);
  const canAddMonth = canViewPlan && hasPermission('month:add', storeId);
  const canDeleteMonth = canViewPlan && hasPermission('month:delete', storeId);
  const canImportPlan = canViewPlan && hasPermission('plan:import', storeId);
  const canExportPlan = canViewPlan && hasPermission('plan:export', storeId);
  const canAddPosition = canViewPlan && hasPermission('position:add', storeId);
  const canDeletePosition = canViewPlan && hasPermission('position:delete', storeId);
  const canRenamePosition = canViewPlan && hasPermission('position:rename', storeId);
  const canEditHeadcount = canViewPlan && hasPermission('headcount:edit', storeId);

  const availableMonths = useMemo(() => Object.keys(store).sort(), [store]);

  /* ⭐ 首次进入：若还没有持久化月份，则选最近可用月份 */
  useEffect(() => {
    if (isInitialSelectDoneRef.current) return;
    if (selectedMonth) {
      isInitialSelectDoneRef.current = true;
      return;
    }
    if (availableMonths.length > 0) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
      isInitialSelectDoneRef.current = true;
    }
  }, [storeId, availableMonths, isInitialSelectDoneRef, selectedMonth, setSelectedMonth]);

  useEffect(() => {
    fetchedKeyRef.current = '';
  }, [storeId]);

  useEffect(() => {
    if (!selectedMonth) return;
    if (!dbOnline) return;
    if (copying.active) return;
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
        setFullStore((prev) => {
          const next = {
            ...prev,
            [storeId]: { ...(prev[storeId] || {}), [selectedMonth]: remote },
          };
          try {
            localStorage.setItem('gym_compensation_store_v2', JSON.stringify(next));
          } catch {}
          return next;
        });
      } catch (e) {
        console.warn('[CompensationPlan] 加载方案详情失败', e);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, selectedMonth, dbOnline, copying.active]);

  const currentPlan = selectedMonth ? store[selectedMonth] : undefined;

  const overviewPositions = useMemo(() => {
    const all = currentPlan?.positions || [];
    return opsViewEnabled ? all : all.filter((p) => p.title !== '运营主管');
  }, [currentPlan, opsViewEnabled]);

  const visiblePositions = useMemo(() => {
    const all = currentPlan?.positions.filter((p) => !p.disabled) || [];
    return opsViewEnabled ? all : all.filter((p) => p.title !== '运营主管');
  }, [currentPlan, opsViewEnabled]);

  const currentPositions = useMemo(() => {
    const all = currentPlan?.positions.filter((p) => p.category === activeTab && !p.disabled) || [];
    return opsViewEnabled ? all : all.filter((p) => p.title !== '运营主管');
  }, [currentPlan, activeTab, opsViewEnabled]);

  const totalHeadcount = visiblePositions.reduce((s, p) => s + p.headcount, 0);
  const totalBase = visiblePositions.reduce(
    (s, p) => s + calcTotalBaseSalary(p, currentPlan?.positions || []),
    0
  );

  const handleSelectMonth = (m: string) => {
    if (copying.active) return;
    isInitialSelectDoneRef.current = true;
    fetchedKeyRef.current = '';
    setSelectedMonth(m);
    navigate(`/compensation?month=${m}`, { replace: true });
  };

  const handleToggleDisabled = (title: string, disabled: boolean) => {
    if (copying.active) return;
    if (!canEditPlan) return alert('无权限：设置方案');
    if (!currentPlan) return;
    const target = currentPlan.positions.find((p) => p.title === title);
    if (!target) return alert(`职位「${title}」不存在`);

    pushUndo(currentPlan.month, currentPlan, disabled ? `禁用职位「${title}」` : `启用职位「${title}」`);
    const nextPlan = {
      ...currentPlan,
      positions: currentPlan.positions.map((p) =>
        p.title === title ? { ...p, disabled } : p
      ),
    };
    persistPlan(currentPlan.month, nextPlan);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (copying.active) { e.target.value = ''; return; }
    if (!canEditPlan) { alert('无权限：设置方案'); e.target.value = ''; return; }
    if (!canImportPlan) { alert('无权限：导入薪酬佣金设置'); e.target.value = ''; return; }
    const file = e.target.files?.[0];
    if (!file) return;

    let month = selectedMonth;
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(month);
    }

    const lower = file.name.toLowerCase();
    const isJson = lower.endsWith('.json');
    const isExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls');
    if (!isJson && !isExcel) {
      alert('仅支持 .xlsx / .xls / .json 文件');
      e.target.value = '';
      return;
    }

    setImporting(true);
    try {
      let plan: MonthlyCompensationPlan;
      if (isJson) {
        const parsed = JSON.parse(await file.text());
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.positions)) {
          throw new Error('JSON 格式错误');
        }
        plan = {
          month,
          periodLabel: formatMonthLabel(month),
          positions: parsed.positions.map((p: any) => ({ ...p, id: p.id || uid() })),
          importedFrom: `JSON: ${file.name}`,
          importedAt: new Date().toISOString(),
          departmentRewards: parsed.departmentRewards,
        };
      } else {
        plan = await parseCompensationExcel(file, month, formatMonthLabel(month));
      }

      const existed = store[month];
      if (existed && existed.positions.length > 0) {
        if (!confirm(`${formatMonthLabel(month)} 已有方案，是否覆盖？`)) {
          setImporting(false);
          e.target.value = '';
          return;
        }
        pushUndo(month, existed, isJson ? '导入 JSON 覆盖' : '导入 Excel 覆盖');
      } else if (existed) {
        pushUndo(month, existed, isJson ? '导入 JSON' : '导入 Excel');
      }

      persistPlan(month, plan);
      fetchedKeyRef.current = '';
      alert(`已导入 ${file.name} → ${formatMonthLabel(month)}（${plan.positions.length} 个岗位）`);
    } catch (err: any) {
      alert((isJson ? '解析 JSON 失败：' : '解析 Excel 失败：') + (err?.message || ''));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleAddMonth = async (month: string, copyFrom?: string, copySimulation?: boolean) => {
    if (copying.active) return;
    if (!canEditPlan) return alert('无权限：设置方案');
    if (!canAddMonth) return alert('无权限：新增月份');

    if (!copyFrom) {
      setShowMonthPicker(false);

      const existedPlan = store[month];
      const hasRealPlan =
        !!existedPlan &&
        Array.isArray(existedPlan.positions) &&
        existedPlan.positions.length > 0;

      if (hasRealPlan && !confirm(`${formatMonthLabel(month)} 已存在，是否覆盖？`)) return;
      if (hasRealPlan) pushUndo(month, existedPlan, '覆盖新建');

      const blank: MonthlyCompensationPlan = {
        month,
        periodLabel: formatMonthLabel(month),
        positions: [],
      };
      pushUndo(month, blank, '新增月份');
      persistPlan(month, blank);
      setSelectedMonth(month);
      fetchedKeyRef.current = '';
      navigate(`/compensation?month=${month}`, { replace: true });
      return;
    }

    const srcPlan = store[copyFrom];
    if (!srcPlan) return alert('源月份方案不存在');

    const existedPlan = store[month];
    const hasRealPlan =
      !!existedPlan &&
      Array.isArray(existedPlan.positions) &&
      existedPlan.positions.length > 0;
    if (hasRealPlan && !confirm(`${formatMonthLabel(month)} 已存在，是否覆盖？`)) return;

    setShowMonthPicker(false);
    setCopying({ active: true, target: month });

    const prevPlan = existedPlan ? JSON.parse(JSON.stringify(existedPlan)) : undefined;

    try {
      const cloned: MonthlyCompensationPlan = {
        ...JSON.parse(JSON.stringify(srcPlan)),
        month,
        periodLabel: formatMonthLabel(month),
        importedFrom: `复制自 ${formatMonthLabel(copyFrom)}`,
        importedAt: new Date().toISOString(),
      };

      if (hasRealPlan) pushUndo(month, existedPlan, '覆盖新建（复制）');
      pushUndo(month, cloned, `复制自 ${copyFrom}`);
      persistLocalOnly(month, cloned);

      if (dbOnline) {
        await Promise.all([
          copyPlan(storeId, copyFrom, month),
          copySimulation
            ? copySimulationSetting(storeId, copyFrom, month)
            : Promise.resolve(),
        ]);
      }

      setSelectedMonth(month);
      fetchedKeyRef.current = '';
      navigate(`/compensation?month=${month}`, { replace: true });
    } catch (e: any) {
      console.error('[handleAddMonth] 复制失败', e);

      if (prevPlan) {
        persistLocalOnly(month, prevPlan);
      } else {
        setFullStore((prev) => {
          const curStore = { ...(prev[storeId] || {}) };
          delete curStore[month];
          const next = { ...prev, [storeId]: curStore };
          try {
            localStorage.setItem('gym_compensation_store_v2', JSON.stringify(next));
          } catch {}
          return next;
        });
      }
      alert('复制失败：' + (e?.message || '未知错误'));
    } finally {
      setCopying({ active: false });
    }
  };

  const removeMonth = async () => {
    if (copying.active) return;
    if (!canEditPlan) return alert('无权限：设置方案');
    if (!canDeleteMonth) return alert('无权限：删除月份');
    if (!selectedMonth || !currentPlan) return;
    if (!confirm(`确定删除 ${formatMonthLabel(selectedMonth)} 的全部配置？`)) return;

    const target = selectedMonth;

    const remaining = availableMonths.filter((m) => m !== target);
    const smaller = remaining.filter((m) => m < target).sort();
    const larger = remaining.filter((m) => m > target).sort();
    const nextMonth =
      smaller.length > 0
        ? smaller[smaller.length - 1]
        : larger.length > 0
        ? larger[0]
        : '';

    pushUndo(target, currentPlan, '删除月份');

    setFullStore((prev) => {
      const cur = { ...(prev[storeId] || {}) };
      delete cur[target];
      const next = { ...prev, [storeId]: cur };
      localStorage.setItem('gym_compensation_store_v2', JSON.stringify(next));
      return next;
    });

    if (dbOnline) {
      deletePlan(storeId, target).catch(() => {});
    }

    fetchedKeyRef.current = '';
    setSelectedMonth(nextMonth);
    if (nextMonth) {
      navigate(`/compensation?month=${nextMonth}`, { replace: true });
    } else {
      navigate(`/compensation`, { replace: true });
    }
  };

  const updatePlan = (
    updates: Partial<MonthlyCompensationPlan>,
    undoLabel: string,
    allowTargetOnly = false
  ) => {
    if (copying.active) return;
    if (!canEditPlan && !(allowTargetOnly && canEditTarget)) {
      return alert('无权限：设置方案');
    }
    if (!selectedMonth || !currentPlan) return;
    pushUndo(selectedMonth, currentPlan, undoLabel);
    persistPlan(selectedMonth, { ...currentPlan, ...updates });
  };

  const updatePosition = (posId: string, updates: Partial<PositionConfig>) => {
    if (copying.active) return;
    if (!currentPlan) return;
    const keys = Object.keys(updates);
    const onlyTarget = keys.length === 1 && keys[0] === 'performanceTarget';
    const containsHeadcount = keys.includes('headcount');
    const containsTitle = keys.includes('title');

    if (containsHeadcount && !canEditHeadcount) {
      alert('无权限：修改职位人数');
      return;
    }
    if (containsTitle && !canRenamePosition) {
      alert('无权限：职位名称更改');
      return;
    }

    updatePlan(
      {
        positions: currentPlan.positions.map((p) =>
          p.id === posId ? { ...p, ...updates } : p
        ),
      },
      `修改职位`,
      onlyTarget
    );
  };

  const addPosition = () => {
    if (copying.active) return;
    if (!canEditPlan) return alert('无权限：设置方案');
    if (!canAddPosition) return alert('无权限：新增职位');
    if (!currentPlan) return;
    updatePlan(
      {
        positions: [
          ...currentPlan.positions,
          {
            id: uid(),
            title: `新${getCategoryLabel(activeTab)}职位`,
            category: activeTab,
            headcount: 0,
            performanceTarget: 0,
            performanceSource: 'self',
            totalBaseSalary: 0,
            commissionTiers: [],
            baseSalaryTiers: [],
          },
        ],
      },
      `新增${getCategoryLabel(activeTab)}职位`
    );
  };

  const removePosition = (posId: string) => {
    if (copying.active) return;
    if (!canEditPlan) return alert('无权限：设置方案');
    if (!canDeletePosition) return alert('无权限：删除职位');
    if (!currentPlan) return;
    const target = currentPlan.positions.find((p) => p.id === posId);
    if (!confirm(`确定删除职位「${target?.title}」？`)) return;
    updatePlan(
      { positions: currentPlan.positions.filter((p) => p.id !== posId) },
      `删除职位`
    );
  };

  const handleExport = () => {
    if (copying.active) return;
    if (!canExportPlan) return alert('无权限：导出薪酬佣金设置');
    if (!currentPlan) return;
    const blob = new Blob([JSON.stringify(currentPlan, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `薪酬配置_${storeId}_${selectedMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDepartmentRewardsChange = (next: DepartmentRewards) => {
    if (!selectedMonth || !currentPlan) return;
    updatePlan({ departmentRewards: next }, '修改部门奖金');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader selectedMonth={selectedMonth} storeId={storeId} />

        {!canViewPlan ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm p-20 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center mb-5">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">无权限：查看方案</h3>
            <p className="text-sm text-gray-400">
              请联系管理员分配「查看方案」权限
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <StoreSwitcher />
              <StoreStatusBadge
                dbOnline={dbOnline}
                saveStatus={saveStatus}
                lastSavedAt={lastSavedAt}
              />

              {canEditPlan && (
                <button
                  onClick={() => handleUndo()}
                  disabled={undoDepth === 0 || copying.active}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition ${
                    undoDepth > 0 && !copying.active
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  <Undo2 className="w-3 h-3" />
                  撤销
                  {undoDepth > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold">
                      {undoDepth}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowCatalogDialog(true)}
                disabled={copying.active}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition disabled:opacity-50"
              >
                <Gift className="w-3 h-3" /> 奖罚库
              </button>

              {currentPlan && (
                <button
                  onClick={() => setShowDeptRewardsDialog(true)}
                  disabled={copying.active || !canEditPlan}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 transition disabled:opacity-50"
                >
                  <Building2 className="w-3 h-3" /> 部门奖金
                </button>
              )}

              <div className="flex-1" />
            </div>

            <Toolbar
              months={availableMonths}
              availableMonths={availableMonths}
              selectedMonth={selectedMonth}
              hasPlan={!!currentPlan}
              importing={importing}
              importedFrom={currentPlan?.importedFrom}
              canEdit={canEditPlan && !copying.active}
              onSelectMonth={handleSelectMonth}
              onAddMonth={() => {
                if (copying.active) return;
                if (!canEditPlan) return alert('无权限：设置方案');
                if (!canAddMonth) return alert('无权限：新增月份');
                setShowMonthPicker(true);
              }}
              onRemoveMonth={removeMonth}
              onImport={handleImport}
              onExport={handleExport}
              canAddMonth={canAddMonth && !copying.active}
              canDeleteMonth={canDeleteMonth && !copying.active}
              canImport={canImportPlan && !copying.active}
              canExport={canExportPlan && !copying.active}
            />

            {!currentPlan && <CompensationEmptyState />}

            {currentPlan && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <StatCard
                    icon={<Briefcase className="w-5 h-5" />}
                    label="职位数"
                    value={visiblePositions.length}
                    gradient="from-blue-500 to-indigo-500"
                    glow="bg-blue-300"
                  />
                  <StatCard
                    icon={<Users className="w-5 h-5" />}
                    label="总人数"
                    value={totalHeadcount}
                    gradient="from-emerald-500 to-teal-500"
                    glow="bg-emerald-300"
                  />
                  <StatCard
                    icon={<Wallet className="w-5 h-5" />}
                    label="总底薪"
                    value={`¥${totalBase.toLocaleString()}`}
                    gradient="from-amber-500 to-orange-500"
                    glow="bg-amber-300"
                  />
                </div>

                <PositionOverview
                  positions={overviewPositions}
                  canEdit={canEditPlan && !copying.active}
                  onGoTo={setActiveTab}
                  onToggleDisabled={handleToggleDisabled}
                />

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <CategoryTabs
                    positions={visiblePositions}
                    active={activeTab}
                    onChange={setActiveTab}
                  />
                  <div className="p-4 sm:p-6 bg-gradient-to-b from-gray-50/40 to-white">
                    {currentPositions.length === 0 ? (
                      <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4">
                          <Briefcase className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400 mb-1">该分类下暂无职位</p>
                        <p className="text-xs text-gray-300">点击下方按钮新增</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {currentPositions.map((pos) => (
                          <PositionCard
                            key={pos.id}
                            position={pos}
                            allPositions={currentPlan.positions}
                            rewardsCatalog={rewardsCatalog}
                            readOnly={!canEditPlan || copying.active}
                            canEditTarget={canEditTarget && !copying.active}
                            canEditHeadcount={canEditHeadcount && !copying.active}
                            canDelete={canDeletePosition && !copying.active}
                            canRename={canRenamePosition && !copying.active}
                            onUpdate={(u) => updatePosition(pos.id, u)}
                            onRemove={() => removePosition(pos.id)}
                          />
                        ))}
                      </div>
                    )}

                    <div className="mt-6">
                      <PermissionGate
                        permission="plan:edit"
                        fallback={
                          <div className="text-xs text-center text-gray-400 py-3">
                            无编辑权限，无法新增职位
                          </div>
                        }
                      >
                        {canAddPosition && !copying.active ? (
                          <button
                            onClick={addPosition}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-white border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-2xl text-sm font-medium text-gray-500 hover:text-blue-600 transition-all active:scale-[0.99]"
                          >
                            <Plus className="w-4 h-4" /> 新增{getCategoryLabel(activeTab)}职位
                          </button>
                        ) : (
                          <div className="text-xs text-center text-gray-400 py-3">
                            无权限：新增职位
                          </div>
                        )}
                      </PermissionGate>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showMonthPicker && canEditPlan && canAddMonth && !copying.active && (
        <MonthPickerDialog
          existingMonths={availableMonths}
          onConfirm={handleAddMonth}
          onCancel={() => setShowMonthPicker(false)}
        />
      )}

      <CompensationGuideDialog
        open={showGuide && canEditPlan}
        onClose={() => setShowGuide(false)}
        onImport={handleImport}
        onManualAdd={() => {
          if (!canAddMonth) return alert('无权限：新增月份');
          setShowMonthPicker(true);
        }}
      />

      {showCatalogDialog && (
        <RewardsCatalogDialog
          open={showCatalogDialog}
          catalog={rewardsCatalog}
          onAdd={addReward}
          onUpdate={updateReward}
          onRemove={removeReward}
          onClose={() => setShowCatalogDialog(false)}
        />
      )}

      {showDeptRewardsDialog && currentPlan && selectedMonth && (
        <DepartmentRewardsDialog
          open={showDeptRewardsDialog}
          catalog={rewardsCatalog}
          value={currentPlan.departmentRewards || {}}
          onChange={handleDepartmentRewardsChange}
          onClose={() => setShowDeptRewardsDialog(false)}
        />
      )}

      {copying.active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm select-none"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-3 min-w-[260px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">正在复制配置</p>
              {copying.target && (
                <p className="text-xs text-gray-500 mt-1 tabular-nums">
                  → {formatMonthLabel(copying.target)}
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-2">
                请稍候，正在同步方案与测算设置…
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompensationPlanPage;