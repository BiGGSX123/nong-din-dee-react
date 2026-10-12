// mirrors server/src/levelOrder.js — returns level indices in play order for
// a player: their chosen home province first (if set), then the rest in the
// default order. Falls back to the default order when no home is set.
export function personalizedOrder(levelCount, homeLevelIndex) {
  const indices = Array.from({ length: levelCount }, (_, i) => i);
  if (homeLevelIndex == null || !indices.includes(homeLevelIndex)) return indices;
  return [homeLevelIndex, ...indices.filter((i) => i !== homeLevelIndex)];
}
