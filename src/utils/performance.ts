import type { PositionConfig } from '../types/compensation';

export function isManager(pos: PositionConfig): boolean {
  return pos.title.includes('经理');
}

export function isStoreManager(pos: PositionConfig): boolean {
  return pos.title.includes('店长');
}

export function resolvePerformanceTarget(
  position: PositionConfig,
  allPositions: PositionConfig[]
): number {
  const source = position.performanceSource || 'self';

  if (source === 'self') {
    return position.performanceTarget || 0;
  }

  if (source === 'members') {
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

  if (source === 'aggregate') {
    const managers = allPositions.filter(
      (p) => p.id !== position.id && isManager(p)
    );
    const targets =
      managers.length > 0
        ? managers
        : allPositions.filter((p) => p.id !== position.id);
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
