import { Router } from 'express';
import { prisma } from '../db.js';
import { logPoints } from '../pointLog.js';
import { requireAuth } from '../auth.js';
import { CHARACTERS, bangkokToday } from '../characters.js';

export const charactersRouter = Router();

const asList = (v) => (Array.isArray(v) ? v.filter((id) => CHARACTERS[id]) : []);

// body: { charId } — buy a special character (once; it's permanent)
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
      await logPoints(tx, req.playerId, -ch.price, 'character', charId);
      return tx.player.update({
        where: { id: req.playerId },
        data: { points: { decrement: ch.price }, characters: [...owned, charId] },
      });
    });
    res.json({ points: player.points, characters: asList(player.characters) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.status ? e.message : 'purchase failed' });
  }
});

// claim today's bonus = sum of every owned character's daily bonus. The
// conditional updateMany makes it once-per-day even if two requests race.
charactersRouter.post('/claim', requireAuth, async (req, res) => {
  const p = await prisma.player.findUnique({ where: { id: req.playerId } });
  if (!p) return res.status(404).json({ error: 'player not found' });
  const owned = asList(p.characters);
  const awarded = owned.reduce((sum, id) => sum + CHARACTERS[id].bonus, 0);
  if (!awarded) return res.status(400).json({ error: 'no characters' });
  const today = bangkokToday();
  const { count } = await prisma.player.updateMany({
    where: { id: req.playerId, OR: [{ charClaimDate: null }, { charClaimDate: { not: today } }] },
    data: { points: { increment: awarded }, charClaimDate: today },
  });
  if (!count) return res.status(409).json({ error: 'already claimed today', claimDate: today });
  await logPoints(prisma, req.playerId, awarded, 'daily');
  const after = await prisma.player.findUnique({ where: { id: req.playerId } });
  res.json({ awarded, points: after.points, claimDate: today });
});
