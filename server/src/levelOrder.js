// returns level indices in play order for a player — their chosen home
// province first (if set and still a valid level), then the rest in the
// default order. Falls back to the default order when no home is set.
export function personalizedOrder(allIndices, homeLevelIndex) {
  if (homeLevelIndex == null || !allIndices.includes(homeLevelIndex)) return allIndices;
  return [homeLevelIndex, ...allIndices.filter((i) => i !== homeLevelIndex)];
}
