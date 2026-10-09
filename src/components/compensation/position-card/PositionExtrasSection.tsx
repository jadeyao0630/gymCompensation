import React from 'react';
import type {
  CourseCommission,
  PositionRewardRef,
  RewardsCatalog,
} from '../../../types/compensation';
import type { CardItem } from '../../../api/card';
import CourseCommissionEditor from '../CourseCommissionEditor';
import PositionRewardsEditor from '../PositionRewardsEditor';

interface Props {
  showCourseCommission: boolean;
  courses: CourseCommission[];
  rewards: PositionRewardRef[];
  rewardsCatalog?: RewardsCatalog;
  readOnly: boolean;
  cardOptions: CardItem[];
  loadingCards: boolean;
  onChangeCourses: (next: CourseCommission[]) => void;
  onChangeRewards: (next: PositionRewardRef[]) => void;
}

export const PositionExtrasSection: React.FC<Props> = ({
  showCourseCommission,
  courses,
  rewards,
  rewardsCatalog,
  readOnly,
  cardOptions,
  loadingCards,
  onChangeCourses,
  onChangeRewards,
}) => {
  if (!showCourseCommission) return null;

  return (
    <div className="px-5 pb-5">
      <CourseCommissionEditor
        courses={courses}
        readOnly={readOnly}
        onChange={onChangeCourses}
        cardOptions={cardOptions}
        loadingCards={loadingCards}
      />
      <PositionRewardsEditor
        rewards={rewards}
        catalog={rewardsCatalog || []}
        readOnly={readOnly}
        onChange={onChangeRewards}
      />
    </div>
  );
};

export default PositionExtrasSection;