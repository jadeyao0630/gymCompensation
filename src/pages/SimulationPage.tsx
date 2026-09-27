import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Sliders,
  Calculator,
  Store,
  Cloud,
  CloudOff,
  Loader2,
  CheckCircle2,
  Undo2,
} from 'lucide-react';
import type {
  CompensationStore,
  MonthlyCompensationPlan,
  CourseCommissionInputs,
  SimulationInput,
  SimulationResult,
  RevenueShareConfig,
  GenderCountConfig,
} from '../types/compensation';
import { calcSimulation } from '../utils/simulation';
import SimulationSettingsPanel from '../components/SimulationSettingsPanel';
import RevenueSliderPanel from '../components/RevenueSliderPanel';
import StoreSwitcher from '../components/StoreSwitcher';
import { useStore } from '../contexts/StoreContext';
import { getStoreById } from '../constants/stores';
import {
  fetchSimulationSetting,
  saveSimulationSetting,
} from '../api/compensation';

const STORAGE_KEY = 'gym_compensation_store_v2';
const SIM_KEY = 'gym_course_simulation_inputs';
const COST_KEY = 'gym_simulation_input';
const SHARE_KEY = 'gym_revenue_share';
const GENDER_KEY = 'gym_gender_counts';
const SAVE_DEBOUNCE_MS = 500;
const UNDO_LIMIT = 20;

type FullStore = Record<string, CompensationStore>;

const EMPTY_SIM_INPUT: SimulationInput = {
  propertyFee: 0,
  electricityFee: 0,
  rent: 0,
  waterFee: 0,
  networkFee: 0,
  otherFee: 0,
};

interface SimulationUndoEntry {
  setting: SimulationInput;
  shareConfig: RevenueShareConfig;
  genderCounts: GenderCountConfig;
  courseInputs: CourseCommissionInputs;
  label: string;
  at: number;
}

const SimulationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { storeId } = useStore();

  const [fullStore, setFullStore] = useState<FullStore>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(
    searchParams.get('month') || ''
  );

  /* ⭐ 数据库连接 / 保存状态 */
  const [dbOnline, setDbOnline] = useState(true);
  const [savingSetting, setSavingSetting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  /* ⭐ 防抖定时器 */
  const saveTimerRef = useRef<number | null>(null);

  /* 只在「从 API 加载」时使用，防止刚读回来就写回去 */
  const skipNextSaveRef = useRef(false);

  /* ⭐ 撤销栈 */
  const undoStackRef = useRef<SimulationUndoEntry[]>([]);
  const [undoDepth, setUndoDepth] = useState(0);

  const store: CompensationStore = fullStore[storeId] || {};

  /* ============================================================
   * 加载本地缓存：薪酬方案
   * ============================================================ */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFullStore(JSON.parse(saved));
      } catch (e) {
        console.error('[SimulationPage] 解析失败', e);
      }
    }
  }, []);

  /* 切门店时选默认月份 */
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
  }, [storeId]);

  /* URL 的 month 参数优先 */
  useEffect(() => {
    const m = searchParams.get('month');
    if (m) setSelectedMonth(m);
  }, [searchParams]);

  const currentPlan: MonthlyCompensationPlan | undefined = selectedMonth
    ? store[selectedMonth]
    : undefined;

  /* ============================================================
   * 课提设置（仍走 localStorage）
   * ============================================================ */
  const [courseInputs, setCourseInputs] = useState<CourseCommissionInputs>(() => {
    const saved = localStorage.getItem(SIM_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(SIM_KEY, JSON.stringify(courseInputs));
  }, [courseInputs]);

  /* ============================================================
   * 成本设置（simInput）
   * ============================================================ */
  const [simInput, setSimInput] = useState<SimulationInput>(() => {
    const saved = localStorage.getItem(COST_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          propertyFee: parsed.propertyFee ?? 0,
          electricityFee: parsed.electricityFee ?? 0,
          rent: parsed.rent ?? 0,
          waterFee: parsed.waterFee ?? 0,
          networkFee: parsed.networkFee ?? 0,
          otherFee: parsed.otherFee ?? 0,
        };
      } catch {}
    }
    return { ...EMPTY_SIM_INPUT };
  });

  useEffect(() => {
    localStorage.setItem(COST_KEY, JSON.stringify(simInput));
  }, [simInput]);

  /* ============================================================
   * ⭐ 切门店 / 切月份 → 从 API 拉测算设置
   * ============================================================ */
  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    let cancelled = false;

    (async () => {
      try {
        const remote = await fetchSimulationSetting(storeId, selectedMonth);
        if (cancelled) return;
        setDbOnline(true);

        /* ⭐ 标记「下一次变化来自 API」，不回写 */
        skipNextSaveRef.current = true;
        setSimInput(remote);
        console.log('[SimulationPage] 已从 API 加载测算设置', storeId, selectedMonth, remote);
      } catch (e) {
        console.warn('[SimulationPage] API 加载失败，使用本地缓存', e);
        if (!cancelled) setDbOnline(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeId, selectedMonth]);

  /* ============================================================
   * ⭐ simInput 变化 → 本地立即生效 + 500ms 防抖写数据库
   * ============================================================ */
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (!storeId || !selectedMonth) return;
    if (!dbOnline) {
      console.warn('[SimulationPage] 数据库离线，暂不保存');
      return;
    }

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      setSavingSetting(true);
      try {
        await saveSimulationSetting(storeId, selectedMonth, simInput);
        setLastSavedAt(new Date());
        console.log('[SimulationPage] 已保存测算设置', storeId, selectedMonth, simInput);
      } catch (e) {
        console.error('[SimulationPage] 保存测算设置失败', e);
        setDbOnline(false);
      } finally {
        setSavingSetting(false);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [simInput, storeId, selectedMonth, dbOnline]);

  /* ============================================================
   * 业绩分配比例（仍走 localStorage）
   * ============================================================ */
  const [shareConfig, setShareConfig] = useState<RevenueShareConfig>(() => {
    const saved = localStorage.getItem(SHARE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(SHARE_KEY, JSON.stringify(shareConfig));
  }, [shareConfig]);

  /* ============================================================
   * 性别人数（仍走 localStorage）
   * ============================================================ */
  const [genderCounts, setGenderCounts] = useState<GenderCountConfig>(() => {
    const saved = localStorage.getItem(GENDER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(GENDER_KEY, JSON.stringify(genderCounts));
  }, [genderCounts]);

  /* ============================================================
   * ⭐ 撤销栈
   * ============================================================ */
  const pushUndo = (label: string) => {
    const stack = undoStackRef.current;
    stack.push({
      setting: JSON.parse(JSON.stringify(simInput)),
      shareConfig: JSON.parse(JSON.stringify(shareConfig)),
      genderCounts: JSON.parse(JSON.stringify(genderCounts)),
      courseInputs: JSON.parse(JSON.stringify(courseInputs)),
      label,
      at: Date.now(),
    });
    if (stack.length > UNDO_LIMIT) stack.shift();
    setUndoDepth(stack.length);
  };

  /* ⭐ 撤销：直接 setSimInput，让它走正常的防抖保存流程 */
  const handleUndo = () => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const last = stack.pop()!;
    setUndoDepth(stack.length);

    setSimInput(last.setting);
    setShareConfig(last.shareConfig);
    setGenderCounts(last.genderCounts);
    setCourseInputs(last.courseInputs);

    console.log('[undo] 已撤销:', last.label, last.setting);
  };

  /* Ctrl/Cmd+Z 快捷键 */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 切门店 / 切月份清空撤销栈 */
  useEffect(() => {
    undoStackRef.current = [];
    setUndoDepth(0);
  }, [storeId, selectedMonth]);

  /* ============================================================
   * ⭐ 所有入口包一层「先压栈再 set」
   * ============================================================ */
  const handleInputChange = (next: SimulationInput) => {
    pushUndo('修改成本设置');
    setSimInput(next);
  };

  const handleShareConfigChange = (next: RevenueShareConfig) => {
    pushUndo('修改业绩分配比例');
    setShareConfig(next);
  };

  const handleGenderCountsChange = (next: GenderCountConfig) => {
    pushUndo('修改性别人数');
    setGenderCounts(next);
  };

  const handleCourseInputsChange = (next: CourseCommissionInputs) => {
    pushUndo('修改课提设置');
    setCourseInputs(next);
  };

  /* ============================================================
   * 测算结果
   * ============================================================ */
  const simResult: SimulationResult = useMemo(() => {
    if (!currentPlan) {
      return {
        fixedCost: 0,
        totalBaseSalary: 0,
        totalCommission: 0,
        totalClassCommission: 0,
        requiredRevenue: 0,
        iterations: 0,
        breakdown: [],
        courseBreakdown: [],
      };
    }
    return calcSimulation(
      currentPlan.positions,
      simInput,
      courseInputs,
      shareConfig,
      genderCounts
    );
  }, [currentPlan, simInput, courseInputs, shareConfig, genderCounts]);

  const storeName = getStoreById(storeId)?.name || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 shadow-2xl shadow-indigo-500/20 p-8 sm:p-10 mb-8 text-white">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between flex-wrap gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
                <Sliders className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold tracking-widest uppercase">
                  Payroll Simulation
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                薪酬测算
              </h1>
              <p className="text-sm text-indigo-100/90 mt-3 max-w-md">
                设置成本、业绩比例、性别人数，拖动滑块查看利润
              </p>
              <div className="mt-3 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/25">
                <Store className="w-3.5 h-3.5" />
                <span className="text-sm font-medium">{storeName}</span>

                {/* ⭐ 数据库状态徽章 */}
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-white/20 rounded px-1.5 py-0.5">
                  {!dbOnline ? (
                    <>
                      <CloudOff className="w-3 h-3" /> 离线
                    </>
                  ) : savingSetting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> 保存中
                    </>
                  ) : lastSavedAt ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> 已保存{' '}
                      {lastSavedAt.toLocaleTimeString('zh-CN', { hour12: false })}
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3 h-3" /> 已连接
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/payroll?month=${selectedMonth}`)}
                className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition"
              >
                <Calculator className="w-4 h-4" />
                <span className="text-sm font-medium">去计算薪酬</span>
              </button>

              <button
                onClick={() => navigate('/compensation')}
                className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 shadow-lg hover:bg-white/25 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">返回配置</span>
              </button>
            </div>
          </div>
        </div>

        {/* 门店切换 */}
        <div className="mb-4">
          <StoreSwitcher />
        </div>

        {/* 月份选择 + 撤销 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-600">月份</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                navigate(`/simulation?month=${e.target.value}`, {
                  replace: true,
                });
              }}
              className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.keys(store).sort().map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              {!selectedMonth && <option value="">请选择月份</option>}
            </select>

            {!currentPlan && (
              <p className="text-xs text-amber-600">
                该月份暂无薪酬配置，请先到「薪酬配置」页面导入 Excel
              </p>
            )}

            <div className="flex-1" />

            {/* ⭐ 撤销按钮 */}
            <button
              onClick={handleUndo}
              disabled={undoDepth === 0}
              title={
                undoDepth > 0
                  ? `撤销（Ctrl/Cmd+Z，剩余 ${undoDepth} 步）`
                  : '无可撤销'
              }
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
        </div>

        {currentPlan ? (
          <>
            {/* 设置区 */}
            <SimulationSettingsPanel
              positions={currentPlan.positions}
              input={simInput}
              onInputChange={handleInputChange}
              shareConfig={shareConfig}
              onShareConfigChange={handleShareConfigChange}
              genderCounts={genderCounts}
              onGenderCountsChange={handleGenderCountsChange}
              courseInputs={courseInputs}
              onCourseInputsChange={handleCourseInputsChange}
            />

            {/* 结果区 */}
            <RevenueSliderPanel
              positions={currentPlan.positions}
              input={simInput}
              requiredRevenue={simResult.requiredRevenue}
              shareConfig={shareConfig}
              courseCommissions={courseInputs}
              genderCounts={genderCounts}
            />
          </>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-dashed border-gray-200 p-20 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-5">
              <Sliders className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">
              还没有可测算的配置
            </h3>
            <p className="text-sm text-gray-400">
              请先在配置页导入该月的薪酬方案
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationPage;