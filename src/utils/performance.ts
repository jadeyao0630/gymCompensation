import type { PositionConfig } from '../types/compensation';

export function isManager(pos: PositionConfig): boolean {
  return pos.title.includes('经理');
}

export function isStoreManager(pos: PositionConfig): boolean {
  return pos.title.includes('店长');
}

/* ⭐ 从 title 推断部门 */
function getDeptOf(title: string): '会籍' | '私教' | '泳教' | '运营' {
  if (!title) return '运营';
  if (title.includes('会籍')) return '会籍';
  if (
    title.includes('私教') ||
    title.includes('瑜伽') ||
    title.includes('舞蹈') ||
    title.includes('团操')
  ) {
    return '私教';
  }
  if (title.includes('泳教') || title.includes('游泳')) return '泳教';
  return '运营';
}

export function resolvePerformanceTarget(
  position: PositionConfig,
  allPositions: PositionConfig[]
): number {
  const source = position.performanceSource || 'self';

  /* ⭐ 经理 + 勾选「业绩=部门总和」→ 本部门非经理、非店长目标之和 */
  if (position.managerAggregateByDept) {
    const dept = getDeptOf(position.title);
    if (dept !== '运营') {
      return allPositions
        .filter((p) => {
          if (p.id === position.id) return false;
          if (p.title.includes('经理')) return false;
          if (p.title.includes('店长')) return false;
          if (getDeptOf(p.title) !== dept) return false;
          if (p.disabled) return false;
          return true;
        })
        .reduce(
          (sum, p) => sum + resolvePerformanceTarget(p, allPositions),
          0
        );
    }
  }

  if (source === 'self') {
    return position.performanceTarget || 0;
  }

  if (source === 'members') {
    /* 会籍经理的 members 逻辑：本 category 非经理、非店长 */
    const members = allPositions.filter(
      (p) =>
        p.id !== position.id &&
        p.category === position.category &&
        !isManager(p) &&
        !isStoreManager(p)
    );
    return members.reduce(
      (sum, p) => sum + resolvePerformanceTarget(p, allPositions),
      0
    );
  }

  /* ⭐ 店长：按 includedDepartments 过滤，排除已勾选 managerAggregateByDept 的经理 */
  if (source === 'aggregate') {
    const included = position.includedDepartments ?? ['会籍', '私教', '泳教'];

    const targets = allPositions.filter((p) => {
      if (p.id === position.id) return false;
      if (p.disabled) return false;
      if (isStoreManager(p)) return false;   // 排除其他店长

      const dept = getDeptOf(p.title);
      if (!included.includes(dept)) return false;   // ⭐ 按 includedDepartments 过滤

      /* ⭐ 已勾选「业绩=部门总和」的经理 → 排除（避免重复） */
      if (isManager(p) && p.managerAggregateByDept) return false;

      return true;
    });

    return targets.reduce(
      (sum, p) => sum + resolvePerformanceTarget(p, allPositions),
      0
    );
  }

  if (source === 'manager' && position.linkedManagerId) {
    const mgr = allPositions.find((p) => p.id === position.linkedManagerId);
    return mgr ? resolvePerformanceTarget(mgr, allPositions) : 0;
  }

  return position.performanceTarget || 0;
}