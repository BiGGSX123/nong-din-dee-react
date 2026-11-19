// point ledger: one PointLog row per change to Player.points, so a player can
// see where their points came from / went (profile screen). Write it in the
// same transaction as the points change wherever possible.
//   kind: level | quiz | shop | character | char-bonus (paid at purchase) | daily | dividend
//   ref:  levelIndex | difficulty (":x2" when doubled) | itemId | charId
export function logPoints(db, playerId, amount, kind, ref = null) {
  return db.pointLog.create({ data: { playerId, amount, kind, ref: ref == null ? null : String(ref) } });
}
