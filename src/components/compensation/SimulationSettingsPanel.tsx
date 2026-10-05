import React, { useState } from 'react';
import {
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  Zap,
  Home,
  Droplet,
  Wifi,
  MoreHorizontal,
  Users,
  User,
  UserRound,
  Sparkles,
  RotateCcw,
  BookOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  PositionConfig,
  SimulationInput,
  RevenueShareConfig,
  CourseCommissionInputs,
  GenderCount,
  GenderCountConfig,
} from '../../types/compensation';
import { resolveCalcFlags } from '../../types/compensation';
import type { PermissionKey as PermKey } from '../../constants/permissions';
import { buildShareWeights } from '../../utils/simulation';
import { uid } from '../../utils/id';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';

interface SimulationSettingsPanelProps {
  positions: PositionConfig[];
  input: SimulationInput;
  onInputChange: (i: SimulationInput) => void;
  shareConfig: RevenueShareConfig;
  onShareConfigChange: (c: RevenueShareConfig) => void;
  genderCounts: GenderCountConfig;
  onGenderCountsChange: (c: GenderCountConfig) => void;
  courseInputs: CourseCommissionInputs;
  onCourseInputsChange: (c: CourseCommissionInputs) => void;
}

const isStoreManager = (p: PositionConfig) =>
  p.title.includes('店长') || p.title.includes('门店经理');

const isManager = (p: PositionConfig) =>
  p.title.includes('经理') && !isStoreManager(p);

const isShareable = (p: PositionConfig) =>
  resolveCalcFlags(p).includePerformance &&
  !isStoreManager(p) &&
  !isManager(p);

/* ⭐ 参与课提的职位（用于课提设置的「关联职位」下拉） */
const hasClassCommission = (p: PositionConfig) =>
  resolveCalcFlags(p).includeClassCommission;

const SimulationSettingsPanel: React.FC<SimulationSettingsPanelProps> = ({
  positions,
  input,
  onInputChange,
  shareConfig,
  onShareConfigChange,
  genderCounts,
  onGenderCountsChange,
  courseInputs,
  onCourseInputsChange,
}) => {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'cost' | 'share' | 'gender' | 'course'>('cost');

  /* ⭐ 权限 */
  const { hasPermission } = useAuth();
  const { storeId } = useStore();
  const can = (key: PermKey) => hasPermission(key, storeId);

  const canEditCost = (key: PermKey) => can(key);
  const canEditShare = can('simulation:share');
  const canEditGender = can('simulation:gender');
  const canEditCourse = can('simulation:course');

  const shareablePositions = positions.filter(isShareable);
  const weights = buildShareWeights(positions, shareConfig);

  const setShare = (title: string, value: number) => {
    if (!canEditShare) return;
    onShareConfigChange({ ...shareConfig, [title]: value });
  };
  const resetShares = () => {
    if (!canEditShare) return;
    onShareConfigChange({});
  };

  const rawWeightOf = (title: string): number => {
    const raw = shareConfig[title];
    if (raw !== undefined) return raw;
    return positions.find((p) => p.title === title)?.headcount ?? 0;
  };
  const shareTotal = shareablePositions.reduce(
    (s, p) => s + rawWeightOf(p.title),
    0
  );

  const genderTargets = positions.filter(
    (p) =>
      (p.title.includes('泳教') || p.title.includes('私教')) &&
      !p.title.includes('经理')
  );

  const countOf = (pos: PositionConfig): GenderCount => {
    const cur = genderCounts?.[pos.title];
    if (cur) return cur;
    return {
      maleCount: pos.headcount || 0,
      femaleCount: 0,
      newbieCount: 0,
    };
  };

  const setGenderCount = (
    title: string,
    key: 'maleCount' | 'femaleCount' | 'newbieCount',
    value: number
  ) => {
    if (!canEditGender) return;
    const pos = positions.find((p) => p.title === title);
    if (!pos) return;
    const cur = countOf(pos);
    const v = Math.max(0, value);

    const next: GenderCount = { ...cur, [key]: v };
    const hc = pos.headcount || 0;

    if (key === 'maleCount') {
      next.femaleCount = Math.max(0, hc - v - (next.newbieCount || 0));
    } else if (key === 'femaleCount') {
      next.maleCount = Math.max(0, hc - v - (next.newbieCount || 0));
    } else if (key === 'newbieCount') {
      const rest = Math.max(0, hc - v);
      next.maleCount = Math.ceil(rest / 2);
      next.femaleCount = rest - next.maleCount;
    }

    onGenderCountsChange({ ...genderCounts, [title]: next });
  };

  const resetGenderCounts = () => {
    if (!canEditGender) return;
    const next: GenderCountConfig = {};
    genderTargets.forEach((p) => {
      next[p.title] = {
        maleCount: p.headcount || 0,
        femaleCount: 0,
        newbieCount: 0,
      };
    });
    onGenderCountsChange(next);
  };

  /* ⭐ 课提设置：关联职位下拉选项 */
  const coursePositionOptions = positions.filter(hasClassCommission);

  const addCourse = () => {
    if (!canEditCourse) return;
    const id = uid();
    onCourseInputsChange({
      ...courseInputs,
      [id]: {
        note: '',
        averagePrice: 0,
        classCount: 0,
        positionTitle: coursePositionOptions[0]?.title || '',
      },
    });
  };

  const updateCourse = (
    id: string,
    u: Partial<import('../../types/compensation').CourseCommissionInput>
  ) => {
    if (!canEditCourse) return;
    const cur = courseInputs[id];
    if (!cur) return;
    onCourseInputsChange({ ...courseInputs, [id]: { ...cur, ...u } });
  };

  const removeCourse = (id: string) => {
    if (!canEditCourse) return;
    const next = { ...courseInputs };
    delete next[id];
    onCourseInputsChange(next);
  };

  const fixedCost =
    (input.propertyFee || 0) +
    (input.electricityFee || 0) +
    (input.rent || 0) +
    (input.waterFee || 0) +
    (input.networkFee || 0) +
    (input.otherFee || 0);

  const formatMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

  const TABS: { key: typeof tab; label: string; icon: React.ReactNode }[] = [
    { key: 'cost', label: '成本设置', icon: <Home className="w-3.5 h-3.5" /> },
    {
      key: 'share',
      label: '业绩分配比例',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    {
      key: 'gender',
      label: '性别人数',
      icon: <User className="w-3.5 h-3.5" />,
    },
    {
      key: 'course',
      label: '课提设置',
      icon: <BookOpen className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-gray-100 flex items-center justify-between hover:bg-slate-50/80 transition"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-gray-900 text-white flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-800">测算设置</h3>
            <p className="text-[11px] text-gray-400">
              成本 · 业绩比例 · 性别人数 · 课提
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            固定成本合计
            <span className="font-bold text-slate-700 ml-1">
              {formatMoney(fixedCost)}
            </span>
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {open && (
        <>
          <div className="px-5 pt-4">
            <div className="inline-flex p-1 bg-gray-100 rounded-xl gap-1 flex-wrap">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    tab === t.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {/* 成本 */}
            {tab === 'cost' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <CostInput
                  icon={<Building2 className="w-3.5 h-3.5" />}
                  label="物业费"
                  value={input.propertyFee}
                  readOnly={!canEditCost('simulation:cost:property')}
                  onChange={(v) => onInputChange({ ...input, propertyFee: v })}
                  color="text-blue-600"
                />
                <CostInput
                  icon={<Zap className="w-3.5 h-3.5" />}
                  label="电费"
                  value={input.electricityFee}
                  readOnly={!canEditCost('simulation:cost:electricity')}
                  onChange={(v) =>
                    onInputChange({ ...input, electricityFee: v })
                  }
                  color="text-amber-600"
                />
                <CostInput
                  icon={<Home className="w-3.5 h-3.5" />}
                  label="租金"
                  value={input.rent}
                  readOnly={!canEditCost('simulation:cost:rent')}
                  onChange={(v) => onInputChange({ ...input, rent: v })}
                  color="text-emerald-600"
                />
                <CostInput
                  icon={<Droplet className="w-3.5 h-3.5" />}
                  label="水费"
                  value={input.waterFee}
                  readOnly={!canEditCost('simulation:cost:water')}
                  onChange={(v) => onInputChange({ ...input, waterFee: v })}
                  color="text-cyan-600"
                />
                <CostInput
                  icon={<Wifi className="w-3.5 h-3.5" />}
                  label="网络费"
                  value={input.networkFee}
                  readOnly={!canEditCost('simulation:cost:network')}
                  onChange={(v) => onInputChange({ ...input, networkFee: v })}
                  color="text-violet-600"
                />
                <CostInput
                  icon={<MoreHorizontal className="w-3.5 h-3.5" />}
                  label="其他杂项"
                  value={input.otherFee}
                  readOnly={!canEditCost('simulation:cost:other')}
                  onChange={(v) => onInputChange({ ...input, otherFee: v })}
                  color="text-rose-600"
                />
              </div>
            )}

            {/* 业绩比例 */}
            {tab === 'share' && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-900">
                      业绩分配比例
                    </span>
                    <span className="text-[11px] text-indigo-500">
                      （共 {shareTotal} 权重，自动归一化）
                    </span>
                  </div>
                  {canEditShare && (
                    <button
                      onClick={resetShares}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-100/60 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      重置（按人数）
                    </button>
                  )}
                </div>

                {shareablePositions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    没有参与业绩的职位
                  </p>
                ) : (
                  <div className="space-y-2">
                    {shareablePositions.map((p) => {
                      const raw = rawWeightOf(p.title);
                      const percent =
                        shareTotal > 0
                          ? ((raw / shareTotal) * 100).toFixed(1)
                          : '0.0';
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 bg-white rounded-xl border border-indigo-100 px-3 py-2"
                        >
                          <span className="text-xs font-medium text-gray-700 w-24 truncate">
                            {p.title}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={raw}
                            disabled={!canEditShare}
                            onChange={(e) =>
                              setShare(p.title, parseInt(e.target.value) || 0)
                            }
                            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-blue-400 to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60
                              [&::-webkit-slider-thumb]:appearance-none
                              [&::-webkit-slider-thumb]:w-4
                              [&::-webkit-slider-thumb]:h-4
                              [&::-webkit-slider-thumb]:rounded-full
                              [&::-webkit-slider-thumb]:bg-white
                              [&::-webkit-slider-thumb]:border-2
                              [&::-webkit-slider-thumb]:border-indigo-500
                              [&::-webkit-slider-thumb]:shadow
                              [&::-webkit-slider-thumb]:cursor-pointer
                              [&::-moz-range-thumb]:w-4
                              [&::-moz-range-thumb]:h-4
                              [&::-moz-range-thumb]:rounded-full
                              [&::-moz-range-thumb]:bg-white
                              [&::-moz-range-thumb]:border-2
                              [&::-moz-range-thumb]:border-indigo-500"
                          />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={raw}
                            disabled={!canEditShare}
                            onChange={(e) =>
                              setShare(p.title, parseInt(e.target.value) || 0)
                            }
                            className="w-14 text-xs font-semibold text-indigo-700 text-right bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 tabular-nums disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <span className="text-[11px] text-indigo-500 w-12 text-right tabular-nums">
                            {percent}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 性别人数 */}
            {tab === 'gender' && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-rose-600" />
                    <span className="text-sm font-semibold text-rose-900">
                      性别人数
                    </span>
                    <span className="text-[11px] text-rose-500">
                      （默认全男，自动保持总人数一致）
                    </span>
                  </div>
                  {canEditGender && (
                    <button
                      onClick={resetGenderCounts}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 px-2 py-1 rounded-lg hover:bg-rose-100/60 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      重置（全男）
                    </button>
                  )}
                </div>

                {genderTargets.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    没有泳教/私教职位
                  </p>
                ) : (
                  <div className="space-y-3">
                    {genderTargets.map((p) => {
                      const c = countOf(p);
                      const hc = p.headcount || 0;
                      const sum =
                        (c.maleCount ?? 0) +
                        (c.femaleCount ?? 0) +
                        (c.newbieCount ?? 0);
                      const mismatch = sum !== hc;

                      return (
                        <div
                          key={p.id}
                          className="bg-white rounded-xl border border-rose-100 p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-rose-800">
                              {p.title}
                            </span>
                            <span
                              className={`text-[11px] tabular-nums ${
                                mismatch ? 'text-red-500' : 'text-gray-400'
                              }`}
                            >
                              总人数 {hc} · 已分配 {sum}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <GenderInput
                              icon={<User className="w-3 h-3" />}
                              label="男"
                              value={c.maleCount ?? 0}
                              max={hc}
                              color="blue"
                              readOnly={!canEditGender}
                              onChange={(v) =>
                                setGenderCount(p.title, 'maleCount', v)
                              }
                            />
                            <GenderInput
                              icon={<UserRound className="w-3 h-3" />}
                              label="女"
                              value={c.femaleCount ?? 0}
                              max={hc}
                              color="pink"
                              readOnly={!canEditGender}
                              onChange={(v) =>
                                setGenderCount(p.title, 'femaleCount', v)
                              }
                            />
                            <GenderInput
                              icon={<Sparkles className="w-3 h-3" />}
                              label="新"
                              value={c.newbieCount ?? 0}
                              max={hc}
                              color="violet"
                              readOnly={!canEditGender}
                              onChange={(v) =>
                                setGenderCount(p.title, 'newbieCount', v)
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 课提设置 */}
            {tab === 'course' && (
              <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-900">
                      课提设置
                    </span>
                    <span className="text-[11px] text-purple-500">
                      （备注 / 均价 / 节数 / 关联职位）
                    </span>
                  </div>
                  {canEditCourse && (
                    <button
                      onClick={addCourse}
                      className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 px-2 py-1 rounded-lg hover:bg-purple-100/60 transition"
                    >
                      <Plus className="w-3 h-3" />
                      添加课程
                    </button>
                  )}
                </div>

                {Object.keys(courseInputs).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    暂无课程
                    {canEditCourse && '，点击右上角添加'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(courseInputs).map(([id, c]) => (
                      <div
                        key={id}
                        className="grid grid-cols-12 gap-2 bg-white rounded-xl border border-purple-100 px-3 py-2 items-center"
                      >
                        {/* ⭐ 备注 */}
                        <input
                          type="text"
                          value={c.note}
                          disabled={!canEditCourse}
                          onChange={(e) =>
                            updateCourse(id, { note: e.target.value })
                          }
                          placeholder="备注"
                          className="col-span-3 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        {/* 均价 */}
                        <input
                          type="number"
                          value={c.averagePrice}
                          disabled={!canEditCourse}
                          onChange={(e) =>
                            updateCourse(id, {
                              averagePrice: parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder="均价"
                          className="col-span-2 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 tabular-nums disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        {/* 节数 */}
                        <input
                          type="number"
                          value={c.classCount}
                          disabled={!canEditCourse}
                          onChange={(e) =>
                            updateCourse(id, {
                              classCount: parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder="节数"
                          className="col-span-2 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 tabular-nums disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        {/* ⭐ 关联职位：下拉 */}
                        <select
                          value={c.positionTitle}
                          disabled={!canEditCourse}
                          onChange={(e) =>
                            updateCourse(id, {
                              positionTitle: e.target.value,
                            })
                          }
                          className="col-span-3 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="">请选择职位</option>
                          {coursePositionOptions.map((p) => (
                            <option key={p.id} value={p.title}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeCourse(id)}
                          disabled={!canEditCourse}
                          className="col-span-2 justify-self-end p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ============================================================
 * 子组件
 * ============================================================ */
interface CostInputProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  readOnly?: boolean;
  onChange: (v: number) => void;
  color: string;
}

const CostInput: React.FC<CostInputProps> = ({
  icon,
  label,
  value,
  readOnly = false,
  onChange,
  color,
}) => (
  <div className="flex items-center gap-2 bg-gray-50/80 border border-gray-100 rounded-xl px-3 py-2 hover:border-gray-200 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-400/30 transition">
    <span className={color}>{icon}</span>
    <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
      {label}
    </span>
    <input
      type="number"
      value={value}
      disabled={readOnly}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className="flex-1 min-w-0 text-sm font-semibold text-gray-800 bg-transparent focus:outline-none tabular-nums text-right disabled:cursor-not-allowed disabled:opacity-60"
    />
  </div>
);

interface GenderInputProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  color: 'blue' | 'pink' | 'violet';
  readOnly?: boolean;
  onChange: (v: number) => void;
}

const COLOR_STYLE: Record<
  string,
  { bg: string; text: string; unit: string }
> = {
  blue: { bg: 'bg-blue-50/60 border-blue-100', text: 'text-blue-700', unit: 'text-blue-400' },
  pink: { bg: 'bg-pink-50/60 border-pink-100', text: 'text-pink-700', unit: 'text-pink-400' },
  violet: {
    bg: 'bg-violet-50/60 border-violet-100',
    text: 'text-violet-700',
    unit: 'text-violet-400',
  },
};

const GenderInput: React.FC<GenderInputProps> = ({
  icon,
  label,
  value,
  max,
  color,
  readOnly = false,
  onChange,
}) => {
  const c = COLOR_STYLE[color];
  return (
    <div className={`flex items-center gap-1.5 ${c.bg} rounded-lg border px-2 py-1.5`}>
      <span className={`text-[11px] ${c.text} flex items-center gap-0.5 whitespace-nowrap`}>
        {icon}
        {label}
      </span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className={`flex-1 min-w-0 text-xs font-semibold ${c.text} text-right bg-transparent focus:outline-none tabular-nums disabled:cursor-not-allowed disabled:opacity-60`}
      />
      <span className={`text-[10px] ${c.unit}`}>人</span>
    </div>
  );
};

export default SimulationSettingsPanel;