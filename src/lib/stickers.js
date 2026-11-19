// which collection stickers a player owns, and which of them they've already
// SEEN in the album — anything owned but unseen shows a "NEW" badge + pops in
// on the คลังสะสม page (and puts a dot on its nav tab).
// Seen ids live per player on this device (localStorage); guests' progress is
// in-memory only, so their seen-set is too (it resets with the progress).
import { CROPS, SOIL } from '../data/content';
import { CHARACTERS } from '../data/characters';

// same rules as CollectionScreen: a level passed with 2+ stars unlocks its
// crop + soil stickers; special characters once bought
export function collectedStickerIds(levels, levelStatus, characters) {
  if (!levels || !levelStatus) return [];
  const crops = new Set(levelStatus.filter((s) => s.completed && s.stars >= 2 && s.pickedCropId).map((s) => s.pickedCropId));
  const soils = new Set(levels.filter((l, i) => levelStatus[i]?.completed && levelStatus[i].stars >= 2).map((l) => l.soilId));
  return [
    ...CHARACTERS.filter((c) => characters.includes(c.id)).map((c) => `char:${c.id}`),
    ...CROPS.filter((c) => crops.has(c.id)).map((c) => `crop:${c.id}`),
    ...SOIL.filter((s) => soils.has(s.id)).map((s) => `soil:${s.id}`),
  ];
}

const guestSeen = { ids: null };
const key = (owner) => `ndd_seen_stickers_${owner}`;

export function readSeen(owner) {
  if (!owner) return guestSeen.ids ? new Set(guestSeen.ids) : null;
  try {
    const raw = localStorage.getItem(key(owner));
    return raw ? new Set(JSON.parse(raw)) : null;
  } catch { return null; }
}

export function writeSeen(owner, ids) {
  if (!owner) { guestSeen.ids = [...ids]; return; }
  try { localStorage.setItem(key(owner), JSON.stringify([...ids])); } catch { /* storage unavailable */ }
}
