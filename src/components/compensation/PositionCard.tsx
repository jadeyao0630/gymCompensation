import React, { useEffect, useState } from 'react';
import type {
  PositionConfig,
  CommissionTier,
  BaseSalaryTier,
  GenderSalaryTier,
  CourseCommission,
  ClassCommissionMode,
  PositionRewardRef,
  RewardsCatalog,
} from '../../types/compensation';
import { uid } from '../../utils/id';
import { calcTotalBaseSalary } from '../../utils/salary';
import { resolvePerformanceTarget } from '../../utils/performance';
import { useStore } from '../../contexts/StoreContext';
import {
  fetchCardList,
  resolveCardTypeByPosition,
  type CardItem,
} from '../../api/card';
import {
  PositionHeaderBar,
  PositionCalcFlagsRow,
  StoreDeptSelector,
  PositionTiersSection,
  PositionExtrasSection,
} from './position-card';

interface PositionCardProps {
  position: PositionConfig;
  allPositions: PositionConfig[];
  readOnly?: boolean;
  canEditTarget?: boolean;
  canEditHeadcount?: boolean;
  canDelete?: boolean;
  canRename?: boolean;
  onUpdate: (updates: Partial<PositionConfig>) => void;
  onRemove: () => void;
  rewardsCatalog?: RewardsCatalog;
}

const PositionCard: React.FC<PositionCardProps> = ({
  position,
  allPositions,
  readOnly = false,
  canEditTarget = false,
  canEditHeadcount = true,
  canDelete = true,
  canRename = true,
  onUpdate,
  onRemove,
  rewardsCatalog,
}) => {
  const { storeId } = useStore();

  const [cardOptions, setCardOptions] = useState<CardItem[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  /* ---------- 展示判断（派生状态） ---------- */
  const showCourseCommission =
    position.title.includes('泳教') ||
    position.title.includes('私教') ||
    position.title.includes('泳教经理') ||
    position.title.includes('瑜伽') ||
    position.title.includes('舞蹈') ||
    position.title.includes('团操') ||
    position.category === 'swim' ||
    position.category === 'personalTraining';

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

  /* ---------- 加载课程列表 ---------- */
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

  /* ---------- 佣金阶梯操作 ---------- */
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

  /* ---------- 底薪阶梯操作 ---------- */
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

  /* ---------- 其他编辑 ---------- */
  const updateGenderTiers = (tiers: GenderSalaryTier[]) => {
    if (readOnly) return;
    onUpdate({ genderSalaryTiers: tiers });
  };

  const updateCourseCommissions = (courses: CourseCommission[]) => {
    if (readOnly) return;
    onUpdate({ courseCommissions: courses });
  };

  const updateRewards = (next: PositionRewardRef[]) => {
    if (readOnly) return;
    onUpdate({ rewards: next });
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 overflow-hidden animate-fade-in-up">
      <PositionHeaderBar
        position={position}
        allPositions={allPositions}
        readOnly={readOnly}
        canEditTarget={canEditTarget}
        canEditHeadcount={canEditHeadcount}
        canDelete={canDelete}
        canRename={canRename}
        autoTotalBase={autoTotalBase}
        resolvedTarget={resolvedTarget}
        isLocked={isLocked}
        isManager={isManager}
        isStore={isStore}
        isOps={isOps}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />

      <PositionCalcFlagsRow
        position={position}
        readOnly={readOnly}
        onUpdate={onUpdate}
      />

      {isStore && (
        <StoreDeptSelector
          position={position}
          readOnly={readOnly}
          onUpdate={onUpdate}
        />
      )}

      <PositionTiersSection
        position={position}
        readOnly={readOnly}
        showClassCommission={showClassCommission}
        defaultClassMode={defaultClassMode}
        isSwimCoach={isSwimCoach}
        onAddCommission={addCommissionTier}
        onUpdateCommission={updateCommissionTier}
        onRemoveCommission={removeCommissionTier}
        onAddBase={addBaseTier}
        onUpdateBase={updateBaseTier}
        onRemoveBase={removeBaseTier}
        onUpdateGenderTiers={updateGenderTiers}
      />

      <PositionExtrasSection
        showCourseCommission={showCourseCommission}
        courses={position.courseCommissions || []}
        rewards={position.rewards || []}
        rewardsCatalog={rewardsCatalog}
        readOnly={readOnly}
        cardOptions={cardOptions}
        loadingCards={loadingCards}
        onChangeCourses={updateCourseCommissions}
        onChangeRewards={updateRewards}
      />
    </div>
  );
};

export default PositionCard;