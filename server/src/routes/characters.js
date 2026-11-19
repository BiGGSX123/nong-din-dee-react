import { Router } from 'express';
import { prisma } from '../db.js';
import { logPoints } from '../pointLog.js';
import { requireAuth } from '../auth.js';
import { CHARACTERS, bangkokToday } from '../characters.js';

export const charactersRouter = Router();

const asList = (v) => (Array.isArray(v) ? v.filter((id) => CHARACTERS[id]) : []);

// body: { charId } — buy a special character (once; it's permanent). Its daily
// bonus is credited right away and counted as already claimed for today, so the
// daily claim can't pay it twice (other characters' shares stay claimable).
charactersRouter.post('/buy', requireAuth, async (req, res) => {
  const { charId } = req.body || {};
  const ch = CHARACTERS[charId];
  if (!ch) return res.status(400).json({ error: 'unknown character' });
  try {
    const player = await prisma.$transaction(async (tx) => {
      const p = await tx.player.findUnique({ where: { id: req.playerId } });
      if (!p) throw Object.assign(new Error('player not found'), { status: 404 });
      const owned = asList(p.characters);
      if (owned.includes(charId)) throw Object.assign(new Error('already owned'), { status: 409 });
      if (p.points < ch.price) throw Object.assign(new Error('not enough points'), { status: 400 });
      const today = bangkokToday();
      const ownedTotal = owned.reduce((sum, id) => sum + CHARACTERS[id].bonus, 0);
      // today's claimed amount + this character's share (a pre-ledger claim made
      // today, stored as 0, counts as the full amount of what was owned then)
      const claimedBonus = p.charClaimDate === today ? (p.charClaimedBonus || ownedTotal) + ch.bonus : ch.bonus;
      await logPoints(tx, req.playerId, -ch.price, 'character', charId);
      await logPoints(tx, req.playerId, ch.bonus, 'char-bonus', charId);
      return tx.player.update({
        where: { id: req.playerId },
        data: { points: { increment: ch.bonus - ch.price }, characters: [...owned, charId], charClaimDate: today, charClaimedBonus: claimedBonus },
      });
    });
    res.json({ points: player.points, characters: asList(player.characters), bonus: ch.bonus, claimDate: player.charClaimDate, claimedBonus: player.charClaimedBonus });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.status ? e.message : 'purchase failed' });
  }
});

// claim the daily bonus = sum of every owned character's bonus, once per
// Bangkok day. Characters bought today were already paid at purchase, so only
// the not-yet-claimed part is awarded (never anything twice).
charactersRouter.post('/claim', requireAuth, async (req, res) => {
  const p = await prisma.player.findUnique({ where: { id: req.playerId } });
  if (!p) return res.status(404).json({ error: 'player not found' });
  const owned = asList(p.characters);
  const total = owned.reduce((sum, id) => sum + CHARACTERS[id].bonus, 0);
  if (!total) return res.status(400).json({ error: 'no characters' });
  const today = bangkokToday();
  const claimedToday = p.charClaimDate === today;
  // already claimed/paid today → only the part not yet received (characters
  // bought today were paid at purchase). A pre-ledger claim (0) counts as full.
  const already = claimedToday ? (p.charClaimedBonus || total) : 0;
  const awarded = total - already;
  if (awarded <= 0) return res.status(409).json({ error: 'already claimed today', claimDate: today, claimedBonus: already });
  // conditional update = race guard (two taps / two devices can't both win)
  const where = claimedToday
    ? { id: req.playerId, charClaimDate: today, charClaimedBonus: p.charClaimedBonus }
    : { id: req.playerId, OR: [{ charClaimDate: null }, { charClaimDate: { not: today } }] };
  const { count } = await prisma.player.updateMany({
    where,
    data: { points: { increment: awarded }, charClaimDate: today, charClaimedBonus: total },
  });
  if (!count) return res.status(409).json({ error: 'already claimed today', claimDate: today });
  await logPoints(prisma, req.playerId, awarded, 'daily');
  const after = await prisma.player.findUnique({ where: { id: req.playerId } });
  res.json({ awarded, points: after.points, claimDate: today, claimedBonus: total, topUp: claimedToday });
});
