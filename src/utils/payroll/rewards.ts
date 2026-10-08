import type {
  PositionConfig,
  RewardsCatalog,
  RewardDefinition,
  PositionRewardRef,
  DepartmentRewards,
  TempReward,
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
  departmentRewards?: DepartmentRewards,
  tempRewards?: TempReward[] | Record<string, TempReward[]>
): { rewards: RewardHit[]; rewardsTotal: number } {
  const hits: RewardHit[] = [];
  const ctx: RewardContext = {
    fullAttendance: perf.fullAttendance ?? true,
    salesAmount: perf.salesAmount ?? 0,
    classCount: perf.classCount ?? 0,
  };

  const byId = new Map(catalog.map((d) => [d.id, d]));

  const tryRef = (ref: PositionRewardRef, source: 'position' | 'department') => {
    const def = byId.get(ref.rewardId);
    if (!def) return;

    const sign = def.type === 'deduction' ? -1 : 1;
    const rawAmount = ref.amountOverride ?? def.amount;
    const amount = Math.abs(rawAmount) * sign;
    const note = ref.note ?? def.note;
    const type = def.type ?? 'reward';

    if (def.mode === 'condition') {
      if (matchCondition(def, ctx)) {
        hits.push({ rewardId: def.id, name: def.name, amount, source, trigger: 'auto', note, type });
      }
    } else if (ref.enabled === true) {
      hits.push({ rewardId: def.id, name: def.name, amount, source, trigger: 'manual', note, type });
    }
  };

  (position.rewards || []).forEach((ref) => tryRef(ref, 'position'));

  if (departmentRewards) {
    const dept = getDepartmentOf(position.title);
    const list = departmentRewards[dept];
    (list || []).forEach((ref) => tryRef(ref, 'department'));
  }

  /* ⭐ 临时奖金：兼容数组 / {staffId: TempReward[]} */
  let tempList: TempReward[] = [];
  if (Array.isArray(tempRewards)) {
    tempList = tempRewards;
  } else if (tempRewards && typeof tempRewards === 'object') {
    const sid = String(perf.staffId ?? '').trim();
    const arr = (tempRewards as Record<string, TempReward[]>)[sid];
    if (Array.isArray(arr)) tempList = arr;
  }

  tempList.forEach((t) => {
    if (!t) return;

    /* ⭐ 情况 A：引用奖罚库 */
    if (t.rewardId) {
      const def = byId.get(t.rewardId);
      if (!def) return;
      const sign = def.type === 'deduction' ? -1 : 1;
      const base = Math.abs(t.amount || def.amount || 0);
      const amount = base * sign;               // 正数 × sign
      hits.push({
        rewardId: t.rewardId,
        name: t.name || def.name,
        amount,
        source: 'staff',
        trigger: 'manual',
        note: t.note ?? def.note,
        type: def.type ?? 'reward',
      });
      return;
    }

    /* ⭐ 情况 B：纯自定义 */
    if (!t.name) return;
    const sign = t.type === 'deduction' ? -1 : 1;
    const base = Math.abs(Number(t.amount) || 0);
    const amount = base * sign;                 // 正数 × sign
    hits.push({
      rewardId: t.id,
      name: t.name,
      amount,
      source: 'staff',
      trigger: 'manual',
      note: t.note,
      type: t.type ?? 'reward',
    });
  });

  const rewardsTotal = hits.reduce((s, h) => s + h.amount, 0);
  return { rewards: hits, rewardsTotal };
}