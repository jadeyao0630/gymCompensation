import type { RewardHit } from '../../types/payroll';

/** 单条奖金：正/负颜色类 */
export function rewardAmountClass(h: RewardHit): string {
  return h.amount < 0 || h.type === 'deduction'
    ? 'text-rose-600'
    : 'text-amber-600';
}

/** 单条奖金：来源标签颜色 */
export function rewardSourceClass(h: RewardHit): string {
  const isDeduction = h.amount < 0 || h.type === 'deduction';
  if (isDeduction) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

/** 单条奖金：中文来源 */
export function rewardSourceLabel(h: RewardHit): string {
  return h.source === 'position'
    ? '职位'
    : h.source === 'department'
    ? '部门'
    : '个人';
}

/** 单条奖金：中文触发方式 */
export function rewardTriggerLabel(h: RewardHit): string {
  return h.trigger === 'auto' ? '自动命中' : '手动勾选';
}