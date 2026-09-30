import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CompensationStore,
  CourseCommissionInputs,
  SimulationInput,
  RevenueShareConfig,
  GenderCountConfig,
} from '../types/compensation';
import { fetchSimulationSetting, saveSimulationSetting } from '../api/compensation';

const STORAGE_KEY = 'gym_compensation_store_v2';
const SIM_KEY = 'gym_course_simulation_inputs';
const COST_KEY = 'gym_simulation_input';
const SHARE_KEY = 'gym_revenue_share';
const GENDER_KEY = 'gym_gender_counts';
const SAVE_DEBOUNCE_MS = 500;
const UNDO_LIMIT = 20;

export type FullStore = Record<string, CompensationStore>;

export const EMPTY_SIM_INPUT: SimulationInput = {
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

export function useSimulation(storeId: string, selectedMonth: string) {
  const [fullStore, setFullStore] = useState<FullStore>({});
  const [dbOnline, setDbOnline] = useState(true);
  const [savingSetting, setSavingSetting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

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

  const [shareConfig, setShareConfig] = useState<RevenueShareConfig>(() => {
    const saved = localStorage.getItem(SHARE_KEY);
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return {};
  });

  const [genderCounts, setGenderCounts] = useState<GenderCountConfig>(() => {
    const saved = localStorage.getItem(GENDER_KEY);
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return {};
  });

  const [courseInputs, setCourseInputs] = useState<CourseCommissionInputs>(() => {
    const saved = localStorage.getItem(SIM_KEY);
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return {};
  });

  const saveTimerRef = useRef<number | null>(null);
  const skipNextSaveRef = useRef(false);

  const undoStackRef = useRef<SimulationUndoEntry[]>([]);
  const [undoDepth, setUndoDepth] = useState(0);

  // 加载本地缓存 - fullStore
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setFullStore(JSON.parse(saved)); } catch (e) {
        console.error('[Simulation] 解析失败', e);
      }
    }
  }, []);

  // 本地持久化 - 各项配置
  useEffect(() => { localStorage.setItem(SIM_KEY, JSON.stringify(courseInputs)); }, [courseInputs]);
  useEffect(() => { localStorage.setItem(COST_KEY, JSON.stringify(simInput)); }, [simInput]);
  useEffect(() => { localStorage.setItem(SHARE_KEY, JSON.stringify(shareConfig)); }, [shareConfig]);
  useEffect(() => { localStorage.setItem(GENDER_KEY, JSON.stringify(genderCounts)); }, [genderCounts]);

  // 从 API 加载测算设置
  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchSimulationSetting(storeId, selectedMonth);
        if (cancelled) return;
        setDbOnline(true);
        skipNextSaveRef.current = true;
        setSimInput(remote);
      } catch (e) {
        console.warn('[Simulation] API 加载失败，使用本地缓存', e);
        if (!cancelled) setDbOnline(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeId, selectedMonth]);

  // 自动保存（防抖）
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (!storeId || !selectedMonth) return;
    if (!dbOnline) {
      console.warn('[Simulation] 数据库离线，暂不保存');
      return;
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      setSavingSetting(true);
      try {
        await saveSimulationSetting(storeId, selectedMonth, simInput);
        setLastSavedAt(new Date());
      } catch (e) {
        console.error('[Simulation] 保存测算设置失败', e);
        setDbOnline(false);
      } finally {
        setSavingSetting(false);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [simInput, storeId, selectedMonth, dbOnline]);

  // 撤销
  const pushUndo = useCallback((label: string) => {
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
  }, [simInput, shareConfig, genderCounts, courseInputs]);

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const last = stack.pop()!;
    setUndoDepth(stack.length);
    setSimInput(last.setting);
    setShareConfig(last.shareConfig);
    setGenderCounts(last.genderCounts);
    setCourseInputs(last.courseInputs);
  }, []);

  // 键盘快捷键
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

  // 切换门店/月份时清空撤销栈
  useEffect(() => {
    undoStackRef.current = [];
    setUndoDepth(0);
  }, [storeId, selectedMonth]);

  // 受控变更（带撤销快照）
  const handleInputChange = (next: SimulationInput) => { pushUndo('修改成本设置'); setSimInput(next); };
  const handleShareConfigChange = (next: RevenueShareConfig) => { pushUndo('修改业绩分配比例'); setShareConfig(next); };
  const handleGenderCountsChange = (next: GenderCountConfig) => { pushUndo('修改性别人数'); setGenderCounts(next); };
  const handleCourseInputsChange = (next: CourseCommissionInputs) => { pushUndo('修改课提设置'); setCourseInputs(next); };

  return {
    fullStore, setFullStore,
    simInput, shareConfig, genderCounts, courseInputs,
    handleInputChange, handleShareConfigChange, handleGenderCountsChange, handleCourseInputsChange,
    dbOnline, savingSetting, lastSavedAt,
    undoDepth, handleUndo,
  };
}