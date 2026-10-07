import React, { useEffect, useState } from 'react';
import { Trash2, Users, Wallet, StickyNote, Target, Store } from 'lucide-react';
import type {
  PositionConfig,
  CommissionTier,
  BaseSalaryTier,
  GenderSalaryTier,
  CourseCommission,
  ClassCommissionMode,
  DepartmentKey,
} from '../../types/compensation';
import { resolveCalcFlags } from '../../types/compensation';
import { uid } from '../../utils/id';
import { calcTotalBaseSalary } from '../../utils/salary';
import { resolvePerformanceTarget } from '../../utils/performance';
import { useStore } from '../../contexts/StoreContext';
import {
  fetchCardList,
  resolveCardTypeByPosition,
  type CardItem,
} from '../../api/card';
import TierEditor from './TierEditor';
import GenderTierEditor from './GenderTierEditor';
import CourseCommissionEditor from './CourseCommissionEditor';
import PositionRewardsEditor from './PositionRewardsEditor';
import type { PositionRewardRef, RewardsCatalog } from '../../types/compensation';

const ALL_DEPTS: DepartmentKey[] = ['会籍', '私教', '泳教', '运营'];
const DEFAULT_STORE_DEPTS: DepartmentKey[] = ['会籍', '私教', '泳教'];

const FLAG_COLORS: Record<string, { on: string; off: string }> = {
  emerald: {
    on: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    off: 'bg-white text-gray-400 border-gray-200',
  },
  sky: {
    on: 'bg-sky-50 text-sky-700 border-sky-200',
    off: 'bg-white text-gray-400 border-gray-200',
  },
  blue: {
    on: 'bg-blue-50 text-blue-700 border-blue-200',
    off: 'bg-white text-gray-400 border-gray-200',
  },
  cyan: {
    on: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    off: 'bg-white text-gray-400 border-gray-200',
  },
  violet: {
    on: 'bg-violet-50 text-violet-700 border-violet-200',
    off: 'bg-white text-gray-400 border-gray-200',
  },
};

const PositionCalcFlagsRow: React.FC<{
  position: PositionConfig;
  readOnly: boolean;
  onUpdate: (u: Partial<PositionConfig>) => void;
}> = ({ position, readOnly, onUpdate }) => {
  const flags = resolveCalcFlags(position);

  const setFlag = (key: keyof typeof flags, value: boolean) => {
    if (readOnly) return;
    onUpdate({
      calcFlags: {
        ...position.calcFlags,
        [key]: value,
      },
    });
  };

  const items: {
    key: keyof typeof flags;
    label: string;
    color: keyof typeof FLAG_COLORS;
  }[] = [
    { key: 'includePerformance', label: '业绩', color: 'emerald' },
    { key: 'includeSalesCommission', label: '佣金', color: 'sky' },
    { key: 'includeBaseSalary', label: '底薪', color: 'blue' },
    { key: 'includeClassAmount', label: '上课金额', color: 'cyan' },
    { key: 'includeClassCommission', label: '课提', color: 'violet' },
  ];

  return (
    <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center gap-3">
      <span className="text-xs font-medium text-slate-600">参与计算项：</span>
      {items.map((it) => {
        const active = flags[it.key];
        const c = FLAG_COLORS[it.color];
        return (
          <label
            key={it.key}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              active ? c.on : c.off
            } ${readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              checked={active}
              disabled={readOnly}
              onChange={(e) => setFlag(it.key, e.target.checked)}
              className="accent-current"
            />
            {it.label}
          </label>
        );
      })}
    </div>
  );
};

interface PositionCardProps {
  position: PositionConfig;
  allPositions: PositionConfig[];
  readOnly?: boolean;
  canEditTarget?: boolean;
  canEditHeadcount?: boolean;
  canDelete?: boolean;
  canRename?: boolean;   // ⭐ 新增
  onUpdate: (updates: Partial<PositionConfig>) => void;
  onRemove: () => void;
  /** ⭐ 全局奖金库 */
  rewardsCatalog?: RewardsCatalog;
}

const PositionCard: React.FC<PositionCardProps> = ({
  position,
  allPositions,
  readOnly = false,
  canEditTarget = false,
  canEditHeadcount = true,
  canDelete = true,
  canRename = true,      // ⭐ 默认允许，向下兼容
  onUpdate,
  onRemove,
  rewardsCatalog,
}) => {
  const { storeId } = useStore();

  const [cardOptions, setCardOptions] = useState<CardItem[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const showCourseCommission =
    position.title.includes('泳教') ||
    position.title.includes('私教') ||
    position.title.includes('泳教经理') ||
    position.title.includes('瑜伽') ||
    position.title.includes('舞蹈') ||
    position.title.includes('团操') ||
    position.category === 'swim' ||
    position.category === 'personalTraining';

  useEffect(() => {
    if (!showCourseCommission) {
      setCardOptions([]);
      return;
    }

    const cardType = resolveCardTypeByPosition(
      position.title,
      position.category
    );

    if (!cardType) {
      setCardOptions([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingCards(true);
      try {
        const list = await fetchCardList(storeId, cardType);
        if (!cancelled) setCardOptions(list);
      } catch (e) {
        console.error('[PositionCard] 加载课程列表失败', e);
      } finally {
        if (!cancelled) setLoadingCards(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, position.title, position.category, showCourseCommission]);

  const isSwimCoach =
    position.title.includes('泳教') && !position.title.includes('经理');

  const isSwimOrPersonal =
    position.title.includes('泳教') || position.title.includes('私教');

  const isStore =
    position.title.includes('店长') || position.title.includes('门店经理');

  const isOpsManager = position.title === '运营主管';

  const showClassCommission =
    position.category === 'personalTraining' ||
    isSwimOrPersonal ||
    isStore ||
    isOpsManager;

  const isManager =
    position.title.includes('经理') && !position.title.includes('店长');

  const isOps = position.category === 'operations';

  const targetAggregated =
    position.managerAggregateByDept === true && !isOps && isManager;

  const autoTotalBase = calcTotalBaseSalary(position, allPositions);
  const defaultClassMode: ClassCommissionMode =
    position.classCommissionMode || 'percent';

  const isLocked =
    (position.performanceSource && position.performanceSource !== 'self') ||
    targetAggregated;

  const resolvedTarget = resolvePerformanceTarget(position, allPositions);

  const addCommissionTier = () => {
    if (readOnly) return;
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
  };

  const updateCommissionTier = (id: string, u: Partial<CommissionTier>) => {
    if (readOnly) return;
    onUpdate({
      commissionTiers: position.commissionTiers.map((t) =>
        t.id === id ? { ...t, ...u } : t
      ),
    });
  };

  const removeCommissionTier = (id: string) => {
    if (readOnly) return;
    onUpdate({
      commissionTiers: position.commissionTiers.filter((t) => t.id !== id),
    });
  };

  const addBaseTier = () => {
    if (readOnly) return;
    onUpdate({
      baseSalaryTiers: [
        ...position.baseSalaryTiers,
        { id: uid(), threshold: 0, amount: 0 },
      ],
    });
  };

  const updateBaseTier = (id: string, u: Partial<BaseSalaryTier>) => {
    if (readOnly) return;
    onUpdate({
      baseSalaryTiers: position.baseSalaryTiers.map((t) =>
        t.id === id ? { ...t, ...u } : t
      ),
    });
  };

  const removeBaseTier = (id: string) => {
    if (readOnly) return;
    onUpdate({
      baseSalaryTiers: position.baseSalaryTiers.filter((t) => t.id !== id),
    });
  };

  const updateGenderTiers = (tiers: GenderSalaryTier[]) => {
    if (readOnly) return;
    onUpdate({ genderSalaryTiers: tiers });
  };

  const updateCourseCommissions = (courses: CourseCommission[]) => {
    if (readOnly) return;
    onUpdate({ courseCommissions: courses });
  };

  const toggleDept = (dept: DepartmentKey) => {
    if (readOnly) return;
    const current = position.includedDepartments ?? DEFAULT_STORE_DEPTS;
    const next = current.includes(dept)
      ? current.filter((d) => d !== dept)
      : [...current, dept];
    onUpdate({ includedDepartments: next });
  };

  /* ⭐ 各字段独立权限 */
  const headcountDisabled = readOnly || !canEditHeadcount;
  const deleteDisabled = readOnly || !canDelete;
  const renameDisabled = readOnly || !canRename;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 overflow-hidden animate-fade-in-up">
      <div className="relative px-5 py-4 bg-gradient-to-r from-gray-50/80 via-white to-white border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />

            {/* ⭐ 职位名称：受 position:rename 控制 */}
            <input
              value={position.title}
              disabled={renameDisabled}
              onChange={(e) => onUpdate({ title: e.target.value })}
              title={!canRename ? '无权限：职位名称更改' : undefined}
              className={`border rounded-lg px-2.5 py-1.5 text-sm font-bold w-36 focus:outline-none focus:ring-2 transition ${
                renameDisabled
                  ? 'border-transparent bg-gray-50 text-gray-600 cursor-not-allowed'
                  : 'border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white text-gray-900 focus:ring-blue-400/30'
              }`}
            />
          </div>

          {/* 人数：受 headcount:edit 控制 */}
          <div
            className={`flex items-center gap-1.5 text-sm border rounded-lg px-2.5 py-1.5 transition ${
              headcountDisabled
                ? 'bg-gray-100/80 border-gray-200'
                : 'bg-gray-50/80 border-gray-100 hover:border-gray-200'
            }`}
            title={!canEditHeadcount ? '无权限：修改职位人数' : undefined}
          >
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-500 text-xs">人数</span>
            <input
              type="number"
              value={position.headcount}
              disabled={headcountDisabled}
              onChange={(e) =>
                onUpdate({ headcount: parseInt(e.target.value) || 0 })
              }
              className="w-14 text-sm font-semibold text-gray-900 bg-transparent focus:outline-none tabular-nums disabled:cursor-not-allowed"
            />
          </div>

          <div
            className={`flex items-center gap-1.5 text-sm rounded-lg px-2.5 py-1.5 transition ${
              isLocked
                ? 'bg-emerald-50/80 border border-emerald-200'
                : 'bg-emerald-50/70 border border-emerald-100 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/30'
            }`}
          >
            {isLocked ? (
              <Target className="w-3.5 h-3.5 text-emerald-600" />
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
                  value={resolvedTarget}
                  disabled={!canEditTarget}
                  onChange={(e) =>
                    onUpdate({
                      performanceTarget: parseInt(e.target.value) || 0,
                    })
                  }
                  title={!canEditTarget ? '无权限：业绩目标设置' : undefined}
                  className="w-24 text-sm font-semibold text-emerald-800 bg-transparent focus:outline-none tabular-nums disabled:cursor-not-allowed"
                />
                <span className="text-[11px] text-emerald-500">元</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-sm bg-blue-50/70 border border-blue-100 rounded-lg px-2.5 py-1.5">
            <Wallet className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-blue-600 text-xs font-medium">总底薪</span>
            <span className="text-sm font-bold text-blue-700 tabular-nums">
              ¥{autoTotalBase.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-sm bg-amber-50/70 border border-amber-100 rounded-lg px-2.5 py-1.5 hover:border-amber-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/30 transition">
            <StickyNote className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-600 text-xs font-medium whitespace-nowrap">
              备注
            </span>
            <input
              type="text"
              value={position.extraNote || ''}
              disabled={readOnly}
              onChange={(e) => onUpdate({ extraNote: e.target.value })}
              placeholder="如：店长兼任、上一休一…"
              className="w-40 text-xs text-amber-800 bg-transparent focus:outline-none placeholder:text-amber-300 disabled:cursor-not-allowed"
            />
            {!readOnly && position.extraNote && (
              <button
                onClick={() => onUpdate({ extraNote: '' })}
                className="text-amber-400 hover:text-amber-600 transition"
                title="清空备注"
              >
                ×
              </button>
            )}
          </div>

          {isManager && !isStore && !isOps && (
            <>
              <label
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                  position.managerAggregateByDept
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-white text-gray-500 border-gray-200'
                } ${
                  readOnly
                    ? 'cursor-not-allowed opacity-70'
                    : 'cursor-pointer'
                }`}
                title={
                  readOnly
                    ? '无权限：设置方案'
                    : '打开：该经理业绩及目标 = 本部门其他职位总和；关闭：用自己的值'
                }
              >
                <input
                  type="checkbox"
                  checked={position.managerAggregateByDept ?? false}
                  disabled={readOnly}
                  onChange={(e) =>
                    onUpdate({ managerAggregateByDept: e.target.checked })
                  }
                  className="accent-violet-600 disabled:cursor-not-allowed"
                />
                <span className="whitespace-nowrap">业绩=部门总和</span>
              </label>

              {position.managerAggregateByDept && (
                <label
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                    position.managerIncludeSelf
                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : 'bg-white text-gray-500 border-gray-200'
                  } ${
                    readOnly
                      ? 'cursor-not-allowed opacity-70'
                      : 'cursor-pointer'
                  }`}
                  title={
                    readOnly
                      ? '无权限：设置方案'
                      : '打开：业绩 = 本部门其他职位总和 + 自己的业绩'
                  }
                >
                  <input
                    type="checkbox"
                    checked={position.managerIncludeSelf ?? false}
                    disabled={readOnly}
                    onChange={(e) =>
                      onUpdate({ managerIncludeSelf: e.target.checked })
                    }
                    className="accent-violet-600 disabled:cursor-not-allowed"
                  />
                  <span className="whitespace-nowrap">含自己业绩</span>
                </label>
              )}
            </>
          )}

          <div className="flex-1" />

          {!readOnly && (
            <button
              onClick={onRemove}
              disabled={deleteDisabled}
              className={`p-2 rounded-xl transition ${
                deleteDisabled
                  ? 'text-gray-300 cursor-not-allowed opacity-50'
                  : 'text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'
              }`}
              title={!canDelete ? '无权限：删除职位' : '删除职位'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <PositionCalcFlagsRow
        position={position}
        readOnly={readOnly}
        onUpdate={onUpdate}
      />

      {isStore && (
        <div className="px-5 py-3 bg-violet-50/60 border-b border-violet-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-violet-700">
              <Store className="w-3.5 h-3.5" />
              <span className="text-xs font-medium whitespace-nowrap">
                店长业绩包含部门
              </span>
            </div>

            {ALL_DEPTS.map((dept) => {
              const active = (
                position.includedDepartments ?? DEFAULT_STORE_DEPTS
              ).includes(dept);
              return (
                <button
                  key={dept}
                  onClick={() => toggleDept(dept)}
                  disabled={readOnly}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                    active
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {dept}
                </button>
              );
            })}

            <label className="flex items-center gap-1.5 text-xs text-violet-700 ml-2 cursor-pointer">
              <input
                type="checkbox"
                checked={position.includeSelf ?? false}
                disabled={readOnly}
                onChange={(e) => onUpdate({ includeSelf: e.target.checked })}
                className="accent-violet-600 disabled:cursor-not-allowed"
              />
              含自己业绩
            </label>

            <span className="text-[10px] text-violet-500 ml-auto">
              永远不含任何经理
            </span>
          </div>
        </div>
      )}

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TierEditor
          mode="commission"
          readOnly={readOnly}
          commissionTiers={position.commissionTiers}
          onAddCommission={addCommissionTier}
          onUpdateCommission={updateCommissionTier}
          onRemoveCommission={removeCommissionTier}
          showClassCommission={showClassCommission}
          defaultClassMode={defaultClassMode}
        />

        {isSwimCoach ? (
          <GenderTierEditor
            tiers={position.genderSalaryTiers || []}
            readOnly={readOnly}
            onChange={updateGenderTiers}
          />
        ) : (
          <TierEditor
            mode="base"
            readOnly={readOnly}
            baseSalaryTiers={position.baseSalaryTiers}
            onAddBase={addBaseTier}
            onUpdateBase={updateBaseTier}
            onRemoveBase={removeBaseTier}
          />
        )}
      </div>

      {showCourseCommission && (
        <div className="px-5 pb-5">
          <CourseCommissionEditor
            courses={position.courseCommissions || []}
            readOnly={readOnly}
            onChange={updateCourseCommissions}
            cardOptions={cardOptions}
            loadingCards={loadingCards}
          />
          {/* ⭐ 职位级奖金 */}
          <PositionRewardsEditor
            rewards={position.rewards || []}
            catalog={rewardsCatalog || []}
            readOnly={readOnly}
            onChange={(next: PositionRewardRef[]) => onUpdate({ rewards: next })}
          />
        </div>
      )}
    </div>
  );
};

export default PositionCard;