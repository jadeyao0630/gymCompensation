import React from 'react';
import type {
  PositionConfig,
  CommissionTier,
  BaseSalaryTier,
  GenderSalaryTier,
  ClassCommissionMode,
} from '../../../types/compensation';
import TierEditor from '../TierEditor';
import GenderTierEditor from '../GenderTierEditor';

interface Props {
  position: PositionConfig;
  readOnly: boolean;
  showClassCommission: boolean;
  defaultClassMode: ClassCommissionMode;
  isSwimCoach: boolean;
  onAddCommission: () => void;
  onUpdateCommission: (id: string, u: Partial<CommissionTier>) => void;
  onRemoveCommission: (id: string) => void;
  onAddBase: () => void;
  onUpdateBase: (id: string, u: Partial<BaseSalaryTier>) => void;
  onRemoveBase: (id: string) => void;
  onUpdateGenderTiers: (tiers: GenderSalaryTier[]) => void;
}

export const PositionTiersSection: React.FC<Props> = ({
  position,
  readOnly,
  showClassCommission,
  defaultClassMode,
  isSwimCoach,
  onAddCommission,
  onUpdateCommission,
  onRemoveCommission,
  onAddBase,
  onUpdateBase,
  onRemoveBase,
  onUpdateGenderTiers,
}) => {
  return (
    <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
      <TierEditor
        mode="commission"
        readOnly={readOnly}
        commissionTiers={position.commissionTiers}
        onAddCommission={onAddCommission}
        onUpdateCommission={onUpdateCommission}
        onRemoveCommission={onRemoveCommission}
        showClassCommission={showClassCommission}
        defaultClassMode={defaultClassMode}
      />

      {isSwimCoach ? (
        <GenderTierEditor
          tiers={position.genderSalaryTiers || []}
          readOnly={readOnly}
          onChange={onUpdateGenderTiers}
        />
      ) : (
        <TierEditor
          mode="base"
          readOnly={readOnly}
          baseSalaryTiers={position.baseSalaryTiers}
          onAddBase={onAddBase}
          onUpdateBase={onUpdateBase}
          onRemoveBase={onRemoveBase}
        />
      )}
    </div>
  );
};

export default PositionTiersSection;