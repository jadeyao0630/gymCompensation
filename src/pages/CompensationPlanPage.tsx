import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Calculator, Sliders, Cloud, CloudOff, Undo2, Loader2,
  CheckCircle2, AlertCircle, Users, Wallet, Briefcase,
  BarChart3,
} from 'lucide-react';
import type { PositionCategory, MonthlyCompensationPlan, PositionConfig } from '../types/compensation';
import { getCategoryLabel } from '../constants/categories';
import { uid } from '../utils/id';
import { formatMonthLabel } from '../utils/format';
import { parseCompensationExcel } from '../utils/excelParser';
import { calcTotalBaseSalary } from '../utils/salary';
import { deletePlan, copyPlan, copySimulationSetting, fetchPlanByMonth } from '../api/compensation';
import PageHeader from '../components/PageHeader';
import Toolbar from '../components/Toolbar';
import StatCard from '../components/StatCard';
import CategoryTabs from '../components/CategoryTabs';
import PositionCard from '../components/PositionCard';
import PositionOverview from '../components/PositionOverview';
import MonthPickerDialog from '../components/MonthPickerDialog';
import StoreSwitcher from '../components/StoreSwitcher';
import PermissionGate from '../components/PermissionGate';
import { CompensationGuideDialog } from '../components/CompensationGuideDialog';
import { CompensationEmptyState } from '../components/CompensationEmptyState';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { useCompensationPlan } from '../hooks/useCompensationPlan';

const CompensationPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { storeId } = useStore();
  const { hasPermission } = useAuth();

  const {
    fullStore, setFullStore, persistPlan, pushUndo, handleUndo, undoDepth,
    dbOnline, saveStatus, lastSavedAt, showGuide, setShowGuide,
    isInitialSelectDoneRef,
  } = useCompensationPlan(storeId);

  const [selectedMonth, setSelectedMonth] = useState<string>(searchParams.get('month') || '');
  const [activeTab, setActiveTab] = useState<PositionCategory>('membership');
  const [importing, setImporting] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  /* ⭐ 记录已请求过的 storeId:month，避免无限请求 */
  const fetchedKeyRef = useRef<string>('');

  const store = fullStore[storeId] || {};

  /* ============================================================
   * 权限
   * ============================================================ */
  const canEditPlan = hasPermission('plan:edit', storeId);
  const canEditTarget = hasPermission('target:edit', storeId);
  const opsViewEnabled = hasPermission('ops:view', storeId);
  /* 月份 / 导入导出权限 */
  const canAddMonth = hasPermission('month:add', storeId);
  const canDeleteMonth = hasPermission('month:delete', storeId);
  const canImportPlan = hasPermission('plan:import', storeId);
  const canExportPlan = hasPermission('plan:export', storeId);
  /* 职位细粒度权限 */
  const canAddPosition = hasPermission('position:add', storeId);
  const canDeletePosition = hasPermission('position:delete', storeId);
  const canRenamePosition = hasPermission('position:rename', storeId);
  const canEditHeadcount = hasPermission('headcount:edit', storeId);

  /* ============================================================
   * 选中月份逻辑
   * ============================================================ */
  useEffect(() => {
    if (isInitialSelectDoneRef.current) return;
    const months = Object.keys(store).sort();
    if (months.length > 0) {
      setSelectedMonth(months[months.length - 1]);
      isInitialSelectDoneRef.current = true;
    }
  }, [storeId, store, isInitialSelectDoneRef]);

  useEffect(() => {
    const m = searchParams.get('month');
    if (m) {
      setSelectedMonth(m);
      isInitialSelectDoneRef.current = true;
    }
  }, [searchParams, isInitialSelectDoneRef]);

  /* ⭐ 切换门店/月份时重置请求标记，允许重新拉取 */
  useEffect(() => {
    fetchedKeyRef.current = '';
  }, [storeId]);

  /* ============================================================
   * 远程拉取方案详情
   * ⭐ 修复：用 fetchedKeyRef 标记已请求的 key，避免依赖 store 造成无限循环
   * ============================================================ */
  useEffect(() => {
    if (!selectedMonth) return;
    if (!dbOnline) return;

    const key = `${storeId}:${selectedMonth}`;
    if (fetchedKeyRef.current === key) return;

    // 本地已有完整数据 → 直接标记已请求，不再请求
    const localPlan = fullStore[storeId]?.[selectedMonth];
    if (localPlan && localPlan.positions && localPlan.positions.length > 0) {
      fetchedKeyRef.current = key;
      return;
    }

    let cancelled = false;
    fetchedKeyRef.current = key; // 立即打标记，防止 StrictMode 重复触发

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

    return () => {
      cancelled = true;
    };
    // ⭐ 依赖数组不含 fullStore / store
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, selectedMonth, dbOnline]);

  const currentPlan = selectedMonth ? store[selectedMonth] : undefined;

  /* ============================================================
   * 数据过滤
   * ============================================================ */
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

  /* ============================================================
   * 操作
   * ============================================================ */
  const handleSelectMonth = (m: string) => {
    isInitialSelectDoneRef.current = true;
    fetchedKeyRef.current = ''; // ⭐ 切换月份允许重新拉取
    setSelectedMonth(m);
    navigate(`/compensation?month=${m}`, { replace: true });
  };

  const handleToggleDisabled = (title: string, disabled: boolean) => {
    if (!canEditPlan) return alert('无权限：设置方案');
    if (!currentPlan) return;
    const target = currentPlan.positions.find((p) => p.title === title);
    if (!target) return alert(`职位「${title}」不存在`);

    pushUndo(
      currentPlan.month,
      currentPlan,
      disabled ? `禁用职位「${title}」` : `启用职位「${title}」`
    );
    const nextPlan = {
      ...currentPlan,
      positions: currentPlan.positions.map((p) =>
        p.title === title ? { ...p, disabled } : p
      ),
    };
    persistPlan(currentPlan.month, nextPlan);
  };

  /* ⭐ 导入：需要 plan:import */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditPlan) {
      alert('无权限：设置方案');
      e.target.value = '';
      return;
    }
    if (!canImportPlan) {
      alert('无权限：导入薪酬佣金设置');
      e.target.value = '';
      return;
    }
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
      fetchedKeyRef.current = ''; // ⭐ 允许后续重新拉取
      alert(`已导入 ${file.name} → ${formatMonthLabel(month)}（${plan.positions.length} 个岗位）`);
    } catch (err: any) {
      alert((isJson ? '解析 JSON 失败：' : '解析 Excel 失败：') + (err?.message || ''));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  /* ⭐ 新增月份：需要 month:add */
  const handleAddMonth = async (month: string, copyFrom?: string, copySimulation?: boolean) => {
    if (!canEditPlan) return alert('无权限：设置方案');
    if (!canAddMonth) return alert('无权限：新增月份');
    setShowMonthPicker(false);

    if (store[month] && !confirm(`${formatMonthLabel(month)} 已存在，是否覆盖？`)) return;
    if (store[month]) pushUndo(month, store[month], '覆盖新建');

    if (!copyFrom) {
      const blank: MonthlyCompensationPlan = {
        month,
        periodLabel: formatMonthLabel(month),
        positions: [],
      };
      pushUndo(month, blank, '新增月份');
      persistPlan(month, blank);
      setSelectedMonth(month);
      fetchedKeyRef.current = ''; // ⭐ 允许后续重新拉取
      return;
    }

    try {
      if (dbOnline) {
        await copyPlan(storeId, copyFrom, month);
        const remote = await fetchPlanByMonth(storeId, month);
        if (remote) {
          setFullStore((prev) => {
            const next = {
              ...prev,
              [storeId]: { ...(prev[storeId] || {}), [month]: remote },
            };
            localStorage.setItem('gym_compensation_store_v2', JSON.stringify(next));
            return next;
          });
        }
        if (copySimulation) {
          await copySimulationSetting(storeId, copyFrom, month).catch(console.warn);
        }
        setSelectedMonth(month);
        fetchedKeyRef.current = ''; // ⭐ 允许后续重新拉取
        alert(`已复制配置到 ${formatMonthLabel(month)}`);
      } else {
        const srcPlan = store[copyFrom];
        if (!srcPlan) return alert('源月份方案不存在');
        const cloned = {
          ...JSON.parse(JSON.stringify(srcPlan)),
          month,
          periodLabel: formatMonthLabel(month),
        };
        pushUndo(month, cloned, `复制自 ${copyFrom}`);
        persistPlan(month, cloned);
        setSelectedMonth(month);
        fetchedKeyRef.current = ''; // ⭐ 允许后续重新拉取
        alert(`已离线复制到 ${formatMonthLabel(month)}`);
      }
    } catch (e) {
      alert('复制失败：' + (e as Error).message);
    }
  };

  /* ⭐ 删除月份：需要 month:delete */
  const removeMonth = async () => {
    if (!canEditPlan) return alert('无权限：设置方案');
    if (!canDeleteMonth) return alert('无权限：删除月份');
    if (!selectedMonth || !currentPlan) return;
    if (!confirm(`确定删除 ${formatMonthLabel(selectedMonth)} 的全部配置？`)) return;

    pushUndo(selectedMonth, currentPlan, '删除月份');

    setFullStore((prev) => {
      const cur = { ...(prev[storeId] || {}) };
      delete cur[selectedMonth];
      const next = { ...prev, [storeId]: cur };
      localStorage.setItem('gym_compensation_store_v2', JSON.stringify(next));
      return next;
    });

    if (dbOnline) {
      await deletePlan(storeId, selectedMonth).catch(() => {});
    }

    fetchedKeyRef.current = ''; // ⭐ 允许后续重新拉取
    const rest = Object.keys(store).filter((m) => m !== selectedMonth).sort();
    setSelectedMonth(rest.length > 0 ? rest[rest.length - 1] : '');
  };

  const updatePlan = (
    updates: Partial<MonthlyCompensationPlan>,
    undoLabel: string,
    allowTargetOnly = false
  ) => {
    if (!canEditPlan && !(allowTargetOnly && canEditTarget)) {
      return alert('无权限：设置方案');
    }
    if (!selectedMonth || !currentPlan) return;
    pushUndo(selectedMonth, currentPlan, undoLabel);
    persistPlan(selectedMonth, { ...currentPlan, ...updates });
  };

  /* 修改职位：细分 人数 / 名称 权限 */
  const updatePosition = (posId: string, updates: Partial<PositionConfig>) => {
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

  /* 新增职位：需要 position:add */
  const addPosition = () => {
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

  /* 删除职位：需要 position:delete */
  const removePosition = (posId: string) => {
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

  /* ⭐ 导出：需要 plan:export */
  const handleExport = () => {
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

  /* 状态徽章 */
  const StatusBadge = () => {
    if (!dbOnline) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border bg-gray-100 text-gray-500 border-gray-200">
          <CloudOff className="w-3 h-3" /> 离线模式
        </span>
      );
    }
    if (saveStatus === 'saving') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border bg-blue-50 text-blue-700 border-blue-200">
          <Loader2 className="w-3 h-3 animate-spin" /> 保存中…
        </span>
      );
    }
    if (saveStatus === 'error') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border bg-red-50 text-red-700 border-red-200">
          <AlertCircle className="w-3 h-3" /> 保存失败
        </span>
      );
    }
    if (saveStatus === 'saved' && lastSavedAt) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> 已保存{' '}
          {lastSavedAt.toLocaleTimeString('zh-CN', { hour12: false })}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
        <Cloud className="w-3 h-3" /> 已连接数据库
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader selectedMonth={selectedMonth} storeId={storeId} />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <StoreSwitcher />
            <StatusBadge />

            {canEditPlan && (
              <button
                onClick={() => handleUndo()}
                disabled={undoDepth === 0}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition ${
                  undoDepth > 0
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission('simulation:access', storeId) && (
              <button
                onClick={() =>
                  selectedMonth
                    ? navigate(`/simulation?month=${selectedMonth}`)
                    : alert('请先选择月份')
                }
                disabled={!selectedMonth}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.97] ${
                  selectedMonth
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Sliders className="w-4 h-4" /> 去测算
              </button>
            )}
            {hasPermission('payroll:calc', storeId) && (
              <button
                onClick={() =>
                  selectedMonth
                    ? navigate(`/payroll?month=${selectedMonth}`)
                    : alert('请先选择月份')
                }
                disabled={!selectedMonth}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.97] ${
                  selectedMonth
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Calculator className="w-4 h-4" /> 去计算薪酬
              </button>
            )}
            {/* ⭐ 新增：营销收入 */}
            {hasPermission('report:marketing:view', storeId) && (
              <button
                onClick={() => navigate('/marketing-report')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.97] bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white shadow-fuchsia-500/20"
              >
                <BarChart3 className="w-4 h-4" /> 营销收入
              </button>
            )}
          </div>
        </div>

        <Toolbar
          months={Object.keys(store).sort()}
          selectedMonth={selectedMonth}
          hasPlan={!!currentPlan}
          importing={importing}
          importedFrom={currentPlan?.importedFrom}
          canEdit={canEditPlan}
          onSelectMonth={handleSelectMonth}
          onAddMonth={() => {
            if (!canEditPlan) return alert('无权限：设置方案');
            if (!canAddMonth) return alert('无权限：新增月份');
            setShowMonthPicker(true);
          }}
          onRemoveMonth={removeMonth}
          onImport={handleImport}
          onExport={handleExport}
          canAddMonth={canAddMonth}
          canDeleteMonth={canDeleteMonth}
          canImport={canImportPlan}
          canExport={canExportPlan}
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
              canEdit={canEditPlan}
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
                        readOnly={!canEditPlan}
                        canEditTarget={canEditTarget}
                        canEditHeadcount={canEditHeadcount}
                        canDelete={canDeletePosition}
                        canRename={canRenamePosition}
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
                    {canAddPosition ? (
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
      </div>

      {showMonthPicker && canEditPlan && canAddMonth && (
        <MonthPickerDialog
          existingMonths={Object.keys(store).sort()}
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
    </div>
  );
};

export default CompensationPlanPage;