import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  savePlan,
  deletePlan,
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
const UNDO_LIMIT = 20;                    // 撤销栈最大深度
const SAVE_DEBOUNCE_MS = 400;             // 防抖时间

type FullStore = Record<string, CompensationStore>;
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface UndoEntry {
  month: string;
  plan: MonthlyCompensationPlan;   // 快照（旧版本）
  label: string;                    // 用于提示"撤销：修改职位 / 新增月份"等
  at: number;
}

const CompensationPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId } = useStore();

  const [fullStore, setFullStore] = useState<FullStore>({});
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [activeTab, setActiveTab] = useState<PositionCategory>('membership');
  const [importing, setImporting] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [dbOnline, setDbOnline] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  /* ⭐ 撤销栈（内存） */
  const undoStackRef = useRef<UndoEntry[]>([]);
  const [undoDepth, setUndoDepth] = useState(0);   // 用于触发重新渲染

  /* ⭐ 防抖保存 */
  const saveTimerRef = useRef<number | null>(null);

  /* 当前门店的 store */
  const store: CompensationStore = fullStore[storeId] || {};

  /* ---------- 工具：把当前 plan 压入撤销栈 ---------- */
  const pushUndo = useCallback(
    (month: string, plan: MonthlyCompensationPlan, label: string) => {
      const stack = undoStackRef.current;
      stack.push({
        month,
        plan: JSON.parse(JSON.stringify(plan)),   // 深拷贝
        label,
        at: Date.now(),
      });
      if (stack.length > UNDO_LIMIT) stack.shift();
      setUndoDepth(stack.length);
    },
    []
  );

  /* ---------- 通用更新：本地立即生效 + 防抖写数据库 ---------- */
  const persistPlan = useCallback(
    (month: string, plan: MonthlyCompensationPlan) => {
      /* 1) 本地立即生效 + 写 localStorage 缓存 */
      setFullStore((prev) => {
        const next = { ...prev, [storeId]: { ...(prev[storeId] || {}), [month]: plan } };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });

      /* 2) 清掉旧定时器 */
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

      /* 3) 防抖写数据库 */
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
    [storeId, dbOnline]
  );

  /* ---------- 撤销 ---------- */
  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const last = stack.pop()!;
    setUndoDepth(stack.length);

    /* 把旧快照写回 */
    setFullStore((prev) => {
      const next = {
        ...prev,
        [storeId]: { ...(prev[storeId] || {}), [last.month]: last.plan },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    /* 立即同步到数据库（不走防抖，确保撤销立刻生效） */
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

    /* 切换选中的月份（如果撤销的是别的月份） */
    if (last.month !== selectedMonth) setSelectedMonth(last.month);

    console.log('[undo] 已撤销:', last.label);
  }, [storeId, selectedMonth, dbOnline]);

  /* 快捷键：Ctrl/Cmd + Z */
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

  /* ---------- 首次加载：v1→v2 迁移 + 读本地缓存 ---------- */
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

  /* ---------- 切门店：拉月份列表 ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchPlanList(storeId);
        if (cancelled) return;
        setDbOnline(true);
        setFullStore((prev) => {
          const curStore = prev[storeId] || {};
          const nextStore: CompensationStore = { ...curStore };
          list.forEach((p) => {
            if (!nextStore[p.month]) {
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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  /* ---------- 切门店时重置撤销栈 ---------- */
  useEffect(() => {
    undoStackRef.current = [];
    setUndoDepth(0);
  }, [storeId]);

  /* ---------- 切门店时选默认月份 ---------- */
  useEffect(() => {
    const months = Object.keys(fullStore[storeId] || {}).sort();
    if (months.length > 0) {
      setSelectedMonth(months[months.length - 1]);
    } else {
      const now = new Date();
      const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, fullStore]);

  /* ---------- 选中月份但本地为空时，从 API 拉详情 ---------- */
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

  /* ---------- 导入 Excel ---------- */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMonth) return;
    setImporting(true);
    try {
      const plan = await parseCompensationExcel(
        file,
        selectedMonth,
        formatMonthLabel(selectedMonth)
      );

      const existed = store[selectedMonth];
      if (existed && existed.positions.length > 0) {
        if (!confirm(`${formatMonthLabel(selectedMonth)} 已有方案，是否覆盖？`)) {
          setImporting(false);
          e.target.value = '';
          return;
        }
        /* 覆盖前压入撤销栈 */
        pushUndo(selectedMonth, existed, '导入覆盖');
      } else {
        /* 若已有空方案（由新增月份创建），也压栈 */
        if (existed) pushUndo(selectedMonth, existed, '导入');
      }

      persistPlan(selectedMonth, plan);
      alert(`已导入 ${file.name} → ${formatMonthLabel(selectedMonth)}`);
    } catch (err) {
      console.error(err);
      alert('解析 Excel 失败，请检查文件格式');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  /* ---------- 导出 JSON ---------- */
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

  /* ---------- 新增月份 ---------- */
  const handleAddMonth = async (month: string) => {
    if (store[month]) {
      alert('该月份已存在');
      return;
    }
    const blank: MonthlyCompensationPlan = {
      month,
      periodLabel: formatMonthLabel(month),
      positions: [],
    };
    /* 新增月份本身也压栈，方便撤销 */
    pushUndo(month, blank, '新增月份');
    persistPlan(month, blank);
    setSelectedMonth(month);
    setShowMonthPicker(false);
  };

  const removeMonth = async () => {
    if (!selectedMonth || !currentPlan) return;
    if (!confirm(`确定删除 ${formatMonthLabel(selectedMonth)} 的全部配置？`)) return;

    pushUndo(selectedMonth, currentPlan, '删除月份');

    setFullStore((prev) => {
      const cur = { ...(prev[storeId] || {}) };
      delete cur[selectedMonth];
      const next = { ...prev, [storeId]: cur };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (dbOnline) {
      try {
        await deletePlan(storeId, selectedMonth);
      } catch (e) {
        console.error('[removeMonth] 数据库删除失败', e);
        setSaveStatus('error');
      }
    }

    const rest = Object.keys(store).filter((m) => m !== selectedMonth).sort();
    setSelectedMonth(rest.length > 0 ? rest[rest.length - 1] : '');
  };

  /* ---------- 职位操作 ---------- */
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

  /* ---------- 跳转 ---------- */
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

  /* ---------- 保存状态徽章 ---------- */
  const StatusBadge: React.FC = () => {
    if (!dbOnline) {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border bg-gray-100 text-gray-500 border-gray-200"
          title="数据库离线，仅本地缓存"
        >
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
          <CheckCircle2 className="w-3 h-3" /> 已保存 {lastSavedAt.toLocaleTimeString('zh-CN', { hour12: false })}
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

        {/* 门店切换 + 状态 + 撤销 + 跳转 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <StoreSwitcher />
            <StatusBadge />

            {/* ⭐ 撤销按钮 */}
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

        <Toolbar
          months={Object.keys(store).sort()}
          selectedMonth={selectedMonth}
          hasPlan={!!currentPlan}
          importing={importing}
          importedFrom={currentPlan?.importedFrom}
          onSelectMonth={setSelectedMonth}
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
              请选择或新增一个月份，然后导入 Excel 生成薪酬配置
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
                    <p className="text-sm text-gray-400 mb-1">
                      该分类下暂无职位
                    </p>
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
    </div>
  );
};

export default CompensationPlanPage;