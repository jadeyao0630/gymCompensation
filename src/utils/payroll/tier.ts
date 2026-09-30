export function sortByThreshold<T extends { threshold: number }>(tiers: T[]): T[] {
  return [...tiers].sort((a, b) => a.threshold - b.threshold);
}

export function findHitTier<T extends { threshold: number }>(
  tiers: T[],
  perf: number
): T | undefined {
  if (tiers.length === 0) return undefined;
  const sorted = sortByThreshold(tiers);
  let hit: T = sorted[0];
  for (const t of sorted) {
    if (perf >= t.threshold) hit = t;
    else break;
  }
  return hit;
}