import type {
  PositionConfig,
  RewardsCatalog,
  RewardDefinition,
  StaffRewardRef,
  PositionRewardRef,
  DepartmentRewards,
} from '../../types/compensation';
import type { RewardHit, EmployeePerformance } from '../../types/payroll';
import { getDepartmentOf } from './department';

interface RewardContext {
  fullAttendance: boolean;
  salesAmount: number;
  classCount: number;
}

function matchCondition(def: RewardDefinition, ctx: RewardContext): boolean {
  switch (def.conditionType) {
    case 'fullAttendance':
      return ctx.fullAttendance;
    case 'performance':
    case 'salesAmount':
      return ctx.salesAmount >= (def.conditionValue ?? 0);
    case 'classCount':
      return ctx.classCount >= (def.conditionValue ?? 0);
    case 'custom':
    default:
      return false;
  }
}

export function applyRewards(
  position: PositionConfig,
  perf: EmployeePerformance,
  catalog: RewardsCatalog,
  staffRewards: StaffRewardRef[] | undefined,
  departmentRewards?: DepartmentRewards
): { rewards: RewardHit[]; rewardsTotal: number } {
  const hits: RewardHit[] = [];
  const ctx: RewardContext = {
    fullAttendance: perf.fullAttendance ?? true,
    salesAmount: perf.salesAmount ?? 0,
    classCount: perf.classCount ?? 0,
  };

  const byId = new Map(catalog.map((d) => [d.id, d]));

  const tryRef = (
    ref: PositionRewardRef | StaffRewardRef,
    source: 'position' | 'staff' | 'department'
  ) => {
    const customName = (ref as StaffRewardRef).customName;
    const customType = (ref as StaffRewardRef).customType;

    /* ⭐ 内联自定义：customName 非空 */
    if (customName && customName.trim()) {
      if (ref.enabled === false) return;
      const isDeduction = customType === 'deduction';
      const abs = Math.abs(ref.amountOverride ?? 0);
      if (abs === 0) return;
      const amount = isDeduction ? -abs : abs;
      hits.push({
        rewardId: ref.rewardId,
        name: customName,
        amount,
        source,
        trigger: 'manual',
        note: ref.note,
        type: isDeduction ? 'deduction' : 'reward',
      });
      return;
    }

    const def = byId.get(ref.rewardId);
    if (!def) return;

    const sign = def.type === 'deduction' ? -1 : 1;
    const rawAmount = ref.amountOverride ?? def.amount;
    const amount = rawAmount * sign;
    const note = ref.note ?? def.note;
    const type = def.type ?? 'reward';

    if (def.mode === 'condition') {
      if (matchCondition(def, ctx)) {
        hits.push({
          rewardId: def.id,
          name: def.name,
          amount,
          source,
          trigger: 'auto',
          note,
          type,
        });
      }
    } else if (ref.enabled === true) {
      hits.push({
        rewardId: def.id,
        name: def.name,
        amount,
        source,
        trigger: 'manual',
        note,
        type,
      });
    }
  };

  (position.rewards || []).forEach((ref) => tryRef(ref, 'position'));

  if (departmentRewards) {
    const dept = getDepartmentOf(position.title);
    const list = departmentRewards[dept];
    (list || []).forEach((ref) => tryRef(ref, 'department'));
  }

  (staffRewards || []).forEach((ref) => tryRef(ref, 'staff'));

  const rewardsTotal = hits.reduce((s, h) => s + h.amount, 0);
  return { rewards: hits, rewardsTotal };
}