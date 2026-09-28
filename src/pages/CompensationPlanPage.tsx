import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Calendar,
  Users,
  Wallet,
  Briefcase,
  Calculator,
  Sliders,
  Cloud,
  CloudOff,
  Undo2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
} from 'lucide-react';
import type {
  CompensationStore,
  MonthlyCompensationPlan,
  PositionConfig,
  PositionCategory,
} from '../types/compensation';
import { getCategoryLabel } from '../constants/categories';
import { uid } from '../utils/id';
import { formatMonthLabel } from '../utils/format';
import { parseCompensationExcel } from '../utils/excelParser';
import { calcTotalBaseSalary } from '../utils/salary';
import {
  fetchPlanByMonth,
  fetchPlanList,
  initStorePlans,
  savePlan,
  deletePlan,
  copyPlan,
  copySimulationSetting,
} from '../api/compensation';
import PageHeader from '../components/PageHeader';
import Toolbar from '../components/Toolbar';
import StatCard from '../components/StatCard';
import CategoryTabs from '../components/CategoryTabs';
import PositionCard from '../components/PositionCard';
import PositionOverview from '../components/PositionOverview';
import MonthPickerDialog from '../components/MonthPickerDialog';
import StoreSwitcher from '../components/StoreSwitcher';
import { useStore } from '../contexts/StoreContext';

const STORAGE_KEY = 'gym_compensation_store_v2';
const UNDO_LIMIT = 20;
const SAVE_DEBOUNCE_MS = 400;

const INIT_FLAG_PREFIX = 'gym_store_initialized_';

type FullStore = Record<string, CompensationStore>;
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface UndoEntry {
  month: string;
  plan: MonthlyCompensationPlan;
  label: string;
  at: number;
}

const CompensationPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { storeId } = useStore();

  const [fullStore, setFullStore] = useState<FullStore>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(
    searchParams.get('month') || ''
  );
  const [activeTab, setActiveTab] = useState<PositionCategory>('membership');
  const [importing, setImporting] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [dbOnline, setDbOnline] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [showGuide, setShowGuide] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  const undoStackRef = useRef<UndoEntry[]>([]);
  const [undoDepth, setUndoDepth] = useState(0);

  const saveTimerRef = useRef<number | null>(null);

  /* ⭐ 关键：记录「本门店是否已执行过"默认月份选择"」，避免重复覆盖用户选择 */
  const isInitialSelectDoneRef = useRef<boolean>(false);

  const store: CompensationStore = fullStore[storeId] || {};

  const persistToLocalStorage = useCallback((nextFullStore: FullStore) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextFullStore));
    } catch (e) {
      console.error('[CompensationPage] 写 localStorage 失败', e);
    }
  }, []);

  const pushUndo = useCallback(
    (month: string, plan: MonthlyCompensationPlan, label: string) => {
      const stack = undoStackRef.current;
      stack.push({
        month,
        plan: JSON.parse(JSON.stringify(plan)),
        label,
        at: Date.now(),
      });
      if (stack.length > UNDO_LIMIT) stack.shift();
      setUndoDepth(stack.length);
    },
    []
  );

  const persistPlan = useCallback(
    (month: string, plan: MonthlyCompensationPlan) => {
      setFullStore((prev) => {
        const next = {
          ...prev,
          [storeId]: { ...(prev[storeId] || {}), [month]: plan },
        };
        persistToLocalStorage(next);
        return next;
      });

      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        if (!dbOnline) {
          setSaveStatus('offline');
          return;
        }
        setSaveStatus('saving');
        try {
          await savePlan(storeId, plan);
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        } catch (e) {
          console.error('[persistPlan] 保存到数据库失败', e);
          setSaveStatus('error');
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [storeId, dbOnline, persistToLocalStorage]
  );

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const last = stack.pop()!;
    setUndoDepth(stack.length);

    setFullStore((prev) => {
      const next = {
        ...prev,
        [storeId]: { ...(prev[storeId] || {}), [last.month]: last.plan },
      };
      persistToLocalStorage(next);
      return next;
    });

    if (dbOnline) {
      setSaveStatus('saving');
      savePlan(storeId, last.plan)
        .then(() => {
          setSaveStatus('saved');
          setLastSavedAt(new Date());
        })
        .catch(() => setSaveStatus('error'));
    } else {
      setSaveStatus('offline');
    }

    if (last.month !== selectedMonth) setSelectedMonth(last.month);
    console.log('[undo] 已撤销:', last.label);
  }, [storeId, selectedMonth, dbOnline, persistToLocalStorage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (undoStackRef.current.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo]);

  /* 首次加载本地缓存 */
  useEffect(() => {
    const v1 = localStorage.getItem('gym_compensation_store_v1');
    const v2 = localStorage.getItem(STORAGE_KEY);
    if (v1 && !v2) {
      try {
        const old = JSON.parse(v1);
        const migrated: FullStore = { '12279': old };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      } catch (e) {
        console.error('[migrate] 失败', e);
      }
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFullStore(JSON.parse(saved));
      } catch {}
    }
  }, []);

  /* 切门店：拉月份列表 → 只加不减 / 无则初始化（带标记） */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setInitLoading(true);

        let list = await fetchPlanList(storeId);
        if (cancelled) return;

        if (list.length === 0) {
          const initFlagKey = `${INIT_FLAG_PREFIX}${storeId}`;
          const wasInitialized = localStorage.getItem(initFlagKey);

          if (!wasInitialized) {
            console.log('[CompensationPage] 门店首次进入，自动初始化…');
            const initRes = await initStorePlans(storeId);
            if (cancelled) return;
            localStorage.setItem(initFlagKey, '1');

            list = await fetchPlanList(storeId);
            if (cancelled) return;

            if (initRes.initialized) setShowGuide(true);
          } else {
            console.log(
              '[CompensationPage] 门店已初始化过但当前无方案，不再自动补'
            );
          }
        }

        setDbOnline(true);

        setFullStore((prev) => {
          const curStore = prev[storeId] || {};
          const nextStore: CompensationStore = {};

          list.forEach((p) => {
            const local = curStore[p.month];
            if (local && local.positions && local.positions.length > 0) {
              nextStore[p.month] = local;
            } else {
              nextStore[p.month] = {
                month: p.month,
                periodLabel: p.periodLabel,
                positions: [],
                importedAt: p.importedAt,
              };
            }
          });

          const next = { ...prev, [storeId]: nextStore };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      } catch (e) {
        console.warn('[CompensationPage] API 不可用，使用本地缓存', e);
        if (!cancelled) setDbOnline(false);
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  /* 切门店清空撤销栈 + 重置默认月份标记 */
  useEffect(() => {
    undoStackRef.current = [];
    setUndoDepth(0);
    isInitialSelectDoneRef.current = false;
  }, [storeId]);

  /* ============================================================
   * ⭐ 切门店时选默认月份：只依赖 storeId，且只执行一次
   * ============================================================ */
  useEffect(() => {
    if (isInitialSelectDoneRef.current) return;

    const months = Object.keys(fullStore[storeId] || {}).sort();
    if (months.length > 0) {
      setSelectedMonth(months[months.length - 1]);
      isInitialSelectDoneRef.current = true;
    } else {
      /* 还没拉到数据，等 fullStore 更新后再判断（下面第二个 effect 处理） */
    }
  }, [storeId, fullStore]);

  /* 当 fullStore 有数据但 selectedMonth 还是空 → 补选最新月份（只做一次） */
  useEffect(() => {
    if (isInitialSelectDoneRef.current) return;
    if (selectedMonth) return;

    const months = Object.keys(fullStore[storeId] || {}).sort();
    if (months.length === 0) return;

    setSelectedMonth(months[months.length - 1]);
    isInitialSelectDoneRef.current = true;
  }, [storeId, fullStore, selectedMonth]);

  /* URL 参数优先（首次进入） */
  useEffect(() => {
    const m = searchParams.get('month');
    if (m) {
      setSelectedMonth(m);
      isInitialSelectDoneRef.current = true;
    }
  }, [searchParams]);

  /* 选中月份但本地为空 → 从 API 拉详情 */
  useEffect(() => {
    if (!selectedMonth) return;
    const localPlan = fullStore[storeId]?.[selectedMonth];
    if (localPlan && localPlan.positions && localPlan.positions.length > 0) return;
    if (!dbOnline) return;

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
        console.log('[CompensationPage] 已从 API 加载方案', storeId, selectedMonth);
      } catch (e) {
        console.warn('[CompensationPage] 加载方案详情失败', e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, selectedMonth, dbOnline]);

  const currentPlan = selectedMonth ? store[selectedMonth] : undefined;

  const currentPositions = useMemo(
    () => currentPlan?.positions.filter((p) => p.category === activeTab) || [],
    [currentPlan, activeTab]
  );

  const totalHeadcount =
    currentPlan?.positions.reduce((s, p) => s + p.headcount, 0) || 0;
  const totalBase =
    currentPlan?.positions.reduce(
      (s, p) => s + calcTotalBaseSalary(p, currentPlan.positions),
      0
    ) || 0;

  /* ⭐ 月份切换（供 Toolbar 调用） */
  const handleSelectMonth = useCallback(
    (m: string) => {
      isInitialSelectDoneRef.current = true;
      setSelectedMonth(m);
      navigate(`/compensation?month=${m}`, { replace: true });
    },
    [navigate]
  );

  /* ============================================================
   * 统一导入：按扩展名分流 Excel / JSON
   * ============================================================ */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let month = selectedMonth;
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      isInitialSelectDoneRef.current = true;
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
        const text = await file.text();
        const parsed = JSON.parse(text) as MonthlyCompensationPlan;

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('JSON 内容不是有效对象');
        }
        if (!Array.isArray(parsed.positions)) {
          throw new Error('JSON 缺少 positions 数组');
        }

        const nowISO = new Date().toISOString();
        plan = {
          month,
          periodLabel: formatMonthLabel(month),
          positions: parsed.positions.map((p) => ({
            ...p,
            id: p.id || uid(),
          })),
          importedFrom: `JSON: ${file.name}`,
          importedAt: nowISO,
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
      alert(
        `已导入 ${file.name} → ${formatMonthLabel(month)}（${plan.positions.length} 个岗位）`
      );
    } catch (err: any) {
      console.error(err);
      alert(
        (isJson ? '解析 JSON 失败：' : '解析 Excel 失败，请检查文件格式：') +
          (err?.message || '')
      );
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  /* 导出 JSON */
  const handleExport = () => {
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

  /* 新增月份（支持复制） */
  const handleAddMonth = async (
    month: string,
    copyFrom?: string,
    copySimulation?: boolean
  ) => {
    setShowMonthPicker(false);

    if (store[month]) {
      if (!confirm(`${formatMonthLabel(month)} 已存在，是否覆盖？`)) return;
      pushUndo(month, store[month], '覆盖新建');
    }

    if (!copyFrom) {
      const blank: MonthlyCompensationPlan = {
        month,
        periodLabel: formatMonthLabel(month),
        positions: [],
      };
      pushUndo(month, blank, '新增月份');
      persistPlan(month, blank);
      isInitialSelectDoneRef.current = true;
      setSelectedMonth(month);
      return;
    }

    try {
      if (dbOnline) {
        const res = await copyPlan(storeId, copyFrom, month);
        console.log('[copy] 已复制方案', copyFrom, '→', month, res);

        const remote = await fetchPlanByMonth(storeId, month);
        if (remote) {
          setFullStore((prev) => {
            const next = {
              ...prev,
              [storeId]: { ...(prev[storeId] || {}), [month]: remote },
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }

        if (copySimulation) {
          try {
            const simRes = await copySimulationSetting(storeId, copyFrom, month);
            console.log('[copy-sim] 结果:', simRes);
          } catch (e) {
            console.warn('[copy-sim] 复制测算设置失败', e);
          }
        }

        isInitialSelectDoneRef.current = true;
        setSelectedMonth(month);
        alert(
          `已复制 ${formatMonthLabel(copyFrom)} 的配置到 ${formatMonthLabel(month)}${
            copySimulation ? '（含测算设置）' : ''
          }`
        );
      } else {
        const srcPlan = store[copyFrom];
        if (!srcPlan) {
          alert('源月份方案不存在');
          return;
        }
        const cloned: MonthlyCompensationPlan = JSON.parse(JSON.stringify(srcPlan));
        cloned.month = month;
        cloned.periodLabel = formatMonthLabel(month);
        cloned.importedFrom = `复制自 ${copyFrom}`;
        cloned.importedAt = new Date().toISOString();

        pushUndo(month, cloned, `复制自 ${copyFrom}`);
        persistPlan(month, cloned);
        isInitialSelectDoneRef.current = true;
        setSelectedMonth(month);
        alert(
          `已离线复制 ${formatMonthLabel(copyFrom)} 到 ${formatMonthLabel(month)}（仅本地）`
        );
      }
    } catch (e) {
      console.error('[handleAddMonth] 复制失败', e);
      alert('复制失败：' + (e as Error).message);
    }
  };

  /* 删除月份 */
  const removeMonth = async () => {
    if (!selectedMonth || !currentPlan) return;
    if (!confirm(`确定删除 ${formatMonthLabel(selectedMonth)} 的全部配置？`)) return;

    const monthToDelete = selectedMonth;

    pushUndo(monthToDelete, currentPlan, '删除月份');

    setFullStore((prev) => {
      const cur = { ...(prev[storeId] || {}) };
      delete cur[monthToDelete];
      const next = { ...prev, [storeId]: cur };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('[removeMonth] 写 localStorage 失败', e);
      }
      return next;
    });

    if (dbOnline) {
      try {
        await deletePlan(storeId, monthToDelete);
        console.log('[removeMonth] 已从数据库删除', storeId, monthToDelete);
      } catch (e) {
        console.error('[removeMonth] 数据库删除失败', e);
        setSaveStatus('error');
      }
    }

    const rest = Object.keys(store)
      .filter((m) => m !== monthToDelete)
      .sort();
    if (rest.length > 0) {
      isInitialSelectDoneRef.current = true;
      setSelectedMonth(rest[rest.length - 1]);
    } else {
      isInitialSelectDoneRef.current = false;
      setSelectedMonth('');
    }
  };

  /* 职位操作 */
  const updatePlan = (
    updates: Partial<MonthlyCompensationPlan>,
    undoLabel: string
  ) => {
    if (!selectedMonth || !currentPlan) return;
    pushUndo(selectedMonth, currentPlan, undoLabel);
    const nextPlan = { ...currentPlan, ...updates };
    persistPlan(selectedMonth, nextPlan);
  };

  const updatePosition = (posId: string, updates: Partial<PositionConfig>) => {
    if (!currentPlan) return;
    const target = currentPlan.positions.find((p) => p.id === posId);
    updatePlan(
      {
        positions: currentPlan.positions.map((p) =>
          p.id === posId ? { ...p, ...updates } : p
        ),
      },
      `修改职位「${target?.title || '未知'}」`
    );
  };

  const addPosition = () => {
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
    if (!currentPlan) return;
    const target = currentPlan.positions.find((p) => p.id === posId);
    if (!confirm(`确定删除职位「${target?.title}」？`)) return;
    updatePlan(
      { positions: currentPlan.positions.filter((p) => p.id !== posId) },
      `删除职位「${target?.title}」`
    );
  };

  const goToPayroll = () => {
    if (!selectedMonth) {
      alert('请先选择月份');
      return;
    }
    navigate(`/payroll?month=${selectedMonth}`);
  };

  const goToSimulation = () => {
    if (!selectedMonth) {
      alert('请先选择月份');
      return;
    }
    navigate(`/simulation?month=${selectedMonth}`);
  };

  /* 状态徽章 */
  const StatusBadge: React.FC = () => {
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

            <button
              onClick={handleUndo}
              disabled={undoDepth === 0}
              title={undoDepth > 0 ? `撤销（Ctrl/Cmd+Z，剩余 ${undoDepth} 步）` : '无可撤销'}
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={goToSimulation}
              disabled={!selectedMonth}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.97] ${
                selectedMonth
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/20'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Sliders className="w-4 h-4" />
              去测算
            </button>

            <button
              onClick={goToPayroll}
              disabled={!selectedMonth}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.97] ${
                selectedMonth
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/20'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Calculator className="w-4 h-4" />
              去计算薪酬
            </button>
          </div>
        </div>

        {/* ⭐ onSelectMonth 用 handleSelectMonth（同步 URL） */}
        <Toolbar
          months={Object.keys(store).sort()}
          selectedMonth={selectedMonth}
          hasPlan={!!currentPlan}
          importing={importing}
          importedFrom={currentPlan?.importedFrom}
          onSelectMonth={handleSelectMonth}
          onAddMonth={() => setShowMonthPicker(true)}
          onRemoveMonth={removeMonth}
          onImport={handleImport}
          onExport={handleExport}
        />

        {!currentPlan && (
          <div className="bg-white rounded-3xl shadow-sm border border-dashed border-gray-200 p-20 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-5">
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">还没有配置</h3>
            <p className="text-sm text-gray-400">
              请选择或新增一个月份，然后导入 Excel / JSON 生成薪酬配置
            </p>
          </div>
        )}

        {currentPlan && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard
                icon={<Briefcase className="w-5 h-5" />}
                label="职位数"
                value={currentPlan.positions.length}
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
              positions={currentPlan.positions}
              onGoTo={(cat) => setActiveTab(cat)}
            />

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <CategoryTabs
                positions={currentPlan.positions}
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
                        onUpdate={(u) => updatePosition(pos.id, u)}
                        onRemove={() => removePosition(pos.id)}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={addPosition}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-white border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-2xl text-sm font-medium text-gray-500 hover:text-blue-600 transition-all active:scale-[0.99]"
                  >
                    <Plus className="w-4 h-4" />
                    新增{getCategoryLabel(activeTab)}职位
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showMonthPicker && (
        <MonthPickerDialog
          existingMonths={Object.keys(store).sort()}
          onConfirm={handleAddMonth}
          onCancel={() => setShowMonthPicker(false)}
        />
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">开始配置薪酬方案</h2>
              <p className="text-sm text-gray-500 mt-1">
                该门店还没有任何方案，选择一种方式开始
              </p>
            </div>

            <div className="p-6 space-y-3">
              <label className="flex items-start gap-4 p-4 rounded-xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer transition-all">
                <input
                  type="file"
                  accept=".xlsx,.xls,.json,application/json"
                  className="hidden"
                  onChange={async (e) => {
                    setShowGuide(false);
                    await handleImport(e);
                  }}
                />
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">导入 Excel 或 JSON</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    .xlsx / .xls 走 Excel 解析；.json 直接还原
                  </p>
                </div>
              </label>

              <button
                onClick={() => {
                  setShowGuide(false);
                  setShowMonthPicker(true);
                }}
                className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">手动新建月份</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    选择月份后，逐个添加职位和阶梯配置
                  </p>
                </div>
              </button>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                稍后
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompensationPlanPage;