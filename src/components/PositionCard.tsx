import React from 'react';
import {
  Trash2,
  Users,
  Wallet,
  StickyNote,
  Target,
  Lock,
  BadgePercent,
} from 'lucide-react';
import type {
  PositionConfig,
  CommissionTier,
  BaseSalaryTier,
  GenderSalaryTier,
  CourseCommission,
  ClassCommissionMode,
} from '../types/compensation';
import { uid } from '../utils/id';
import { calcTotalBaseSalary } from '../utils/salary';
import { resolvePerformanceTarget } from '../utils/performance';
import TierEditor from './TierEditor';
import GenderTierEditor from './GenderTierEditor';
import CourseCommissionEditor from './CourseCommissionEditor';

interface PositionCardProps {
  position: PositionConfig;
  allPositions: PositionConfig[];
  onUpdate: (updates: Partial<PositionConfig>) => void;
  onRemove: () => void;
}

const PositionCard: React.FC<PositionCardProps> = ({
  position,
  allPositions,
  onUpdate,
  onRemove,
}) => {
  const isSwimCoach =
    position.title.includes('泳教') && !position.title.includes('经理');
  const isSwimOrPersonal =
    position.title.includes('泳教') || position.title.includes('私教');
  const showClassCommission = isSwimOrPersonal;
  const showCourseCommission =
    position.title.includes('泳教') ||
    position.title.includes('私教') ||
    position.title.includes('泳教经理');

  const hasCommission =
    position.hasCommission !== undefined
      ? position.hasCommission
      : position.commissionTiers.length > 0;

  const autoTotalBase = calcTotalBaseSalary(position, allPositions);
  const defaultClassMode: ClassCommissionMode =
    position.classCommissionMode || 'percent';

  const isLocked =
    position.performanceSource && position.performanceSource !== 'self';
  const resolvedTarget = resolvePerformanceTarget(position, allPositions);

  /* ---- 佣金阶梯 ---- */
  const addCommissionTier = () =>
    onUpdate({
      commissionTiers: [
        ...position.commissionTiers,
        {
          id: uid(),
          threshold: 0,
          rate: 0,
          classRate: showClassCommission ? 0 : undefined,
          classMode: showClassCommission ? defaultClassMode : undefined,
        },
      ],
    });

  const updateCommissionTier = (id: string, u: Partial<CommissionTier>) =>
    onUpdate({
      commissionTiers: position.commissionTiers.map((t) =>
        t.id === id ? { ...t, ...u } : t
      ),
    });

  const removeCommissionTier = (id: string) =>
    onUpdate({
      commissionTiers: position.commissionTiers.filter((t) => t.id !== id),
    });

  const setCommissionTiered = (v: boolean) =>
    onUpdate({ commissionTiered: v });

  const toggleHasCommission = () => {
    if (hasCommission) {
      onUpdate({ hasCommission: false, commissionTiers: [] });
    } else {
      onUpdate({
        hasCommission: true,
        commissionTiers:
          position.commissionTiers.length > 0
            ? position.commissionTiers
            : [
                {
                  id: uid(),
                  threshold: 0,
                  rate: 0,
                  classRate: showClassCommission ? 0 : undefined,
                  classMode: showClassCommission ? defaultClassMode : undefined,
                },
              ],
      });
    }
  };

  /* ---- 普通底薪 ---- */
  const addBaseTier = () =>
    onUpdate({
      baseSalaryTiers: [
        ...position.baseSalaryTiers,
        { id: uid(), threshold: 0, amount: 0 },
      ],
    });

  const updateBaseTier = (id: string, u: Partial<BaseSalaryTier>) =>
    onUpdate({
      baseSalaryTiers: position.baseSalaryTiers.map((t) =>
        t.id === id ? { ...t, ...u } : t
      ),
    });

  const removeBaseTier = (id: string) =>
    onUpdate({
      baseSalaryTiers: position.baseSalaryTiers.filter((t) => t.id !== id),
    });

  const setBaseTiered = (v: boolean) => onUpdate({ baseTiered: v });

  /* ---- 泳教性别底薪 ---- */
  const updateGenderTiers = (tiers: GenderSalaryTier[]) =>
    onUpdate({ genderSalaryTiers: tiers });

  /* ---- 课程课提 ---- */
  const updateCourseCommissions = (courses: CourseCommission[]) =>
    onUpdate({ courseCommissions: courses });

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 overflow-hidden animate-fade-in-up">
      {/* ============ 卡片头 ============ */}
      <div className="relative px-5 py-4 bg-gradient-to-r from-gray-50/80 via-white to-white border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-3">
          {/* 职位名 */}
          <div className="flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
            <input
              value={position.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white rounded-lg px-2.5 py-1.5 text-sm font-bold text-gray-900 w-36 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition"
            />
          </div>

          {/* 人数 */}
          <div className="flex items-center gap-1.5 text-sm bg-gray-50/80 border border-gray-100 rounded-lg px-2.5 py-1.5 hover:border-gray-200 transition">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-500 text-xs">人数</span>
            <input
              type="number"
              value={position.headcount}
              onChange={(e) =>
                onUpdate({ headcount: parseInt(e.target.value) || 0 })
              }
              className="w-14 text-sm font-semibold text-gray-900 bg-transparent focus:outline-none tabular-nums"
            />
          </div>

          {/* 业绩目标 —— 仅含佣金职位显示 */}
          {hasCommission && (
            <div
              className={`flex items-center gap-1.5 text-sm rounded-lg px-2.5 py-1.5 transition ${
                isLocked
                  ? 'bg-emerald-50/80 border border-emerald-200'
                  : 'bg-emerald-50/70 border border-emerald-100 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/30'
              }`}
              title={
                isLocked
                  ? '业绩目标自动计算（来自下级/关联职位）'
                  : '手动输入业绩目标'
              }
            >
              {isLocked ? (
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Target className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span className="text-emerald-600 text-xs font-medium whitespace-nowrap">
                业绩目标
              </span>
              {isLocked ? (
                <span className="w-28 text-sm font-bold text-emerald-800 tabular-nums">
                  ¥{resolvedTarget.toLocaleString()}
                </span>
              ) : (
                <>
                  <input
                    type="number"
                    value={position.performanceTarget}
                    onChange={(e) =>
                      onUpdate({
                        performanceTarget: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-24 text-sm font-semibold text-emerald-800 bg-transparent focus:outline-none tabular-nums"
                  />
                  <span className="text-[11px] text-emerald-500">元</span>
                </>
              )}
            </div>
          )}

          {/* 总底薪 */}
          <div
            className="flex items-center gap-1.5 text-sm bg-blue-50/70 border border-blue-100 rounded-lg px-2.5 py-1.5"
            title="根据底薪阶梯自动计算"
          >
            <Wallet className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-blue-600 text-xs font-medium">总底薪</span>
            <span className="text-sm font-bold text-blue-700 tabular-nums">
              ¥{autoTotalBase.toLocaleString()}
            </span>
          </div>

          {/* 佣金开关 */}
          <button
            onClick={toggleHasCommission}
            className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 border transition ${
              hasCommission
                ? 'bg-sky-50/80 border-sky-200 text-sky-700 hover:bg-sky-100'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
            }`}
            title={hasCommission ? '点击关闭佣金' : '点击开启佣金'}
          >
            <BadgePercent className="w-3.5 h-3.5" />
            {hasCommission ? '含佣金' : '无佣金'}
          </button>

          {/* 备注 */}
          <div className="flex items-center gap-1.5 text-sm bg-amber-50/70 border border-amber-100 rounded-lg px-2.5 py-1.5 hover:border-amber-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/30 transition">
            <StickyNote className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-600 text-xs font-medium whitespace-nowrap">
              备注
            </span>
            <input
              type="text"
              value={position.extraNote || ''}
              onChange={(e) => onUpdate({ extraNote: e.target.value })}
              placeholder="如：店长兼任、上一休一…"
              className="w-40 text-xs text-amber-800 bg-transparent focus:outline-none placeholder:text-amber-300"
            />
            {position.extraNote && (
              <button
                onClick={() => onUpdate({ extraNote: '' })}
                className="text-amber-400 hover:text-amber-600 transition"
                title="清空备注"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex-1" />

          <button
            onClick={onRemove}
            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition opacity-0 group-hover:opacity-100"
            title="删除职位"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============ 泳教：上下两行 ============ */}
      {isSwimCoach && (
        <>
          {hasCommission && (
            <div className="p-5">
              <TierEditor
                mode="commission"
                commissionTiers={position.commissionTiers}
                onAddCommission={addCommissionTier}
                onUpdateCommission={updateCommissionTier}
                onRemoveCommission={removeCommissionTier}
                showClassCommission={showClassCommission}
                defaultClassMode={defaultClassMode}
                tiered={position.commissionTiered !== false}
                onTieredChange={setCommissionTiered}
              />
            </div>
          )}

          <div className={hasCommission ? 'px-5 pb-5' : 'p-5'}>
            <GenderTierEditor
              tiers={position.genderSalaryTiers || []}
              onChange={updateGenderTiers}
            />
          </div>
        </>
      )}

      {/* ============ 其他职位：左右两列 ============ */}
      {!isSwimCoach && (
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {hasCommission ? (
            <TierEditor
              mode="commission"
              commissionTiers={position.commissionTiers}
              onAddCommission={addCommissionTier}
              onUpdateCommission={updateCommissionTier}
              onRemoveCommission={removeCommissionTier}
              showClassCommission={showClassCommission}
              defaultClassMode={defaultClassMode}
              tiered={position.commissionTiered !== false}
              onTieredChange={setCommissionTiered}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 p-4 flex items-center justify-center text-xs text-gray-400">
              该职位无佣金
            </div>
          )}

          <TierEditor
            mode="base"
            baseSalaryTiers={position.baseSalaryTiers}
            onAddBase={addBaseTier}
            onUpdateBase={updateBaseTier}
            onRemoveBase={removeBaseTier}
            tiered={position.baseTiered !== false}
            onTieredChange={setBaseTiered}
          />
        </div>
      )}

      {/* ============ 课程课提 ============ */}
      {showCourseCommission && hasCommission && (
        <div className="px-5 pb-5">
          <CourseCommissionEditor
            courses={position.courseCommissions || []}
            onChange={updateCourseCommissions}
          />
        </div>
      )}
    </div>
  );
};

export default PositionCard;